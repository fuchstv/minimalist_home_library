<?php
require_once 'db.php';
try {
    $pdo->exec("ALTER TABLE books ADD COLUMN signature VARCHAR(100) UNIQUE AFTER cover_image");
    echo "Column 'signature' added successfully.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
