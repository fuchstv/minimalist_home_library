<?php
// backend/loans.php
session_start();
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
// Resolve user ID: check session first, then fallback to GET/POST parameter, default to 2
$user_id = $_SESSION['user_id'] ?? (isset($_GET['user_id']) ? (int)$_GET['user_id'] : 2);

if ($method == 'GET') {
    // Get loans for the current user
    $query = "
        SELECT l.id, l.book_id, l.user_id, l.loan_date, l.due_date, l.return_date,
               CASE
                   WHEN l.status != 'returned' AND l.due_date < CURDATE() THEN 'overdue'
                   ELSE l.status
               END as status,
               b.title, b.author, b.isbn, b.location
        FROM loans l
        JOIN books b ON l.book_id = b.id
        WHERE l.user_id = ?
        ORDER BY l.loan_date DESC
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user_id]);
    $loans = $stmt->fetchAll();
    echo json_encode(["data" => $loans]);

} elseif ($method == 'POST') {
    // Borrow a book
    $data = json_decode(file_get_contents('php://input'), true);
    $book_id = $data['book_id'] ?? null;

    if (!$book_id) {
        http_response_code(400);
        echo json_encode(["message" => "Book ID is required."]);
    } else {
        $pdo->beginTransaction();
        try {
            // Check active loans count (max 3)
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM loans WHERE user_id = ? AND status != 'returned'");
            $stmt->execute([$user_id]);
            $active_loans_count = $stmt->fetchColumn();

            if ($active_loans_count >= 3) {
                throw new Exception("You have reached the maximum limit of 3 borrowed items.");
            }

            // Check if available
            $stmt = $pdo->prepare("SELECT availability_status FROM books WHERE id = ? FOR UPDATE");
            $stmt->execute([$book_id]);
            $book = $stmt->fetch();

            if (!$book || $book['availability_status'] !== 'available') {
                throw new Exception("Book is not available for borrowing.");
            }

            // Create loan (2 weeks default)
            $loan_date = date('Y-m-d');
            $due_date = date('Y-m-d', strtotime('+2 weeks'));

            $stmt = $pdo->prepare("INSERT INTO loans (book_id, user_id, loan_date, due_date) VALUES (?, ?, ?, ?)");
            $stmt->execute([$book_id, $user_id, $loan_date, $due_date]);

            // Update book status
            $stmt = $pdo->prepare("UPDATE books SET availability_status = 'borrowed' WHERE id = ?");
            $stmt->execute([$book_id]);

            $pdo->commit();
            echo json_encode(["message" => "Book successfully borrowed.", "due_date" => $due_date]);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }
} elseif ($method == 'PUT') {
    // Return or extend a loan
    $data = json_decode(file_get_contents('php://input'), true);
    $loan_id = $data['loan_id'] ?? null;
    $action = $data['action'] ?? null; // 'return' or 'extend'

    if (!$loan_id || !$action) {
        http_response_code(400);
        echo json_encode(["message" => "Loan ID and action are required."]);
    } else {
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM loans WHERE id = ? AND user_id = ? AND status != 'returned' FOR UPDATE");
            $stmt->execute([$loan_id, $user_id]);
            $loan = $stmt->fetch();

            if (!$loan) {
                throw new Exception("Active loan not found.");
            }

            if ($action === 'return') {
                $return_date = date('Y-m-d');
                $stmt = $pdo->prepare("UPDATE loans SET status = 'returned', return_date = ? WHERE id = ?");
                $stmt->execute([$return_date, $loan_id]);

                $stmt = $pdo->prepare("UPDATE books SET availability_status = 'available' WHERE id = ?");
                $stmt->execute([$loan['book_id']]);

                $message = "Book successfully returned.";
            } elseif ($action === 'extend') {
                $new_due_date = date('Y-m-d', strtotime($loan['due_date'] . ' +2 weeks'));
                $stmt = $pdo->prepare("UPDATE loans SET due_date = ? WHERE id = ?");
                $stmt->execute([$new_due_date, $loan_id]);

                $message = "Loan extended to $new_due_date.";
            } else {
                throw new Exception("Invalid action.");
            }

            $pdo->commit();
            echo json_encode(["message" => $message]);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}
