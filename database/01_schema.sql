SET NAMES 'utf8mb4';

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    fee_paid BOOLEAN DEFAULT FALSE,
    data_consent BOOLEAN DEFAULT FALSE,
    rules_consent BOOLEAN DEFAULT FALSE,
    role ENUM('member', 'admin') DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100),
    author VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    publication_year VARCHAR(255),
    publisher VARCHAR(255),
    isbn VARCHAR(255),
    description TEXT,
    cover_image VARCHAR(255),
    signature VARCHAR(100) UNIQUE,
    location VARCHAR(100) DEFAULT 'Katalog SprachCafé',
    availability_status ENUM('available', 'borrowed') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    status ENUM('active', 'returned', 'overdue') DEFAULT 'active',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert a default admin and member user for testing
INSERT INTO users (name, email, role) VALUES 
('Admin User', 'admin@sprachcafe.de', 'admin'),
('Test Member', 'member@sprachcafe.de', 'member')
ON DUPLICATE KEY UPDATE id=id;

CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    title_de VARCHAR(255),
    title_pl VARCHAR(255),
    content_de TEXT,
    content_pl TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO pages (slug, title_de, title_pl, content_de, content_pl) VALUES
('regeln', 'Bibliotheksregeln', 'Regulamin biblioteki', 'Herzlich willkommen in der Bibliothek des SprachCafé Polnisch. Um einen reibungslosen Ablauf und die Freude an unseren Büchern für alle zu gewährleisten, bitten wir um Beachtung der folgenden Regeln:\n\n### Anmeldung\nFür die Nutzung der Bibliothek ist eine einmalige Registrierung erforderlich. Dabei wird eine Gebühr von 10 Euro erhoben.\n\n### Ausleihe\nDie Leihfrist für Bücher beträgt in der Regel 4 Wochen. Eine Verlängerung ist nach Absprache möglich, sofern keine Vormerkung vorliegt.\n\n### Umgang mit Medien\nBitte gehen Sie sorgsam mit den ausgeliehenen Büchern um. Bei Beschädigung oder Verlust ist Ersatz zu leisten.\n\n### Rückgabe\nBücher sind fristgerecht während der Öffnungszeiten des SprachCafés zurückzugeben.', 'Witamy w bibliotece SprachCafé Polnisch. Aby zapewnić sprawne funkcjonowanie i radość z naszych książek dla wszystkich, prosimy o przestrzeganie następujących zasad:\n\n### Rejestracja\nKorzystanie z biblioteki wymaga jednorazowej rejestracji. Pobierana jest przy tym opłata w wysokości 10 euro.\n\n### Wypożyczanie\nOkres wypożyczenia książek wynosi zazwyczaj 4 tygodnie. Przedłużenie istniej możliwe po uzgodnieniu, o ile nie ma rezerwacji.\n\n### Dbanie o media\nProsimy o staranne obchodzenie się z wypożyczonymi książkami. W przypadku uszkodzenia lub zgubienia należy dokonać wymiany lub zwrotu kosztów.\n\n### Zwrot\nKsiążki należy zwracać terminowo w godzinach otwarcia SprachCafé.'),
('datenschutz', 'Datenschutz', 'Ochrona danych', 'Inhalt folgt.', 'Treść wkrótce.'),
('impressum', 'Impressum', 'Impressum', 'Inhalt folgt.', 'Treść wkrötce.'),
('announcement', 'Globale Ankündigung', 'Ogłoszenie globalne', '', '');

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
