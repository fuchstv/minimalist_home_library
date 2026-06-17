<?php
require_once 'db.php';
try {
    // Add data_consent column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN data_consent BOOLEAN DEFAULT FALSE AFTER fee_paid");
        echo "Column 'data_consent' added successfully.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column 'data_consent' already exists.\n";
        } else {
            echo "Error adding 'data_consent': " . $e->getMessage() . "\n";
        }
    }

    // Add rules_consent column
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN rules_consent BOOLEAN DEFAULT FALSE AFTER data_consent");
        echo "Column 'rules_consent' added successfully.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "Column 'rules_consent' already exists.\n";
        } else {
            echo "Error adding 'rules_consent': " . $e->getMessage() . "\n";
        }
    }

} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}
