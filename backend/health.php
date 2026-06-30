<?php
header("Content-Type: application/json");
require_once 'db.php';

try {
    $pdo->query("SELECT 1");
    echo json_encode(["status" => "ok", "database" => "connected"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
