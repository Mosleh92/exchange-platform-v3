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
