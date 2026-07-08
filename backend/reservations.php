<?php
// backend/reservations.php

require_once 'db.php';
require_once 'error_utils.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["message" => "Unauthorized"]);
    die();
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get user's reservations
    try {
        $stmt = $pdo->prepare("
            SELECT r.*, b.title, b.author, b.signature
            FROM reservations r
            JOIN books b ON r.book_id = b.id
            WHERE r.user_id = ? AND r.status = 'pending'
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $reservations = $stmt->fetchAll();
        echo json_encode(["data" => $reservations]);
    } catch (\Exception $e) {
        handleException($e, "Failed to fetch reservations");
    }
} elseif ($method === 'POST') {
    // Create a reservation
    $data = json_decode(file_get_contents('php://input'), true);
    $book_id = $data['book_id'] ?? null;

    if (!$book_id) {
        http_response_code(400);
        echo json_encode(["message" => "Book ID is required."]);
        die();
    }

    try {
        $pdo->beginTransaction();

        // Check if book exists and is borrowed
        $stmt = $pdo->prepare("SELECT availability_status FROM books WHERE id = ? FOR UPDATE");
        $stmt->execute([$book_id]);
        $book = $stmt->fetch();

        if (!$book) {
            throw new Exception("Book not found.");
        }

        if ($book['availability_status'] !== 'borrowed') {
            throw new Exception("Only borrowed books can be reserved.");
        }

        // Check if already reserved by this user
        $stmt = $pdo->prepare("SELECT id FROM reservations WHERE book_id = ? AND user_id = ? AND status = 'pending'");
        $stmt->execute([$book_id, $user_id]);
        if ($stmt->fetch()) {
            throw new Exception("You have already reserved this book.");
        }

        // Create reservation
        $stmt = $pdo->prepare("INSERT INTO reservations (book_id, user_id) VALUES (?, ?)");
        $stmt->execute([$book_id, $user_id]);

        $pdo->commit();
        echo json_encode(["message" => "Book successfully reserved."]);
    } catch (\Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        handleException($e, "Failed to create reservation");
    }
} elseif ($method === 'DELETE') {
    // Cancel a reservation
    $data = json_decode(file_get_contents('php://input'), true);
    $reservation_id = $data['reservation_id'] ?? null;

    if (!$reservation_id) {
        http_response_code(400);
        echo json_encode(["message" => "Reservation ID is required."]);
        die();
    }

    try {
        $stmt = $pdo->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND user_id = ?");
        $stmt->execute([$reservation_id, $user_id]);
        echo json_encode(["message" => "Reservation cancelled."]);
    } catch (\Exception $e) {
        handleException($e, "Failed to cancel reservation");
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}
