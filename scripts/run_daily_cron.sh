#!/usr/bin/env bash
set -e
LOG_FILE="/home/ubuntu/minimalist_home_library/logs/daily_cron.log"
mkdir -p "$(dirname "$LOG_FILE")"
echo "=== [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting Daily Hausbibliothek Email Cron ===" >> "$LOG_FILE"
docker exec library_backend php /var/www/html/cron_overdue_digest.php >> "$LOG_FILE" 2>&1
echo "=== [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Finished Daily Hausbibliothek Email Cron ===" >> "$LOG_FILE"
