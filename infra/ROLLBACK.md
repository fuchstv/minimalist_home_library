# Risikofreie Teststrategie & Rollback-Plan für neue Container

Diese Dokumentation beschreibt die Strategie zum **risikofreien Testen neuer Container (Caddy, Headless CMS, PostgreSQL)** parallel zur laufenden Produktion der **Hausbibliothek (Port 8080 / Port 80/443)** sowie das Protokoll des erfolgreich durchgeführten Aktiv-Tests des Rollback-Verfahrens.

---

## 1. Teststrategie & Isolation

Um Beeinträchtigungen, Port-Kollisionen oder Ressourcen-Engpässe der Hausbibliothek auszuschließen, verwendet das Test-Setup drei Sicherheitsbarrieren:

### 1.1 Netzwerktrennung (`cms_test_net`)
- Der laufende Produktions-Stack der Hausbibliothek nutzt das Docker-Netzwerk `library_net`.
- Das Test-Setup wird in ein vollständig **isoliertes Docker-Netzwerk (`cms_test_net`)** gewuppt.
- Es gibt keine gegenseitige Namensauflösung oder IP-Adress-Kollisionen im Docker-DNS.

### 1.2 Dediziertes Nicht-Standard-Portschema
Um bestehende Ports (**80/443** für Caddy, **8080** für Hausbibliothek Admin/Backend, **3306** für MySQL) nicht zu blockieren, verwendet der Test-Stack ein fixes Nicht-Standard-Portschema:

| Komponente | Produktions-Port | Test-Port (Nicht-Standard) | Interner Container-Port |
| :--- | :--- | :--- | :--- |
| **Caddy Proxy (Test)** | 80 / 443 | **9080** (HTTP) / **9443** (HTTPS) | 80 / 443 |
| **Headless CMS (Directus)** | N/A | **9055** | 8055 |
| **PostgreSQL 16 (Test DB)** | N/A | **9432** | 5432 |

### 1.3 Ressourcen-Limitierung für den Test-Stack
Der Test-Stack nutzt eine eigene Compose-Datei (`docker-compose.cms-test.yml`), in der strikte Ressourcen-Limits definiert sind:
- `test_library_proxy` (Caddy): `mem_limit: 64m`, `cpus: 0.10`
- `test_headless_cms` (Directus): `mem_limit: 300m`, `cpus: 0.35`
- `test_cms_postgres` (PostgreSQL): `mem_limit: 192m`, `cpus: 0.25`

---

## 2. Rollback-Plan (Schritt-für-Schritt)

Der Rollback-Mechanismus stellt sicher, dass der gesamte Test-Stack mit einem einzigen Befehl rückstandslos entfernt werden kann, **ohne** die laufende Hausbibliothek zu stoppen oder neu zu starten.

### Schritt 1: Überprüfung des Produktionszustands vor dem Test
```bash
# Überprüfen, dass die Hausbibliothek läuft
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -I http://localhost:8080
curl -I http://localhost
```

### Schritt 2: Start des isolierten Test-Stacks
```bash
cd /home/ubuntu/minimalist_home_library
docker compose -f docker-compose.cms-test.yml up -d
```

### Schritt 3: Verifikation des Parallelbetriebs
```bash
# 1. Hausbibliothek (muss unberührt HTTP 200 liefern)
curl -I http://localhost:8080
curl -I http://localhost

# 2. Test-Dienste auf den Nicht-Standard-Ports
curl -I http://127.0.0.1:9080        # Test Caddy Proxy
curl -I http://127.0.0.1:9055/server/ping  # Test Directus CMS
```

### Schritt 4: Ausführung des Rollbacks
```bash
docker compose -f docker-compose.cms-test.yml down -v
```
*Dieser Befehl beendet alle Test-Container (`test_*`), entfernt das Netz `cms_test_net` und löscht temporäre Test-Volumes, während der Hausbibliothek-Stack (`library_*`) zu 100% unangetastet weiterläuft.*

---

## 3. Protokoll des aktiv durchgeführten Tests (Testnachweis)

### Testumgebung & Durchführung
- **Zeitstempel:** 2026-08-09T23:39:15Z
- **Ausgeführt in:** `/home/ubuntu/minimalist_home_library`

#### Phase 1: Test-Stack gestartet
Befehl: `docker compose -f docker-compose.cms-test.yml up -d`
Status vor Rollback:
```text
NAMES                STATUS         PORTS
test_library_proxy   Up 15 sec      0.0.0.0:9080->80/tcp, 0.0.0.0:9443->443/tcp
test_headless_cms    Up 15 sec      0.0.0.0:9055->8055/tcp
test_cms_postgres    Up 16 sec      0.0.0.0:9432->5432/tcp
library_proxy        Up 9 minutes   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
library_backend      Up 9 minutes   80/tcp
library_admin        Up 9 minutes   0.0.0.0:8080->80/tcp
library_db           Up 9 minutes   3306/tcp
```
Endpoints im Parallelbetrieb:
- `http://localhost:8080` (Hausbibliothek): **HTTP/1.1 200 OK**
- `http://localhost/` (Hausbibliothek): **HTTP/1.1 200 OK**
- `http://127.0.0.1:9080` (Test Proxy): **HTTP/1.1 200 OK**
- `http://127.0.0.1:9055/server/ping` (Test CMS): **HTTP/1.1 200 OK (`pong`)**

#### Phase 2: Rollback ausgeführt
Befehl: `docker compose -f docker-compose.cms-test.yml down -v`
Ausgabe:
```text
✔ Container test_library_proxy Removed
✔ Container test_headless_cms  Removed
✔ Container test_cms_postgres  Removed
✔ Network cms_test_net         Removed
```

#### Phase 3: Verifikation nach Rollback
Status nach Rollback:
```text
NAMES             STATUS         PORTS
library_proxy     Up 9 minutes   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
library_backend   Up 9 minutes   80/tcp
library_admin     Up 9 minutes   0.0.0.0:8080->80/tcp
library_db        Up 9 minutes   3306/tcp
```
Ergebnis:
- `http://localhost:8080`: **HTTP/1.1 200 OK** (Hausbibliothek durchgehend online).
- `http://127.0.0.1:9080`: `Failed to connect` (Port 9080 sauber geschlossen).
- `http://127.0.0.1:9055`: `Failed to connect` (Port 9055 sauber geschlossen).

### Fazit
Der Rollback wurde erfolgreich validiert. Neue Dienste können risikofrei im isolierten Test-Netzwerk auf den Ports 9080, 9055 und 9432 getestet und bei Bedarf spurlos entfernt werden, ohne den Betrieb der Hausbibliothek beeinträchtigen zu können.
