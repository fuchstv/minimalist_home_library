<?php
require_once 'db.php';

try {
    $pdo->exec("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE AFTER fee_paid");
    echo "Successfully added is_blocked column to users table.\n";
} catch (PDOException $e) {
    if ($e->getCode() == '42S21' || strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column is_blocked already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
