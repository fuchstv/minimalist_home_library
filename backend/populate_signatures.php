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

        foreach ($books as $book) {
            $abbr = getCategoryAbbreviation($book['category']);

            // Initialize counter for this category if not already done
            if (!isset($counters[$abbr])) {
                $stmt2 = $pdo->prepare("SELECT signature FROM books WHERE signature LIKE ? ORDER BY LENGTH(signature) DESC, signature DESC LIMIT 1");
                $stmt2->execute([$abbr . '-%']);
                $lastSignature = $stmt2->fetchColumn();

                if ($lastSignature) {
                    $parts = explode('-', $lastSignature);
                    $counters[$abbr] = (int)end($parts);
                } else {
                    $counters[$abbr] = 0;
                }
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
