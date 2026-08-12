<?php
// backend/payments.php
require_once 'db.php';
require_once 'error_utils.php';
require_once 'notification_utils.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$user = $_SESSION['user'] ?? null;

if (!$user) {
    http_response_code(401);
    echo json_encode(["message" => "Unauthorized. Please log in."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('/^\/api/', '', $request_uri);
$parts = explode('/', trim($path, '/'));

// Handle /payments
if ($parts[0] === 'payments') {
    // 1. Submit Payment (POST /api/payments)
    if ($method === 'POST' && count($parts) === 1) {
        $input = json_decode(file_get_contents('php://input'), true);
        $amount = isset($input['amount']) ? (float)$input['amount'] : 10.00;
        $payment_method = !empty($input['payment_method']) ? trim($input['payment_method']) : 'paypal';
        $comment = !empty($input['comment']) ? trim($input['comment']) : '10 Euro für Bibliothekskonto';

        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "Ungültiger Betrag."]);
            exit();
        }

        $pdo->beginTransaction();
        try {
            $user_id = (int)$user['id'];
            $is_simulation = ($payment_method === 'simulation');
            $status = $is_simulation ? 'completed' : 'pending';

            $stmt = $pdo->prepare("INSERT INTO payments (user_id, amount, payment_method, comment, status) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$user_id, $amount, $payment_method, $comment, $status]);
            $payment_id = $pdo->lastInsertId();

            if ($is_simulation) {
                // Instantly activate user fee status
                $stmtUser = $pdo->prepare("UPDATE users SET fee_paid = 1 WHERE id = ?");
                $stmtUser->execute([$user_id]);
                $_SESSION['user']['fee_paid'] = 1;

                createNotification($pdo, $user_id, "Ihre Zahlung von " . number_format($amount, 2, ',', '.') . " € wurde erfolgreich verbucht. Ihr Bibliothekskonto ist nun vollständig aktiviert!");
                
                $pdo->commit();
                echo json_encode([
                    "message" => "Zahlung erfolgreich verbucht! Ihr Gebührenstatus ist nun 'Gebühr bezahlt'.",
                    "fee_paid" => true,
                    "payment_id" => $payment_id
                ]);
            } else {
                // Pending manual Buchhalter / Admin confirmation
                createNotification($pdo, $user_id, "Ihre Zahlungsanfrage über " . number_format($amount, 2, ',', '.') . " € ('" . htmlspecialchars($comment) . "') wurde eingereicht und wird vom SprachCafé Buchhalter geprüft.");
                
                // Notify admins
                $stmtAdmins = $pdo->query("SELECT id FROM users WHERE role = 'admin'");
                while ($adminRow = $stmtAdmins->fetch()) {
                    createNotification($pdo, (int)$adminRow['id'], "Neuer Zahlungseingang (" . number_format($amount, 2, ',', '.') . " €) von " . htmlspecialchars($user['name']) . " zur Prüfung durch den Buchhalter eingegangen.");
                }

                $pdo->commit();
                echo json_encode([
                    "message" => "Zahlung erfolgreich eingereicht! Der Buchhalter wird Ihre Zahlung prüfen und das Konto aktivieren.",
                    "fee_paid" => false,
                    "payment_id" => $payment_id
                ]);
            }
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            handleException($e, "Fehler bei der Zahlungsverarbeitung");
        }
        exit();
    }

    // 2. Fetch Payments (GET /api/payments)
    if ($method === 'GET' && count($parts) === 1) {
        try {
            if ($user['role'] === 'admin') {
                $stmt = $pdo->query("
                    SELECT p.*, u.name as user_name, u.email as user_email 
                    FROM payments p 
                    JOIN users u ON p.user_id = u.id 
                    ORDER BY p.created_at DESC
                ");
                $payments = $stmt->fetchAll();
            } else {
                $stmt = $pdo->prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC");
                $stmt->execute([(int)$user['id']]);
                $payments = $stmt->fetchAll();
            }
            echo json_encode(["data" => $payments]);
        } catch (\PDOException $e) {
            handleException($e, "Fehler beim Laden der Zahlungen");
        }
        exit();
    }

    // 3. Confirm / Reject Payment (PUT /api/payments/{id}) - Admin Only
    if ($method === 'PUT' && count($parts) === 2 && is_numeric($parts[1])) {
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["message" => "Zugriff verweigert. Nur Administratoren / Buchhalter dürfen Zahlungen bestätigen."]);
            exit();
        }

        $payment_id = (int)$parts[1];
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'confirm';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM payments WHERE id = ? FOR UPDATE");
            $stmt->execute([$payment_id]);
            $payment = $stmt->fetch();

            if (!$payment) {
                throw new Exception("Zahlungseintrag nicht gefunden.");
            }

            $target_user_id = (int)$payment['user_id'];

            if ($action === 'confirm') {
                $stmtUpdate = $pdo->prepare("UPDATE payments SET status = 'completed' WHERE id = ?");
                $stmtUpdate->execute([$payment_id]);

                $stmtUser = $pdo->prepare("UPDATE users SET fee_paid = 1 WHERE id = ?");
                $stmtUser->execute([$target_user_id]);

                createNotification($pdo, $target_user_id, "Ihre Bibliotheks-Mitgliedsgebühr (" . number_format($payment['amount'], 2, ',', '.') . " €) wurde vom Buchhalter des SprachCafé Polnisch geprüft und verbucht. Ihr Status wurde auf 'Gebühr bezahlt' gesetzt!");
                
                $pdo->commit();
                echo json_encode(["message" => "Zahlung erfolgreich vom Buchhalter bestätigt. Mitgliedsstatus auf 'Gebühr bezahlt' gesetzt."]);
            } elseif ($action === 'reject') {
                $stmtUpdate = $pdo->prepare("UPDATE payments SET status = 'rejected' WHERE id = ?");
                $stmtUpdate->execute([$payment_id]);

                createNotification($pdo, $target_user_id, "Ihre Zahlungsanforderung (" . number_format($payment['amount'], 2, ',', '.') . " €) konnte vom Buchhalter nicht verifiziert werden. Bitte kontaktieren Sie das SprachCafé Team.");

                $pdo->commit();
                echo json_encode(["message" => "Zahlung abgelehnt."]);
            } else {
                throw new Exception("Ungültige Aktion.");
            }
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            handleException($e, "Fehler bei der Zahlungsbestätigung");
        }
        exit();
    }
}
