<?php
// backend/mail_utils.php - Power Automate M365 Exchange Email Service
require_once 'db.php';
require_once 'error_utils.php';

/**
 * Get the Power Automate Webhook URL for a specific template from environment or .env file
 */
function getMailWebhookUrl($templateType = 'general') {
    $templateKeyMap = [
        'welcome' => 'POWER_AUTOMATE_WEBHOOK_WELCOME',
        'loan_confirmation' => 'POWER_AUTOMATE_WEBHOOK_LOAN_CONFIRMATION',
        'book_available' => 'POWER_AUTOMATE_WEBHOOK_BOOK_AVAILABLE',
        'due_reminder' => 'POWER_AUTOMATE_WEBHOOK_DUE_REMINDER',
        'overdue_reminder' => 'POWER_AUTOMATE_WEBHOOK_OVERDUE',
        'password_reset' => 'POWER_AUTOMATE_WEBHOOK_PASSWORD_RESET',
        'admin_new_user' => 'POWER_AUTOMATE_WEBHOOK_ADMIN_NEW_USER',
        'admin_daily_digest' => 'POWER_AUTOMATE_WEBHOOK_ADMIN_DIGEST'
    ];

    $specificKey = $templateKeyMap[$templateType] ?? null;

    if ($specificKey) {
        $val = getenv($specificKey);
        if ($val) return trim($val);
    }

    $generalVal = getenv('POWER_AUTOMATE_MAIL_WEBHOOK_URL');
    if ($generalVal) return trim($generalVal);

    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        $env = [];
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($key, $val) = explode('=', $line, 2);
                $env[trim($key)] = trim($val);
            }
        }

        if ($specificKey && isset($env[$specificKey]) && !empty($env[$specificKey])) {
            return $env[$specificKey];
        }
        if (isset($env['POWER_AUTOMATE_MAIL_WEBHOOK_URL']) && !empty($env['POWER_AUTOMATE_MAIL_WEBHOOK_URL'])) {
            return $env['POWER_AUTOMATE_MAIL_WEBHOOK_URL'];
        }
    }
    return null;
}

/**
 * Central function to dispatch email payload to Power Automate Webhook
 */
function sendEmailPayload($pdo, $recipient, $subject, $htmlBody, $templateType = 'general', $metadata = []) {
    $webhookUrl = getMailWebhookUrl($templateType);
    $status = 'logged';
    $httpCode = null;

    $payload = [
        'to' => $recipient,
        'from' => 'bibliothek@sprachcafe-polnisch.org',
        'subject' => $subject,
        'bodyHtml' => $htmlBody,
        'template' => $templateType,
        'source' => 'hausbibliothek.org',
        'timestamp' => date('c'),
        'metadata' => $metadata
    ];

    if ($webhookUrl && filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
        $ch = curl_init($webhookUrl);
        $jsonPayload = json_encode($payload);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: ' . strlen($jsonPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            $status = 'sent';
            error_log("[MailUtils] Email successfully sent to $recipient ($templateType)");
        } else {
            $status = 'error';
            error_log("[MailUtils] Error sending email to $recipient ($templateType): HTTP $httpCode - $curlError");
        }
    } else {
        // Safe mock / logging mode when no webhook is configured yet
        error_log("[MailUtils] [MOCK MODE] Email queued for $recipient | Subject: $subject | Template: $templateType");
        $status = 'mock_logged';
    }

    // Record in email_logs audit table
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO email_logs (recipient, subject, template, status, response_code) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$recipient, $subject, $templateType, $status, $httpCode]);
        } catch (\PDOException $e) {
            error_log("[MailUtils] Failed to insert email_log: " . $e->getMessage());
        }
    }

    return ($status === 'sent' || $status === 'mock_logged');
}

/**
 * Responsive HTML Email Layout in the SprachCafé Warm Vintage Design
 */
