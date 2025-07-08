# 🏦 Exchange Platform v3 - Multi-Tenant System

A comprehensive multi-tenant exchange platform built with Node.js, React, and MongoDB.

## 🌟 Features

- **Multi-Tenant Architecture** - Support for multiple organizations
- **Role-Based Access Control** - Super Admin, Tenant Admin, Manager, Staff, Customer
- **Real-time Trading** - WebSocket-based live updates
- **P2P Marketplace** - Peer-to-peer exchange functionality
- **Financial Management** - Accounting, invoicing, and reporting
- **Document Management** - Secure file upload and storage
- **Multi-Currency Support** - Multiple currency exchange rates
- **Mobile Responsive** - Works on all devices
- **Real-time Notifications** - Instant updates via WebSocket

## 🔒 Security Features

- **Tenant Isolation** - Complete data separation between organizations
- **Authentication & Authorization** - JWT-based auth with role-based permissions
- **Input Validation & Sanitization** - Comprehensive data validation and XSS protection
- **Rate Limiting** - API rate limiting to prevent abuse
- **Security Logging** - Comprehensive audit trails and security event logging
- **Error Handling** - Secure error handling without information disclosure
- **Connection Pooling** - Optimized database and cache connections
- **Monitoring & Alerting** - Health checks and performance monitoring

## 📊 Performance Optimizations

- **Database Indexing** - Optimized indexes for all tenant-scoped queries
- **Redis Caching** - Multi-layer caching with tenant isolation
- **Connection Pooling** - MongoDB and Redis connection optimization
- **Monitoring** - Real-time performance metrics and health checks
- **Logging** - Structured logging with security and performance insights

## 🏗️ Architecture

```
├── backend/          # Node.js API Server
│   ├── src/
│   │   ├── controllers/    # API Controllers
│   │   ├── models/         # Database Models
│   │   ├── routes/         # API Routes
│   │   ├── middleware/     # Custom Middleware
│   │   └── services/       # Business Logic
│   └── tests/              # Backend Tests
├── frontend/         # React Application
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── pages/          # Page Components
│   │   ├── services/       # API Services
│   │   └── contexts/       # React Contexts
│   └── public/             # Static Assets
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 6+
- Redis 6+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/exchange-platform-v3.git
   cd exchange-platform-v3
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cd backend
   cp env.example .env
   # Edit .env with your configuration
   
   # Frontend environment
   cd ../frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB and Redis
   # Then run database setup
   cd backend
   npm run setup
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:5173/admin

## 🔐 Security Configuration

### Environment Variables

The following environment variables are required for security:

```bash
# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
SESSION_SECRET=your-session-secret-key

# Database Security
DATABASE_URL=mongodb://localhost:27017/exchange_platform
CUSTOMER_ENCRYPTION_KEY=your-customer-data-encryption-key

# Redis Cache
REDIS_URL=redis://localhost:6379

# Security Settings
NODE_ENV=production
BCRYPT_ROUNDS=12
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Security Best Practices

1. **Strong Secrets**: Use cryptographically strong secrets for JWT and session keys
2. **Environment Security**: Never commit `.env` files to version control
3. **Database Security**: Use MongoDB authentication and encryption at rest
4. **Network Security**: Use HTTPS in production and secure firewall rules
5. **Regular Updates**: Keep dependencies updated and monitor for security advisories

### Monitoring and Logging

- **Health Checks**: `/health` endpoint for system monitoring
- **Metrics**: `/metrics` endpoint for Prometheus integration
- **Logs**: Structured logging to files and console
- **Alerts**: Built-in alerting for security events and system issues

### Security Endpoints

- `GET /health` - Comprehensive health check
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe
- `GET /metrics` - Application metrics
- `GET /health/alerts` - Current system alerts

## 🛠️ Available Scripts

### Backend
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run setup        # Setup database and seed data
npm run build        # Build for production
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

## 🔐 Default Login Credentials

### Super Admin
- **Email**: admin@exchange.com
- **Password**: admin123

### Tenant Admin
- **Email**: tenant@exchange.com
- **Password**: tenant123

### Customer
- **Email**: customer@exchange.com
- **Password**: customer123

## 🌐 Deployment

### Free Hosting Options

1. **Railway** - Recommended for full-stack apps
2. **Render** - Good for Node.js applications
3. **Heroku** - Classic choice with good free tier
4. **Vercel** - Excellent for frontend deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t exchange-backend ./backend
docker build -t exchange-frontend ./frontend
```

## 📊 System Roles

### Super Admin
- Manage all tenants
- System-wide settings
- Global reports
- User management

### Tenant Admin
- Manage their organization
- Staff management
- Financial reports
- Settings configuration

### Manager
- Branch management
- Customer oversight
- Transaction approval
- Report generation

### Staff
- Customer service
- Transaction processing
- Basic reporting
- Document handling

### Customer
- Personal dashboard
- Transaction history
- Document upload
- P2P trading

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/exchange
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME=Exchange Platform
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **Postman Collection**: `docs/Postman_Collection.json`
- **API Documentation**: `docs/API_DOCUMENTATION.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder
- **Issues**: Create an issue on GitHub
- **Email**: support@exchange.com

## 🔄 Version History

- **v3.0.0** - Multi-tenant architecture, P2P marketplace
- **v2.0.0** - Real-time features, WebSocket integration
- **v1.0.0** - Basic exchange functionality

---

**Built with ❤️ using Node.js, React, and MongoDB**
# exchange-platform-v
# exchange-platform-v3
