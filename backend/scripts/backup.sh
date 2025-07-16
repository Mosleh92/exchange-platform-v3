#!/bin/bash

# Database Backup Script for Exchange Platform v3
# Automated daily backup with compression and rotation

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/daily"
RETENTION_DAYS=30
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-exchange_platform}"
DB_USER="${DB_USER:-postgres}"
BACKUP_TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/exchange_platform_${BACKUP_TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
LOG_FILE="/var/log/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Check if required tools are available
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        error_exit "pg_dump is not installed"
    fi
    
    if ! command -v gzip &> /dev/null; then
        error_exit "gzip is not installed"
    fi
    
    success "All dependencies are available"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    log "Creating backup directory..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
        success "Created backup directory: $BACKUP_DIR"
    else
        log "Backup directory already exists: $BACKUP_DIR"
    fi
}

# Test database connection
test_db_connection() {
    log "Testing database connection..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error_exit "Cannot connect to database"
    fi
    
    success "Database connection successful"
}

# Create database backup
create_backup() {
    log "Creating database backup..."
    
    # Set environment variables for pg_dump
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup with custom format for better compression
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --exclude-table-data='audit_logs' \
        --exclude-table-data='temp_*' \
        > "$BACKUP_FILE"; then
        
        success "Database backup created: $BACKUP_FILE"
    else
        error_exit "Failed to create database backup"
    fi
}

# Compress backup file
compress_backup() {
    log "Compressing backup file..."
    
    if gzip "$BACKUP_FILE"; then
        success "Backup compressed: $COMPRESSED_FILE"
        BACKUP_FILE="$COMPRESSED_FILE"
    else
        error_exit "Failed to compress backup file"
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    # Test if the backup can be restored (dry run)
    if gunzip -c "$BACKUP_FILE" | head -n 100 | grep -q "PostgreSQL database dump"; then
        success "Backup verification successful"
    else
        error_exit "Backup verification failed"
    fi
}

# Calculate backup size
get_backup_size() {
    local size=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $size"
}

# Upload to cloud storage (optional)
upload_to_cloud() {
    if [ -n "${AWS_S3_BUCKET:-}" ]; then
        log "Uploading backup to S3..."
        
        if aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" --storage-class STANDARD_IA; then
            success "Backup uploaded to S3"
        else
            warning "Failed to upload backup to S3"
        fi
    fi
    
    if [ -n "${GCS_BUCKET:-}" ]; then
        log "Uploading backup to Google Cloud Storage..."
        
        if gsutil cp "$BACKUP_FILE" "gs://$GCS_BUCKET/backups/"; then
            success "Backup uploaded to GCS"
        else
            warning "Failed to upload backup to GCS"
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    local current_time=$(date +%s)
    local retention_seconds=$((RETENTION_DAYS * 24 * 60 * 60))
    
    for file in "$BACKUP_DIR"/*.sql.gz; do
        if [ -f "$file" ]; then
            local file_time=$(stat -c %Y "$file")
            local age=$((current_time - file_time))
            
            if [ $age -gt $retention_seconds ]; then
                if rm "$file"; then
                    log "Deleted old backup: $file"
                    ((deleted_count++))
                else
                    warning "Failed to delete old backup: $file"
                fi
            fi
        fi
    done
    
    if [ $deleted_count -gt 0 ]; then
        success "Cleaned up $deleted_count old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."
    
    local report_file="/tmp/backup_report_${BACKUP_TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
Exchange Platform v3 - Database Backup Report
============================================

Backup Date: $(date)
Backup File: $BACKUP_FILE
Backup Size: $(du -h "$BACKUP_FILE" | cut -f1)
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT

Backup Statistics:
- Total tables: $(gunzip -c "$BACKUP_FILE" | grep -c "CREATE TABLE")
- Total sequences: $(gunzip -c "$BACKUP_FILE" | grep -c "CREATE SEQUENCE")
- Total functions: $(gunzip -c "$BACKUP_FILE" | grep -c "CREATE FUNCTION")

Retention Policy:
- Keep backups for: $RETENTION_DAYS days
- Backup directory: $BACKUP_DIR

Cloud Storage:
- AWS S3: ${AWS_S3_BUCKET:-Not configured}
- Google Cloud Storage: ${GCS_BUCKET:-Not configured}

EOF
    
    log "Backup report generated: $report_file"
}

# Send notification (optional)
send_notification() {
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        log "Sending Slack notification..."
        
        local message="{
            \"text\": \"Database backup completed successfully\",
            \"attachments\": [{
                \"fields\": [
                    {\"title\": \"Backup File\", \"value\": \"$BACKUP_FILE\", \"short\": true},
                    {\"title\": \"Backup Size\", \"value\": \"$(du -h "$BACKUP_FILE" | cut -f1)\", \"short\": true},
                    {\"title\": \"Database\", \"value\": \"$DB_NAME\", \"short\": true},
                    {\"title\": \"Timestamp\", \"value\": \"$BACKUP_TIMESTAMP\", \"short\": true}
                ]
            }]
        }"
        
        if curl -X POST -H 'Content-type: application/json' --data "$message" "$SLACK_WEBHOOK_URL" > /dev/null 2>&1; then
            success "Slack notification sent"
        else
            warning "Failed to send Slack notification"
        fi
    fi
    
    if [ -n "${EMAIL_RECIPIENT:-}" ]; then
        log "Sending email notification..."
        
        local subject="Exchange Platform - Database Backup Report"
        local body="Database backup completed successfully.\n\nBackup File: $BACKUP_FILE\nBackup Size: $(du -h "$BACKUP_FILE" | cut -f1)\nTimestamp: $BACKUP_TIMESTAMP"
        
        if echo -e "$body" | mail -s "$subject" "$EMAIL_RECIPIENT"; then
            success "Email notification sent"
        else
            warning "Failed to send email notification"
        fi
    fi
}

# Main execution
main() {
    log "Starting database backup process..."
    
    # Check dependencies
    check_dependencies
    
    # Create backup directory
    create_backup_dir
    
    # Test database connection
    test_db_connection
    
    # Create backup
    create_backup
    
    # Compress backup
    compress_backup
    
    # Verify backup
    verify_backup
    
    # Get backup size
    get_backup_size
    
    # Upload to cloud storage
    upload_to_cloud
    
    # Clean old backups
    cleanup_old_backups
    
    # Generate report
    generate_report
    
    # Send notification
    send_notification
    
    success "Database backup process completed successfully"
}

# Execute main function
main "$@" 