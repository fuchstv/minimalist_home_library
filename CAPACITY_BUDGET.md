# Kapazitätsbudget und Ressourcen-Monitoring – Hausbibliothek

## 1. Übersicht & Zielsetzung

Um sicherzustellen, dass die **Hausbibliothek (Port 8080)** auf dem Server stabil und performant läuft, während zusätzliche Dienste (**Caddy Reverse Proxy**, ein **Headless CMS** wie Directus/Strapi und eine **PostgreSQL-Datenbank**) betrieben werden, wurde eine verlässliche Überwachung eingerichtet und ein **Kapazitätsbudget** berechnet.

Alle Container wurden in `docker-compose.yml` sowie `docker-compose.prod.yml` mit strikten Ressourcen-Limits (`mem_limit`, `cpus`, `mem_reservation`) ausgestattet, damit kein Container bei Lastspitzen andere verdrängen oder einen Out-Of-Memory (OOM) Crash des Hosts verursachen kann.

---

## 2. 24h-Monitoring-Setup & Logging

### Monitoring-Architektur
Es wurde ein automatisierter Cron-Monitoring-Dienst eingerichtet, der kontinuierlich über 24 Stunden (und laufend darüber hinaus) System- und Container-Kennzahlen sammelt und analysiert.

- **Skript für Datenerfassung:** [`scripts/monitor_resources.py`](file:///home/ubuntu/minimalist_home_library/scripts/monitor_resources.py)
  - Erfasst minütlich CPU-Auslastung (`vmstat`), Host-Arbeitsspeicher (`/proc/meminfo`), Disk-I/O (`iostat`), Docker-Container-Metriken (`docker stats`) sowie den HTTP-Gesundheitsstatus von Port 8080.
- **Logdatei:** [`logs/resource_usage_24h.jsonl`](file:///home/ubuntu/minimalist_home_library/logs/resource_usage_24h.jsonl)
- **Cron-Job:**
  ```cron
  * * * * * /usr/bin/python3 /home/ubuntu/minimalist_home_library/scripts/monitor_resources.py >> /tmp/monitor_cron.log 2>&1
  ```
- **Auswertungs-Skript:** [`scripts/analyze_metrics.py`](file:///home/ubuntu/minimalist_home_library/scripts/analyze_metrics.py)
  - Aggregiert Min, Avg, Max und Perzentile für CPU, RAM, Disk-I/O und einzelne Container.

---

## 3. Empirische Messwerte (Baseline & Lasttest)

### Host-Hardware-Spezifikationen
- **vCPU:** 2 Kerne (x86_64 AWS Lightsail / EC2 Instance)
- **RAM:** 1,86 GiB (~1906 MB gesamt)
- **Swap:** 0 MB
- **Disk-Speicher:** 58 GB (davon ~48 GB frei)

### Messergebnisse der Hausbibliothek

| Komponente / Zustand | CPU-Auslastung (Idle) | CPU-Auslastung (Peak) | RAM-Verbrauch (Idle) | RAM-Verbrauch (Peak) |
| :--- | :--- | :--- | :--- | :--- |
| **MySQL 8.0 (`library_db`)** | ~0.6% | ~2.5% | ~360 MB | ~380 MB |
| **PHP 8.4 Backend (`library_backend`)** | ~0.0% | ~8.0% | ~15 MB | ~35 MB |
| **phpMyAdmin (`library_admin`, Port 8080)** | ~0.0% | ~51.4% (Last) | ~18 MB | ~54 MB |
| **Caddy Proxy (`library_proxy`)** | ~0.0% | ~8.8% | ~11 MB | ~18 MB |
| **Host OS & Docker Engine** | ~1-3% | ~10-15% | ~450 MB | ~480 MB |
| **Gesamtsystem** | **~2% CPU** | **~65% CPU** | **~854 MB RAM** | **~1020 MB RAM** |

---

## 4. Kapazitätsbudget (Resource Allocation Plan)

Auf Basis eines Gesamtspeichers von **1906 MB** und **2.0 vCPUs** ergibt sich folgende Verteilung:

### Budget-Aufteilung

1. **Host OS & System-Reserve (Sicherheitspuffer):** **468 MB RAM**
   - Garantiert, dass der Linux-Kernel, Docker-Daemon und SSH-Zugriff auch bei maximaler Container-Auslastung stabil bleiben.
2. **Container-Gesamtkapazität:** **1438 MB RAM**, **2.10 vCPU (max burst)**

### Detailliertes Limit-Budget pro Container

```
+-------------------------------------------------------------------------+
| GESAMTSPEICHER HOST: 1906 MB RAM / 2.0 vCPU                             |
+-------------------------------------------------------------------------+
| [1] OS & System-Buffer:    468 MB RAM (Reserviert für Kernel/Docker)    |
| [2] Hausbibliothek-Stack:  800 MB RAM / 1.25 vCPU Limit                 |
| [3] Neue Dienste (CMS+PG): 638 MB RAM / 0.95 vCPU Limit                 |
+-------------------------------------------------------------------------+
```

| Dienst / Container | Funktion | Memory Limit (`mem_limit`) | Memory Reservation | CPU Limit (`cpus`) |
| :--- | :--- | :--- | :--- | :--- |
| **`library_db`** | MySQL 8.0 Datenbanksystem | **512 MB** | 256 MB | **0.60 vCPU** |
| **`library_backend`** | PHP 8.4 REST API | **128 MB** | 32 MB | **0.30 vCPU** |
| **`library_admin`** | phpMyAdmin (Port 8080) | **96 MB** | 32 MB | **0.20 vCPU** |
| **`library_proxy`** | Caddy Reverse Proxy | **64 MB** | 16 MB | **0.15 vCPU** |
| **`headless_cms`** | Headless CMS (Directus/Strapi) | **350 MB** | 192 MB | **0.45 vCPU** |
| **`cms_postgres`** | PostgreSQL 16 (für CMS) | **224 MB** | 128 MB | **0.35 vCPU** |
| **SUMME ALLER LIMITS** | | **1438 MB** | **656 MB** | **2.05 vCPU (shared)** |

---

## 5. Konfiguration in Docker Compose

Die Limits wurden in [`docker-compose.yml`](file:///home/ubuntu/minimalist_home_library/docker-compose.yml) und [`docker-compose.prod.yml`](file:///home/ubuntu/minimalist_home_library/docker-compose.prod.yml) implementiert.

### Beispiel `docker-compose.yml` Ausschnitt:

```yaml
services:
  database:
    image: mysql:8.0
    container_name: library_db
    mem_limit: 512m
    mem_reservation: 256m
    cpus: 0.60
    deploy:
      resources:
        limits:
          cpus: '0.60'
          memory: 512M
        reservations:
          cpus: '0.20'
          memory: 256M

  headless_cms:
    image: directus/directus:10
    container_name: headless_cms
    mem_limit: 350m
    mem_reservation: 192m
    cpus: 0.45
    deploy:
      resources:
        limits:
          cpus: '0.45'
          memory: 350M

  postgres:
    image: postgres:16-alpine
    container_name: cms_postgres
    command: ["postgres", "-c", "shared_buffers=48MB", "-c", "max_connections=25", "-c", "work_mem=4MB"]
    mem_limit: 224m
    mem_reservation: 128m
    cpus: 0.35
    deploy:
      resources:
        limits:
          cpus: '0.35'
          memory: 224M
```

---

## 6. Empfehlungen für PostgreSQL & CMS Konfiguration

1. **PostgreSQL-Optimierung:**
   - PostgreSQL sollte mit reduzierten Puffergrößen gestartet werden:
     `shared_buffers = 48MB`, `max_connections = 25`, `work_mem = 4MB`.
   - Dadurch bleibt der RAM-Verbrauch stabil unter 150–200 MB.
2. **Headless CMS Wahl:**
   - Bei Nutzung von **Directus** oder **Strapi** (Node.js) reicht ein Speicherlimit von 350 MB für mittlere Last.
   - Falls ein noch leichtgewichtigeres CMS gewählt wird (z. B. PocketBase in Go), reduziert sich der RAM-Bedarf auf unter 100 MB.
3. **Ergebnis:**
   Durch die festgelegten Limits ist ausgeschlossen, dass ein speicherintensives CMS den MySQL-Server oder das Backend der Hausbibliothek ausbremst.
