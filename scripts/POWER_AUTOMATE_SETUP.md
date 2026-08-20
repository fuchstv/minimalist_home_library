# 📚 Microsoft 365 Power Automate E-Mail Integration für hausbibliothek.org

Diese Dokumentation beschreibt die Einrichtung des Power Automate Cloud Flows für den E-Mail-Versand über das Postfach `bibliothek@sprachcafe-polnisch.org`.

---

## 1. Übersicht der Architektur

```
+-------------------------------------------------------------+
|  hausbibliothek.org (Backend / Cronjobs)                    |
|  - Registrierungen                                          |
|  - Ausleihen / Rückgaben                                    |
|  - Vormerkungen                                             |
|  - Mahnungen & Fristerinnerungen                            |
|  - Passwort-Reset                                           |
+------------------------------+------------------------------+
                               | HTTPS POST (JSON Payload)
                               v
+-------------------------------------------------------------+
|  Power Automate Instant Cloud Flow                          |
|  Trigger: When an HTTP request is received                  |
|  Action:  Send an email (V2) - Office 365 Outlook           |
+------------------------------+------------------------------+
                               | M365 Exchange Online
                               v
+-------------------------------------------------------------+
|  Empfänger (Nutzer & Admins)                                |
|  - SPF / DKIM / DMARC konform                               |
|  - Zweisprachige Responsive HTML Vorlagen (DE / PL)         |
+-------------------------------------------------------------+
```

---

## 2. Einrichtung des Flows in Power Automate (Schritt für Schritt)

1. Melde dich bei **[make.powerautomate.com](https://make.powerautomate.com/)** mit dem M365 Admin-Account des Vereins an.
2. Klicke im Menü links auf **Erstellen** &rarr; **Automatisierter Cloud-Flow** oder **Sofortiger Cloud-Flow** (Instant Cloud Flow).
3. Flow-Namen vergeben: z. B. `Hausbibliothek - Mail Dispatcher`.
4. Trigger wählen: **Beim Empfang einer HTTP-Anforderung** (*When an HTTP request is received*).
5. Klicke auf *Beispielnutzlast zum Generieren eines Schemas verwenden* und füge Folgendes ein:
   ```json
   {
     "to": "empfaenger@example.com",
     "from": "bibliothek@sprachcafe-polnisch.org",
     "subject": "Betreffzeile",
     "bodyHtml": "<p>Inhalt</p>",
     "template": "welcome",
     "source": "hausbibliothek.org",
     "timestamp": "2026-08-20T18:00:00Z"
   }
   ```
6. Füge eine neue Aktion hinzu: **E-Mail senden (V2) – Office 365 Outlook** (*Send an email (V2)*).
   - **An (To):** Dynamischer Inhalt &rarr; `to`
   - **Betreff (Subject):** Dynamischer Inhalt &rarr; `subject`
   - **Textkörper (Body):** Dynamischer Inhalt &rarr; `bodyHtml` *(Code-Ansicht / HTML aktiviert)*
   - **Erweiterte Optionen &rarr; Von (Senden als):** `bibliothek@sprachcafe-polnisch.org`
7. Füge als letzte Aktion **Antwort** (*Response*) hinzu:
   - **Statuscode:** `200`
   - **Textkörper:** `{"status": "success", "message": "Email sent"}`
8. Klicke auf **Speichern** und kopiere die erzeugte **HTTP-POST-URL**.

---

## 3. Webhook-URL auf dem Server hinterlegen

Füge die generierte URL in `/home/ubuntu/minimalist_home_library/backend/.env` ein:

```bash
POWER_AUTOMATE_MAIL_WEBHOOK_URL="https://prod-XX.westeurope.logic.azure.com:443/workflows/..."
```

Oder führe das PowerShell-Skript aus:
```powershell
pwsh ./scripts/setup-powerautomate-mail.ps1 -WebhookUrl "DEINE_WEBHOOK_URL"
```

---

## 4. Cronjobs Übersicht

Auf dem Server sind folgende automatische Cronjobs eingerichtet:

| Zeitplan | Befehl | Zweck |
| :--- | :--- | :--- |
| **Täglich 08:00 Uhr** (`0 8 * * *`) | `/home/ubuntu/minimalist_home_library/scripts/run_daily_cron.sh` | Prüft fällige Ausleihen (3 Tage vorher), überfällige Bücher und sendet den Admin-Tagesbericht |
| **Sonntags 03:30 Uhr** (`30 3 * * 0`) | `docker exec library_backend php /var/www/html/dsgvo_cleanup.php --execute` | DSGVO-Bereinigung inaktiver Accounts (>24 Monate) |

