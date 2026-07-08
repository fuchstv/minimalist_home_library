<?php
function getCategoryAbbreviation($category) {
    $map = [
        'deutsch' => 'AD',
        'belytrystyka_polska' => 'BP',
        'belytrystyka_zagraniczna' => 'BZ',
        'biografie' => 'BI',
        'dzieciece' => 'DZ',
        'fantasy_scifi' => 'FS',
        'historyczne' => 'HI',
        'kryminal_thriller' => 'KT',
        'mlodziezowe_young_adult' => 'MY',
        'poezja' => 'PO',
        'poradniki_popularnonaukowe' => 'PP',
        'reportaze_podroznicze' => 'RP'
    ];
    return $map[$category] ?? strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $category), 0, 2));
}

function generateSignature($pdo, $category) {
    $abbr = getCategoryAbbreviation($category);
    $stmt = $pdo->prepare("SELECT signature FROM books WHERE signature LIKE ? ORDER BY LENGTH(signature) DESC, signature DESC LIMIT 1");
    $stmt->execute([$abbr . '-%']);
    $lastSignature = $stmt->fetchColumn();

    if ($lastSignature) {
        $parts = explode('-', $lastSignature);
        $lastNumber = (int)end($parts);
        $nextNumber = $lastNumber + 1;
    } else {
        $nextNumber = 1;
    }

    return $abbr . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
}

function normalizeIsbn($isbn) {
    if (!$isbn) return null;
    return preg_replace('/[^0-9X]/i', '', $isbn);
}

function findDuplicateBook($pdo, $title, $author, $isbn, $excludeId = null) {
    // 1. Check by ISBN if provided
    $normalizedIsbn = normalizeIsbn($isbn);
    if ($normalizedIsbn) {
        $sql = "SELECT id, title, author, signature FROM books WHERE (REPLACE(REPLACE(isbn, '-', ''), ' ', '') = ?) ";
        $params = [$normalizedIsbn];
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($duplicate) return $duplicate;
    }

    // 2. Check by Title and Author
    if (!empty(trim($title))) {
        $sql = "SELECT id, title, author, signature FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(author)) = LOWER(TRIM(?))";
        $params = [$title, $author];
        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($duplicate) return $duplicate;
    }

    return null;
}
