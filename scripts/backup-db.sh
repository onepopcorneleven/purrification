#!/usr/bin/env bash
# Nightly Postgres backup for Purrification (docs/vps-runbook.md's backup
# follow-up, Phase 11 of docs/workplan.md).
#
# Dumps via pg_dump using the app's own DB role (DATABASE_URL, sourced from
# .env.production) rather than needing postgres-OS-level sudo — the
# `purrification` role already owns the `purrification` database (see
# vps-runbook.md step 8), so this needs no elevated privileges at all.
# Runs from the deploy user's crontab (see vps-runbook.md step 15) rather
# than a system-level systemd timer: writing unit files under
# /etc/systemd/system needs root, and deploy's passwordless sudo is scoped
# to `systemctl restart purrification` only (vps-runbook.md step 12) — a
# user crontab needs no elevated privilege at all.
set -euo pipefail

APP_DIR="/home/deploy/purrification"
BACKUP_DIR="/home/deploy/backups/purrification"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

set -a
source "$APP_DIR/.env.production"
set +a

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="$BACKUP_DIR/purrification-$timestamp.sql.gz"
tmp_file="$dump_file.tmp"

pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$tmp_file"
mv "$tmp_file" "$dump_file"

find "$BACKUP_DIR" -name 'purrification-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
