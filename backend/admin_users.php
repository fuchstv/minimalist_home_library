<?php
// backend/admin_users.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

// Helper to calculate overdue status dynamically
function checkAndUpdateOverdueLoans($pdo) {
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("UPDATE loans SET status = 'overdue' WHERE due_date < ? AND status = 'active'");
    $stmt->execute([$today]);
}

// Keep status up to date
checkAndUpdateOverdueLoans($pdo);

// Check if path is /api/admin/loans (global loans list)
if (isset($parts[2]) && $parts[2] === 'loans') {
    if ($method === 'GET') {
        try {
            $query = "
                SELECT l.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
                       b.title as book_title, b.author as book_author, b.signature as book_signature
                FROM loans l
                JOIN users u ON l.user_id = u.id
                JOIN books b ON l.book_id = b.id
                ORDER BY l.status DESC, l.due_date ASC
            ";
            $stmt = $pdo->query($query);
            $loans = $stmt->fetchAll();
            echo json_encode(["data" => $loans]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Failed to fetch loans: " . $e->getMessage()]);
        }
        return;
    }
    
    // PUT /api/admin/loans/{loan_id} (global action on loan)
    if (count($parts) > 3 && is_numeric($parts[3])) {
        $loan_id = (int)$parts[3];
        if ($method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? null;
            $due_date = $input['due_date'] ?? null;
            
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("SELECT * FROM loans WHERE id = ? FOR UPDATE");
                $stmt->execute([$loan_id]);
                $loan = $stmt->fetch();
                if (!$loan) {
                    throw new Exception("Loan not found.");
                }
                
                if ($action === 'return') {
                    $return_date = date('Y-m-d');
                    $stmt = $pdo->prepare("UPDATE loans SET status = 'returned', return_date = ? WHERE id = ?");
                    $stmt->execute([$return_date, $loan_id]);
                    
                    $stmt = $pdo->prepare("UPDATE books SET availability_status = 'available' WHERE id = ?");
                    $stmt->execute([$loan['book_id']]);
                    
                    $message = "Book successfully returned.";
                } elseif ($action === 'extend') {
                    if (!$due_date) {
                        $due_date = date('Y-m-d', strtotime($loan['due_date'] . ' +4 weeks'));
                    }
                    $status = (strtotime($due_date) < time()) ? 'overdue' : 'active';
                    $stmt = $pdo->prepare("UPDATE loans SET due_date = ?, status = ? WHERE id = ?");
                    $stmt->execute([$due_date, $status, $loan_id]);
                    
                    $message = "Loan extended to $due_date.";
                } else {
                    throw new Exception("Invalid action.");
                }
                
                $pdo->commit();
                echo json_encode(["message" => $message]);
            } catch (\Exception $e) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(["message" => $e->getMessage()]);
            }
            return;
        }
    }
}