function renderEmailTemplate($titleDe, $titlePl, $badge, $contentDeHtml, $contentPlHtml, $ctaText = null, $ctaUrl = null, $extraFooter = '') {
    $ctaButtonHtml = '';
    if ($ctaText && $ctaUrl) {
        $ctaButtonHtml = '
        <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="' . htmlspecialchars($ctaUrl) . '" style="background-color: #8B263E; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 9999px; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(139,38,62,0.2);">
                ' . htmlspecialchars($ctaText) . ' &rarr;
            </a>
        </div>';
    }

    return '
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($titleDe) . '</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f2ef; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1d1b1a; line-height: 1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f2ef; padding: 24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e7e1df; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #8B263E; padding: 20px 24px; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <div style="color: #ffffff; font-size: 20px; font-weight: bold; font-family: Georgia, serif; letter-spacing: 0.5px;">
                                            📚 SprachCafé Polnisch
                                        </div>
                                        <div style="color: #ffcad4; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                                            Digitale Hausbibliothek &bull; hausbibliothek.org
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 28px 24px 28px;">
                            <!-- Badge -->
                            <div style="margin-bottom: 16px;">
                                <span style="display: inline-block; background-color: rgba(139,38,62,0.1); color: #8B263E; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(139,38,62,0.2);">
                                    ' . htmlspecialchars($badge) . '
                                </span>
                            </div>

                            <!-- Main Title -->
                            <h1 style="color: #1d1b1a; font-family: Georgia, serif; font-size: 22px; margin: 0 0 4px 0; line-height: 1.3;">
                                ' . htmlspecialchars($titleDe) . '
                            </h1>
                            <h2 style="color: #8B263E; font-family: Georgia, serif; font-size: 17px; font-weight: normal; margin: 0 0 20px 0; font-style: italic;">
                                ' . htmlspecialchars($titlePl) . '
                            </h2>

                            <!-- German Content Box -->
                            <div style="background-color: #fdfbf7; border: 1px solid #e7e1df; border-radius: 12px; padding: 18px 20px; margin-bottom: 18px; font-size: 14px; color: #32302f;">
                                <div style="font-size: 11px; font-weight: bold; color: #8B263E; text-transform: uppercase; margin-bottom: 8px;">
                                    🇩🇪 Deutsch
                                </div>
                                ' . $contentDeHtml . '
                            </div>

                            <!-- Polish Content Box -->
                            <div style="background-color: #fdfbf7; border: 1px solid #e7e1df; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; font-size: 14px; color: #32302f;">
                                <div style="font-size: 11px; font-weight: bold; color: #8B263E; text-transform: uppercase; margin-bottom: 8px;">
                                    🇵🇱 Polski
                                </div>
                                ' . $contentPlHtml . '
                            </div>

                            ' . $ctaButtonHtml . '
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f2f0; border-top: 1px solid #e7e1df; padding: 20px 24px; font-size: 12px; color: #5b403d; text-align: center; line-height: 1.5;">
                            <p style="margin: 0 0 6px 0; font-weight: bold; color: #1d1b1a;">
                                SprachCafé Polnisch e.V. &bull; Standort Pankow
                            </p>
                            <p style="margin: 0 0 6px 0;">
                                Schulzestr. 1, 13187 Berlin &bull; S-Bhf Wollankstraße (S1, S25, S85, ca. 280 m)
                            </p>
                            <p style="margin: 0 0 10px 0;">
                                E-Mail: <a href="mailto:bibliothek@sprachcafe-polnisch.org" style="color: #8B263E; text-decoration: underline;">bibliothek@sprachcafe-polnisch.org</a> &bull; Tel: +49 160 9968 0059
                            </p>
                            ' . ($extraFooter ? '<p style="margin: 8px 0 0 0; font-size: 11px; color: #8c7774;">' . $extraFooter . '</p>' : '') . '
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
}

/**
 * 1. User Registration / Welcome Email
 */
