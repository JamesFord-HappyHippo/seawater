#!/bin/bash
# Database Backup and Restore Scripts for Seawater Platform
# Supports PostgreSQL with PostGIS extensions

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="seawater"
BACKUP_DIR="${SCRIPT_DIR}/backups"
DATE_FORMAT=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Help function
show_help() {
    cat << EOF
Seawater Database Backup and Restore Utility

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    backup      Create a database backup
    restore     Restore from a backup file
    list        List available backups
    cleanup     Remove old backup files
    help        Show this help message

Options:
    -e, --environment   Environment (dev, staging, production) [default: dev]
    -f, --file         Backup file path (for restore command)
    -r, --retention    Retention days for cleanup [default: 30]
    -s, --schema-only  Backup/restore schema only (no data)
    -d, --data-only    Backup/restore data only (no schema)
    -t, --tables       Comma-separated list of tables to backup/restore
    -v, --verbose      Verbose output
    --dry-run          Show commands without executing (for cleanup)

Examples:
    $0 backup -e production
    $0 restore -e dev -f backups/seawater_prod_20240101_120000.sql
    $0 cleanup -r 7
    $0 list

Environment Variables:
    DB_HOST            Database host
    DB_PORT            Database port [default: 5432]
    DB_NAME            Database name [default: seawater]
    DB_USER            Database username
    DB_PASSWORD        Database password
    AWS_PROFILE        AWS profile for S3 backup storage
    S3_BACKUP_BUCKET   S3 bucket for backup storage

EOF
}

# Parse command line arguments
COMMAND=""
ENVIRONMENT="dev"
BACKUP_FILE=""
RETENTION_DAYS="30"
SCHEMA_ONLY=false
DATA_ONLY=false
TABLES=""
VERBOSE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        backup|restore|list|cleanup|help)
            COMMAND="$1"
            shift
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -s|--schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        -d|--data-only)
            DATA_ONLY=true
            shift
            ;;
        -t|--tables)
            TABLES="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    error "No command specified. Use --help for usage information."
fi

# Set database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-seawater}"
DB_USER="${DB_USER:-seawater_admin}"

# Environment-specific database settings
case "$ENVIRONMENT" in
    dev)
        DB_HOST="${DB_HOST:-seawater-dev-db.cluster-xxxxx.us-east-1.rds.amazonaws.com}"
        ;;
    staging)
        DB_HOST="${DB_HOST:-seawater-staging-db.cluster-xxxxx.us-east-1.rds.amazonaws.com}"
        ;;
    production)
        DB_HOST="${DB_HOST:-seawater-production-db.cluster-xxxxx.us-east-1.rds.amazonaws.com}"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or production."
        ;;
esac

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Set PostgreSQL environment variables
export PGPASSWORD="$DB_PASSWORD"
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGDATABASE="$DB_NAME"

# Verify database connection
verify_connection() {
    log "Verifying database connection to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
    
    if ! psql -c "SELECT version();" > /dev/null 2>&1; then
        error "Cannot connect to database. Please check your connection parameters."
    fi
    
    log "Database connection verified"
}

# Create database backup
create_backup() {
    local backup_filename="${PROJECT_NAME}_${ENVIRONMENT}_${DATE_FORMAT}"
    local backup_options=""
    
    # Build backup options
    if [[ "$SCHEMA_ONLY" == true ]]; then
        backup_options="$backup_options --schema-only"
        backup_filename="${backup_filename}_schema"
    elif [[ "$DATA_ONLY" == true ]]; then
        backup_options="$backup_options --data-only"
        backup_filename="${backup_filename}_data"
    fi
    
    if [[ -n "$TABLES" ]]; then
        IFS=',' read -ra TABLE_ARRAY <<< "$TABLES"
        for table in "${TABLE_ARRAY[@]}"; do
            backup_options="$backup_options --table=$table"
        done
        backup_filename="${backup_filename}_tables"
    fi
    
    if [[ "$VERBOSE" == true ]]; then
        backup_options="$backup_options --verbose"
    fi
    
    local backup_path="$BACKUP_DIR/${backup_filename}.sql"
    local compressed_path="$BACKUP_DIR/${backup_filename}.sql.gz"
    
    log "Creating backup: $backup_filename"
    log "Backup path: $backup_path"
    
    # Create backup
    pg_dump \
        --format=plain \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --create \
        --encoding=UTF8 \
        $backup_options \
        "$DB_NAME" > "$backup_path"
    
    # Compress backup
    log "Compressing backup..."
    gzip "$backup_path"
    
    # Verify backup
    if [[ -f "$compressed_path" ]]; then
        local backup_size=$(du -h "$compressed_path" | cut -f1)
        log "Backup created successfully: $compressed_path ($backup_size)"
        
        # Upload to S3 if configured
        if [[ -n "${S3_BACKUP_BUCKET:-}" ]]; then
            upload_to_s3 "$compressed_path" "$backup_filename.sql.gz"
        fi
        
        # Create backup metadata
        create_backup_metadata "$compressed_path" "$backup_filename"
        
    else
        error "Backup file was not created"
    fi
}

