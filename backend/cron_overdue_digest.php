<?php
// backend/cron_overdue_digest.php - Daily Cron for Reminders & Admin Digest
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mail_utils.php';

echo "========================================================\n";
echo "📚 Hausbibliothek Daily Email Cronjob - " . date('Y-m-d H:i:s') . "\n";
echo "========================================================\n";

try {
    // 1. Send Due Date Reminders (Due in exactly 3 days)
    $stmt = $pdo->query("
        SELECT l.id, l.due_date, u.name as user_name, u.email as user_email, b.title as book_title, b.signature
        FROM loans l
        JOIN users u ON l.user_id = u.id
        JOIN books b ON l.book_id = b.id
        WHERE l.status != 'returned' AND l.due_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    ");
    $dueSoon = $stmt->fetchAll();
    echo "Found " . count($dueSoon) . " loan(s) due in 3 days.\n";

    foreach ($dueSoon as $loan) {
        if (!empty($loan['user_email'])) {
            echo " -> Sending due reminder to {$loan['user_email']} for '{$loan['book_title']}'\n";
            sendDueDateReminderEmail($pdo, $loan['user_email'], $loan['user_name'], $loan['book_title'], $loan['signature'], $loan['due_date']);
        }
    }

    // 2. Send Overdue Reminders (Overdue by 1, 7, 14, 21, 28 days)
    $stmt = $pdo->query("
        SELECT l.id, l.due_date, DATEDIFF(CURDATE(), l.due_date) as days_overdue,
               u.name as user_name, u.email as user_email, b.title as book_title, b.signature
        FROM loans l
        JOIN users u ON l.user_id = u.id
        JOIN books b ON l.book_id = b.id
        WHERE l.status != 'returned' AND l.due_date < CURDATE()
    ");
    $allOverdue = $stmt->fetchAll();
    echo "Found " . count($allOverdue) . " total overdue loan(s).\n";

    $overdueRemindersSent = 0;
    foreach ($allOverdue as $loan) {
        $days = (int)$loan['days_overdue'];
        // Send on day 1, 7, 14, 21, 28, or every 14 days thereafter
        if ($days === 1 || $days === 7 || $days === 14 || $days === 21 || $days === 28 || ($days > 28 && $days % 14 === 0)) {
            if (!empty($loan['user_email'])) {
                echo " -> Sending overdue warning ($days days) to {$loan['user_email']} for '{$loan['book_title']}'\n";
                sendOverdueReminderEmail($pdo, $loan['user_email'], $loan['user_name'], $loan['book_title'], $loan['signature'], $loan['due_date'], $days);
                $overdueRemindersSent++;
            }
        }
    }
    echo "Sent $overdueRemindersSent overdue reminder email(s).\n";

    // 3. Upcoming returns (next 3 days) for Admin Digest
    $stmt = $pdo->query("
        SELECT l.id, l.due_date, u.name as user_name, b.title as book_title, b.signature
        FROM loans l
        JOIN users u ON l.user_id = u.id
        JOIN books b ON l.book_id = b.id
        WHERE l.status != 'returned' AND l.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        ORDER BY l.due_date ASC
    ");
    $upcomingLoans = $stmt->fetchAll();

    // 4. New user registrations in past 24h
    $stmt = $pdo->query("
        SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $newUsersCount = (int)$stmt->fetchColumn();

    // 5. Send Admin Daily Digest
    echo " -> Sending Admin Daily Digest...\n";
    sendAdminDailyDigestEmail($pdo, $allOverdue, $upcomingLoans, $newUsersCount);

    echo "✅ Cronjob completed successfully.\n";

} catch (Exception $e) {
    echo "❌ Error in cronjob: " . $e->getMessage() . "\n";
    error_log("[Cron] Daily email job failed: " . $e->getMessage());
}
