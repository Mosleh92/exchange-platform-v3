#!/bin/bash
# MongoDB Backup Script
# Usage: ./backup.sh [db_name]

DB_NAME=${1:-exchange_platform}
BACKUP_DIR="$(dirname "$0")/../backups/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

echo "[INFO] Starting backup for database: $DB_NAME"
mongodump --db "$DB_NAME" --out "$BACKUP_DIR"
if [ $? -eq 0 ]; then
  echo "[SUCCESS] Backup completed: $BACKUP_DIR"
else
  echo "[ERROR] Backup failed!"
fi 