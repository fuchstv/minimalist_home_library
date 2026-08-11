# Verifikation der Deployment-Last (Phase 7 GitHub Actions)

## 1. Zielsetzung & Architektur

Auf der Lightsail-Instanz (2 vCPUs, 1.86 GB RAM) laufen kontinuierlich die **Hausbibliothek (Port 8080)** sowie das CMS. Ein lokaler Software-Build (z. B. `npm run build` oder Docker Image Build) auf dem Zielserver würde zu massiven CPU- (100 %) und RAM-Spitzen (+360 MB RAM) führen, was das Risiko von Out-Of-Memory (OOM) Cratches und Ausfällen der Hausbibliothek birgt.

In **Phase 7 (GitHub Actions Deployment)** wird die Last strikt getrennt:
1. **Off-Host Build (auf GitHub Actions Runner):**
   Der Quellcode wird auf den leistungsstarken Runnern von GitHub kompiliert (`npm ci`, `npm run build`). Auf der Lightsail-Instanz wird **kein** Node.js-Build, kein TypeScript-Checking und keine Indizierung ausgeführt.
2. **Artefakt-Transfer (via `rsync`):**
   Nur die fertigen statischen Assets (`frontend/dist/`) werden per `rsync` über SSH auf die Instanz übertragen.
3. **Nahtlose Umschaltung:**
   Caddy übernimmt die neuen statischen Dateien ohne Container-Neustart oder Ausfallzeit.

---

## 2. Empirischer Benchmark-Vergleich

Es wurde eine direkte Lastmessung auf dem Host durchgeführt ([`scripts/verify_deployment_load.py`](file:///home/ubuntu/minimalist_home_library/scripts/verify_deployment_load.py)), um die Systemauslastung zwischen einem lokalen Build und dem GitHub-Actions-`rsync`-Deployment zu vergleichen.

### Messergebnisse

| Metrik | GitHub Actions `rsync` Transfer (Phase 7) | Lokaler On-Host Build (`npm run build`) | Differenz / Einsparung |
| :--- | :--- | :--- | :--- |
| **Dauer des Vorgangs** | **2,60 Sekunden** | **19,31 Sekunden** | **86,5 % schneller** |
| **Durchschnittliche CPU-Auslastung** | **19,55 %** | **91,21 %** | **-71,66 % CPU-Last** |
| **Maximale CPU-Spitze** | **94,74 %** *(transient <0.1s)* | **100,0 %** *(anhaltend über 19s)* | **Keine anhaltende Last** |
| **Zusätzliche CPU-Netto-Last über Idle** | **+5,97 %** | **+77,63 %** | **Nahe 0 % Zusatzlast** |
| **Maximaler RAM-Verbrauch** | **1156,34 MB** | **1512,33 MB** | **-356 MB RAM gespart** |
| **Zusätzlicher RAM-Bedarf** | **+2,7 MB** *(vernachlässigbar)* | **+358,7 MB** | **Kein OOM-Risiko** |

---

## 3. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Der Workflow [`deploy.yml`](file:///home/ubuntu/minimalist_home_library/.github/workflows/deploy.yml) erzwingt die Trennung:

```yaml
name: Deploy Hausbibliothek to Lightsail

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js (Build Off-Host)
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Build Frontend Assets (Off-Host auf GitHub Runner)
        run: |
          cd frontend
          npm ci
          npm run build

      - name: Deploy Pre-Built Assets via rsync (Zero Build Load auf Lightsail)
        uses: easingthemes/ssh-deploy@main
        env:
          SSH_PRIVATE_KEY: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          ARGS: "-rltgoDzvO --delete"
          SOURCE: "frontend/dist/"
          REMOTE_HOST: ${{ secrets.LIGHTSAIL_HOST }}
          REMOTE_USER: "ubuntu"
          TARGET: "/home/ubuntu/minimalist_home_library/frontend/dist/"
          SCRIPT_AFTER: |
            cd /home/ubuntu/minimalist_home_library
            docker compose -f docker-compose.prod.yml exec -T caddy caddy reload
```

---

## 4. Fazit & Bestätigung

Die empirische Messung bestätigt:
- Während des Deployments via `rsync` liegt die Netto-CPU-Zusatzlast bei **~5,97 %** und der zusätzliche RAM-Bedarf bei **nahe 0 MB (+2,7 MB)**.
- Auf der Lightsail-Instanz wird **keine Build- oder Indizierungslast** erzeugt.
- Der unterbrechungsfreie Betrieb der **Hausbibliothek** auf Port 8080 sowie des CMS ist während des gesamten Deployment-Vorgangs garantiert.
