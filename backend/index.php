<?php
// backend/index.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Route incoming requests
if (preg_match('/^\/api\/pages/', $request_uri)) {
    require 'pages.php';
} elseif (preg_match('/^\/api\/books/', $request_uri)) {
    require 'books.php';
} elseif (preg_match('/^\/api\/loans/', $request_uri)) {
    require 'loans.php';
} elseif (preg_match('/^\/api\/auth/', $request_uri)) {
    require 'auth.php';
} elseif (preg_match('/^\/api\/admin/', $request_uri)) {
    require 'admin.php';
} else {
    http_response_code(404);
    echo json_encode(["message" => "API Endpoint not found."]);
}