function sendWelcomeEmail($pdo, $userEmail, $userName) {
    $subject = "Willkommen in der Hausbibliothek des SprachCafé Polnisch! / Witamy w Hausbibliothek!";
    $badge = "Neuanmeldung / Nowa rejestracja";
    
    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>herzlich willkommen in der digitalen Hausbibliothek des SprachCafé Polnisch e.V.!</p>
    <p>Ihr Benutzerkonto wurde erfolgreich eingerichtet. Sie können nun den gesamten Katalog durchstöbern, Bücher vormerken und vor Ort am <strong>Standort Pankow</strong> (Schulzestr. 1, 13187 Berlin) ausleihen.</p>
    <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Leihfrist: in der Regel 4 Wochen</li>
        <li>Einmalige Anmeldegebühr: 10 € bei der ersten Ausleihe vor Ort</li>
        <li>Anbindung: S-Bhf Wollankstr. (S1, S25, S85, ca. 280 m zu Fuß)</li>
    </ul>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>witamy serdecznie w cyfrowej bibliotece SprachCafé Polnisch e.V.!</p>
    <p>Twoje konto zostało pomyślnie utworzone. Możesz przeglądać pełny katalog, rezerwować książki oraz wypożyczać je na miejscu w <strong>lokalizacji Pankow</strong> (Schulzestr. 1, 13187 Berlin).</p>
    <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Okres wypożyczenia: zazwyczaj 4 tygodnie</li>
        <li>Jednorazowa opłata wpisowa: 10 € przy pierwszym wypożyczeniu</li>
        <li>Dojazd: stacja S-Bahn Wollankstr. (S1, S25, S85, ok. 280 m pieszo)</li>
    </ul>';

    $html = renderEmailTemplate(
        "Willkommen in der Hausbibliothek!",
        "Witamy w cyfrowej bibliotece!",
        $badge,
        $contentDe,
        $contentPl,
        "Zum Katalog / Do katalogu",
        "https://hausbibliothek.org/"
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'welcome', ['user_name' => $userName]);
}

/**
 * 2. Loan Confirmation Email
 */
function sendLoanConfirmationEmail($pdo, $userEmail, $userName, $bookTitle, $signature, $dueDate) {
    $subject = "Ausleihbestätigung: '$bookTitle' (Rückgabe bis $dueDate) / Potwierdzenie wypożyczenia";
    $badge = "Ausleihe / Wypożyczenie";

    $formattedDate = date('d.m.Y', strtotime($dueDate));

    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>Sie haben folgendes Buch erfolgreich in unserer Hausbibliothek ausgeliehen:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #8B263E; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Signatur: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #8B263E; font-weight: bold;">Rückgabefrist: ' . $formattedDate . '</p>
    </div>
    <p>Bitte geben Sie das Buch fristgerecht während der Öffnungszeiten im SprachCafé Pankow zurück. Eine Verlängerung ist nach Absprache möglich.</p>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>pomyślnie wypożyczyłeś/aś następującą książkę z naszej biblioteki:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #8B263E; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Sygnatura: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #8B263E; font-weight: bold;">Termin zwrotu: ' . $formattedDate . '</p>
    </div>
    <p>Prosimy o terminowy zwrot książki w godzinach otwarcia SprachCafé Pankow. Przedłużenie terminu jest możliwe po wcześniejszym uzgodnieniu.</p>';

    $html = renderEmailTemplate(
        "Ausleihbestätigung",
        "Potwierdzenie wypożyczenia",
        $badge,
        $contentDe,
        $contentPl,
        "Mein Bibliothekskonto / Moje konto",
        "https://hausbibliothek.org/profil"
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'loan_confirmation', [
        'book_title' => $bookTitle,
        'signature' => $signature,
        'due_date' => $dueDate
    ]);
}

/**
 * 3. Reserved Book is Available
 */
