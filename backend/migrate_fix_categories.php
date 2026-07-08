<?php
require_once 'db.php';

// New mapping based on normalized slugs in frontend/src/locales/*.json
$mapping = [
    'Auf Deutsch' => 'deutsch',
    'Belytrystyka polska' => 'belytrystyka_polska',
    'Belytrystyka zagraniczna' => 'belytrystyka_zagraniczna',
    'Dziecięce' => 'dzieciece',
    'Fantasy | Sci-fi' => 'fantasy_scifi',
    'Historyczne' => 'historyczne',
    'Kryminał | Thriller' => 'kryminal_thriller',
    'Młodzieżowe | Young Adult' => 'mlodziezowe_young_adult',
    'Biografie' => 'biografie',
    'Poezja' => 'poezja',
    'Poradniki | Popularnonaukowe' => 'poradniki_popularnonaukowe',
    'Reportaże | Podróżnicze' => 'reportaze_podroznicze'
];

// Handle previous potentially failed migration with special characters
$mapping['kryminał_thriller'] = 'kryminal_thriller';
$mapping['młodziezowe_young_adult'] = 'mlodziezowe_young_adult';

try {
    $pdo->beginTransaction();

    foreach ($mapping as $old => $new) {
        $stmt = $pdo->prepare("UPDATE books SET category = ? WHERE category = ?");
        $stmt->execute([$new, $old]);
        echo "Updated [" . $old . "] to [" . $new . "]: " . $stmt->rowCount() . " rows affected.\n";
    }

    $pdo->commit();
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Migration failed: " . $e->getMessage() . "\n";
}
