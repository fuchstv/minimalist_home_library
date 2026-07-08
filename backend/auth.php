<?php
// backend/auth.php
require_once 'db.php';
require_once 'error_utils.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (strpos($path, '/auth/login') !== false) {
        try {
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';

            $stmt = $pdo->prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_role'] = $user['role'];
                echo json_encode([
                    "message" => "Login successful",
                    "user" => [
                        "id" => $user['id'],
                        "name" => $user['name'],
                        "email" => $user['email'],
                        "role" => $user['role']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Invalid credentials"]);
            }
        } catch (\Exception $e) {
            handleException($e, "Login failed");
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

        if (!$acceptData || !$acceptRules) {
            http_response_code(400);
            echo json_encode(["message" => "Data and rules agreements are mandatory"]);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone, data_consent, rules_consent, role) VALUES (?, ?, ?, ?, ?, ?, 'member')");
            $stmt->execute([$name, $email, $hash, $phone, $acceptData ? 1 : 0, $acceptRules ? 1 : 0]);
            echo json_encode(["message" => "User registered successfully"]);
        } catch (\Exception $e) {
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
            $stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                echo json_encode(["user" => $user]);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Not authenticated"]);
            }
        } catch (\Exception $e) {
            handleException($e, "Failed to fetch user info");
        }
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Not authenticated"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed"]);
}
