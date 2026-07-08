<?php
// backend/notifications.php

require_once 'db.php';
require_once 'error_utils.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["message" => "Unauthorized"]);
    die();
}

$user_id = $_SESSION['user_id'];
$user_role = $_SESSION['user_role'] ?? 'member';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Count overdue loans
        $overdue_count = 0;
        if ($user_role === 'admin') {
            $stmt = $pdo->query("SELECT COUNT(*) FROM loans WHERE due_date < CURDATE() AND status != 'returned'");
            $overdue_count = (int)$stmt->fetchColumn();
        } else {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM loans WHERE user_id = ? AND due_date < CURDATE() AND status != 'returned'");
            $stmt->execute([$user_id]);
            $overdue_count = (int)$stmt->fetchColumn();
        }

        // Count unread notifications
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE");
        $stmt->execute([$user_id]);
        $unread_notifications_count = (int)$stmt->fetchColumn();

        // Get actual notifications
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$user_id]);
        $notifications = $stmt->fetchAll();

        echo json_encode([
            "count" => $overdue_count + $unread_notifications_count,
            "overdue_count" => $overdue_count,
            "unread_count" => $unread_notifications_count,
            "data" => $notifications
        ]);
    } catch (\Exception $e) {
        sendGenericError($e, "Internal Server Error");
    }
} elseif ($method === 'PUT') {
    // Mark as read
    $data = json_decode(file_get_contents('php://input'), true);
    $notification_id = $data['id'] ?? null;

    try {
        if ($notification_id) {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?");
            $stmt->execute([$notification_id, $user_id]);
        } else {
            // Mark all as read
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE user_id = ?");
            $stmt->execute([$user_id]);
        }
        echo json_encode(["message" => "Notifications updated"]);
    } catch (\Exception $e) {
        sendGenericError($e, "Internal Server Error");
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}
