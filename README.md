# 🏦 Enterprise Exchange Platform v4.0.0 - Multi-Tenant SaaS

A comprehensive **enterprise-grade multi-tenant exchange platform** built with Node.js, React, and PostgreSQL. Designed for financial institutions, exchange services, and banks requiring robust double-entry bookkeeping, advanced security, and scalable architecture.

## 🌟 Enterprise Features

### 🏗️ 4-Level Multi-Tenant Architecture
- **Platform Level (Super Admin)** - Global system management and oversight
- **Tenant Level (Exchange/Bank)** - Organization-wide administration and configuration
- **Branch Level (Local Offices)** - Regional branch management and operations
- **Customer Level (End Users)** - Individual account management and transactions

### 🔒 Enterprise Security Suite
- **JWT Authentication** with refresh token rotation
- **2FA Support** with TOTP (Google Authenticator, Authy)
- **Advanced Rate Limiting** and DDoS protection
- **Data Encryption** for sensitive information
- **Role-based Access Control** (RBAC) with granular permissions
- **Audit Logging** for all financial transactions
- **Input Validation** and sanitization
- **Security Headers** with Helmet.js

### 💰 Complete Financial Accounting System (25+ Modules)

#### Core Financial Operations
1. **دریافت نقدی (Cash Receipts)** - Cash income management
2. **پرداخت نقدی (Cash Payments)** - Cash outflow processing
3. **چک دریافتی (Incoming Checks)** - Check receipt handling
4. **چک پرداختی (Outgoing Checks)** - Check payment processing
5. **واریز بانکی (Bank Deposits)** - Bank deposit management
6. **برداشت بانکی (Bank Withdrawals)** - Bank withdrawal processing
7. **انتقال بین حسابها (Inter-account Transfers)** - Internal transfers
8. **معامله ارز یکطرفه (Single Currency Exchange)** - Single currency trading
9. **معامله دوگانه ارزی (Dual Currency Exchange)** - Multi-currency trading
10. **ارسال حواله (Remittance Sending)** - Money transfer services
11. **دریافت حواله (Remittance Receiving)** - Remittance receipt handling

#### Advanced Financial Management
12. **گزارشگیری مالی (Financial Reporting)** - Comprehensive financial reports
13. **تطبیق حسابها (Account Reconciliation)** - Account balance reconciliation
14. **حسابداری دوطرفه (Double-entry Bookkeeping)** - Complete accounting system
15. **مدیریت کمیسیون (Commission Management)** - Fee and commission tracking
16. **مدیریت اسناد (Document Management)** - Financial document handling
17. **گزارش سود و زیان (P&L Reports)** - Profit and loss analysis
18. **ترازنامه (Balance Sheet)** - Financial position statements
19. **گردش حساب (Account Statements)** - Customer account statements
20. **مدیریت دارایی (Asset Management)** - Asset tracking and management

#### Risk Management & Analytics
21. **مدیریت بدهی (Liability Management)** - Debt and liability tracking
22. **تحلیل مالی (Financial Analysis)** - Advanced financial analytics
23. **پیشبینی جریان نقدی (Cash Flow Forecasting)** - Predictive cash flow
24. **مدیریت ریسک (Risk Management)** - Risk assessment and mitigation
25. **حسابداری مالیاتی (Tax Accounting)** - Tax compliance and reporting

## 🏗️ Technical Architecture

### Database & Storage
- **PostgreSQL 14+** with advanced indexing and optimization
- **Sequelize ORM** for database management and migrations
- **Redis** for caching and session management
- **Connection Pooling** for high-performance database operations

### Backend Technologies
- **Node.js 18+** with Express.js framework
- **WebSocket** for real-time updates
- **Background Jobs** with Bull/Agenda
- **File Upload** with Multer and Sharp
- **Email Services** with Nodemailer
- **Monitoring** with Winston logging

### Frontend Technologies
- **React 18+** with modern hooks and context
- **Material-UI** for enterprise-grade components
- **Chart.js & Recharts** for data visualization
- **React Hook Form** for form management
- **Real-time Updates** via Socket.io

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mosleh92/exchange-platform-v3.git
   cd exchange-platform-v3
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env
   # Edit .env with your PostgreSQL configuration
   
   # Frontend environment
   cd ../frontend
   cp .env.example .env
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb exchange_platform
   
   # Run migrations
   cd backend
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

