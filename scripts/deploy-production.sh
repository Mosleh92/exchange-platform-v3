#!/bin/bash

# Exchange Platform V3 - Production Deployment Script
# This script helps set up the production environment

set -e

echo "🚀 Exchange Platform V3 - Production Setup"
echo "=========================================="

# Check Node.js version
node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Check for required environment variables
echo "🔧 Checking environment configuration..."

if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your production settings before running the server."
fi

# Validate critical environment variables
source .env 2>/dev/null || true

required_vars=("NODE_ENV" "JWT_SECRET" "SESSION_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf ' - %s\n' "${missing_vars[@]}"
    echo "Please set these in your .env file."
    exit 1
fi

echo "✅ Environment configuration looks good"

# Security check
if [ "$JWT_SECRET" = "dev-jwt-secret-key-not-for-production-use" ]; then
    echo "⚠️  WARNING: Using development JWT secret in production!"
    echo "Please set a secure JWT_SECRET in your .env file."
fi

# Database connection check (if MongoDB URI is provided)
if [ -n "$MONGODB_URI" ]; then
    echo "🗄️  Database URI configured"
else
    echo "⚠️  No database URI configured - running in demo mode"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p tmp/uploads

# Set proper permissions
chmod 755 logs tmp/uploads

# Test the application startup
echo "🧪 Testing application startup..."
timeout 10s npm start &
PID=$!

sleep 5

# Check if the process is still running
if kill -0 $PID 2>/dev/null; then
    echo "✅ Application started successfully"
    
    # Test health endpoint
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Health endpoint responding"
    else
        echo "⚠️  Health endpoint not responding (may be normal if port is different)"
    fi
    
    # Stop test process
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
else
    echo "❌ Application failed to start"
    exit 1
fi

echo ""
echo "🎉 Production setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with production settings"
echo "2. Set up MongoDB database (if not using demo mode)"
echo "3. Configure reverse proxy (nginx/apache) if needed"
echo "4. Set up SSL certificate for HTTPS"
echo "5. Configure monitoring and alerting"
echo ""
echo "To start the production server:"
echo "  npm start"
echo ""
echo "To check system health:"
echo "  curl http://localhost:3000/api/health"
echo ""
echo "📚 Documentation: http://localhost:3000/api/docs"
echo "🎮 Demo interface: http://localhost:3000/demo.html"
echo ""