# Upload backup to S3
upload_to_s3() {
    local local_file="$1"
    local s3_key="$2"
    local s3_path="s3://$S3_BACKUP_BUCKET/seawater-backups/$ENVIRONMENT/$s3_key"
    
    log "Uploading backup to S3: $s3_path"
    
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$local_file" "$s3_path" \
            --storage-class STANDARD_IA \
            --metadata "environment=$ENVIRONMENT,backup-type=postgresql,created-date=$(date -Iseconds)"
        
        log "Backup uploaded to S3 successfully"
        
        # Set lifecycle policy for automatic cleanup
        aws s3api put-object-tagging \
            --bucket "$S3_BACKUP_BUCKET" \
            --key "seawater-backups/$ENVIRONMENT/$s3_key" \
            --tagging "TagSet=[{Key=Environment,Value=$ENVIRONMENT},{Key=BackupType,Value=postgresql},{Key=AutoDelete,Value=true}]"
    else
        warn "AWS CLI not found. Skipping S3 upload."
    fi
}

# Create backup metadata
create_backup_metadata() {
    local backup_path="$1"
    local backup_name="$2"
    local metadata_path="${backup_path}.meta"
    
    cat > "$metadata_path" << EOF
{
    "backup_name": "$backup_name",
    "environment": "$ENVIRONMENT",
    "database": "$DB_NAME",
    "host": "$DB_HOST",
    "created_at": "$(date -Iseconds)",
    "file_size": "$(stat -c%s "$backup_path")",
    "checksum": "$(sha256sum "$backup_path" | cut -d' ' -f1)",
    "postgres_version": "$(psql -t -c "SELECT version();" | xargs)",
    "postgis_version": "$(psql -t -c "SELECT PostGIS_Version();" | xargs)",
    "schema_only": $SCHEMA_ONLY,
    "data_only": $DATA_ONLY,
    "tables": "$TABLES"
}
EOF
}

# Restore database from backup
restore_backup() {
    if [[ -z "$BACKUP_FILE" ]]; then
        error "Backup file path is required for restore operation. Use -f option."
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        error "Backup file not found: $BACKUP_FILE"
    fi
    
    log "Restoring database from: $BACKUP_FILE"
    
    # Determine if file is compressed
    local restore_command
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        restore_command="gunzip -c '$BACKUP_FILE' | psql"
    else
        restore_command="psql -f '$BACKUP_FILE'"
    fi
    
    # Confirm restoration (unless it's dev environment)
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        read -p "Are you sure you want to restore $ENVIRONMENT database from $BACKUP_FILE? This will replace existing data. (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Restore operation cancelled."
            exit 0
        fi
    fi
    
    # Execute restore
    log "Starting database restore..."
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | psql
    else
        psql -f "$BACKUP_FILE"
    fi
    
    log "Database restore completed successfully"
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"
    
    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        log "No backups found"
        return
    fi
    
    # List local backups
    echo
    echo "Local backups:"
    echo "=============="
    for backup in "$BACKUP_DIR"/*.sql.gz; do
        if [[ -f "$backup" ]]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d':' -f1,2)
            
            echo "  $filename ($size) - $date"
            
            # Show metadata if available
            local meta_file="${backup}.meta"
            if [[ -f "$meta_file" ]]; then
                local env=$(jq -r '.environment' "$meta_file" 2>/dev/null || echo "unknown")
                local postgres_ver=$(jq -r '.postgres_version' "$meta_file" 2>/dev/null | cut -d' ' -f1,2)
                echo "    Environment: $env, PostgreSQL: $postgres_ver"
            fi
        fi
    done
    
    # List S3 backups if configured
    if [[ -n "${S3_BACKUP_BUCKET:-}" ]] && command -v aws >/dev/null 2>&1; then
        echo
        echo "S3 backups:"
        echo "==========="
        aws s3 ls "s3://$S3_BACKUP_BUCKET/seawater-backups/$ENVIRONMENT/" --human-readable --summarize
    fi
}

# Clean up old backups
cleanup_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    local deleted_count=0
    
    # Find and delete old local backups
    while IFS= read -r -d '' backup; do
        local filename=$(basename "$backup")
        
        if [[ "$DRY_RUN" == true ]]; then
            log "Would delete: $filename"
        else
            rm -f "$backup" "${backup}.meta"
            log "Deleted: $filename"
        fi
        
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Clean up S3 backups if configured
    if [[ -n "${S3_BACKUP_BUCKET:-}" ]] && command -v aws >/dev/null 2>&1; then
        log "Cleaning up S3 backups older than $RETENTION_DAYS days"
        
        local s3_prefix="seawater-backups/$ENVIRONMENT/"
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3api list-objects-v2 \
            --bucket "$S3_BACKUP_BUCKET" \
            --prefix "$s3_prefix" \
            --query "Contents[?LastModified<'$cutoff_date'].Key" \
            --output text | while read -r key; do
            
            if [[ -n "$key" && "$key" != "None" ]]; then
                if [[ "$DRY_RUN" == true ]]; then
                    log "Would delete S3 object: $key"
                else
                    aws s3 rm "s3://$S3_BACKUP_BUCKET/$key"
                    log "Deleted S3 object: $key"
                fi
                ((deleted_count++))
            fi
        done
    fi
    
    if [[ $deleted_count -eq 0 ]]; then
        log "No old backups found to delete"
    else
        log "Cleanup completed. Processed $deleted_count files"
    fi
}

# Main execution
main() {
    log "Starting $COMMAND operation for environment: $ENVIRONMENT"
    
    case "$COMMAND" in
        backup)
            verify_connection
            create_backup
            ;;
        restore)
            verify_connection
            restore_backup
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_backups
            ;;
        help)
            show_help
            ;;
        *)
            error "Unknown command: $COMMAND"
            ;;
    esac
    
    log "Operation completed successfully"
}

# Run main function
main "$@"