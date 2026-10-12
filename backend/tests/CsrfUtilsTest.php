<?php
namespace Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../csrf_utils.php';

class CsrfUtilsTest extends TestCase {

    protected function setUp(): void {
        parent::setUp();
        // Reset $_SESSION before each test
        $_SESSION = [];
    }

    protected function tearDown(): void {
        parent::tearDown();
        $_SESSION = [];
    }

    public function testGenerateCsrfTokenCreatesHex64StringAndStoresInSession(): void {
        $token = generateCsrfToken();

        $this->assertNotEmpty($token);
        $this->assertSame(64, strlen($token));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $this->assertArrayHasKey('csrf_token', $_SESSION);
        $this->assertSame($token, $_SESSION['csrf_token']);
    }

    public function testGenerateCsrfTokenReturnsExistingTokenIfPresent(): void {
        $existingToken = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        $_SESSION['csrf_token'] = $existingToken;

        $token = generateCsrfToken();

        $this->assertSame($existingToken, $token);
        $this->assertSame($existingToken, $_SESSION['csrf_token']);
    }

    public function testVerifyCsrfTokenReturnsTrueForMatchingToken(): void {
        $token = generateCsrfToken();

        $this->assertTrue(verifyCsrfToken($token));
    }

    public function testVerifyCsrfTokenReturnsFalseForMismatchingToken(): void {
        generateCsrfToken();

        $this->assertFalse(verifyCsrfToken('invalid_token_value_1234567890abcdef1234567890abcdef1234567890'));
    }

    #[DataProvider('invalidTokenProvider')]
    public function testVerifyCsrfTokenReturnsFalseForInvalidInputs(?string $token): void {
        generateCsrfToken();

        $this->assertFalse(verifyCsrfToken($token));
    }

    public static function invalidTokenProvider(): array {
        return [
            'null token' => [null],
            'empty string token' => [''],
        ];
    }

    public function testVerifyCsrfTokenReturnsFalseWhenNoSessionTokenSet(): void {
        unset($_SESSION['csrf_token']);

        $this->assertFalse(verifyCsrfToken('some_token'));
    }
}
