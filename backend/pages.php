<?php
// backend/pages.php - Dynamic Pages with Headless CMS Sync Proxy
require_once 'db.php';
require_once 'error_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('/^\/api/', '', $path);
$parts = explode('/', trim($path, '/'));

// Expected path: /pages/{slug}
if (count($parts) >= 2 && $parts[0] === 'pages') {
    $slug = $parts[1];

    if ($method === 'GET') {
        // 1. Try to fetch from Astro Headless CMS Pages export endpoint / static file
        $cmsPage = fetchFromHeadlessCms($slug);
        if ($cmsPage !== null) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($cmsPage);
            return;
        }

        // 2. Fallback to local database table `pages`
        try {
            $stmt = $pdo->prepare("SELECT * FROM pages WHERE slug = ?");
            $stmt->execute([$slug]);
            $page = $stmt->fetch();

            if ($page) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode($page);
            } else {
                http_response_code(404);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode(["message" => "Page not found"]);
            }
        } catch (\PDOException $e) {
            handleException($e, "Failed to fetch page");
        }
        return;
    }
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(["message" => "Endpoint not found"]);

/**
 * Helper function to fetch and match pages from Astro Content Collections export
 */
function fetchFromHeadlessCms($slug) {
    // Check local dist filesystem path first for super fast response
    $localJsonPath = '/var/www/beta/export/pages.json';
    $jsonContent = null;

    if (file_exists($localJsonPath)) {
        $jsonContent = @file_get_contents($localJsonPath);
    } else {
        // Fallback to HTTP fetch
        $cmsExportUrl = 'https://beta.sprachcafe-polnisch.org/export/pages.json';
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 2,
                'ignore_errors' => true
            ]
        ]);
        $jsonContent = @file_get_contents($cmsExportUrl, false, $ctx);
    }

    if ($jsonContent) {
        $pages = json_decode($jsonContent, true);
        if (is_array($pages)) {
            foreach ($pages as $p) {
                if (isset($p['slug']) && $p['slug'] === $slug) {
                    return [
                        'slug' => $p['slug'],
                        'title_de' => $p['title_de'] ?? '',
                        'title_pl' => $p['title_pl'] ?? '',
                        'content_de' => $p['content_de'] ?? '',
                        'content_pl' => $p['content_pl'] ?? '',
                        'source' => 'Astro Content Collections (Headless CMS)'
                    ];
                }
            }
        }
    }
    return null;
}
