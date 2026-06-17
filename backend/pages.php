<?php
// backend/pages.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

// Expected path: /api/pages/{slug}
if (count($parts) >= 3 && $parts[1] === 'pages') {
    $slug = $parts[2];

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM pages WHERE slug = ?");
        $stmt->execute([$slug]);
        $page = $stmt->fetch();

        if ($page) {
            echo json_encode($page);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Page not found"]);
        }
        return;
    }
}

http_response_code(404);
echo json_encode(["message" => "Endpoint not found"]);
