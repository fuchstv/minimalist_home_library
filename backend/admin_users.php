<?php
// backend/admin_users.php (updated for error handling)
require_once 'error_utils.php';

// Check if path is /admin/loans
if (isset($parts[1]) && $parts[1] === 'loans') {
    if (count($parts) === 2) {
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("
                    SELECT l.id, l.book_id, l.user_id, l.loan_date, l.due_date, l.return_date,
                           CASE
                               WHEN l.status != 'returned' AND l.due_date < CURDATE() THEN 'overdue'
                               ELSE l.status
                           END as status,
                           b.title as book_title, b.author as book_author, b.signature as book_signature, b.isbn as book_isbn,
                           u.name as user_name, u.email as user_email
                    FROM loans l
                    JOIN books b ON l.book_id = b.id
                    JOIN users u ON l.user_id = u.id
                    ORDER BY l.status DESC, l.loan_date DESC
                ");
                $loans = $stmt->fetchAll();
                echo json_encode(["data" => $loans]);
            } catch (\Exception $e) {
                handleException($e, "Failed to fetch loans");
            }
            return;
        }
    }
}

// Check if path is /admin/users
if (isset($parts[1]) && $parts[1] === 'users') {
    // GET /admin/users
    if (count($parts) === 2) {
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT id, name, email, phone, fee_paid, data_consent, rules_consent, role, created_at FROM users ORDER BY name ASC");
                $users = $stmt->fetchAll();
                echo json_encode(["data" => $users]);
            } catch (\Exception $e) {
                handleException($e, "Failed to fetch users");
            }
            return;
        }
    }
    
    // /admin/users/{id}
    if (count($parts) >= 3 && is_numeric($parts[2])) {
        $user_id = (int)$parts[2];
        
        // /admin/users/{id}/loans
        if (isset($parts[3]) && $parts[3] === 'loans') {
            if (count($parts) === 4) {
                if ($method === 'GET') {
                    try {
                        $stmt = $pdo->prepare("
                            SELECT l.id, l.book_id, l.user_id, l.loan_date, l.due_date, l.return_date,
                                   CASE
                                       WHEN l.status != 'returned' AND l.due_date < CURDATE() THEN 'overdue'
                                       ELSE l.status
                                   END as status,
                                   b.title as book_title, b.author as book_author, b.signature as book_signature, b.isbn as book_isbn
                            FROM loans l
                            JOIN books b ON l.book_id = b.id
                            WHERE l.user_id = ?
                            ORDER BY l.status DESC, l.loan_date DESC
                        ");
                        $stmt->execute([$user_id]);
                        $loans = $stmt->fetchAll();
                        echo json_encode(["data" => $loans]);
                    } catch (\Exception $e) {
                        handleException($e, "Failed to fetch user loans");
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
                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }
                        handleException($e, "An error occurred while lending the book");
                    }
                    return;
                }
            }
            
            // /admin/users/{id}/loans/{loan_id}
            if (count($parts) === 5 && is_numeric($parts[4])) {
                $loan_id = (int)$parts[4];
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
                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }
                        handleException($e, "An error occurred while updating the loan");
                    }
                    return;
                }
            }
        }
        
        // Single user operations: GET / PUT
        if (count($parts) === 3) {
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
                    handleException($e, "Failed to fetch user");
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
                    handleException($e, "Failed to update user");
                }
                return;
            }
        }
    }
}
