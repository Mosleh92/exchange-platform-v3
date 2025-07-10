const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');

// Import enhanced middleware
const { enhancedAuthMiddleware, roleMiddleware, permissionMiddleware, createRateLimiter, validateInput, securityHeaders, csrfProtection } = require('./middleware/security-enhanced');
const { tenantContextMiddleware, ensureTenantIsolation } = require('./middleware/tenant-context');
const ErrorHandler = require('./utils/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const userRoutes = require('./routes/user');
const reportRoutes = require('./routes/report');
const p2pRoutes = require('./routes/p2p');
const accountingRoutes = require('./routes/accounting');

// Import services
const tradingEngine = require('./services/tradingEngine');
const logger = require('./utils/logger');

const app = express();

// Enhanced Security Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));

// Rate limiting
const limiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-csrf-token']
}));

// Security headers
app.use(securityHeaders);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes with enhanced security
app.use('/api/auth', authRoutes);

// Protected routes with tenant context
app.use('/api/transactions', 
  enhancedAuthMiddleware,
  tenantContextMiddleware,
  ensureTenantIsolation,
  transactionRoutes
);

app.use('/api/users',
  enhancedAuthMiddleware,
  roleMiddleware(['admin', 'super_admin']),
  tenantContextMiddleware,
  ensureTenantIsolation,
  userRoutes
);

app.use('/api/reports',
  enhancedAuthMiddleware,
  permissionMiddleware(['read_reports']),
  tenantContextMiddleware,
  ensureTenantIsolation,
  reportRoutes
);

app.use('/api/p2p',
  enhancedAuthMiddleware,
  tenantContextMiddleware,
  ensureTenantIsolation,
  p2pRoutes
);

app.use('/api/accounting',
  enhancedAuthMiddleware,
  permissionMiddleware(['manage_accounting']),
  tenantContextMiddleware,
  ensureTenantIsolation,
  accountingRoutes
);

// Error handling middleware (must be last)
app.use(ErrorHandler.handleError);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  logger.info('Connected to MongoDB');
  
  // Start trading engine
  tradingEngine.start().catch(error => {
    logger.error('Failed to start trading engine:', error);
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  ErrorHandler.handleDatabaseError(error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop trading engine
  tradingEngine.stop();
  
  // Close database connection
  await mongoose.connection.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Stop trading engine
  tradingEngine.stop();
  
  // Close database connection
  await mongoose.connection.close();
  
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
