# Fly.io Deployment Guide for Exchange Platform v3

This guide provides step-by-step instructions for deploying the Exchange Platform to Fly.io with optimized configurations.

## Prerequisites

1. **Fly.io Account**: Sign up at [fly.io](https://fly.io)
2. **Fly CLI**: Install flyctl
   ```bash
   # macOS
   brew install flyctl
   
   # Linux/WSL
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```
3. **Node.js 18+**: Required for local development and testing
4. **Git**: For version control

## Step 1: Authentication

```bash
# Login to Fly.io
flyctl auth login

# Verify authentication
flyctl auth whoami
```

## Step 2: Database Setup

### MongoDB Setup
```bash
# Create MongoDB app
flyctl apps create exchange-platform-db

# Create a volume for data persistence
flyctl volumes create mongodb_data --size 10 --app exchange-platform-db

# Deploy MongoDB
flyctl deploy --app exchange-platform-db --image mongo:5.0 \
  --env MONGO_INITDB_ROOT_USERNAME=admin \
  --env MONGO_INITDB_ROOT_PASSWORD=your-secure-password
```

### Redis Setup
```bash
# Create Redis app
flyctl apps create exchange-platform-redis

# Create a volume for Redis persistence
flyctl volumes create redis_data --size 1 --app exchange-platform-redis

# Deploy Redis
flyctl deploy --app exchange-platform-redis --image redis:7-alpine \
  --env REDIS_PASSWORD=your-redis-password
```

## Step 3: Backend Deployment

### Launch Backend App
```bash
cd backend

# Launch the backend app (this creates the app and fly.toml)
flyctl launch --name exchange-platform-backend --region fra --no-deploy

# The fly.toml file is already configured, but you can customize it if needed
```

### Set Environment Secrets
```bash
# Set required secrets
flyctl secrets set \
  JWT_SECRET="your-super-secure-jwt-secret-minimum-32-characters" \
  SESSION_SECRET="your-super-secure-session-secret-minimum-32-characters" \
  MONGODB_URI="mongodb://admin:your-secure-password@exchange-platform-db.internal:27017/exchange_platform" \
  REDIS_URL="redis://:your-redis-password@exchange-platform-redis.internal:6379" \
  --app exchange-platform-backend

# Optional: Set additional secrets
flyctl secrets set \
  EXCHANGE_API_KEY="your-exchange-rate-api-key" \
  SENTRY_DSN="your-sentry-dsn" \
  --app exchange-platform-backend
```

### Create Upload Volume
```bash
# Create persistent volume for file uploads
flyctl volumes create uploads_vol --size 1 --app exchange-platform-backend
```

### Deploy Backend
```bash
# Deploy the backend
flyctl deploy --app exchange-platform-backend

# Check deployment status
flyctl status --app exchange-platform-backend

# View logs
flyctl logs --app exchange-platform-backend
```

### Verify Backend Health
```bash
# Check health endpoint
curl https://exchange-platform-backend.fly.dev/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "components": {
#     "database": {"status": "healthy"},
#     "redis": {"status": "healthy"}
#   }
# }
```

## Step 4: Frontend Deployment

### Launch Frontend App
```bash
cd ../frontend

# Launch the frontend app
flyctl launch --name exchange-platform-frontend --region fra --no-deploy

# The fly.toml file is already configured
```

### Deploy Frontend
```bash
# Build and deploy the frontend
npm run deploy

# Alternative: Deploy manually
npm run build
flyctl deploy --app exchange-platform-frontend

# Check deployment status
flyctl status --app exchange-platform-frontend
```

### Verify Frontend Health
```bash
# Check frontend health
curl https://exchange-platform-frontend.fly.dev/health

# Test full application
open https://exchange-platform-frontend.fly.dev
```

## Step 5: SSL Certificate Configuration

SSL certificates are automatically provided by Fly.io, but you can configure custom domains:

```bash
# Add custom domain to backend
flyctl certs add api.yourdomain.com --app exchange-platform-backend

# Add custom domain to frontend
flyctl certs add yourdomain.com --app exchange-platform-frontend
flyctl certs add www.yourdomain.com --app exchange-platform-frontend

# Check certificate status
flyctl certs list --app exchange-platform-backend
flyctl certs list --app exchange-platform-frontend
```

## Step 6: DNS Configuration

Update your DNS records to point to Fly.io:

```
# For backend API
api.yourdomain.com CNAME exchange-platform-backend.fly.dev

# For frontend
yourdomain.com CNAME exchange-platform-frontend.fly.dev
www.yourdomain.com CNAME exchange-platform-frontend.fly.dev
```

## Step 7: Monitoring Setup

### Application Monitoring
```bash
# View application metrics
flyctl metrics --app exchange-platform-backend
flyctl metrics --app exchange-platform-frontend

# Monitor logs in real-time
flyctl logs --app exchange-platform-backend --follow
flyctl logs --app exchange-platform-frontend --follow
```

### Database Monitoring
```bash
# Connect to MongoDB for monitoring
flyctl ssh console --app exchange-platform-db
# Inside the container:
mongosh mongodb://admin:your-password@localhost:27017/exchange_platform

# Connect to Redis for monitoring
flyctl ssh console --app exchange-platform-redis
# Inside the container:
redis-cli -a your-redis-password
```

## Step 8: Backup Configuration

### Database Backup Script
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="exchange-platform-backup-$DATE"

# MongoDB backup
flyctl ssh console --app exchange-platform-db --command "mongodump --uri mongodb://admin:your-password@localhost:27017/exchange_platform --out /backup/$BACKUP_NAME"

# Download backup
flyctl ssh sftp get /backup/$BACKUP_NAME ./backups/ --app exchange-platform-db

echo "Backup completed: $BACKUP_NAME"
EOF

chmod +x backup-db.sh
```

### Automated Backup with GitHub Actions
Add to `.github/workflows/backup.yml`:
```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Create Database Backup
        run: ./scripts/backup-db.sh
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Step 9: Scaling Recommendations

### Auto-scaling Configuration
The apps are configured with auto-scaling in `fly.toml`:

- **Backend**: 1-3 instances based on load
- **Frontend**: 1-2 instances based on load

### Manual Scaling
```bash
# Scale backend to 2 instances
flyctl scale count 2 --app exchange-platform-backend

# Scale frontend to 2 instances  
flyctl scale count 2 --app exchange-platform-frontend

# Scale up memory if needed
flyctl scale memory 1gb --app exchange-platform-backend
```

### Performance Tuning
```bash
# Monitor resource usage
flyctl metrics --app exchange-platform-backend

# Adjust based on metrics:
# - High CPU: Scale instances
# - High memory: Scale memory
# - High response time: Scale instances or optimize code
```

## Step 10: Deployment Automation

### Using the Deployment Script
```bash
# Full deployment
./scripts/fly-deploy.sh

# Deploy only backend
./scripts/fly-deploy.sh backend

# Deploy only frontend
./scripts/fly-deploy.sh frontend

# Verify deployment
./scripts/fly-deploy.sh verify
```

### GitHub Actions Deployment
The repository includes `.github/workflows/fly-deploy.yml` which automatically deploys on push to main branch.

Required secrets in GitHub:
- `FLY_API_TOKEN`: Your Fly.io API token

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   ```bash
   # Check logs
   flyctl logs --app exchange-platform-backend
   
   # SSH into container
   flyctl ssh console --app exchange-platform-backend
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   flyctl ssh console --app exchange-platform-backend --command "npm run migrate test"
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   flyctl metrics --app exchange-platform-backend
   
   # Scale memory if needed
   flyctl scale memory 1gb --app exchange-platform-backend
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   flyctl certs list --app exchange-platform-frontend
   
   # Show certificate details
   flyctl certs show yourdomain.com --app exchange-platform-frontend
   ```

### Debug Commands
```bash
# View app configuration
flyctl config show --app exchange-platform-backend

# Check app status
flyctl status --app exchange-platform-backend

# View recent deployments
flyctl releases --app exchange-platform-backend

# Rollback if needed
flyctl releases rollback --app exchange-platform-backend
```

## Useful Commands

```bash
# View all apps
flyctl apps list

# Open app dashboard
flyctl dashboard --app exchange-platform-backend

# SSH into app
flyctl ssh console --app exchange-platform-backend

# View environment variables
flyctl config env --app exchange-platform-backend

# Update secrets
flyctl secrets set KEY=value --app exchange-platform-backend

# View resource usage
flyctl metrics --app exchange-platform-backend

# Restart app
flyctl restart --app exchange-platform-backend
```

## Security Best Practices

1. **Secrets Management**: Always use `flyctl secrets` for sensitive data
2. **Network Security**: Use Fly.io's internal networking for database connections
3. **SSL/TLS**: Enable HTTPS for all external traffic
4. **Regular Updates**: Keep dependencies and base images updated
5. **Monitoring**: Set up alerts for unusual activity
6. **Backup**: Implement regular automated backups
7. **Access Control**: Limit SSH access to production systems

## Performance Optimization

1. **Regional Deployment**: Deploy close to your users (fra region configured)
2. **Auto-scaling**: Configure based on actual usage patterns
3. **Caching**: Implement Redis caching for frequently accessed data
4. **CDN**: Use a CDN for static assets
5. **Database Optimization**: Regular index maintenance and query optimization
6. **Monitoring**: Use APM tools for performance insights

## Cost Optimization

1. **Right-sizing**: Monitor usage and adjust instance sizes
2. **Auto-sleep**: Configure auto-sleep for development environments
3. **Volume Management**: Regular cleanup of upload volumes
4. **Logging**: Implement log rotation to manage storage costs

## Support

- **Fly.io Documentation**: https://fly.io/docs/
- **Exchange Platform Issues**: Create an issue in the GitHub repository
- **Community Support**: Fly.io community forum

---

## Quick Reference

### Application URLs
- Backend: https://exchange-platform-backend.fly.dev
- Frontend: https://exchange-platform-frontend.fly.dev
- Health Check: https://exchange-platform-backend.fly.dev/health

### Key Files
- `backend/fly.toml` - Backend configuration
- `frontend/fly.toml` - Frontend configuration
- `scripts/fly-deploy.sh` - Deployment script
- `.github/workflows/fly-deploy.yml` - CI/CD pipeline

This deployment is optimized for production use with proper security, monitoring, and scaling configurations.