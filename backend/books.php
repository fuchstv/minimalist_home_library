<?php
// backend/books.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    // Check if a specific ID is requested
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    $id = null;
    if (count($parts) > 2 && is_numeric($parts[2])) {
        $id = $parts[2];
    }

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM books WHERE id = ?");
        $stmt->execute([$id]);
        $book = $stmt->fetch();
        if ($book) {
            echo json_encode($book);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Book not found."]);
        }
    } else {
        // Handle search, filter, pagination
        $search = $_GET['search'] ?? '';
        $category = $_GET['category'] ?? '';
        $status = $_GET['status'] ?? '';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 12;
        $offset = ($page - 1) * $limit;

        $query = "SELECT * FROM books WHERE 1=1";
        $countQuery = "SELECT COUNT(*) as total FROM books WHERE 1=1";
        $params = [];

        if ($search) {
            $query .= " AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)";
            $countQuery .= " AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($category) {
            // Using LIKE for category because CSV categories are broad
            $query .= " AND category LIKE ?";
            $countQuery .= " AND category LIKE ?";
            $params[] = "%$category%";
        }

        if ($status) {
            $query .= " AND availability_status = ?";
            $countQuery .= " AND availability_status = ?";
            $params[] = $status;
        }

        // Get total count
        $stmtCount = $pdo->prepare($countQuery);
        $stmtCount->execute($params);
        $totalRows = $stmtCount->fetch()['total'];

        // Get paginated results
        $query .= " LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $books = $stmt->fetchAll();

        echo json_encode([
            "data" => $books,
            "meta" => [
                "total" => $totalRows,
                "page" => $page,
                "limit" => $limit,
                "totalPages" => ceil($totalRows / $limit)
            ]
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}
