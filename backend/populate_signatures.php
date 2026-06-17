<?php
require_once 'db.php';
require_once 'admin_utils.php'; // I'll move getCategoryAbbreviation and generateSignature here if I want to reuse them

try {
    $stmt = $pdo->query("SELECT id, category FROM books WHERE signature IS NULL OR signature = ''");
    $books = $stmt->fetchAll();

    echo "Found " . count($books) . " books without signatures.\n";

    foreach ($books as $book) {
        $signature = generateSignature($pdo, $book['category']);
        $updateStmt = $pdo->prepare("UPDATE books SET signature = ? WHERE id = ?");
        $updateStmt->execute([$signature, $book['id']]);
        echo "Updated Book ID {$book['id']} with signature {$signature}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
