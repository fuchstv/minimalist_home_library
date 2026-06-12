<?php
// backend/admin.php
require_once 'db.php';
session_start();

// Ensure only admins can access
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "Forbidden: Admin access required"]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// Handle Book operations
if (strpos($_SERVER['REQUEST_URI'], '/api/admin/books') !== false) {
    
    if ($method == 'POST') {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if (strpos($path, '/api/admin/books/import') !== false) {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['books']) || !is_array($input['books'])) {
                http_response_code(400);
                echo json_encode(["message" => "Invalid input format. Expected an array of books."]);
                exit;
            }

            try {
                $pdo->beginTransaction();
                $stmt = $pdo->prepare("INSERT INTO books (title, author, category, publication_year, publisher, isbn, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
                
                $importedCount = 0;
                foreach ($input['books'] as $book) {
                    $title = $book['title'] ?? '';
                    $author = $book['author'] ?? '';
                    $category = $book['category'] ?? '';
                    $publication_year = $book['publication_year'] ?? '';
                    $publisher = $book['publisher'] ?? '';
                    $isbn = $book['isbn'] ?? '';
                    $description = $book['description'] ?? '';

                    if (empty(trim($title))) {
                        throw new Exception("Title is required for all books.");
                    }

                    $stmt->execute([$title, $author, $category, $publication_year, $publisher, $isbn, $description]);
                    $importedCount++;
                }

                $pdo->commit();
                echo json_encode(["message" => "Imported $importedCount books successfully.", "count" => $importedCount]);
            } catch (\Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(400);
                echo json_encode(["message" => "Failed to import books: " . $e->getMessage()]);
            }
            exit;
        }

        // Create new book. We might receive form-data if uploading image
        $title = $_POST['title'] ?? '';
        $author = $_POST['author'] ?? '';
        $category = $_POST['category'] ?? '';
        $publication_year = $_POST['publication_year'] ?? '';
        $publisher = $_POST['publisher'] ?? '';
        $isbn = $_POST['isbn'] ?? '';
        $description = $_POST['description'] ?? '';
        
        $cover_image = null;
        if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $filename = uniqid() . '_' . basename($_FILES['cover_image']['name']);
            $targetPath = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['cover_image']['tmp_name'], $targetPath)) {
                $cover_image = 'uploads/' . $filename;
            }
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO books (title, author, category, publication_year, publisher, isbn, description, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $author, $category, $publication_year, $publisher, $isbn, $description, $cover_image]);
            echo json_encode(["message" => "Book created successfully", "id" => $pdo->lastInsertId()]);
        } catch (\PDOException $e) {
            http_response_code(400);
            echo json_encode(["message" => "Failed to create book: " . $e->getMessage()]);
        }
    } elseif ($method == 'DELETE') {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts = explode('/', trim($path, '/'));
        if (count($parts) > 3 && is_numeric($parts[3])) {
            $id = $parts[3];
            $stmt = $pdo->prepare("DELETE FROM books WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Book deleted"]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Invalid ID"]);
        }
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
    }
}
