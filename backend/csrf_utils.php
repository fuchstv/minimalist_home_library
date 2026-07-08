<?php
// backend/csrf_utils.php

/**
 * Generates a CSRF token and stores it in the session if not already present.
 * @return string The CSRF token.
 */
function generateCsrfToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verifies the provided CSRF token against the one stored in the session.
 * @param string|null $token The token to verify.
 * @return bool True if the token is valid, false otherwise.
 */
function verifyCsrfToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!isset($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}
