# راهنمای دپلوی | Deployment Guide

## 📋 فهرست مطالب

- [پیش‌نیازها](#پیش‌نیازها)
- [محیط Development](#محیط-development)
- [محیط Staging](#محیط-staging)
- [محیط Production](#محیط-production)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)

## پیش‌نیازها

### نرم‌افزارهای مورد نیاز
- Node.js >= 16.0.0
- npm >= 8.0.0
- Docker >= 20.10
- Docker Compose >= 2.0
- Git >= 2.30
- MongoDB >= 5.0
- Redis >= 6.0

### سرویس‌های ابری (اختیاری)
- AWS / Azure / GCP
- MongoDB Atlas
- Redis Cloud
- CloudFlare CDN

## محیط Development

### راه‌اندازی محلی

#### 1. کلون پروژه
```bash
git clone https://github.com/your-username/exchange-platform-v3.git
cd exchange-platform-v3
```

#### 2. نصب وابستگی‌ها
```bash
# نصب وابستگی‌های اصلی
npm install

# نصب وابستگی‌های بک‌اند
cd backend
npm install

# نصب وابستگی‌های فرانت‌اند
cd ../frontend
npm install
```

#### 3. تنظیم متغیرهای محیطی

**Backend (.env)**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/exchange_platform_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_ROUNDS=10
SESSION_SECRET=dev-session-secret

# External APIs
EXCHANGE_RATE_API_KEY=your-dev-api-key
EXCHANGE_RATE_BASE_URL=https://api.exchangerate-api.com/v4
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=پلتفرم صرافی (Development)
VITE_APP_VERSION=1.0.0
VITE_SOCKET_URL=http://localhost:5000
```

#### 4. راه‌اندازی دیتابیس
```bash
# راه‌اندازی MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# راه‌اندازی Redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### 5. Seed داده‌ها
```bash
cd backend
npm run seed
```

#### 6. اجرای پروژه
```bash
# ترمینال 1 - Backend
cd backend
npm run dev

# ترمینال 2 - Frontend
cd frontend
npm run dev
```

### Docker Development

#### 1. فایل docker-compose.dev.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: exchange_mongodb_dev
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:6.0-alpine
    container_name: exchange_redis_dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: exchange_backend_dev
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/exchange_platform_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: exchange_frontend_dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mongodb_data:
  redis_data:
```

#### 2. اجرا
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## محیط Staging

### راه‌اندازی Staging

#### 1. فایل docker-compose.staging.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: exchange_mongodb_staging
    ports:
      - "27017:27017"
    volumes:
      - mongodb_staging_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    networks:
      - exchange_network

  redis:
    image: redis:6.0-alpine
    container_name: exchange_redis_staging
    ports:
      - "6379:6379"
    volumes:
      - redis_staging_data:/data
    networks:
      - exchange_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: exchange_backend_staging
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=staging
      - MONGODB_URI=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/exchange_platform_staging
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - mongodb
      - redis
    networks:
      - exchange_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: exchange_frontend_staging
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=http://staging-api.exchange.com/api
    depends_on:
      - backend
    networks:
      - exchange_network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: exchange_nginx_staging
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.staging.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - exchange_network
    restart: unless-stopped

volumes:
  mongodb_staging_data:
  redis_staging_data:

networks:
  exchange_network:
    driver: bridge
```

#### 2. متغیرهای محیطی Staging
```env
# .env.staging
NODE_ENV=staging
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password
JWT_SECRET=staging-jwt-secret-key
JWT_REFRESH_SECRET=staging-refresh-secret-key
REDIS_PASSWORD=redis-password
```

#### 3. اجرا
```bash
# Build و اجرا
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d

# مشاهده لاگ‌ها
docker-compose -f docker-compose.staging.yml logs -f

# توقف
docker-compose -f docker-compose.staging.yml down
```

## محیط Production

### راه‌اندازی Production

#### 1. فایل docker-compose.production.yml
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: exchange_mongodb_prod
    volumes:
      - mongodb_prod_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    networks:
      - exchange_prod_network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  redis:
    image: redis:6.0-alpine
    container_name: exchange_redis_prod
    volumes:
      - redis_prod_data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - exchange_prod_network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: exchange_backend_prod
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017/exchange_platform_prod
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    depends_on:
      - mongodb
      - redis
    networks:
      - exchange_prod_network
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '1'
        reservations:
          memory: 512M
          cpus: '0.5'
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: exchange_frontend_prod
    environment:
      - VITE_API_BASE_URL=https://api.exchange.com/api
    depends_on:
      - backend
    networks:
      - exchange_prod_network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  nginx:
    image: nginx:alpine
    container_name: exchange_nginx_prod
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.production.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - exchange_prod_network
    restart: unless-stopped
    deploy:
      replicas: 2

volumes:
  mongodb_prod_data:
    driver: local
  redis_prod_data:
    driver: local

networks:
  exchange_prod_network:
    driver: bridge
```

#### 2. متغیرهای محیطی Production
```env
# .env.production
NODE_ENV=production
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=very-secure-password
JWT_SECRET=very-secure-jwt-secret-key-256-bits
JWT_REFRESH_SECRET=very-secure-refresh-secret-key-256-bits
REDIS_PASSWORD=very-secure-redis-password
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 3. اجرا
```bash
# Build و اجرا
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# مشاهده لاگ‌ها
docker-compose -f docker-compose.production.yml logs -f

# Scale سرویس‌ها
docker-compose -f docker-compose.production.yml up -d --scale backend=5 --scale frontend=3
```

## Docker Deployment

### Dockerfile ها

#### Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:16-alpine

WORKDIR /app

# نصب وابستگی‌ها
COPY package*.json ./
RUN npm ci --only=production

# کپی کد
COPY . .

# ایجاد کاربر غیر root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose پورت
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# اجرای اپلیکیشن
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:16-alpine as builder

WORKDIR /app

# نصب وابستگی‌ها
COPY package*.json ./
RUN npm ci

# کپی کد و build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# کپی فایل‌های build شده
COPY --from=builder /app/dist /usr/share/nginx/html

# کپی تنظیمات nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Expose پورت
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose برای Development
```dockerfile
# backend/Dockerfile.dev
FROM node:16-alpine

WORKDIR /app

# نصب وابستگی‌ها
COPY package*.json ./
RUN npm install

# کپی کد
COPY . .

# Expose پورت
EXPOSE 5000

# اجرای اپلیکیشن در development mode
CMD ["npm", "run", "dev"]
```

## Kubernetes Deployment

### Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: exchange-platform
```

### ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: exchange-config
  namespace: exchange-platform
data:
  NODE_ENV: "production"
  MONGODB_URI: "mongodb://mongodb-service:27017/exchange_platform_prod"
  REDIS_URL: "redis://redis-service:6379"
  VITE_API_BASE_URL: "https://api.exchange.com/api"
```

### Secret
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: exchange-secrets
  namespace: exchange-platform
type: Opaque
data:
  JWT_SECRET: <base64-encoded-jwt-secret>
  JWT_REFRESH_SECRET: <base64-encoded-refresh-secret>
  MONGO_ROOT_PASSWORD: <base64-encoded-mongo-password>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

### Deployment Backend
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: exchange-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: exchange-platform/backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: exchange-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: exchange-secrets
              key: JWT_SECRET
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Backend
```yaml
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: exchange-platform
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
```

### Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: exchange-ingress
  namespace: exchange-platform
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.exchange.com
    - exchange.com
    secretName: exchange-tls
  rules:
  - host: api.exchange.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
  - host: exchange.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

## CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd backend && npm ci
        cd ../frontend && npm ci
    
    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm test
    
    - name: Run security audit
      run: |
        npm run security:audit
        cd backend && npm run security:audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: exchange-platform/backend:latest
    
    - name: Build and push Frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: exchange-platform/frontend:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      uses: steebchen/kubectl@v2
      with:
        config: ${{ secrets.KUBE_CONFIG_DATA }}
        command: apply -f k8s/
```

## Monitoring & Logging

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'exchange-backend'
    static_configs:
      - targets: ['backend-service:5000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'exchange-frontend'
    static_configs:
      - targets: ['frontend-service:80']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-service:27017']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-service:6379']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Exchange Platform Dashboard",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "mongodb_connections_current"
          }
        ]
      },
      {
        "title": "Redis Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "redis_memory_used_bytes"
          }
        ]
      }
    ]
  }
}
```

## Backup & Recovery

### Database Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

# تنظیمات
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="mongodb://admin:password@localhost:27017"
DATABASES=("exchange_platform_prod" "exchange_platform_staging")

# ایجاد پوشه backup
mkdir -p $BACKUP_DIR

# Backup هر دیتابیس
for db in "${DATABASES[@]}"
do
  echo "Backing up $db..."
  mongodump --uri="$MONGODB_URI/$db" --out="$BACKUP_DIR/$db_$DATE"
  
  # فشرده‌سازی
  tar -czf "$BACKUP_DIR/$db_$DATE.tar.gz" -C "$BACKUP_DIR" "$db_$DATE"
  rm -rf "$BACKUP_DIR/$db_$DATE"
  
  echo "Backup completed: $BACKUP_DIR/$db_$DATE.tar.gz"
done

# حذف backup های قدیمی (بیش از 30 روز)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# آپلود به cloud storage (اختیاری)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/
```

### Recovery Script
```bash
#!/bin/bash
# scripts/recovery.sh

BACKUP_FILE=$1
MONGODB_URI="mongodb://admin:password@localhost:27017"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.tar.gz>"
  exit 1
fi

# استخراج فایل backup
tar -xzf $BACKUP_FILE

# بازیابی دیتابیس
mongorestore --uri="$MONGODB_URI" --drop $BACKUP_FILE

echo "Recovery completed successfully"
```

---

**نسخه راهنما**: v1.0.0  
**آخرین بروزرسانی**: 2024  
**توسعه‌دهنده**: Exchange Platform Team 