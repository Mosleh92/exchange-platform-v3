const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swagger = require('./config/swagger');

// Import enhanced services and middleware
const EnhancedErrorHandler = require('./middleware/enhancedErrorHandler');
const EnhancedEventService = require('./services/enhancedEventService');
const EnhancedTenantConfigService = require('./services/enhancedTenantConfigService');
const EnhancedAuditService = require('./services/enhancedAuditService');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const enhancedAuthRoutes = require('./routes/enhancedAuth');
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
const securityHeaders = require('./middleware/securityHeaders');
const advancedRateLimit = require('./middleware/advancedRateLimit');
const tokenCleanupService = require('./services/tokenCleanup');
const { enhancedAuth } = require('./middleware/enhancedAuth');

const app = express();

/**
 * Enhanced Express Application Configuration
 * Includes all security, performance, and monitoring features
 */

// Apply security middleware
app.use(securityHeaders.applyAllSecurityHeaders());
app.use(securityHeaders.apiSecurityHeaders());
app.use(securityMiddleware.applyAllSecurity());

// Apply validation middleware
app.use(validationMiddleware.sanitizeRequestData);

// Apply performance optimization
app.use(performanceOptimization.optimizeResponseCompression);

// Apply error handling
app.use(errorHandler.handleError);

// Initialize global error handlers
errorHandler.initializeGlobalHandlers();

// Rate limiting - Use advanced rate limiter
app.use('/api/', advancedRateLimit.generalUserLimiter());

// Stricter rate limiting for sensitive endpoints
app.use('/api/auth/', advancedRateLimit.authLimiter());
app.use('/api/admin/', advancedRateLimit.adminLimiter());
app.use('/api/transactions/', advancedRateLimit.transactionLimiter());

// Compression
app.use(compression());

// CORS configuration - Use secure CORS config
app.use(cors(securityHeaders.getSecureCORSConfig()));

// Body parsing middleware
app.use(cookieParser()); // Add cookie parser before body parsing
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// CSP violation reporting endpoint
app.post('/api/security/csp-report', express.json(), securityHeaders.cspReportHandler());

// API documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// API routes with enhanced middleware
app.use('/api/auth', enhancedAuthRoutes); // New enhanced auth routes
app.use('/api/auth-legacy', authRoutes); // Keep legacy auth for backward compatibility
app.use('/api/transaction', (req, res, next) => {
  req.optimizedQuery = databaseOptimization.executeQuery.bind(databaseOptimization);
  req.paginatedQuery = databaseOptimization.paginatedQuery.bind(databaseOptimization);
  req.batchLoad = databaseOptimization.batchLoadUsers.bind(databaseOptimization);
  next();
}, transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/p2p', p2pRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/remittances', remittanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', securityHeaders.adminSecurityHeaders(), adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Event-driven architecture initialization
const eventService = new EnhancedEventService();
const tenantConfigService = new EnhancedTenantConfigService();
const auditService = new EnhancedAuditService();

// Start background services
tokenCleanupService.start();

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

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop background services
  tokenCleanupService.stop();
  
  // Close database connections
  const mongoose = require('mongoose');
  mongoose.connection.close(() => {
    logger.info('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Stop background services
  tokenCleanupService.stop();
  
  // Close database connections
  const mongoose = require('mongoose');
  mongoose.connection.close(() => {
    logger.info('Database connection closed');
    process.exit(0);
  });
});

// Unhandled promise rejection handler
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
});

// Uncaught exception handler
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
  
  // Exit process after logging
  process.exit(1);
});

// Performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method,
        url,
        statusCode,
        duration,
        userId: req.user?.id,
        tenantId: req.headers['x-tenant-id']
      });
    }
    
    // Log performance metrics
    logger.info('Request completed', {
      method,
      url,
      statusCode,
      duration,
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id']
    });
  });
  
  next();
});

// Export enhanced app with services
module.exports = {
  app,
  eventService,
  tenantConfigService,
  auditService
};