5. **Start Development Servers**
   ```bash
   # Start both backend and frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:5173/admin

## 🔐 Default Login Credentials

### Super Admin (Platform Level)
- **Email**: superadmin@platform.com
- **Password**: SuperAdmin@2024
- **Access**: Global system management

### Tenant Admin (Exchange/Bank Level)
- **Email**: admin@exchange.com
- **Password**: TenantAdmin@2024
- **Access**: Organization management

### Branch Manager (Branch Level)
- **Email**: manager@branch.com
- **Password**: Manager@2024
- **Access**: Branch operations

### Staff (Operational Level)
- **Email**: staff@branch.com
- **Password**: Staff@2024
- **Access**: Customer service

### Customer (End User Level)
- **Email**: customer@exchange.com
- **Password**: Customer@2024
- **Access**: Personal account

## ⚙️ Environment Configuration

### Backend (.env)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/exchange_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=exchange_platform
DB_USER=postgres
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 2FA Configuration
TWO_FA_SECRET=your-2fa-secret-key-here
TWO_FA_ISSUER=ExchangePlatform

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Security & Encryption
ENCRYPTION_KEY=your-32-char-encryption-key-here
SESSION_SECRET=your-session-secret-key-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME=Enterprise Exchange Platform
VITE_APP_VERSION=4.0.0
VITE_ENABLE_2FA=true
VITE_MAX_FILE_SIZE=10485760
```

## 🛠️ Available Scripts

### Root Level
```bash
npm run dev          # Start both backend and frontend
npm run build        # Build both applications
npm run start        # Start production server
npm run install:all  # Install all dependencies
npm run clean        # Clean all node_modules
```

### Backend
```bash
npm run start        # Start production server
npm run dev          # Start development server
npm run test         # Run test suite
npm run migrate      # Run database migrations
npm run seed         # Seed database with initial data
npm run build        # Build for production
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run ESLint
```

## 🌐 Production Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Scale services
docker-compose -f docker-compose.production.yml up --scale backend=3 -d
```

### Cloud Deployment Options
1. **AWS ECS/EKS** - Recommended for enterprise deployments
2. **Google Cloud Run** - Serverless container deployment
3. **Azure Container Instances** - Enterprise Azure integration
4. **Railway** - Simple and scalable hosting
5. **Render** - Full-stack application hosting

### Performance & Scalability
- **Horizontal Scaling**: Multi-instance backend deployment
- **Database Optimization**: Connection pooling and indexing
- **Caching Strategy**: Redis for session and data caching
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Nginx reverse proxy configuration

## 📊 System Roles & Permissions

### Super Admin (Platform Level)
- Global system configuration
- Tenant management and onboarding
- Platform-wide analytics and reporting
- System health monitoring
- Security configuration

### Tenant Admin (Organization Level)
- Organization configuration and branding
- Staff and role management
- Financial reporting and analytics
- Branch management
- Customer oversight

### Branch Manager (Branch Level)
- Branch operations management
- Staff scheduling and management
- Customer service oversight
- Transaction approval workflow
- Local reporting and analytics

### Staff (Operational Level)
- Customer service and support
- Transaction processing and verification
- Document management
- Basic reporting access
- Customer communication

### Customer (End User Level)
- Personal account management
- Transaction history and statements
- Document upload and verification
- P2P trading access
- Mobile and web access

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

# Performance testing
npm run test:performance
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **Postman Collection**: `/docs/Postman_Collection.json`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`

## 🔧 Database Migration

```bash
# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Run migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo

# Seed database
npx sequelize-cli db:seed:all
```

## 🚨 Security Features

- **Data Encryption**: AES-256 encryption for sensitive data
- **SQL Injection Protection**: Parameterized queries with Sequelize
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based CSRF prevention
- **Rate Limiting**: Advanced request throttling
- **Audit Logging**: Comprehensive activity tracking
- **Session Security**: Secure session management with Redis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Create an issue on GitHub for bug reports
- **Security**: Report security issues to security@exchange.com
- **Enterprise Support**: contact@exchange.com

## 🔄 Version History

- **v4.0.0** - Enterprise upgrade with PostgreSQL, 25+ financial modules, 4-level multi-tenancy
- **v3.0.0** - Multi-tenant architecture, P2P marketplace, advanced security
- **v2.0.0** - Real-time features, WebSocket integration, mobile support
- **v1.0.0** - Basic exchange functionality, MongoDB implementation

---

**Built with ❤️ for Enterprise Financial Institutions using Node.js, React, and PostgreSQL**

**Certified Enterprise-Ready | Production-Tested | Scalable Architecture**