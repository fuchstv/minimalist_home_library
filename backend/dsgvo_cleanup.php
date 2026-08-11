<?php
/**
 * CLI Script for DSGVO Inactive Account Purging & Loan Anonymization
 * 
 * Usage:
 *   php dsgvo_cleanup.php --dry-run
 *   php dsgvo_cleanup.php --execute
 */

if (php_sapi_name() !== 'cli') {
    die("This script can only be run from the command line.\n");
}

require_once __DIR__ . '/db.php';

$options = getopt('', ['dry-run', 'execute']);
$isDryRun = !isset($options['execute']);

echo "====================================================================\n";
echo "  DSGVO Inactive Account Cleanup Tool (hausbibliothek.org)\n";
echo "  Mode: " . ($isDryRun ? "DRY-RUN (Simulation Only)" : "EXECUTE (Permanent Deletion)") . "\n";
echo "====================================================================\n\n";

try {
    // 24 Months Inactivity Query (No active loans, no loan activity in 24 months, account created >= 24 months ago)
    $sql = "
        SELECT u.id, u.name, u.email, u.created_at
        FROM users u
        WHERE u.role != 'admin'
          AND u.created_at <= DATE_SUB(NOW(), INTERVAL 24 MONTH)
          AND NOT EXISTS (
              SELECT 1 FROM loans l 
              WHERE l.user_id = u.id AND (l.status != 'returned' OR l.loan_date >= DATE_SUB(NOW(), INTERVAL 24 MONTH))
          )
    ";
    $stmt = $pdo->query($sql);
    $candidates = $stmt->fetchAll();

    $count = count($candidates);
    echo "Found $count candidate account(s) for DSGVO purging (24+ months inactivity):\n";

    if ($count === 0) {
        echo "✓ No inactive accounts found. Cleanup complete.\n";
        exit(0);
    }

    foreach ($candidates as $cand) {
        echo " - [ID {$cand['id']}] {$cand['name']} ({$cand['email']}) - Registered: {$cand['created_at']}\n";
    }

    if ($isDryRun) {
        echo "\nℹ️ DRY-RUN complete. No data was deleted. Run with --execute to perform purging.\n";
        exit(0);
    }

    echo "\n⚠️ Executing DSGVO Account Purging & Loan Anonymization...\n";
    $purged = 0;
    $pdo->beginTransaction();

    foreach ($candidates as $cand) {
        $uid = $cand['id'];
        
        // 1. Anonymize loan history (preserve book borrow counts, remove user link)
        $stmtLoans = $pdo->prepare("UPDATE loans SET user_id = NULL WHERE user_id = ?");
        $stmtLoans->execute([$uid]);

        // 2. Remove pending reservations & notifications
        $pdo->prepare("DELETE FROM reservations WHERE user_id = ?")->execute([$uid]);
        $pdo->prepare("DELETE FROM notifications WHERE user_id = ?")->execute([$uid]);

        // 3. Delete user account record
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$uid]);
        
        $purged++;
    }

    $pdo->commit();
    echo "✓ Successfully purged $purged account(s) and anonymized historical loan records according to DSGVO Art. 17 & 5(1)(e).\n";

} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "❌ Error during DSGVO cleanup: " . $e->getMessage() . "\n";
    exit(1);
}