function sendBookAvailableEmail($pdo, $userEmail, $userName, $bookTitle, $signature) {
    $subject = "Ihr vorgemerktes Buch ist abholbereit: '$bookTitle' / Twoja zarezerwowana książka czeka!";
    $badge = "Vormerkung bereit / Książka gotowa do odbioru";

    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>gute Nachrichten! Das von Ihnen vorgemerkte Buch wurde zurückgegeben und liegt nun für Sie am <strong>Standort Pankow</strong> bereit:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #8B263E; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Signatur: <code>' . htmlspecialchars($signature) . '</code></p>
    </div>
    <p>Bitte holen Sie das Buch in den nächsten 7 Tagen während der Öffnungszeiten im SprachCafé Polnisch ab.</p>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>mamy świetną wiadomość! Zarezerwowana przez Ciebie książka została zwrócona i czeka na Ciebie w <strong>lokalizacji Pankow</strong>:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #8B263E; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Sygnatura: <code>' . htmlspecialchars($signature) . '</code></p>
    </div>
    <p>Prosimy o odbiór książki w ciągu najbliższych 7 dni w godzinach otwarcia SprachCafé Polnisch.</p>';

    $html = renderEmailTemplate(
        "Vorgemerktes Buch ist abholbereit",
        "Zarezerwowana książka jest dostępna",
        $badge,
        $contentDe,
        $contentPl,
        "Standort Pankow & Öffnungszeiten",
        "https://hausbibliothek.org/impressum"
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'book_available', [
        'book_title' => $bookTitle,
        'signature' => $signature
    ]);
}

/**
 * 4. Due Date Reminder (e.g. 3 days before)
 */
function sendDueDateReminderEmail($pdo, $userEmail, $userName, $bookTitle, $signature, $dueDate) {
    $formattedDate = date('d.m.Y', strtotime($dueDate));
    $subject = "Erinnerung: Leihfrist für '$bookTitle' endet bald ($formattedDate) / Przypomnienie o terminie zwrotu";
    $badge = "Frist-Erinnerung / Przypomnienie";

    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>wir möchten Sie freundlich daran erinnern, dass die Leihfrist für folgendes Buch in Kürze endet:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #e49b0f; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Signatur: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #e49b0f; font-weight: bold;">Fällig am: ' . $formattedDate . '</p>
    </div>
    <p>Falls Sie das Buch verlängern möchten, antworten Sie einfach auf diese E-Mail oder kontaktieren Sie uns.</p>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>przypominamy, że termin zwrotu poniższej książki upływa wkrótce:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #e49b0f; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Sygnatura: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #e49b0f; font-weight: bold;">Termin zwrotu: ' . $formattedDate . '</p>
    </div>
    <p>Jeśli chcesz przedłużyć wypożyczenie, odpowiedz na tę wiadomość lub skontaktuj się z nami.</p>';

    $html = renderEmailTemplate(
        "Leihfrist endet bald",
        "Zbliża się termin zwrotu",
        $badge,
        $contentDe,
        $contentPl,
        "Ausleihen ansehen / Moje wypożyczenia",
        "https://hausbibliothek.org/profil"
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'due_reminder', [
        'book_title' => $bookTitle,
        'signature' => $signature,
        'due_date' => $dueDate
    ]);
}

/**
 * 5. Overdue Reminder Email
 */
function sendOverdueReminderEmail($pdo, $userEmail, $userName, $bookTitle, $signature, $dueDate, $daysOverdue) {
    $formattedDate = date('d.m.Y', strtotime($dueDate));
    $subject = "Mahnung: Buch '$bookTitle' ist überfällig (seit $daysOverdue Tagen) / Zwrot książki przekroczony";
    $badge = "Überfällig / Zaległy zwrot";

    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>die Leihfrist für folgendes Buch wurde überschritten:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #ba1a1a; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Signatur: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #ba1a1a; font-weight: bold;">Fällig war: ' . $formattedDate . ' (überfällig seit ' . $daysOverdue . ' Tagen)</p>
    </div>
    <p>Bitte bringen Sie das Buch baldmöglichst im SprachCafé Pankow vorbei, damit andere Leser nicht warten müssen. Bei Fragen melden Sie sich bitte direkt bei uns.</p>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>termin zwrotu poniższej książki minął:</p>
    <div style="background-color: #ffffff; border-left: 4px solid #ba1a1a; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 15px;">📖 ' . htmlspecialchars($bookTitle) . '</p>
        <p style="margin: 4px 0 0 0; color: #5b403d; font-size: 13px;">Sygnatura: <code>' . htmlspecialchars($signature) . '</code></p>
        <p style="margin: 4px 0 0 0; color: #ba1a1a; font-weight: bold;">Termin minął: ' . $formattedDate . ' (opóźnienie: ' . $daysOverdue . ' dni)</p>
    </div>
    <p>Prosimy o jak najszybszy zwrot książki w SprachCafé Pankow, aby inni czytelnicy mogli z niej skorzystać. W razie pytań skontaktuj się z nami.</p>';

    $html = renderEmailTemplate(
        "Überfällige Ausleihe",
        "Zaległy zwrot książki",
        $badge,
        $contentDe,
        $contentPl,
        "Kontakt aufnehmen / Kontakt",
        "mailto:bibliothek@sprachcafe-polnisch.org"
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'overdue_reminder', [
        'book_title' => $bookTitle,
        'signature' => $signature,
        'due_date' => $dueDate,
        'days_overdue' => $daysOverdue
    ]);
}

