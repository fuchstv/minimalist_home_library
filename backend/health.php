<?php
header("Content-Type: application/json");
require_once 'db.php';
require_once 'error_utils.php';

try {
    $pdo->query("SELECT 1");
    echo json_encode(["status" => "ok", "database" => "connected"]);
} catch (Exception $e) {
    error_log("Health check failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Service unavailable"]);
}
