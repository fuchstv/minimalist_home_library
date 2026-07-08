<?php
// backend/admin_pages.php
require_once 'db.php';
require_once 'error_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('/^\/api/', '', $path);
$parts = explode('/', trim($path, '/'));

// Expected path: /admin/pages OR /admin/pages/{slug}
if (count($parts) >= 2 && $parts[0] === 'admin' && $parts[1] === 'pages') {
    if ($method === 'GET') {
        try {
            if (isset($parts[2])) {
                $slug = $parts[2];
                $stmt = $pdo->prepare("SELECT * FROM pages WHERE slug = ?");
                $stmt->execute([$slug]);
                echo json_encode($stmt->fetch());
            } else {
                $stmt = $pdo->query("SELECT * FROM pages");
                echo json_encode($stmt->fetchAll());
            }
        } catch (\Exception $e) {
            handleException($e, "Failed to fetch pages");
        }
        return;
    }

    if ($method === 'POST' && isset($parts[2])) {
        $slug = $parts[2];
        $input = json_decode(file_get_contents('php://input'), true);

        try {
            $stmt = $pdo->prepare("UPDATE pages SET title_de = ?, title_pl = ?, content_de = ?, content_pl = ? WHERE slug = ?");
            $stmt->execute([
                $input['title_de'] ?? '',
                $input['title_pl'] ?? '',
                $input['content_de'] ?? '',
                $input['content_pl'] ?? '',
                $slug
            ]);

            echo json_encode(["message" => "Page updated successfully"]);
        } catch (\Exception $e) {
            handleException($e, "Failed to update page");
        }
        return;
    }
}
