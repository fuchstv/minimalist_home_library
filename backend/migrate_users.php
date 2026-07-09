<?php
require_once 'db.php';
try {
    // Add phone column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER password_hash");
        echo "Column 'phone' added successfully.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column 'phone' already exists.\n";
        } else {
            echo "Error adding 'phone': " . $e->getMessage() . "\n";
        }
    }

    // Add fee_paid column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN fee_paid BOOLEAN DEFAULT FALSE AFTER phone");
        echo "Column 'fee_paid' added successfully.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column 'fee_paid' already exists.\n";
        } else {
            echo "Error adding 'fee_paid': " . $e->getMessage() . "\n";
        }
    }

} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}

// Add is_blocked column
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE AFTER fee_paid");
    echo "Column 'is_blocked' added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'is_blocked' already exists.\n";
    } else {
        echo "Error adding 'is_blocked': " . $e->getMessage() . "\n";
    }
}