// Check if path is /api/admin/users
if (isset($parts[2]) && $parts[2] === 'users') {
    // GET /api/admin/users
    if (count($parts) === 3) {
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT id, name, email, phone, fee_paid, data_consent, rules_consent, role, created_at FROM users ORDER BY name ASC");
                $users = $stmt->fetchAll();
                echo json_encode(["data" => $users]);
            } catch (\Exception $e) {
                http_response_code(500);
                echo json_encode(["message" => "Failed to fetch users: " . $e->getMessage()]);
            }
            return;
        }
    }
    
    // /api/admin/users/{id}
    if (count($parts) >= 4 && is_numeric($parts[3])) {
        $user_id = (int)$parts[3];
        
        // /api/admin/users/{id}/loans
        if (isset($parts[4]) && $parts[4] === 'loans') {
            if (count($parts) === 5) {
                if ($method === 'GET') {
                    try {
                        $stmt = $pdo->prepare("
                            SELECT l.*, b.title as book_title, b.author as book_author, b.signature as book_signature, b.isbn as book_isbn
                            FROM loans l
                            JOIN books b ON l.book_id = b.id
                            WHERE l.user_id = ?
                            ORDER BY l.status DESC, l.loan_date DESC
                        ");
                        $stmt->execute([$user_id]);
                        $loans = $stmt->fetchAll();
                        echo json_encode(["data" => $loans]);
                    } catch (\Exception $e) {
                        http_response_code(500);
                        echo json_encode(["message" => "Failed to fetch user loans: " . $e->getMessage()]);
                    }
                    return;
                } elseif ($method === 'POST') {
                    // Lend a book to user
                    $input = json_decode(file_get_contents('php://input'), true);
                    $book_id = $input['book_id'] ?? null;
                    $due_date = $input['due_date'] ?? null;
                    
                    if (!$book_id) {
                        http_response_code(400);
                        echo json_encode(["message" => "Book ID is required."]);
                        return;
                    }
                    
                    $pdo->beginTransaction();
                    try {
                        // Check if book exists and is available
                        $stmt = $pdo->prepare("SELECT availability_status FROM books WHERE id = ? FOR UPDATE");
                        $stmt->execute([$book_id]);
                        $book = $stmt->fetch();
                        
                        if (!$book) {
                            throw new Exception("Book not found.");
                        }
                        if ($book['availability_status'] !== 'available') {
                            throw new Exception("Book is not available for borrowing.");
                        }
                        
                        $loan_date = date('Y-m-d');
                        if (!$due_date) {
                            $due_date = date('Y-m-d', strtotime('+4 weeks')); // Default to 4 weeks
                        }
                        
                        $stmt = $pdo->prepare("INSERT INTO loans (book_id, user_id, loan_date, due_date, status) VALUES (?, ?, ?, ?, 'active')");
                        $stmt->execute([$book_id, $user_id, $loan_date, $due_date]);
                        
                        $stmt = $pdo->prepare("UPDATE books SET availability_status = 'borrowed' WHERE id = ?");
                        $stmt->execute([$book_id]);
                        
                        $pdo->commit();
                        echo json_encode(["message" => "Book successfully borrowed.", "due_date" => $due_date]);
                    } catch (\Exception $e) {
                        $pdo->rollBack();
                        http_response_code(400);
                        echo json_encode(["message" => $e->getMessage()]);
                    }
                    return;
                }
            }
            
            // /api/admin/users/{id}/loans/{loan_id}
            if (count($parts) === 6 && is_numeric($parts[5])) {
                $loan_id = (int)$parts[5];
                if ($method === 'PUT') {
                    $input = json_decode(file_get_contents('php://input'), true);
                    $action = $input['action'] ?? null;
                    $due_date = $input['due_date'] ?? null;
                    
                    $pdo->beginTransaction();
                    try {
                        $stmt = $pdo->prepare("SELECT * FROM loans WHERE id = ? AND user_id = ? FOR UPDATE");
                        $stmt->execute([$loan_id, $user_id]);
                        $loan = $stmt->fetch();
                        if (!$loan) {
                            throw new Exception("Active loan not found for this user.");
                        }
                        
                        if ($action === 'return') {
                            $return_date = date('Y-m-d');
                            $stmt = $pdo->prepare("UPDATE loans SET status = 'returned', return_date = ? WHERE id = ?");
                            $stmt->execute([$return_date, $loan_id]);
                            
                            $stmt = $pdo->prepare("UPDATE books SET availability_status = 'available' WHERE id = ?");
                            $stmt->execute([$loan['book_id']]);
                            
                            $message = "Book successfully returned.";
                        } elseif ($action === 'extend') {
                            if (!$due_date) {
                                $due_date = date('Y-m-d', strtotime($loan['due_date'] . ' +4 weeks'));
                            }
                            $status = (strtotime($due_date) < time()) ? 'overdue' : 'active';
                            $stmt = $pdo->prepare("UPDATE loans SET due_date = ?, status = ? WHERE id = ?");
                            $stmt->execute([$due_date, $status, $loan_id]);
                            
                            $message = "Loan extended to $due_date.";
                        } else {
                            throw new Exception("Invalid action.");
                        }
                        
                        $pdo->commit();
                        echo json_encode(["message" => $message]);
                    } catch (\Exception $e) {
                        $pdo->rollBack();
                        http_response_code(400);
                        echo json_encode(["message" => $e->getMessage()]);
                    }
                    return;
                }
            }
        }
        
        // Single user operations: GET / PUT
        if (count($parts) === 4) {
            if ($method === 'GET') {
                try {
                    $stmt = $pdo->prepare("SELECT id, name, email, phone, fee_paid, data_consent, rules_consent, role, created_at FROM users WHERE id = ?");
                    $stmt->execute([$user_id]);
                    $user = $stmt->fetch();
                    if ($user) {
                        echo json_encode($user);
                    } else {
                        http_response_code(404);
                        echo json_encode(["message" => "User not found."]);
                    }
                } catch (\Exception $e) {
                    http_response_code(500);
                    echo json_encode(["message" => "Failed to fetch user: " . $e->getMessage()]);
                }
                return;
            } elseif ($method === 'PUT') {
                $input = json_decode(file_get_contents('php://input'), true);
                
                $name = $input['name'] ?? '';
                $email = $input['email'] ?? '';
                $phone = $input['phone'] ?? '';
                $role = $input['role'] ?? 'member';
                $fee_paid = isset($input['fee_paid']) ? (int)$input['fee_paid'] : 0;
                $data_consent = isset($input['data_consent']) ? (int)$input['data_consent'] : 0;
                $rules_consent = isset($input['rules_consent']) ? (int)$input['rules_consent'] : 0;
                
                if (empty($name) || empty($email)) {
                    http_response_code(400);
                    echo json_encode(["message" => "Name and Email are required."]);
                    return;
                }
                
                try {
                    $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, phone = ?, role = ?, fee_paid = ?, data_consent = ?, rules_consent = ? WHERE id = ?");
                    $stmt->execute([$name, $email, $phone, $role, $fee_paid, $data_consent, $rules_consent, $user_id]);
                    echo json_encode(["message" => "User updated successfully."]);
                } catch (\Exception $e) {
                    http_response_code(400);
                    echo json_encode(["message" => "Failed to update user: " . $e->getMessage()]);
                }
                return;
            }
        }
    }
}
