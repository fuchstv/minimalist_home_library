<?php
// backend/migrate_mail_and_reset.php
require_once 'db.php';

function migrateMailTables($pdo) {
    try {
        // 1. Password Resets Table
        $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "Table 'password_resets' created or already exists.\n";

        // 2. Email Audit Logs Table
        $pdo->exec("CREATE TABLE IF NOT EXISTS email_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recipient VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            template VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'queued',
            response_code INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_recipient (recipient),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "Table 'email_logs' created or already exists.\n";

    } catch (PDOException $e) {
        echo "Migration Error: " . $e->getMessage() . "\n";
    }
}

if (php_sapi_name() === 'cli') {
    migrateMailTables($pdo);
}