/**
 * 6. Password Reset Token Email
 */
function sendPasswordResetEmail($pdo, $userEmail, $userName, $resetToken) {
    $subject = "Passwort zurücksetzen für hausbibliothek.org / Reset hasła";
    $badge = "Sicherheit / Bezpieczeństwo";
    $resetUrl = "https://hausbibliothek.org/reset-password?token=" . urlencode($resetToken);

    $contentDe = '
    <p>Hallo <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>Sie haben das Zurücksetzen Ihres Passworts für die Hausbibliothek angefordert. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen:</p>
    <p style="font-size: 12px; color: #8c7774;">Der Link ist aus Sicherheitsgründen <strong>1 Stunde lang gültig</strong>. Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>';

    $contentPl = '
    <p>Cześć <strong>' . htmlspecialchars($userName) . '</strong>,</p>
    <p>otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w cyfrowej bibliotece. Kliknij w poniższy przycisk, aby ustawić nowe hasło:</p>
    <p style="font-size: 12px; color: #8c7774;">Link jest ważny ze względów bezpieczeństwa przez <strong>1 godzinę</strong>. Jeśli to nie Ty wysłałeś/aś prośbę, zignoruj tę wiadomość.</p>';

    $html = renderEmailTemplate(
        "Passwort zurücksetzen",
        "Reset hasła do konta",
        $badge,
        $contentDe,
        $contentPl,
        "Neues Passwort festlegen / Ustaw nowe hasło",
        $resetUrl
    );

    return sendEmailPayload($pdo, $userEmail, $subject, $html, 'password_reset', ['user_name' => $userName]);
}

/**
 * 7. Admin Instant Alert: New User Registered
 */
function sendAdminNewUserAlert($pdo, $userName, $userEmail, $phone) {
    // Get all admin emails
    $adminEmails = ['bibliothek@sprachcafe-polnisch.org'];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin'");
            $admins = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($admins)) {
                $adminEmails = array_unique(array_merge($adminEmails, $admins));
            }
        } catch (\PDOException $e) {}
    }

    $subject = "🔔 Neue Bibliotheks-Registrierung: $userName ($userEmail)";
    $badge = "Admin Benachrichtigung";

    $contentDe = '
    <p>Ein neuer Nutzer hat sich in der digitalen Hausbibliothek registriert:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0;">
        <tr><td style="padding: 6px; font-weight: bold; width: 140px;">Name:</td><td style="padding: 6px;">' . htmlspecialchars($userName) . '</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">E-Mail:</td><td style="padding: 6px;"><a href="mailto:' . htmlspecialchars($userEmail) . '">' . htmlspecialchars($userEmail) . '</a></td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Telefon:</td><td style="padding: 6px;">' . htmlspecialchars($phone) . '</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Registriert am:</td><td style="padding: 6px;">' . date('d.m.Y H:i') . '</td></tr>
    </table>';

    $contentPl = '
    <p>Nowy czytelnik zarejestrował się w cyfrowej bibliotece domowej:</p>
    <p>Możesz zarządzać użytkownikami i opłatami członkowskimi w panelu administracyjnym.</p>';

    $html = renderEmailTemplate(
        "Neuer Bibliotheks-Nutzer",
        "Nowy użytkownik w bibliotece",
        $badge,
        $contentDe,
        $contentPl,
        "Zum Admin-Dashboard",
        "https://hausbibliothek.org/admin"
    );

    $success = true;
    foreach ($adminEmails as $adm) {
        if (!sendEmailPayload($pdo, $adm, $subject, $html, 'admin_new_user', ['user_name' => $userName, 'user_email' => $userEmail])) {
            $success = false;
        }
    }
    return $success;
}

