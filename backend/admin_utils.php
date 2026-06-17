<?php
function getCategoryAbbreviation($category) {
    $map = [
        'Auf Deutsch' => 'AD',
        'Belytrystyka polska' => 'BP',
        'Belytrystyka zagraniczna' => 'BZ',
        'Biografie' => 'BI',
        'Dziecięce' => 'DZ',
        'Fantasy | Sci-fi' => 'FS',
        'Historyczne' => 'HI',
        'Kryminał | Thriller' => 'KT',
        'Młodzieżowe | Young Adult' => 'MY',
        'Poezja' => 'PO',
        'Poradniki | Popularnonaukowe' => 'PP',
        'Reportaże | Podróżnicze' => 'RP'
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
