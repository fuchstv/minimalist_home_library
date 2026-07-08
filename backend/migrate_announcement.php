<?php
require_once 'db.php';

function migrate($pdo) {
    try {
        // Ensure pages table exists (it should, but safety first)
        $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(50) UNIQUE NOT NULL,
            title_de VARCHAR(255),
            title_pl VARCHAR(255),
            content_de TEXT,
            content_pl TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Insert announcement entry if it doesn't exist
        $stmt = $pdo->prepare("INSERT IGNORE INTO pages (slug, title_de, title_pl, content_de, content_pl) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['announcement', 'Globale Ankündigung', 'Ogłoszenie globalne', '', '']);

        if ($stmt->rowCount() > 0) {
            echo "Announcement page entry created successfully.\n";
        } else {
            echo "Announcement page entry already exists or failed to create.\n";
        }

    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

if (php_sapi_name() === 'cli') {
    migrate($pdo);
}
