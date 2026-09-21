<?php
require_once 'db.php';
require_once 'admin_utils.php';

try {
    $stmt = $pdo->query("SELECT id, category FROM books WHERE signature IS NULL OR signature = ''");
    $books = $stmt->fetchAll();

    echo "Found " . count($books) . " books without signatures.\n";

    if (count($books) > 0) {
        $counters = [];
        $updates = [];

        // Pre-fetch highest existing signature numbers for all category prefixes in a single query
        $stmtSig = $pdo->query("SELECT signature FROM books WHERE signature IS NOT NULL AND signature != ''");
        while ($sig = $stmtSig->fetchColumn()) {
            $dashPos = strrpos($sig, '-');
            if ($dashPos !== false) {
                $prefix = substr($sig, 0, $dashPos);
                $num = (int)substr($sig, $dashPos + 1);
                if (!isset($counters[$prefix]) || $num > $counters[$prefix]) {
                    $counters[$prefix] = $num;
                }
            }
        }

        foreach ($books as $book) {
            $abbr = getCategoryAbbreviation($book['category']);

            if (!isset($counters[$abbr])) {
                $counters[$abbr] = 0;
            }

            $counters[$abbr]++;
            $signature = $abbr . '-' . str_pad($counters[$abbr], 4, '0', STR_PAD_LEFT);
            $updates[] = ['id' => $book['id'], 'signature' => $signature];
        }

        // Execute bulk updates in chunks to avoid hitting SQL parameter limits
        $pdo->beginTransaction();
        $chunks = array_chunk($updates, 1000);

        foreach ($chunks as $chunk) {
            $ids = [];
            $cases = [];
            $params = [];

            foreach ($chunk as $u) {
                $ids[] = $u['id'];
                $cases[] = "WHEN id = ? THEN ?";
                $params[] = $u['id'];
                $params[] = $u['signature'];
            }

            $idPlaceholders = implode(',', array_fill(0, count($ids), '?'));
            $sql = "UPDATE books SET signature = CASE " . implode(' ', $cases) . " END WHERE id IN ($idPlaceholders)";

            $stmt = $pdo->prepare($sql);
            $allParams = array_merge($params, $ids);
            $stmt->execute($allParams);
        }
        $pdo->commit();

        echo "Successfully updated " . count($updates) . " books with signatures in bulk.\n";
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
