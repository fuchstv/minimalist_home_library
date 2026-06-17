<?php
// backend/auth.php
require_once 'db.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (strpos($path, '/login') !== false) {
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
    } elseif (strpos($path, '/register') !== false) {
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $phone = $data['phone'] ?? '';

        if (!$name || !$email || !$password) {
            http_response_code(400);
            echo json_encode(["message" => "All fields are required"]);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'member')");
            $stmt->execute([$name, $email, $hash, $phone]);
            echo json_encode(["message" => "User registered successfully"]);
        } catch (\PDOException $e) {
            http_response_code(400);
            echo json_encode(["message" => "Email already exists or invalid data"]);
        }
    } elseif (strpos($path, '/logout') !== false) {
        session_destroy();
        echo json_encode(["message" => "Logout successful"]);
    }
} elseif ($method == 'GET' && strpos($path, '/me') !== false) {
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            echo json_encode(["user" => $user]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Not authenticated"]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Not authenticated"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed"]);
}
