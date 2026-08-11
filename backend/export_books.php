<?php
// backend/export_books.php
// Lightweight read-only public export endpoint for book catalog metadata
require_once 'db.php';
require_once 'error_utils.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed. Only GET is supported."]);
    exit;
}

try {
    $search = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    $status = $_GET['status'] ?? '';
    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 500) : 500;
    $page = isset($_GET['page']) ? max((int)$_GET['page'], 1) : 1;
    $offset = ($page - 1) * $limit;

    $query = "SELECT id, title, author, isbn, category, publication_year, publisher, description, cover_image AS cover_url, location, availability_status, signature, created_at FROM books WHERE 1=1";
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
        $query .= " AND category = ?";
        $countQuery .= " AND category = ?";
        $params[] = $category;
    }

    if ($status) {
        $query .= " AND availability_status = ?";
        $countQuery .= " AND availability_status = ?";
        $params[] = $status;
    }

    $stmtCount = $pdo->prepare($countQuery);
    $stmtCount->execute($params);
    $totalRows = (int)$stmtCount->fetch()['total'];

    $query .= " ORDER BY id ASC LIMIT $limit OFFSET $offset";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $books = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Set caching headers for catalog export
    header("Cache-Control: public, max-age=300");

    echo json_encode([
        "status" => "success",
        "data" => $books,
        "meta" => [
            "total" => $totalRows,
            "page" => $page,
            "limit" => $limit,
            "totalPages" => ceil($totalRows / $limit)
        ]
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (\PDOException $e) {
    handleException($e, "Failed to export book catalog");
}
