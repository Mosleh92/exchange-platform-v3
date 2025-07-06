#!/bin/bash

# ==============================================
# اسکریپت راه‌اندازی اولیه سرور Production
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Update system packages
update_system() {
    log "به‌روزرسانی سیستم..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get upgrade -y
        sudo apt-get install -y curl wget git unzip
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y curl wget git unzip
    else
        warning "Package manager شناسایی نشد"
    fi
    
    success "سیستم به‌روزرسانی شد"
}

# Install Docker
install_docker() {
    log "نصب Docker..."
    
    if command -v docker &> /dev/null; then
        warning "Docker قبلاً نصب شده است"
        return
    fi
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    success "Docker نصب شد"
}

# Install Docker Compose
install_docker_compose() {
    log "نصب Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        warning "Docker Compose قبلاً نصب شده است"
        return
    fi
    
    # Download and install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    success "Docker Compose نصب شد"
}

# Setup firewall
setup_firewall() {
    log "تنظیم firewall..."
    
    if command -v ufw &> /dev/null; then
        # Enable UFW
        sudo ufw --force enable
        
        # Allow SSH
        sudo ufw allow ssh
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Allow specific ports for monitoring (optional)
        sudo ufw allow 9090/tcp  # Prometheus
        sudo ufw allow 3001/tcp  # Grafana
        
        success "Firewall تنظیم شد"
    else
        warning "UFW یافت نشد، firewall دستی تنظیم کنید"
    fi
}

# Create directory structure
create_directories() {
    log "ایجاد ساختار پوشه‌ها..."
    
    mkdir -p {logs,backups,secrets,ssl,nginx/logs,monitoring}
    
    # Set proper permissions
    chmod 700 secrets
    chmod 755 logs backups nginx/logs
    
    success "ساختار پوشه‌ها ایجاد شد"
}

# Generate secrets
generate_secrets() {
    log "تولید secrets..."
    
    if [ -f "secrets/mongo_root_password.txt" ]; then
        warning "Secrets قبلاً ایجاد شده‌اند"
        return
    fi
    
    # Generate secure passwords
    echo "admin" > secrets/mongo_root_username.txt
    openssl rand -base64 32 > secrets/mongo_root_password.txt
    openssl rand -base64 32 > secrets/redis_password.txt
    openssl rand -base64 64 > secrets/jwt_secret.txt
    openssl rand -base64 64 > secrets/jwt_refresh_secret.txt
    openssl rand -base64 32 > secrets/session_secret.txt
    openssl rand -base64 32 > secrets/grafana_admin_password.txt
    
    # Set proper permissions
    chmod 600 secrets/*
    
    success "Secrets تولید شدند"
}

# Setup SSL certificates (Let's Encrypt)
setup_ssl() {
    log "راه‌اندازی SSL certificates..."
    
    read -p "آیا می‌خواهید SSL certificate با Let's Encrypt ایجاد کنید؟ (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "دامنه خود را وارد کنید: " domain
        read -p "ایمیل خود را وارد کنید: " email
        
        # Install Certbot
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        fi
        
        # Generate certificate
        sudo certbot certonly --standalone -d $domain --email $email --agree-tos --no-eff-email
        
        # Copy certificates
        sudo cp /etc/letsencrypt/live/$domain/fullchain.pem ssl/
        sudo cp /etc/letsencrypt/live/$domain/privkey.pem ssl/
        sudo chown $USER:$USER ssl/*
        
        success "SSL certificates ایجاد شدند"
    else
        warning "SSL certificates دستی تنظیم کنید"
    fi
}

# Create environment files
create_env_files() {
    log "ایجاد فایل‌های environment..."
    
    if [ ! -f "backend/.env.production" ]; then
        cp backend/.env.production.example backend/.env.production
        warning "فایل backend/.env.production ایجاد شد، آن را ویرایش کنید"
    fi
    
    if [ ! -f "frontend/.env.production" ]; then
        cp frontend/.env.production.example frontend/.env.production
        warning "فایل frontend/.env.production ایجاد شد، آن را ویرایش کنید"
    fi
    
    success "فایل‌های environment ایجاد شدند"
}

# Setup monitoring
setup_monitoring() {
    log "راه‌اندازی monitoring..."
    
    # Create Prometheus config
    cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: /metrics

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: /metrics

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

    # Create Grafana datasource config
    mkdir -p monitoring/grafana/datasources
    cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    success "Monitoring تنظیم شد"
}

# Setup backup cron job
setup_backup_cron() {
    log "راه‌اندازی backup خودکار..."
    
    # Add cron job for daily backup
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/deploy.sh backup") | crontab -
    
    success "Backup خودکار تنظیم شد (هر روز ساعت 2 صبح)"
}

# Final checks
final_checks() {
    log "بررسی‌های نهایی..."
    
    # Check Docker
    if ! docker --version &> /dev/null; then
        error "Docker نصب نشده است"
    fi
    
    # Check Docker Compose
    if ! docker-compose --version &> /dev/null; then
        error "Docker Compose نصب نشده است"
    fi
    
    # Check secrets
    if [ ! -f "secrets/jwt_secret.txt" ]; then
        error "Secrets تولید نشده‌اند"
    fi
    
    success "تمام بررسی‌ها موفقیت‌آمیز بودند"
}

# Main function
main() {
    echo -e "${GREEN}🚀 راه‌اندازی سرور Production پلتفرم صرافی${NC}"
    echo "========================================="
    
    update_system
    install_docker
    install_docker_compose
    setup_firewall
    create_directories
    generate_secrets
    setup_ssl
    create_env_files
    setup_monitoring
    setup_backup_cron
    final_checks
    
    echo ""
    success "راه‌اندازی کامل شد! 🎉"
    echo ""
    echo -e "${YELLOW}مراحل بعدی:${NC}"
    echo "1. فایل‌های .env.production را ویرایش کنید"
    echo "2. SSL certificates را تنظیم کنید (در صورت نیاز)"
    echo "3. دستور ./scripts/deploy.sh را اجرا کنید"
    echo ""
    warning "لطفاً سرور را restart کنید تا تغییرات اعمال شوند"
}

# Run main function
main "$@"
