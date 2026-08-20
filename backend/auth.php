<?php
// backend/auth.php
require_once 'db.php';
require_once 'error_utils.php';
require_once 'mail_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (strpos($path, '/auth/login') !== false) {
        try {
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';

            $stmt = $pdo->prepare("SELECT id, name, email, password_hash, role, fee_paid, is_blocked, must_change_password FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                if (!session_regenerate_id(true)) {
                    http_response_code(500);
                    echo json_encode(["message" => "Session regeneration failed"]);
                    return;
                }
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_role'] = $user['role'];
                echo json_encode([
                    "message" => "Login successful",
                    "user" => [
                        "id" => (int)$user['id'],
                        "name" => $user['name'],
                        "email" => $user['email'],
                        "role" => $user['role'],
                        "fee_paid" => (int)$user['fee_paid'],
                        "is_blocked" => (int)$user['is_blocked'],
                        "must_change_password" => (int)($user['must_change_password'] ?? 0)
                    ],
                    "csrfToken" => generateCsrfToken()
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Invalid credentials"]);
            }
        } catch (\PDOException $e) {
            handleException($e, "Login failed");
        }
    } elseif (strpos($path, '/auth/change-password') !== false) {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(["message" => "Not authenticated"]);
            return;
        }
        $newPassword = $data['new_password'] ?? ($data['password'] ?? '');
        if (strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode(["message" => "Password must be at least 8 characters long"]);
            return;
        }
        try {
            $hash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?");
            $stmt->execute([$hash, $_SESSION['user_id']]);
            echo json_encode(["message" => "Password changed successfully"]);
        } catch (\PDOException $e) {
            handleException($e, "Failed to change password");
        }
    } elseif (strpos($path, '/auth/forgot-password') !== false) {
        $email = trim($data['email'] ?? '');
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["message" => "Please provide a valid email address"]);
            return;
        }
        try {
            $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                // Invalidate existing unused tokens for this email
                $stmt = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE email = ? AND used = 0");
                $stmt->execute([$email]);

                // Generate secure random 64-char token (valid 1 hour)
                $token = bin2hex(random_bytes(32));
                $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

                $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
                $stmt->execute([$email, $token, $expiresAt]);

                // Send email via Power Automate M365
                sendPasswordResetEmail($pdo, $email, $user['name'], $token);
            }

            // Always respond success to prevent user enumeration
            echo json_encode([
                "message" => "If the email is registered, a password reset link has been sent."
            ]);
        } catch (\PDOException $e) {
            handleException($e, "Password reset request failed");
        }
    } elseif (strpos($path, '/auth/reset-password') !== false) {
        $token = trim($data['token'] ?? '');
        $newPassword = $data['password'] ?? '';

        if (!$token || strlen($newPassword) < 8) {
            http_response_code(400);
            echo json_encode(["message" => "Valid token and a minimum 8-character password are required"]);
            return;
        }

        try {
            $stmt = $pdo->prepare("SELECT email FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()");
            $stmt->execute([$token]);
            $reset = $stmt->fetch();

            if (!$reset) {
                http_response_code(400);
                echo json_encode(["message" => "Invalid or expired password reset link."]);
                return;
            }

            $email = $reset['email'];
            $hash = password_hash($newPassword, PASSWORD_DEFAULT);

            // Update user password and clear must_change_password
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE email = ?");
            $stmt->execute([$hash, $email]);

            // Mark token as used
            $stmt = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
            $stmt->execute([$token]);

            echo json_encode(["message" => "Password has been successfully reset. You can now log in."]);
        } catch (\PDOException $e) {
            handleException($e, "Failed to reset password");
        }
    } elseif (strpos($path, '/auth/register') !== false) {
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $phone = $data['phone'] ?? '';
        $acceptData = $data['acceptData'] ?? false;
        $acceptRules = $data['acceptRules'] ?? false;

        if (!$name || !$email || !$password || !$phone) {
            http_response_code(400);
            echo json_encode(["message" => "All fields are required"]);
            return;
        }

        if (strlen($password) < 8) {
            http_response_code(400);
            echo json_encode(["message" => "Password must be at least 8 characters long"]);
            return;
        }

        if (!$acceptData || !$acceptRules) {
            http_response_code(400);
            echo json_encode(["message" => "Data and rules agreements are mandatory"]);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone, data_consent, rules_consent, role) VALUES (?, ?, ?, ?, ?, ?, 'member')");
            $stmt->execute([$name, $email, $hash, $phone, $acceptData ? 1 : 0, $acceptRules ? 1 : 0]);

            // Trigger Welcome email and Admin notification via Power Automate
            sendWelcomeEmail($pdo, $email, $name);
            sendAdminNewUserAlert($pdo, $name, $email, $phone);

            echo json_encode(["message" => "User registered successfully"]);
        } catch (\PDOException $e) {
            if ($e instanceof PDOException && $e->getCode() == 23000) {
                 http_response_code(400);
                 echo json_encode(["message" => "Email already exists"]);
            } else {
                 handleException($e, "Registration failed");
            }
        }
    } elseif (strpos($path, '/auth/logout') !== false) {
        session_destroy();
        echo json_encode(["message" => "Logout successful"]);
    }
} elseif ($method == 'GET' && strpos($path, '/auth/me') !== false) {
    if (isset($_SESSION['user_id'])) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, email, role, fee_paid, is_blocked, must_change_password FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                $user['id'] = (int)$user['id'];
                $user['fee_paid'] = (int)$user['fee_paid'];
                $user['is_blocked'] = (int)$user['is_blocked'];
                $user['must_change_password'] = (int)($user['must_change_password'] ?? 0);
                echo json_encode([
                    "user" => $user,
                    "csrfToken" => generateCsrfToken()
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Not authenticated"]);
            }
        } catch (\PDOException $e) {
            handleException($e, "Failed to fetch user info");
        }
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Not authenticated"]);
    }
}
