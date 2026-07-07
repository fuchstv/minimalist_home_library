<?php
// backend/admin.php
require_once 'db.php';
require_once 'admin_utils.php';
session_start();

// Ensure only admins can access
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["message" => "Forbidden: Admin access required"]);
    return;
}

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('/^\/api/', '', $request_uri);
$parts = explode('/', trim($path, '/'));

// Handle operations
if (strpos($request_uri, '/admin/pages') !== false) {
    require 'admin_pages.php';
} elseif (strpos($request_uri, '/admin/users') !== false || strpos($request_uri, '/admin/loans') !== false) {
    require 'admin_users.php';
} elseif (strpos($request_uri, '/admin/books') !== false) {
    
    if ($method == 'POST') {
        if (isset($parts[2]) && $parts[2] === 'import') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['books']) || !is_array($input['books'])) {
                http_response_code(400);
                echo json_encode(["message" => "Invalid input format. Expected an array of books."]);
                return;
            }

            try {
                $pdo->beginTransaction();
                $stmt = $pdo->prepare("INSERT INTO books (title, author, category, publication_year, publisher, isbn, description, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                
                $importedCount = 0;
                $skippedCount = 0;
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

                    // Duplicate check
                    if (findDuplicateBook($pdo, $title, $author, $isbn)) {
                        $skippedCount++;
                        continue;
                    }

                    $signature = generateSignature($pdo, $category);
                    $stmt->execute([$title, $author, $category, $publication_year, $publisher, $isbn, $description, $signature]);
                    $importedCount++;
                }

                $pdo->commit();
                echo json_encode([
                    "message" => "Imported $importedCount books successfully." . ($skippedCount > 0 ? " $skippedCount duplicates skipped." : ""),
                    "count" => $importedCount,
                    "skipped" => $skippedCount
                ]);
            } catch (\Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(400);
                echo json_encode(["message" => "Failed to import books: " . $e->getMessage()]);
            }
            return;
        }

        // Update or Create book
        $id = (isset($parts[2]) && is_numeric($parts[2])) ? (int)$parts[2] : null;

        $title = $_POST['title'] ?? '';
        $author = $_POST['author'] ?? '';
        $category = $_POST['category'] ?? '';
        $publication_year = $_POST['publication_year'] ?? '';
        $publisher = $_POST['publisher'] ?? '';
        $isbn = $_POST['isbn'] ?? '';
        $description = $_POST['description'] ?? '';
        $signature = $_POST['signature'] ?? '';
        
        $cover_image = null;
        if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

            $mimeType = mime_content_type($_FILES['cover_image']['tmp_name']);
            $extension = strtolower(pathinfo($_FILES['cover_image']['name'], PATHINFO_EXTENSION));

            if (!in_array($mimeType, $allowedMimeTypes) || !in_array($extension, $allowedExtensions)) {
                http_response_code(400);
                echo json_encode(["message" => "Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed."]);
                return;
            }
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
            $pdo->beginTransaction();

            // Duplicate Check
            $duplicate = findDuplicateBook($pdo, $title, $author, $isbn, $id);
            if ($duplicate) {
                throw new Exception("A similar book already exists with signature: " . ($duplicate['signature'] ?: "N/A"));
            }

            if ($id) {
                // Update
                $sql = "UPDATE books SET title = ?, author = ?, category = ?, publication_year = ?, publisher = ?, isbn = ?, description = ?, signature = ?";
                $params = [$title, $author, $category, $publication_year, $publisher, $isbn, $description, $signature];

                if ($cover_image) {
                    $sql .= ", cover_image = ?";
                    $params[] = $cover_image;
                }

                $sql .= " WHERE id = ?";
                $params[] = $id;

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $pdo->commit();
                echo json_encode(["message" => "Book updated successfully", "id" => $id]);
            } else {
                // Create
                if (empty($signature)) {
                    $signature = generateSignature($pdo, $category);
                }
                $stmt = $pdo->prepare("INSERT INTO books (title, author, category, publication_year, publisher, isbn, description, cover_image, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$title, $author, $category, $publication_year, $publisher, $isbn, $description, $cover_image, $signature]);
                $newId = $pdo->lastInsertId();
                $pdo->commit();
                echo json_encode(["message" => "Book created successfully", "id" => $newId, "signature" => $signature]);
            }
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(400);
            echo json_encode(["message" => "Failed to save book: " . $e->getMessage()]);
        }
    } elseif ($method == 'DELETE') {
        if (isset($parts[2]) && is_numeric($parts[2])) {
            $id = $parts[2];
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
