<?php
// backend/index.php
require_once 'error_utils.php';
require_once 'csrf_utils.php';

session_start();

$allowed_origins = getenv('ALLOWED_ORIGINS') ? explode(',', getenv('ALLOWED_ORIGINS')) : ['http://localhost:5173', 'http://localhost:8080', 'https://hausbibliothek.org'];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    die();
}

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Verify CSRF token for state-changing requests
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    // Exempt login and register as they set up the session/don't have a token yet
    $isExempt = (strpos($request_uri, '/auth/login') !== false) || (strpos($request_uri, '/auth/register') !== false);

    if (!$isExempt) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!verifyCsrfToken($token)) {
            http_response_code(403);
            echo json_encode(["message" => "CSRF token validation failed"]);
            die();
        }
    }
}

/**
 * Helper to check if the path matches the given endpoint,
 * optionally prefixed with /api.
 */
function matchPath($path, $endpoint) {
    return $path === $endpoint ||
           strpos($path, $endpoint . '/') === 0 ||
           $path === '/api' . $endpoint ||
           strpos($path, '/api' . $endpoint . '/') === 0;
}

// Route incoming requests
if (matchPath($request_uri, '/pages')) {
    require 'pages.php';
} elseif (matchPath($request_uri, '/books')) {
    require 'books.php';
} elseif (matchPath($request_uri, '/loans')) {
    require 'loans.php';
} elseif (matchPath($request_uri, '/reservations')) {
    require 'reservations.php';
} elseif (matchPath($request_uri, '/auth')) {
    require 'auth.php';
} elseif (matchPath($request_uri, '/notifications')) {
    require 'notifications.php';
} elseif (matchPath($request_uri, '/admin')) {
    require 'admin.php';
} elseif (matchPath($request_uri, '/health')) {
    require 'health.php';
} else {
    http_response_code(404);
    echo json_encode(["message" => "API Endpoint not found."]);
}
