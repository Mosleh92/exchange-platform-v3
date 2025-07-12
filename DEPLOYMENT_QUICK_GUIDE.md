# Exchange Platform V3 - Deployment Guide

## Quick Deployment Solutions

### 🚀 **Render.com (Recommended)**

1. **Connect Repository**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` configuration

2. **Environment Variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret-minimum-64-characters
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/exchange_platform
   ```

3. **Automatic Deployment**
   - Render will use the `render.yaml` configuration
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: Auto-assigned by Render

### ⚡ **Vercel (Frontend + Serverless API)**

1. **Deploy Frontend**
   ```bash
   npm install -g vercel
   cd frontend
   vercel
   ```

2. **API Configuration**
   - The `api/index.js` provides serverless API endpoints
   - Vercel will automatically deploy API routes

3. **Environment Variables in Vercel**
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-secure-secret
   MONGODB_URI=your-mongodb-connection-string
   ```

### 🎯 **Heroku**

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret
   heroku config:set MONGODB_URI=your-mongodb-uri
   ```

3. **Add MongoDB**
   ```bash
   heroku addons:create mongolab:sandbox
   ```

### 🐳 **Docker (Any Platform)**

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update values for production

## Environment Variables Guide

### Required Variables
```bash
# Application
NODE_ENV=production
PORT=3000  # Auto-set by hosting platforms

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/exchange_platform

# Security (CRITICAL - Generate strong secrets)
JWT_SECRET=your-super-secure-64-character-minimum-secret-key-here
SESSION_SECRET=your-super-secure-64-character-session-secret-here

# Frontend URL (Update for your domain)
FRONTEND_URL=https://your-domain.com
```

### Platform-Specific Environment Variables

#### Render.com
```bash
# Auto-populated by Render
DATABASE_URL=auto-populated-if-using-render-db
REDIS_URL=auto-populated-if-using-render-redis
```

#### Vercel
```bash
# Frontend variables (prefix with VITE_)
VITE_API_URL=/api
VITE_APP_NAME=Exchange Platform
```

#### Heroku
```bash
# Auto-populated by Heroku
PORT=auto-populated
DATABASE_URL=auto-populated-if-addon-added
```

## Database Options

### Option 1: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and get connection string
3. Set `MONGODB_URI` environment variable

### Option 2: Platform-Specific Database
- **Render**: Use Render's MongoDB service
- **Heroku**: Add mLab or MongoDB Atlas addon
- **Vercel**: Use external MongoDB Atlas

## Health Check Endpoints

After deployment, verify these endpoints work:

- `GET /health` - General health check
- `GET /api/health` - API health check  
- `GET /api/test` - API functionality test
- `GET /api/status` - System status

## Build Verification

Run this locally before deploying:

```bash
# Install dependencies
npm run install:all

# Build project
npm run build

# Test server
npm start

# Run health check
node scripts/health-check.js
```

## Common Issues & Solutions

### Issue: Build Fails
**Solution**: Make sure all dependencies are installed
```bash
cd frontend && npm install
cd ../backend && npm install
```

### Issue: API Not Working
**Solution**: Check environment variables are set correctly

### Issue: Database Connection
**Solution**: Verify MongoDB URI format and credentials

### Issue: Frontend Not Loading
**Solution**: Check if frontend build completed and files exist in `frontend/dist`

## Security Checklist

- [ ] JWT_SECRET is at least 64 characters
- [ ] SESSION_SECRET is unique and secure
- [ ] MongoDB credentials are secure
- [ ] Environment variables are properly set
- [ ] CORS is configured for your domain
- [ ] HTTPS is enabled in production

## Support

If you encounter issues:

1. Check the health endpoints
2. Review server logs
3. Verify environment variables
4. Check database connectivity
5. Run the health check script

## Quick Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Health check
node scripts/health-check.js

# Install all dependencies
npm run install:all
```