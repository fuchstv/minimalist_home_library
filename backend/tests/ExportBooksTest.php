<?php
namespace Tests;

use PHPUnit\Framework\TestCase;

class ExportBooksTest extends TestCase {

    private \PDO $pdo;

    protected function setUp(): void {
        parent::setUp();
        putenv('APP_ENV=testing');
        $_SESSION = [];
        $_GET = [];
        $_SERVER['REQUEST_METHOD'] = 'GET';
        http_response_code(200);

        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('CREATE TABLE books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            author TEXT,
            isbn TEXT,
            category TEXT,
            publication_year TEXT,
            publisher TEXT,
            description TEXT,
            cover_image TEXT,
            location TEXT,
            availability_status TEXT,
            signature TEXT,
            created_at TEXT
        )');
    }

    protected function tearDown(): void {
        parent::tearDown();
        $_SESSION = [];
        $_GET = [];
        http_response_code(200);
    }

    public function testExportBooksFailsWhenUnauthenticated(): void {
        unset($_SESSION['user_id']);
        $pdo = $this->pdo;

        ob_start();
        include __DIR__ . '/../export_books.php';
        $output = ob_get_clean();

        $this->assertSame(401, http_response_code());
        $data = json_decode($output, true);
        $this->assertIsArray($data);
        $this->assertSame('Unauthorized', $data['message']);
    }

    public function testExportBooksFailsWhenMethodNotAllowed(): void {
        $_SESSION['user_id'] = 1;
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $pdo = $this->pdo;

        ob_start();
        include __DIR__ . '/../export_books.php';
        $output = ob_get_clean();

        $this->assertSame(405, http_response_code());
        $data = json_decode($output, true);
        $this->assertIsArray($data);
        $this->assertSame('Method not allowed. Only GET is supported.', $data['message']);
    }

    public function testExportBooksSucceedsWhenAuthenticated(): void {
        $_SESSION['user_id'] = 1;
        $_SERVER['REQUEST_METHOD'] = 'GET';

        $stmt = $this->pdo->prepare('INSERT INTO books (title, author, isbn, category) VALUES (?, ?, ?, ?)');
        $stmt->execute(['Test Title', 'Test Author', '1234567890', 'fiction']);
        $pdo = $this->pdo;

        ob_start();
        include __DIR__ . '/../export_books.php';
        $output = ob_get_clean();

        $this->assertSame(200, http_response_code());
        $data = json_decode($output, true);
        $this->assertIsArray($data);
        $this->assertSame('success', $data['status']);
        $this->assertCount(1, $data['data']);
        $this->assertSame('Test Title', $data['data'][0]['title']);
    }
}
