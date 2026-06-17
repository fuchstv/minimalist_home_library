<?php
require_once 'db.php';

function migrate($pdo) {
    try {
        // Create pages table
        $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(50) UNIQUE NOT NULL,
            title_de VARCHAR(255),
            title_pl VARCHAR(255),
            content_de TEXT,
            content_pl TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        echo "Table 'pages' created or already exists.\n";

        // Initial data for 'regeln'
        $regeln_de = "Herzlich willkommen in der Bibliothek des SprachCafé Polnisch. Um einen reibungslosen Ablauf und die Freude an unseren Büchern für alle zu gewährleisten, bitten wir um Beachtung der folgenden Regeln:\n\n### Anmeldung\nFür die Nutzung der Bibliothek ist eine einmalige Registrierung erforderlich. Dabei wird eine Gebühr von 10 Euro erhoben.\n\n### Ausleihe\nDie Leihfrist für Bücher beträgt in der Regel 4 Wochen. Eine Verlängerung ist nach Absprache möglich, sofern keine Vormerkung vorliegt.\n\n### Umgang mit Medien\nBitte gehen Sie sorgsam mit den ausgeliehenen Büchern um. Bei Beschädigung oder Verlust ist Ersatz zu leisten.\n\n### Rückgabe\nBücher sind fristgerecht während der Öffnungszeiten des SprachCafés zurückzugeben.";

        $regeln_pl = "Witamy w bibliotece SprachCafé Polnisch. Aby zapewnić sprawne funkcjonowanie i radość z naszych książek dla wszystkich, prosimy o przestrzeganie następujących zasad:\n\n### Rejestracja\nKorzystanie z biblioteki wymaga jednorazowej rejestracji. Pobierana jest przy tym opłata w wysokości 10 euro.\n\n### Wypożyczanie\nOkres wypożyczenia książek wynosi zazwyczaj 4 tygodnie. Przedłużenie istniej możliwe po uzgodnieniu, o ile nie ma rezerwacji.\n\n### Dbanie o media\nProsimy o staranne obchodzenie się z wypożyczonymi książkami. W przypadku uszkodzenia lub zgubienia należy dokonać wymiany lub zwrotu kosztów.\n\n### Zwrot\nKsiążki należy zwracać terminowo w godzinach otwarcia SprachCafé.";

        $initial_pages = [
            [
                'slug' => 'regeln',
                'title_de' => 'Bibliotheksregeln',
                'title_pl' => 'Regulamin biblioteki',
                'content_de' => $regeln_de,
                'content_pl' => $regeln_pl
            ],
            [
                'slug' => 'datenschutz',
                'title_de' => 'Datenschutz',
                'title_pl' => 'Ochrona danych',
                'content_de' => 'Inhalt folgt.',
                'content_pl' => 'Treść wkrótce.'
            ],
            [
                'slug' => 'impressum',
                'title_de' => 'Impressum',
                'title_pl' => 'Impressum',
                'content_de' => 'Inhalt folgt.',
                'content_pl' => 'Treść wkrótce.'
            ]
        ];

        $stmt = $pdo->prepare("INSERT IGNORE INTO pages (slug, title_de, title_pl, content_de, content_pl) VALUES (?, ?, ?, ?, ?)");
        foreach ($initial_pages as $page) {
            $stmt->execute([$page['slug'], $page['title_de'], $page['title_pl'], $page['content_de'], $page['content_pl']]);
        }

        echo "Initial pages seeded.\n";

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
             $pdo->rollBack();
        }
        echo "Error: " . $e->getMessage() . "\n";
    }
}

if (php_sapi_name() === 'cli') {
    migrate($pdo);
}
