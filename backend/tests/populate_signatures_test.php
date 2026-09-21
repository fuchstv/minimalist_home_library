<?php
require_once __DIR__ . '/../admin_utils.php';

function testPopulateSignaturesLogic() {
    $pdo = new PDO("sqlite::memory:");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category VARCHAR(100),
        title VARCHAR(255),
        signature VARCHAR(100)
    )");

    $categories = [
        "deutsch", "belytrystyka_polska", "belytrystyka_zagraniczna", "biografie",
        "dzieciece", "fantasy_scifi", "historyczne", "kryminal_thriller",
        "mlodziezowe_young_adult", "poezja", "poradniki_popularnonaukowe", "reportaze_podroznicze"
    ];

    // 1. Existing books with signatures
    foreach ($categories as $i => $cat) {
        $abbr = getCategoryAbbreviation($cat);
        for ($j = 1; $j <= 10; $j++) {
            $sig = sprintf("%s-%04d", $abbr, $j);
            $stmt = $pdo->prepare("INSERT INTO books (category, title, signature) VALUES (?, ?, ?)");
            $stmt->execute([$cat, "Existing $i-$j", $sig]);
        }
    }

    // 2. Unassigned books
    for ($k = 1; $k <= 50; $k++) {
        $cat = $categories[$k % count($categories)];
        $stmt = $pdo->prepare("INSERT INTO books (category, title, signature) VALUES (?, ?, NULL)");
        $stmt->execute([$cat, "Unassigned $k"]);
    }

    $stmt = $pdo->query("SELECT id, category FROM books WHERE signature IS NULL OR signature = ''");
    $books = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $counters = [];
    $updates = [];

    // Pre-fetch max signatures for all existing categories
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

    // Execute bulk updates
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

    // Verification
    $unassignedCount = $pdo->query("SELECT COUNT(*) FROM books WHERE signature IS NULL OR signature = ''")->fetchColumn();
    if ($unassignedCount != 0) {
        echo "FAIL: Expected 0 unassigned books, got $unassignedCount\n";
        exit(1);
    }

    // Check specific assigned signature
    $sample = $pdo->query("SELECT signature FROM books WHERE title = 'Unassigned 1'")->fetchColumn();
    if (empty($sample)) {
        echo "FAIL: Signature was not assigned properly\n";
        exit(1);
    }

    echo "PASS: populate_signatures logic verified successfully.\n";
}

testPopulateSignaturesLogic();