/**
 * 8. Admin Daily Digest: Overdue & Upcoming Returns
 */
function sendAdminDailyDigestEmail($pdo, $overdueLoans = [], $upcomingLoans = [], $newUsersToday = 0) {
    $adminEmails = ['bibliothek@sprachcafe-polnisch.org'];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin'");
            $admins = $stmt->fetchAll(PDO::FETCH_COLUMN);
            if (!empty($admins)) {
                $adminEmails = array_unique(array_merge($adminEmails, $admins));
            }
        } catch (\PDOException $e) {}
    }

    $overdueCount = count($overdueLoans);
    $upcomingCount = count($upcomingLoans);

    $subject = "📊 Hausbibliothek Tagesbericht (" . date('d.m.Y') . "): $overdueCount überfällig, $upcomingCount anstehend";
    $badge = "Tagesbericht / Raport dzienny";

    $overdueRowsHtml = '';
    if ($overdueCount > 0) {
        foreach ($overdueLoans as $l) {
            $overdueRowsHtml .= '<tr style="border-bottom: 1px solid #e7e1df;">
                <td style="padding: 6px;">' . htmlspecialchars($l['user_name']) . '</td>
                <td style="padding: 6px;">' . htmlspecialchars($l['book_title']) . ' (<code>' . htmlspecialchars($l['signature']) . '</code>)</td>
                <td style="padding: 6px; color: #ba1a1a; font-weight: bold;">' . date('d.m.Y', strtotime($l['due_date'])) . '</td>
            </tr>';
        }
    } else {
        $overdueRowsHtml = '<tr><td colspan="3" style="padding: 8px; color: #2e7d32; font-style: italic;">Keine überfälligen Bücher vorhanden.</td></tr>';
    }

    $contentDe = '
    <p>Guten Morgen,</p>
    <p>hier ist die automatische Tagesübersicht für die Hausbibliothek am Standort Pankow:</p>
    <h3 style="color: #ba1a1a; font-size: 15px; margin: 16px 0 8px 0;">🚨 Überfällige Ausleihen (' . $overdueCount . ')</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
            <tr style="background-color: #f2edeb; text-align: left;">
                <th style="padding: 6px;">Nutzer</th>
                <th style="padding: 6px;">Buch & Signatur</th>
                <th style="padding: 6px;">Fällig seit</th>
            </tr>
        </thead>
        <tbody>' . $overdueRowsHtml . '</tbody>
    </table>
    <p style="margin-top: 14px; font-size: 13px;"><strong>Anstehende Rückgaben in den nächsten 3 Tagen:</strong> ' . $upcomingCount . '<br><strong>Neue Registrierungen:</strong> ' . $newUsersToday . '</p>';

    $contentPl = '
    <p>Dzień dobry,</p>
    <p>Oto automatyczne podsumowanie dzienne dla biblioteki w lokalizacji Pankow:</p>
    <p>Liczba zaległych zwrotów: <strong>' . $overdueCount . '</strong>. Zwroty w ciągu 3 dni: <strong>' . $upcomingCount . '</strong>.</p>';

    $html = renderEmailTemplate(
        "Tagesbericht Hausbibliothek",
        "Raport dzienny biblioteki",
        $badge,
        $contentDe,
        $contentPl,
        "Zum Admin-Bereich / Panel administracyjny",
        "https://hausbibliothek.org/admin"
    );

    $success = true;
    foreach ($adminEmails as $adm) {
        if (!sendEmailPayload($pdo, $adm, $subject, $html, 'admin_daily_digest', [
            'overdue_count' => $overdueCount,
            'upcoming_count' => $upcomingCount
        ])) {
            $success = false;
        }
    }
    return $success;
}
