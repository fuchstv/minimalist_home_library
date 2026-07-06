<?php
// backend/notifications.php
session_start();
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["message" => "Unauthorized"]);
} else {
    $user_id = $_SESSION['user_id'];
    $user_role = $_SESSION['user_role'] ?? 'member';

    $count = 0;
    try {
        if ($user_role === 'admin') {
            // Admin: Count all overdue loans
            $stmt = $pdo->query("SELECT COUNT(*) FROM loans WHERE due_date < CURDATE() AND status != 'returned'");
            $count = (int)$stmt->fetchColumn();
        } else {
            // Member: Count their own overdue loans
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM loans WHERE user_id = ? AND due_date < CURDATE() AND status != 'returned'");
            $stmt->execute([$user_id]);
            $count = (int)$stmt->fetchColumn();
        }

        echo json_encode(["count" => $count]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(["message" => "Internal Server Error: " . $e->getMessage()]);
    }
}
