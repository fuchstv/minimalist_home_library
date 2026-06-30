# Digitale Hausbibliothek – SprachCafé Polnisch

Dieses Projekt ist eine digitale Katalog- und Ausleihverwaltung für die Hausbibliothek des "SprachCafé Polnisch e.V.". Es dient als moderner, digitaler Dritter Ort ("Third Space") für Sprachanimation, kulturellen Austausch und interkulturelle Begegnungen.

Die Anwendung ist als Progressive Web App (PWA) konzipiert, vollständig zweisprachig (Deutsch/Polnisch) und bietet ein nutzerfreundliches Self-Service-System.

## Tech-Stack
*   **Frontend:** React (TypeScript), Vite, Tailwind CSS v4
*   **Backend:** PHP 8.4 REST-API
*   **Datenbank:** MySQL 8.0
*   **Infrastruktur:** Docker & Docker Compose

## Features
*   **Bilingualer Katalog:** Durchsuchbarer Buchbestand mit Filtern für Kategorien und Status. Umschaltbar zwischen Deutsch und Polnisch.
*   **Nutzerbereich:** Registrierung, Login und eine Übersicht der aktuell ausgeliehenen Bücher inklusive Fälligkeitsdatum.
*   **Ausleihe-Logik:** Self-Service Ausleihe und Rückgabe von Büchern.
*   **Admin-Dashboard:** Verwaltungsoberfläche für den Buchbestand, inkl. Anlage neuer Bücher und Upload von Cover-Bildern.
*   **PWA Ready:** Kann auf mobilen Endgeräten wie eine native App installiert werden.



## Projektstruktur
*   `/backend` - Die PHP REST-API (`index.php`, `books.php`, `loans.php`, `auth.php`, `admin.php`).
*   `/database` - SQL-Scripte (`01_schema.sql`, `02_import.sql`) für die Initialisierung.
*   `/frontend` - Die React-Anwendung (Vite).
*   `docker-compose.yml` - Konfiguration der lokalen Umgebung.

## Lokale Entwicklung

### Voraussetzungen
*   Docker & Docker Compose
*   Node.js (für die Frontend-Entwicklung)

### 1. Backend & Datenbank starten
```bash
# Startet Apache/PHP, MySQL und phpMyAdmin
docker compose up -d
```
*Die Datenbank initialisiert sich beim ersten Start automatisch durch die Skripte im `/database`-Ordner.*

### 2. Frontend starten
Das Frontend läuft über einen lokalen Vite-Dev-Server:
```bash
cd frontend
npm install
npm run dev
```

### 3. Zugriff
*   **Frontend:** `http://localhost:5173`
*   **Backend API:** `http://localhost:8080/api/`
*   **phpMyAdmin:** `http://localhost:8081`

### Erste Schritte (Admin-Rechte vergeben)
1. Registriere einen normalen Nutzer über das Frontend (`/register`).
2. Öffne phpMyAdmin (`http://localhost:8081`, User: `root`, Password: `root`).
3. Gehe in die Datenbank `library_db` -> Tabelle `users` und ändere die `role` deines neuen Nutzers von `member` auf `admin`.
4. Logge dich im Frontend ein und navigiere zum `/admin`-Dashboard.

## Daten-Import
Der initiale Buchbestand wurde aus einer CSV-Datei importiert. Das zugehörige Skript `generate_sql.js` (Root-Verzeichnis) kann genutzt werden, um aus CSV-Dateien neue SQL-Insert-Befehle zu generieren.

## Lizenz
Dieses Projekt wurde für den internen Gebrauch des SprachCafé Polnisch e.V. entwickelt.

## Deployment

### Amazon Lightsail (Empfohlen)
Dieses Projekt ist für das Deployment auf **Amazon Lightsail** optimiert. Detaillierte Anweisungen zur Einrichtung von Containern oder einer VPS-Instanz finden Sie im [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md).

### Render
Dieses Projekt ist auch für das Deployment auf **Render** vorbereitet.

### Backend (Web Service)
1. Erstelle einen neuen **Web Service** auf Render.
2. Verbinde dein Repository.
3. Wähle `Docker` als Environment.
4. Setze den `Docker Context` auf `backend` und den `Dockerfile Path` auf `backend/Dockerfile`.
5. Füge folgende Umgebungsvariablen hinzu:
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` (deine MySQL Zugangsdaten)
   - `ALLOWED_ORIGINS` (deine Frontend URL, z.B. `https://hausbibliothek.onrender.com`)
6. (Optional) Füge ein **Disk** hinzu, um Bilder im `/var/www/html/uploads` Verzeichnis persistent zu speichern.

### Frontend (Static Site)
1. Erstelle eine neue **Static Site** auf Render.
2. Verbinde dein Repository.
3. Build Command: `cd frontend && npm install && npm run build`
4. Publish Directory: `frontend/dist`
5. Füge folgende Umgebungsvariable hinzu:
   - `VITE_API_URL` (URL deines Backends, z.B. `https://hausbibliothek-backend.onrender.com`)
