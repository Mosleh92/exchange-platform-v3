#!/bin/bash

# ==============================================
# اسکریپت Deployment برای سرور
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="exchange-platform-v3"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./logs/deployment_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "انجام بررسی‌های پیش از deployment..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker نصب نشده است"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker در حال اجرا نیست"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose نصب نشده است"
    fi
    
    # Check if required files exist
    if [ ! -f "docker-compose.production.yml" ]; then
        error "فایل docker-compose.production.yml یافت نشد"
    fi
    
    if [ ! -d "secrets" ]; then
        warning "پوشه secrets یافت نشد. در حال ایجاد..."
        mkdir -p secrets
    fi
    
    # Check secrets
    local secrets=("mongo_root_username.txt" "mongo_root_password.txt" "redis_password.txt" "jwt_secret.txt" "jwt_refresh_secret.txt" "session_secret.txt" "grafana_admin_password.txt")
    for secret in "${secrets[@]}"; do
        if [ ! -f "secrets/$secret" ]; then
            warning "Secret file secrets/$secret یافت نشد"
        fi
    done
    
    success "بررسی‌های پیش از deployment کامل شد"
}

# Create backup
create_backup() {
    log "ایجاد backup از دیتابیس..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup MongoDB
    if docker ps | grep -q "exchange_mongodb_prod"; then
        docker exec exchange_mongodb_prod mongodump --out /backups/$(basename "$BACKUP_DIR") || warning "خطا در backup MongoDB"
        success "Backup MongoDB ایجاد شد"
    else
        warning "کانتینر MongoDB در حال اجرا نیست"
    fi
    
    # Backup uploads
    if [ -d "./uploads" ]; then
        cp -r ./uploads "$BACKUP_DIR/uploads" || warning "خطا در backup فایل‌های آپلود شده"
        success "Backup فایل‌های آپلود شده ایجاد شد"
    fi
}

# Stop services
stop_services() {
    log "متوقف کردن سرویس‌های فعلی..."
    
    docker-compose -f docker-compose.production.yml down || warning "خطا در متوقف کردن سرویس‌ها"
    
    success "سرویس‌ها متوقف شدند"
}

# Build and start services
deploy_services() {
    log "شروع deployment سرویس‌ها..."
    
    # Pull latest images
    log "دانلود آخرین images..."
    docker-compose -f docker-compose.production.yml pull || warning "خطا در دانلود images"
    
    # Build custom images
    log "Build کردن images سفارشی..."
    docker-compose -f docker-compose.production.yml build --no-cache || error "خطا در build کردن images"
    
    # Start services
    log "شروع سرویس‌ها..."
    docker-compose -f docker-compose.production.yml up -d || error "خطا در شروع سرویس‌ها"
    
    success "سرویس‌ها با موفقیت deploy شدند"
}

# Health check
health_check() {
    log "بررسی سلامت سرویس‌ها..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            success "سرویس‌ها سالم هستند"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log "تلاش $attempt از $max_attempts..."
        sleep 10
    done
    
    error "سرویس‌ها پس از $max_attempts تلاش سالم نیستند"
}

# Cleanup old images and containers
cleanup() {
    log "پاکسازی images و containers قدیمی..."
    
    # Remove unused images
    docker image prune -f || warning "خطا در پاکسازی images"
    
    # Remove unused volumes
    docker volume prune -f || warning "خطا در پاکسازی volumes"
    
    # Remove unused networks
    docker network prune -f || warning "خطا در پاکسازی networks"
    
    success "پاکسازی کامل شد"
}

# Show logs
show_logs() {
    log "نمایش logs سرویس‌ها..."
    docker-compose -f docker-compose.production.yml logs --tail=50
}

# Main deployment function
main() {
    log "شروع deployment پلتفرم صرافی..."
    
    # Create logs directory
    mkdir -p logs
    
    case "${1:-deploy}" in
        "deploy")
            pre_deployment_checks
            create_backup
            stop_services
            deploy_services
            health_check
            cleanup
            success "Deployment با موفقیت کامل شد!"
            ;;
        "backup")
            create_backup
            success "Backup با موفقیت ایجاد شد در $BACKUP_DIR"
            ;;
        "stop")
            stop_services
            ;;
        "start")
            deploy_services
            health_check
            ;;
        "restart")
            stop_services
            deploy_services
            health_check
            ;;
        "logs")
            show_logs
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "استفاده: $0 {deploy|backup|stop|start|restart|logs|health|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deployment کامل (پیش‌فرض)"
            echo "  backup   - ایجاد backup"
            echo "  stop     - متوقف کردن سرویس‌ها"
            echo "  start    - شروع سرویس‌ها"
            echo "  restart  - راه‌اندازی مجدد سرویس‌ها"
            echo "  logs     - نمایش logs"
            echo "  health   - بررسی سلامت"
            echo "  cleanup  - پاکسازی"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
