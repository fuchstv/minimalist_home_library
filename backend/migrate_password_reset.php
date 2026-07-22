<?php
require_once 'db.php';
try {
    // Add must_change_password column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE AFTER is_blocked");
        echo "Column 'must_change_password' added successfully.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column 'must_change_password' already exists.\n";
        } else {
            echo "Error adding 'must_change_password': " . $e->getMessage() . "\n";
        }
    }
} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}
