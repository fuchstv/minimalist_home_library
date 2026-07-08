<?php
// backend/notification_utils.php

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
        SELECT r.user_id, u.name
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ? AND r.status = 'pending'
    ");
    $stmt->execute([$book_id]);
    $reservations = $stmt->fetchAll();

    foreach ($reservations as $res) {
        $msg = "Das Buch '$bookTitle' ($signature) ist wieder verfügbar.";
        createNotification($pdo, $res['user_id'], $msg);

        // Mark reservation as completed
        $upd = $pdo->prepare("UPDATE reservations SET status = 'completed' WHERE book_id = ? AND user_id = ? AND status = 'pending'");
        $upd->execute([$book_id, $res['user_id']]);
    }

    // 3. Notify all admins if there were reservations
    if (!empty($reservations)) {
        $stmt = $pdo->query("SELECT id FROM users WHERE role = 'admin'");
        $admins = $stmt->fetchAll();
        foreach ($admins as $admin) {
            $msg = "Das Buch '$bookTitle' ($signature) wurde zurückgegeben und ist nun wieder verfügbar. Es lagen Vormerkungen vor.";
            createNotification($pdo, $admin['id'], $msg);
        }
    }
}
