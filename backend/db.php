<?php
// backend/db.php
require_once 'error_utils.php';

$dbPath = getenv('DB_PATH') ?: __DIR__ . '/data/database.sqlite';
$dsn = "sqlite:" . $dbPath;
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, null, null, $options);
    $pdo->exec("PRAGMA foreign_keys = ON;");
    $pdo->exec("PRAGMA journal_mode = WAL;");
    $pdo->exec("PRAGMA synchronous = NORMAL;");
    $pdo->exec("PRAGMA busy_timeout = 5000;");
} catch (\PDOException $e) {
    handleDbError($e, "Database connection failed");
    die();
}

