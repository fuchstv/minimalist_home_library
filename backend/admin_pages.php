<?php
// backend/admin_pages.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

// Expected path: /api/admin/pages OR /api/admin/pages/{slug}
if (count($parts) >= 3 && $parts[2] === 'pages') {
    if ($method === 'GET') {
        if (isset($parts[3])) {
            $slug = $parts[3];
            $stmt = $pdo->prepare("SELECT * FROM pages WHERE slug = ?");
            $stmt->execute([$slug]);
            echo json_encode($stmt->fetch());
        } else {
            $stmt = $pdo->query("SELECT * FROM pages");
            echo json_encode($stmt->fetchAll());
        }
        return;
    }

    if ($method === 'POST' && isset($parts[3])) {
        $slug = $parts[3];
        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $pdo->prepare("UPDATE pages SET title_de = ?, title_pl = ?, content_de = ?, content_pl = ? WHERE slug = ?");
        $stmt->execute([
            $input['title_de'] ?? '',
            $input['title_pl'] ?? '',
            $input['content_de'] ?? '',
            $input['content_pl'] ?? '',
            $slug
        ]);

        echo json_encode(["message" => "Page updated successfully"]);
        return;
    }
}
