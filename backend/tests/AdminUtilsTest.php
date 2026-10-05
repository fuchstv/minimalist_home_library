<?php
namespace Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../admin_utils.php';

class AdminUtilsTest extends TestCase {

    #[DataProvider('isbnProvider')]
    public function testNormalizeIsbn(?string $input, ?string $expected): void {
        $this->assertSame($expected, normalizeIsbn($input));
    }

    public static function isbnProvider(): array {
        return [
            'null input' => [null, null],
            'empty string' => ['', null],
            'ISBN-13 with dashes' => ['978-3-16-148410-0', '9783161484100'],
            'ISBN-10 with dashes' => ['0-306-40615-2', '0306406152'],
            'ISBN with spaces' => ['978 3 16 148410 0', '9783161484100'],
            'ISBN-10 with uppercase X check digit' => ['0-8044-2957-X', '080442957X'],
            'ISBN-10 with lowercase x check digit' => ['0-8044-2957-x', '080442957x'],
            'ISBN with mixed formatting and prefix text' => ['ISBN 978-0-596-52068-7!', '9780596520687'],
            'Already clean ISBN-13' => ['9783161484100', '9783161484100'],
        ];
    }
}
