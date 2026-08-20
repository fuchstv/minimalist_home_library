<?php
// backend/notification_utils.php
require_once 'mail_utils.php';

function createNotification($pdo, $user_id, $message) {
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)");
    $stmt->execute([$user_id, $message]);
}

function notifyBookAvailable($pdo, $book_id) {
    // 1. Get book info
    $stmt = $pdo->prepare("SELECT title, author, signature FROM books WHERE id = ?");
    $stmt->execute([$book_id]);
    $book = $stmt->fetch();
    if (!$book) return;

    $bookTitle = $book['title'];
    $signature = $book['signature'];

    // 2. Notify users who reserved the book
    $stmt = $pdo->prepare("
        SELECT r.user_id, u.name, u.email
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ? AND r.status = 'pending'
    ");
    $stmt->execute([$book_id]);
    $reservations = $stmt->fetchAll();

    if (!empty($reservations)) {
        $msg = "Das Buch '$bookTitle' ($signature) ist wieder verfügbar.";
        $placeholders = [];
        $values = [];
        $userIds = [];

        foreach ($reservations as $res) {
            $placeholders[] = "(?, ?)";
            $values[] = $res['user_id'];
            $values[] = $msg;
            $userIds[] = $res['user_id'];

            // Send rich HTML email via Power Automate
            if (!empty($res['email'])) {
                try {
                    sendBookAvailableEmail($pdo, $res['email'], $res['name'], $bookTitle, $signature);
                } catch (\Exception $e) {
                    error_log("[Notifications] Failed to send book available email: " . $e->getMessage());
                }
            }
        }

        // Batch insert notifications
        $sql = "INSERT INTO notifications (user_id, message) VALUES " . implode(", ", $placeholders);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);

        // Batch update reservations for these specific users
        $inQuery = implode(',', array_fill(0, count($userIds), '?'));
        $updateSql = "UPDATE reservations SET status = 'completed' WHERE book_id = ? AND status = 'pending' AND user_id IN ($inQuery)";
        $updateValues = array_merge([$book_id], $userIds);
        $upd = $pdo->prepare($updateSql);
        $upd->execute($updateValues);
    }

    // 3. Notify all admins if there were reservations
    if (!empty($reservations)) {
        $stmt = $pdo->query("SELECT id FROM users WHERE role = 'admin'");
        $admins = $stmt->fetchAll();

        if (!empty($admins)) {
            $msg = "Das Buch '$bookTitle' ($signature) wurde zurückgegeben und ist nun wieder verfügbar. Es lagen Vormerkungen vor.";
            $placeholders = [];
            $values = [];
            foreach ($admins as $admin) {
                $placeholders[] = "(?, ?)";
                $values[] = $admin['id'];
                $values[] = $msg;
            }
            $sql = "INSERT INTO notifications (user_id, message) VALUES " . implode(", ", $placeholders);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }
    }
}
