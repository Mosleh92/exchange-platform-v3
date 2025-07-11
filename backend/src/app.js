const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const swagger = require('./config/swagger');

// Import enhanced security services and middleware
const secretsManager = require('./config/secretsManager');
const authTokenService = require('./services/authTokenService');
const mfaService = require('./services/mfaService');
const databaseSecurityService = require('./services/databaseSecurityService');
const securityMonitoringService = require('./services/securityMonitoringService');
const enhancedAuth = require('./middleware/enhancedAuth');
const inputValidation = require('./middleware/inputValidation');
const secureFileUpload = require('./middleware/secureFileUpload');
const websocketSecurity = require('./middleware/websocketSecurity');

// Import existing enhanced services and middleware
const EnhancedErrorHandler = require('./middleware/enhancedErrorHandler');
const EnhancedEventService = require('./services/enhancedEventService');
const EnhancedTenantConfigService = require('./services/enhancedTenantConfigService');
const EnhancedAuditService = require('./services/enhancedAuditService');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const accountRoutes = require('./routes/accounts');
const p2pRoutes = require('./routes/p2p');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payment');
const remittanceRoutes = require('./routes/remittance');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

// Import new services and middleware
const securityMiddleware = require('./middleware/security');
const validationMiddleware = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');
const performanceOptimization = require('./services/performanceOptimization.service');
const databaseOptimization = require('./services/databaseOptimization.service');

const app = express();

/**
 * Enhanced Express Application Configuration
 * Includes comprehensive security, performance, and monitoring features
 */

// Initialize security services
async function initializeSecurityServices() {
  try {
    // Initialize secrets manager first
    await secretsManager.initialize();
    
    // Initialize database security
    databaseSecurityService.setupMongooseMiddleware();
    
    // Setup security monitoring
    securityMonitoringService.registerAlertHandler('email', (alert) => {
      // Email notification handler
      logger.error('Security Alert - Email notification', alert);
    });
    
    securityMonitoringService.registerAlertHandler('slack', (alert) => {
      // Slack notification handler  
      logger.error('Security Alert - Slack notification', alert);
    });
    
    logger.info('Security services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize security services:', error);
    process.exit(1);
  }
}

// Initialize security services
initializeSecurityServices();

// Enhanced security middleware stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced input validation and sanitization
app.use(inputValidation.sanitizeRequest);
app.use(inputValidation.contentBasedRateLimit);

// Security monitoring middleware
app.use((req, res, next) => {
  // Log security events
  if (req.path.includes('admin') || req.path.includes('api/auth')) {
    const eventType = req.path.includes('admin') ? 'admin_access' : 'auth_attempt';
    securityMonitoringService.logSecurityEvent(eventType, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
  }
  next();
});

// IP blocking middleware
app.use((req, res, next) => {
  if (securityMonitoringService.isIPBlocked(req.ip)) {
    securityMonitoringService.logSecurityEvent('blocked_ip_attempt', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      error: 'ACCESS_DENIED',
      message: 'Access denied from this IP address'
    });
  }
  next();
});

// Apply performance optimization
app.use(performanceOptimization.optimizeResponseCompression);

// Apply error handling
app.use(errorHandler.handleError);

// Initialize global error handlers
errorHandler.initializeGlobalHandlers();

