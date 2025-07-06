#!/bin/bash

# ==============================================
# اسکریپت بررسی سلامت سیستم
# ==============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost"
TIMEOUT=10
LOG_FILE="./logs/health-check-$(date +%Y%m%d_%H%M%S).log"

# Create logs directory
mkdir -p logs

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
}

# Check service health
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log "بررسی سلامت $service_name..."
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                         --connect-timeout $TIMEOUT \
                         --max-time $TIMEOUT \
                         "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:0")
    
    local http_code=$(echo $response | sed -e 's/.*HTTPSTATUS:\([0-9]*\).*/\1/')
    local time_total=$(echo $response | sed -e 's/.*TIME:\([0-9.]*\).*/\1/')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        success "$service_name سالم است (${time_total}s)"
        return 0
    else
        error "$service_name ناسالم است (HTTP $http_code)"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    log "بررسی وضعیت کانتینرها..."
    
    local containers=("exchange_backend_prod" "exchange_frontend_prod" "exchange_mongodb_prod" "exchange_redis_prod" "exchange_nginx_prod")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            # Check container health
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")
            
            if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-health-check" ]; then
                success "کانتینر $container در حال اجرا است"
            else
                error "کانتینر $container ناسالم است (Health: $health_status)"
                all_healthy=false
            fi
        else
            error "کانتینر $container در حال اجرا نیست"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        success "تمام کانتینرها سالم هستند"
        return 0
    else
        error "برخی کانتینرها مشکل دارند"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    log "بررسی فضای دیسک..."
    
    local disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        success "فضای دیسک کافی است ($disk_usage% استفاده شده)"
    elif [ "$disk_usage" -lt 90 ]; then
        warning "فضای دیسک کم است ($disk_usage% استفاده شده)"
    else
        error "فضای دیسک ناکافی است ($disk_usage% استفاده شده)"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "بررسی استفاده از حافظه..."
    
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -lt 80 ]; then
        success "استفاده از حافظه نرمال است ($memory_usage%)"
    elif [ "$memory_usage" -lt 90 ]; then
        warning "استفاده از حافظه بالا است ($memory_usage%)"
    else
        error "استفاده از حافظه بحرانی است ($memory_usage%)"
        return 1
    fi
}

# Check CPU load
check_cpu_load() {
    log "بررسی بار CPU..."
    
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_count=$(nproc)
    local load_percentage=$(echo "$load_avg * 100 / $cpu_count" | bc -l | cut -d. -f1)
    
    if [ "$load_percentage" -lt 70 ]; then
        success "بار CPU نرمال است ($load_percentage%)"
    elif [ "$load_percentage" -lt 90 ]; then
        warning "بار CPU بالا است ($load_percentage%)"
    else
        error "بار CPU بحرانی است ($load_percentage%)"
        return 1
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        warning "دامنه برای بررسی SSL مشخص نشده"
        return 0
    fi
    
    log "بررسی گواهی SSL برای $domain..."
    
    local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [ -n "$expiry_date" ]; then
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            success "گواهی SSL معتبر است ($days_until_expiry روز باقی مانده)"
        elif [ "$days_until_expiry" -gt 7 ]; then
            warning "گواهی SSL به زودی منقضی می‌شود ($days_until_expiry روز باقی مانده)"
        else
            error "گواهی SSL به زودی منقضی می‌شود ($days_until_expiry روز باقی مانده)"
            return 1
        fi
    else
        warning "نمی‌توان گواهی SSL را بررسی کرد"
    fi
}

# Check database connectivity
check_database() {
    log "بررسی اتصال دیتابیس..."
    
    if docker exec exchange_mongodb_prod mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
        success "اتصال به MongoDB موفقیت‌آمیز است"
    else
        error "اتصال به MongoDB برقرار نیست"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log "بررسی اتصال Redis..."
    
    if docker exec exchange_redis_prod redis-cli ping | grep -q "PONG"; then
        success "اتصال به Redis موفقیت‌آمیز است"
    else
        error "اتصال به Redis برقرار نیست"
        return 1
    fi
}

# Generate health report
generate_report() {
    local total_checks=$1
    local failed_checks=$2
    local success_rate=$(( (total_checks - failed_checks) * 100 / total_checks ))
    
    echo ""
    echo "========================================="
    echo -e "${BLUE}گزارش سلامت سیستم${NC}"
    echo "========================================="
    echo "زمان بررسی: $(date)"
    echo "تعداد کل بررسی‌ها: $total_checks"
    echo "بررسی‌های موفق: $((total_checks - failed_checks))"
    echo "بررسی‌های ناموفق: $failed_checks"
    echo "نرخ موفقیت: $success_rate%"
    echo ""
    
    if [ "$failed_checks" -eq 0 ]; then
        success "تمام بررسی‌ها موفقیت‌آمیز بودند! 🎉"
    elif [ "$success_rate" -ge 80 ]; then
        warning "سیستم عمدتاً سالم است اما نیاز به بررسی دارد"
    else
        error "سیستم مشکلات جدی دارد و نیاز به توجه فوری دارد"
    fi
    
    echo "لاگ کامل: $LOG_FILE"
}

# Main function
main() {
    echo -e "${GREEN}🏥 بررسی سلامت پلتفرم صرافی${NC}"
    echo "======================================="
    
    local total_checks=0
    local failed_checks=0
    
    # Infrastructure checks
    ((total_checks++))
    check_containers || ((failed_checks++))
    
    ((total_checks++))
    check_disk_space || ((failed_checks++))
    
    ((total_checks++))
    check_memory || ((failed_checks++))
    
    ((total_checks++))
    check_cpu_load || ((failed_checks++))
    
    # Service checks
    ((total_checks++))
    check_database || ((failed_checks++))
    
    ((total_checks++))
    check_redis || ((failed_checks++))
    
    # Application checks
    ((total_checks++))
    check_service "Backend Health" "$BACKEND_URL/health" || ((failed_checks++))
    
    ((total_checks++))
    check_service "Backend Ready" "$BACKEND_URL/health/ready" || ((failed_checks++))
    
    ((total_checks++))
    check_service "Frontend" "$FRONTEND_URL/health" || ((failed_checks++))
    
    # SSL check (if domain provided)
    if [ -n "$1" ]; then
        ((total_checks++))
        check_ssl_certificate "$1" || ((failed_checks++))
    fi
    
    # Generate report
    generate_report $total_checks $failed_checks
    
    # Exit with appropriate code
    if [ "$failed_checks" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"
