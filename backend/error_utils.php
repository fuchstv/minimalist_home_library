<?php
// backend/error_utils.php

function sendGenericError($exception, $message = "Internal Server Error", $code = 500) {
    error_log("Error: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine() . "\nStack trace:\n" . $exception->getTraceAsString());
    if (!headers_sent()) {
        http_response_code($code);
    }
    echo json_encode(["message" => $message]);
}

function handleDbError($exception, $message = "Database Error") {
    sendGenericError($exception, $message, 500);
}

/**
 * Handles exceptions by distinguishing between PDOExceptions (leaky)
 * and regular Exceptions (usually business logic).
 */
function handleException($e, $genericMessage = "An error occurred") {
    if ($e instanceof PDOException) {
        handleDbError($e, $genericMessage);
    } else {
        // Business logic or validation errors
        error_log("Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        if (http_response_code() === 200) {
            http_response_code(400);
        }
        echo json_encode(["message" => $e->getMessage()]);
    }
}