// Enhanced rate limiting with better security
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'RATE_LIMIT_ERROR',
    message: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.headers['x-tenant-id'] || 'unknown'}-${req.user?.id || req.ip}`;
  },
  handler: (req, res) => {
    securityMonitoringService.logSecurityEvent('rate_limit_violation', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      error: 'RATE_LIMIT_ERROR',
      message: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

app.use('/api/', generalLimiter);

// Enhanced authentication rate limiting
const authLimiters = enhancedAuth.getRateLimiters();
app.use('/api/auth/login', authLimiters.login);
app.use('/api/auth/forgot-password', authLimiters.passwordReset);
app.use('/api/auth/refresh', authLimiters.refresh);

// Compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://exchangeplatform.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-Client-Version'
  ]
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
}));

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Enhanced health check endpoint with security metrics
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    security: {
      secretsInitialized: secretsManager.getSecretsStatus().initialized,
      encryptionEnabled: !!process.env.DB_ENCRYPTION_KEY,
      monitoringActive: true
    }
  };
  
  res.status(200).json(healthData);
});

// Security status endpoint (admin only)
app.get('/api/security/status', enhancedAuth.authenticate, enhancedAuth.authorize(['admin', 'super_admin']), (req, res) => {
  const securityStatus = {
    secrets: secretsManager.getSecretsStatus(),
    monitoring: securityMonitoringService.getSecurityMetrics(),
    alerts: securityMonitoringService.getRecentAlerts(10),
    database: {
      encryptionEnabled: !!process.env.DB_ENCRYPTION_KEY,
      auditingEnabled: true
    }
  };
  
  res.json(securityStatus);
});

// API documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// API routes with enhanced security middleware
app.use('/api/auth', authRoutes);
app.use('/api/transaction', enhancedAuth.authenticate, enhancedAuth.requireTenant, (req, res, next) => {
  req.optimizedQuery = databaseOptimization.executeQuery.bind(databaseOptimization);
  req.paginatedQuery = databaseOptimization.paginatedQuery.bind(databaseOptimization);
  req.batchLoad = databaseOptimization.batchLoadUsers.bind(databaseOptimization);
  next();
}, transactionRoutes);

app.use('/api/accounts', enhancedAuth.authenticate, enhancedAuth.requireTenant, accountRoutes);
app.use('/api/p2p', enhancedAuth.authenticate, enhancedAuth.requireTenant, p2pRoutes);
app.use('/api/users', enhancedAuth.authenticate, userRoutes);
app.use('/api/payments', enhancedAuth.authenticate, enhancedAuth.requireTenant, paymentRoutes);
app.use('/api/remittances', enhancedAuth.authenticate, enhancedAuth.requireTenant, remittanceRoutes);
app.use('/api/reports', enhancedAuth.authenticate, enhancedAuth.authorize(['admin', 'super_admin']), reportRoutes);
app.use('/api/admin', enhancedAuth.authenticate, enhancedAuth.authorize(['admin', 'super_admin']), enhancedAuth.requireMFA, adminRoutes);
app.use('/api/analytics', enhancedAuth.authenticate, enhancedAuth.authorize(['admin', 'super_admin']), analyticsRoutes);

// Event-driven architecture initialization
const eventService = new EnhancedEventService();
const tenantConfigService = new EnhancedTenantConfigService();
const auditService = new EnhancedAuditService();

// Global event listeners for system monitoring
eventService.on('TRANSACTION_COMPLETED', async (eventData) => {
  logger.info('Transaction completed event received', {
    transactionId: eventData.transactionId,
    userId: eventData.userId,
    tenantId: eventData.tenantId
  });
});

eventService.on('SECURITY_VIOLATION', async (eventData) => {
  logger.error('Security violation detected', {
    violationType: eventData.violationType,
    userId: eventData.userId,
    tenantId: eventData.tenantId,
    details: eventData.details
  });
});

// Tenant configuration cache warming
app.use(async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
      // Warm up tenant configuration cache
      await tenantConfigService.getTenantConfig(tenantId, true);
    }
    next();
  } catch (error) {
    logger.warn('Failed to warm tenant config cache', { error: error.message });
    next();
  }
});

// Enhanced error handling
app.use(EnhancedErrorHandler.handleError.bind(EnhancedErrorHandler));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    // Close database connections
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    
    // Close token service connections
    await authTokenService.close();
    
    // Clear secrets from memory
    secretsManager.clearSecrets();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    // Close database connections
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    
    // Close token service connections
    await authTokenService.close();
    
    // Clear secrets from memory
    secretsManager.clearSecrets();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Enhanced unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log to audit service
  auditService.logEvent({
    eventType: 'SYSTEM_ERROR',
    userId: null,
    tenantId: null,
    action: 'UNHANDLED_REJECTION',
    resource: 'SYSTEM',
    resourceId: null,
    details: {
      reason: reason?.message || reason,
      stack: reason?.stack
    },
    severity: 'CRITICAL'
  });
  
  // Log to security monitoring
  securityMonitoringService.logSecurityEvent('system_error', {
    ip: 'localhost',
    error: reason?.message || reason,
    type: 'unhandled_rejection'
  });
});

// Enhanced uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Log to audit service
  auditService.logEvent({
    eventType: 'SYSTEM_ERROR',
    userId: null,
    tenantId: null,
    action: 'UNCAUGHT_EXCEPTION',
    resource: 'SYSTEM',
    resourceId: null,
    details: {
      error: error.message,
      stack: error.stack
    },
    severity: 'CRITICAL'
  });
  
  // Log to security monitoring
  securityMonitoringService.logSecurityEvent('system_error', {
    ip: 'localhost',
    error: error.message,
    type: 'uncaught_exception'
  });
  
  // Exit process after logging
  process.exit(1);
});

// Enhanced performance monitoring with security events
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    // Log slow requests as potential performance issues
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        url,
        statusCode,
        duration,
        userId: req.user?.id,
        tenantId: req.headers['x-tenant-id']
      });
      
      // Log to security monitoring
      securityMonitoringService.logSecurityEvent('performance_issue', {
        ip: req.ip,
        userId: req.user?.id,
        duration,
        path: url,
        method
      });
    }
    
    // Log performance metrics with security context
    logger.info('Request completed', {
      method,
      url,
      statusCode,
      duration,
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id'],
      ip: req.ip
    });
    
    // Check for suspicious activity patterns
    if (statusCode === 401 || statusCode === 403) {
      securityMonitoringService.logSecurityEvent('unauthorized_access', {
        ip: req.ip,
        userId: req.user?.id,
        path: url,
        statusCode,
        userAgent: req.get('User-Agent')
      });
    }
  });
  
  next();
});

// Export enhanced app with all security services
module.exports = {
  app,
  eventService,
  tenantConfigService,
  auditService,
  // New security services
  secretsManager,
  authTokenService,
  mfaService,
  databaseSecurityService,
  securityMonitoringService,
  enhancedAuth,
  inputValidation,
  secureFileUpload,
  websocketSecurity
};
