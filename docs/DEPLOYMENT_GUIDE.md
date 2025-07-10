# 🚀 Production Deployment Guide

## Overview
Complete guide for deploying Exchange Platform v3 to production with security, performance, and monitoring best practices.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [Security Configuration](#security-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **CPU**: 4+ cores (8+ recommended)
- **RAM**: 8GB+ (16GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: Stable internet connection

### Software Requirements
```bash
# Node.js 18+ LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB 6.0+
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Redis (for caching)
sudo apt-get install -y redis-server

# Nginx (for reverse proxy)
sudo apt-get install -y nginx

# PM2 (for process management)
sudo npm install -g pm2
```

### Security Requirements
- **SSL Certificate**: Valid SSL certificate for domain
- **Firewall**: Configured firewall rules
- **SSH**: Secure SSH configuration
- **Updates**: Regular security updates

## 🌍 Environment Setup

### 1. Create Production User
```bash
# Create production user
sudo adduser exchange
sudo usermod -aG sudo exchange
sudo su - exchange

# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "exchange@production"
```

### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git unzip build-essential
sudo apt install -y python3 python3-pip
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Configure Firewall
```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # Backend API
sudo ufw allow 3001  # Frontend
sudo ufw enable
```

## 🗄️ Database Setup

### 1. MongoDB Configuration
```bash
# Create MongoDB data directory
sudo mkdir -p /data/db
sudo chown -R mongodb:mongodb /data/db

# Configure MongoDB
sudo nano /etc/mongod.conf
```

**MongoDB Configuration:**
```yaml
# /etc/mongod.conf
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

storage:
  dbPath: /data/db
  journal:
    enabled: true

net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

setParameter:
  enableLocalhostAuthBypass: false
```

### 2. Create Database User
```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongosh admin --eval '
db.createUser({
  user: "admin",
  pwd: "SECURE_ADMIN_PASSWORD",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})
'

# Create application user
mongosh exchange_platform --eval '
db.createUser({
  user: "exchange_app",
  pwd: "SECURE_APP_PASSWORD",
  roles: [
    { role: "readWrite", db: "exchange_platform" },
    { role: "dbAdmin", db: "exchange_platform" }
  ]
})
'
```

### 3. Redis Configuration
```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Redis Configuration:**
```conf
# /etc/redis/redis.conf
bind 127.0.0.1
port 6379
requirepass SECURE_REDIS_PASSWORD
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🚀 Application Deployment

### 1. Clone Repository
```bash
# Clone application
cd /home/exchange
git clone https://github.com/Mosleh92/exchange-platform-v3.git
cd exchange-platform-v3

# Install dependencies
npm ci --production
```

### 2. Environment Configuration
```bash
# Create environment file
nano .env.production
```

**Environment Variables:**
```env
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://exchange_app:SECURE_APP_PASSWORD@localhost:27017/exchange_platform?authSource=exchange_platform

# Redis
REDIS_URL=redis://:SECURE_REDIS_PASSWORD@localhost:6379

# Security
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_AT_LEAST_64_CHARS
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=YOUR_REFRESH_TOKEN_SECRET
REFRESH_TOKEN_EXPIRES_IN=7d

# Session
SESSION_SECRET=YOUR_SESSION_SECRET

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# File Upload
UPLOAD_PATH=/home/exchange/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### 3. PM2 Configuration
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**PM2 Configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'exchange-platform-backend',
    script: './backend/src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    instances: 4,
    exec_mode: 'cluster'
  }, {
    name: 'exchange-platform-frontend',
    script: 'serve',
    args: '-s frontend/dist -l 3001',
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 4. Start Application
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🔒 Security Configuration

### 1. SSL Certificate
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx Configuration
```bash
# Configure Nginx
sudo nano /etc/nginx/sites-available/exchange-platform
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/exchange-platform
upstream backend {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /uploads/ {
        alias /home/exchange/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

# Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/exchange-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Security Hardening
```bash
# Configure SSH
sudo nano /etc/ssh/sshd_config
```

**SSH Configuration:**
```conf
# /etc/ssh/sshd_config
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key
UsePrivilegeSeparation yes
KeyRegenerationInterval 3600
ServerKeyBits 1024
SyslogFacility AUTH
LogLevel INFO
LoginGraceTime 120
PermitRootLogin no
StrictModes yes
RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile %h/.ssh/authorized_keys
IgnoreRhosts yes
RhostsRSAAuthentication no
HostbasedAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
PasswordAuthentication yes
X11Forwarding yes
X11DisplayOffset 10
PrintMotd no
PrintLastLog yes
TCPKeepAlive yes
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
UsePAM yes
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

## 📊 Monitoring & Logging

### 1. Log Management
```bash
# Create log directory
mkdir -p /home/exchange/logs

# Configure logrotate
sudo nano /etc/logrotate.d/exchange-platform
```

**Logrotate Configuration:**
```conf
# /etc/logrotate.d/exchange-platform
/home/exchange/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 exchange exchange
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. Monitoring Setup
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Create monitoring script
nano /home/exchange/monitor.sh
```

**Monitoring Script:**
```bash
#!/bin/bash
# /home/exchange/monitor.sh

LOG_FILE="/home/exchange/logs/system-$(date +%Y%m%d).log"

echo "$(date): Starting system monitoring..." >> $LOG_FILE

# CPU and Memory
echo "CPU Usage: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%" >> $LOG_FILE
echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')" >> $LOG_FILE

# Disk Usage
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')" >> $LOG_FILE

# Application Status
if pm2 list | grep -q "online"; then
    echo "Application Status: ONLINE" >> $LOG_FILE
else
    echo "Application Status: OFFLINE" >> $LOG_FILE
fi

# Database Status
if systemctl is-active --quiet mongod; then
    echo "Database Status: ONLINE" >> $LOG_FILE
else
    echo "Database Status: OFFLINE" >> $LOG_FILE
fi

# Network
echo "Network Connections: $(netstat -an | wc -l)" >> $LOG_FILE
```

```bash
# Make executable
chmod +x /home/exchange/monitor.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/exchange/monitor.sh
```

### 3. Alerting Setup
```bash
# Create alert script
nano /home/exchange/alert.sh
```

**Alert Script:**
```bash
#!/bin/bash
# /home/exchange/alert.sh

# Check application status
if ! pm2 list | grep -q "online"; then
    echo "ALERT: Application is offline!" | mail -s "Exchange Platform Alert" admin@your-domain.com
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%!" | mail -s "Exchange Platform Alert" admin@your-domain.com
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "ALERT: Memory usage is ${MEMORY_USAGE}%!" | mail -s "Exchange Platform Alert" admin@your-domain.com
fi
```

## ⚡ Performance Optimization

### 1. Database Optimization
```bash
# MongoDB optimization
sudo nano /etc/mongod.conf
```

**MongoDB Performance Settings:**
```yaml
# /etc/mongod.conf
storage:
  dbPath: /data/db
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

setParameter:
  enableLocalhostAuthBypass: false
  maxTransactionLockRequestTimeoutMillis: 5000
```

### 2. Node.js Optimization
```bash
# Node.js performance settings
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
export UV_THREADPOOL_SIZE=64
```

### 3. Nginx Optimization
```bash
# Nginx performance settings
sudo nano /etc/nginx/nginx.conf
```

**Nginx Performance Settings:**
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Application Won't Start**
```bash
# Check logs
pm2 logs exchange-platform-backend
pm2 logs exchange-platform-frontend

# Check environment
pm2 env exchange-platform-backend

# Restart application
pm2 restart all
```

2. **Database Connection Issues**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh --host localhost --port 27017 --username exchange_app --password SECURE_APP_PASSWORD
```

3. **Nginx Issues**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

4. **SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"
```

### Performance Monitoring

1. **System Resources**
```bash
# CPU and Memory
htop

# Disk I/O
iotop

# Network
nethogs

# Process monitoring
pm2 monit
```

2. **Application Metrics**
```bash
# PM2 metrics
pm2 show exchange-platform-backend

# MongoDB metrics
mongosh --eval "db.serverStatus()"

# Nginx metrics
curl -s http://localhost/nginx_status
```

3. **Log Analysis**
```bash
# Application logs
tail -f /home/exchange/logs/combined.log

# Error logs
tail -f /home/exchange/logs/err.log

# System logs
sudo journalctl -f
```

## 📞 Support

### Emergency Contacts
- **Technical Support**: tech-support@exchange.com
- **Security Issues**: security@exchange.com
- **Database Issues**: db-support@exchange.com

### Documentation
- **API Documentation**: https://docs.exchange.com/api
- **Database Schema**: https://docs.exchange.com/database
- **Troubleshooting**: https://docs.exchange.com/troubleshooting

### Monitoring Dashboard
- **Application Status**: https://status.exchange.com
- **Performance Metrics**: https://metrics.exchange.com
- **Error Tracking**: https://errors.exchange.com 