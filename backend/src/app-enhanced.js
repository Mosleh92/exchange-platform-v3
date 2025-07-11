// backend/src/app-enhanced.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const cluster = require('cluster');

// Import core services
const DatabaseManager = require('./core/database/DatabaseManager');
const BillingService = require('./services/billing/BillingService');
const SystemMonitoringService = require('./services/monitoring/SystemMonitoringService');
const FraudDetectionService = require('./services/intelligence/FraudDetectionService');
const BehavioralAnalyticsService = require('./services/intelligence/BehavioralAnalyticsService');
const AutoScalingService = require('./services/scaling/AutoScalingService');
const CachingService = require('./services/caching/CachingService');

// Import existing services and middleware
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

// Import new middleware
const securityMiddleware = require('./middleware/security');
const validationMiddleware = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

/**
 * Enhanced Exchange Platform Application
 * Fully SaaS-ready with comprehensive monitoring, scaling, and intelligence
 */
class ExchangePlatformApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.isInitialized = false;
    this.gracefulShutdownInProgress = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      logger.info('Initializing Enhanced Exchange Platform...');

      // Initialize core services first
      await this.initializeCoreServices();

      // Setup Express application
      await this.setupExpress();

      // Initialize auto-scaling (handles cluster management)
      await AutoScalingService.initialize();

      // If this is a worker process, continue with app setup
      if (cluster.isWorker || !cluster.isMaster) {
        await this.setupWorkerApp();
      }

      this.isInitialized = true;
      logger.info('Enhanced Exchange Platform initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Enhanced Exchange Platform:', error);
      throw error;
    }
  }

  /**
   * Initialize core services
   */
  async initializeCoreServices() {
    logger.info('Initializing core services...');

    // Initialize database with tenant isolation
    await DatabaseManager.initialize();

    // Initialize caching service
    await CachingService.initialize();

    // Initialize billing system
    await BillingService.initialize();

    // Initialize monitoring system
    await SystemMonitoringService.initialize();

    // Initialize fraud detection
    await FraudDetectionService.initialize();

    // Initialize behavioral analytics
    await BehavioralAnalyticsService.initialize();

    logger.info('All core services initialized');
  }

  /**
   * Setup Express application
   */
  async setupExpress() {
    // Security middleware
    this.app.use(helmet({
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

    // Apply enhanced security middleware
    this.app.use(securityMiddleware.applyAllSecurity());

    // Compression with caching-aware headers
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // CORS configuration with tenant awareness
    this.app.use(cors({
      origin: function (origin, callback) {
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

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Monitoring middleware
    this.app.use(this.createMonitoringMiddleware());

    // Rate limiting with tenant isolation
    const limiter = rateLimit({
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
      }
    });
    this.app.use('/api/', limiter);

    // Validation middleware
    this.app.use(validationMiddleware.sanitizeRequestData);

    // Tenant context middleware
    this.app.use(this.createTenantContextMiddleware());

    // Caching middleware
    this.app.use(this.createCachingMiddleware());

    // Fraud detection middleware
    this.app.use(this.createFraudDetectionMiddleware());

    // Request logging with structured format
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));
  }

  /**
   * Setup worker-specific application components
   */
  async setupWorkerApp() {
    // Setup routes
    this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    // Warm up caches
    await this.warmUpCaches();
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    // Health check endpoint with comprehensive status
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.getHealthStatus();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          message: 'Health check failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Enhanced API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/transactions', transactionRoutes);
    this.app.use('/api/accounts', accountRoutes);
    this.app.use('/api/p2p', p2pRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/remittances', remittanceRoutes);
    this.app.use('/api/reports', reportRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/analytics', analyticsRoutes);

    // New service endpoints
    this.app.use('/api/monitoring', this.createMonitoringRoutes());
    this.app.use('/api/billing', this.createBillingRoutes());
    this.app.use('/api/fraud', this.createFraudRoutes());
    this.app.use('/api/behavior', this.createBehaviorRoutes());
    this.app.use('/api/cache', this.createCacheRoutes());

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Enhanced Exchange Platform API',
        version: '3.0.0',
        description: 'Comprehensive SaaS-ready exchange platform with advanced monitoring and intelligence',
        endpoints: {
          auth: '/api/auth',
          transactions: '/api/transactions',
          accounts: '/api/accounts',
          p2p: '/api/p2p',
          users: '/api/users',
          payments: '/api/payments',
          remittances: '/api/remittances',
          reports: '/api/reports',
          admin: '/api/admin',
          analytics: '/api/analytics',
          monitoring: '/api/monitoring',
          billing: '/api/billing',
          fraud: '/api/fraud',
          behavior: '/api/behavior',
          cache: '/api/cache'
        },
        status: 'operational',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Create monitoring middleware
   */
  createMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      SystemMonitoringService.recordMetric('requests.total', 1);
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Record metrics
        SystemMonitoringService.recordMetric('responseTime.avg', responseTime);
        
        if (res.statusCode >= 400) {
          SystemMonitoringService.recordMetric('requests.failed', 1);
        } else {
          SystemMonitoringService.recordMetric('requests.successful', 1);
        }
      });
      
      next();
    };
  }

  /**
   * Create tenant context middleware
   */
  createTenantContextMiddleware() {
    return async (req, res, next) => {
      const tenantId = req.headers['x-tenant-id'];
      
      if (tenantId) {
        req.tenantId = tenantId;
        
        // Load tenant configuration from cache
        try {
          const tenantConfig = await CachingService.getOrSet(
            `tenant_config:${tenantId}`,
            async () => {
              // Load from database if not in cache
              const config = await EnhancedTenantConfigService.getTenantConfig(tenantId);
              return config;
            },
            900000 // 15 minutes cache
          );
          
          req.tenantConfig = tenantConfig;
        } catch (error) {
          logger.error('Error loading tenant configuration:', error);
        }
      }
      
      next();
    };
  }

  /**
   * Create caching middleware
   */
  createCachingMiddleware() {
    return async (req, res, next) => {
      // Cache GET requests for specific endpoints
      if (req.method === 'GET' && this.shouldCacheRequest(req)) {
        const cacheKey = this.generateCacheKey(req);
        
        try {
          const cachedResponse = await CachingService.get(cacheKey);
          
          if (cachedResponse) {
            res.set('X-Cache', 'HIT');
            return res.json(cachedResponse);
          }
          
          // Store original json method
          const originalJson = res.json.bind(res);
          
          // Override json method to cache response
          res.json = function(data) {
            res.set('X-Cache', 'MISS');
            
            // Cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
              CachingService.set(cacheKey, data, 60000); // 1 minute cache
            }
            
            return originalJson(data);
          };
        } catch (error) {
          logger.error('Caching middleware error:', error);
        }
      }
      
      next();
    };
  }

  /**
   * Create fraud detection middleware
   */
  createFraudDetectionMiddleware() {
    return async (req, res, next) => {
      // Analyze transactions for fraud
      if (req.method === 'POST' && req.path.includes('/transactions')) {
        try {
          // Extract transaction data
          const transactionData = {
            ...req.body,
            tenantId: req.tenantId,
            userId: req.user?.id,
            metadata: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date()
            }
          };
          
          // Analyze for fraud (non-blocking)
          setImmediate(async () => {
            try {
              await FraudDetectionService.analyzeTransaction(transactionData);
            } catch (error) {
              logger.error('Fraud detection analysis error:', error);
            }
          });
          
        } catch (error) {
          logger.error('Fraud detection middleware error:', error);
        }
      }
      
      next();
    };
  }

  /**
   * Create monitoring routes
   */
  createMonitoringRoutes() {
    const router = express.Router();
    
    router.get('/health', async (req, res) => {
      try {
        const dashboard = await SystemMonitoringService.getHealthDashboard();
        res.json(dashboard);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get health dashboard' });
      }
    });
    
    router.get('/metrics', async (req, res) => {
      try {
        const metrics = SystemMonitoringService.getRecentMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });
    
    return router;
  }

  /**
   * Create billing routes
   */
  createBillingRoutes() {
    const router = express.Router();
    
    router.get('/summary/:tenantId', async (req, res) => {
      try {
        const summary = await BillingService.getBillingSummary(req.params.tenantId);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get billing summary' });
      }
    });
    
    router.post('/track-usage', async (req, res) => {
      try {
        const { tenantId, metric, value, metadata } = req.body;
        await BillingService.trackUsage(tenantId, metric, value, metadata);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to track usage' });
      }
    });
    
    return router;
  }

  /**
   * Create fraud detection routes
   */
  createFraudRoutes() {
    const router = express.Router();
    
    router.get('/dashboard/:tenantId?', async (req, res) => {
      try {
        const dashboard = await FraudDetectionService.getFraudDashboard(req.params.tenantId);
        res.json(dashboard);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get fraud dashboard' });
      }
    });
    
    return router;
  }

  /**
   * Create behavioral analytics routes
   */
  createBehaviorRoutes() {
    const router = express.Router();
    
    router.get('/dashboard/:tenantId', async (req, res) => {
      try {
        const dashboard = await BehavioralAnalyticsService.getAnalyticsDashboard(
          req.params.tenantId,
          req.query.userId
        );
        res.json(dashboard);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get analytics dashboard' });
      }
    });
    
    router.post('/track-session', async (req, res) => {
      try {
        const session = await BehavioralAnalyticsService.trackSession(req.body);
        res.json({ success: true, sessionId: session.sessionId });
      } catch (error) {
        res.status(500).json({ error: 'Failed to track session' });
      }
    });
    
    return router;
  }

  /**
   * Create cache management routes
   */
  createCacheRoutes() {
    const router = express.Router();
    
    router.get('/stats', (req, res) => {
      const stats = CachingService.getCacheStats();
      res.json(stats);
    });
    
    router.delete('/clear', async (req, res) => {
      try {
        await CachingService.clearAll();
        res.json({ success: true, message: 'Cache cleared' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear cache' });
      }
    });
    
    router.delete('/invalidate/:pattern', async (req, res) => {
      try {
        const count = await CachingService.invalidatePattern(req.params.pattern);
        res.json({ success: true, invalidated: count });
      } catch (error) {
        res.status(500).json({ error: 'Failed to invalidate cache' });
      }
    });
    
    return router;
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Enhanced error handler
    this.app.use(EnhancedErrorHandler.handleError.bind(EnhancedErrorHandler));
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      if (this.gracefulShutdownInProgress) return;
      this.gracefulShutdownInProgress = true;
      
      logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            logger.info('HTTP server closed');
          });
        }
        
        // Close all services
        await Promise.all([
          DatabaseManager.close(),
          CachingService.close(),
          SystemMonitoringService.stopMonitoring()
        ]);
        
        logger.info('All services closed gracefully');
        process.exit(0);
        
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  /**
   * Warm up caches
   */
  async warmUpCaches() {
    try {
      const warmUpFunctions = {
        'exchange_rates:USD_EUR': async () => {
          // Fetch current exchange rates
          return { rate: 0.85, timestamp: Date.now() };
        },
        'system_config': async () => {
          // Fetch system configuration
          return { version: '3.0.0', features: ['p2p', 'remittance'] };
        }
      };
      
      await CachingService.warmUp(warmUpFunctions);
      logger.info('Cache warm-up completed');
      
    } catch (error) {
      logger.error('Cache warm-up failed:', error);
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    try {
      const dbHealth = await DatabaseManager.getHealthMetrics();
      const cacheStats = CachingService.getCacheStats();
      const monitoringHealth = await SystemMonitoringService.getHealthDashboard();
      
      const overallStatus = (
        dbHealth && 
        cacheStats.redisConnected !== false && 
        monitoringHealth.status !== 'critical'
      ) ? 'healthy' : 'degraded';
      
      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        uptime: process.uptime(),
        services: {
          database: dbHealth ? 'healthy' : 'degraded',
          cache: cacheStats.redisConnected !== false ? 'healthy' : 'degraded',
          monitoring: monitoringHealth.status,
          billing: 'healthy',
          fraud_detection: 'healthy',
          behavioral_analytics: 'healthy'
        },
        metrics: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          cache: cacheStats,
          monitoring: monitoringHealth.score
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check if request should be cached
   */
  shouldCacheRequest(req) {
    const cacheableEndpoints = [
      '/api/analytics',
      '/api/reports',
      '/api/accounts',
      '/api/users'
    ];
    
    return cacheableEndpoints.some(endpoint => req.path.startsWith(endpoint));
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(req) {
    const baseKey = `api_response:${req.method}:${req.path}`;
    const queryString = Object.keys(req.query).length > 0 ? 
      ':' + JSON.stringify(req.query) : '';
    const tenantKey = req.tenantId ? `:tenant:${req.tenantId}` : '';
    
    return baseKey + queryString + tenantKey;
  }

  /**
   * Start the server
   */
  async start(port = process.env.PORT || 3000) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Only start server in worker processes or if not using clustering
      if (cluster.isWorker || !cluster.isMaster) {
        this.server = this.app.listen(port, '0.0.0.0', () => {
          logger.info(`🚀 Enhanced Exchange Platform running on port ${port}`);
          logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
          logger.info(`🌐 Access: http://localhost:${port}`);
          logger.info(`👥 Worker PID: ${process.pid}`);
        });
        
        this.server.keepAliveTimeout = 65000;
        this.server.headersTimeout = 66000;
      }
      
      return this.server;
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }
}

// Export the enhanced application
module.exports = ExchangePlatformApp;

// If this file is run directly, start the application
if (require.main === module) {
  const app = new ExchangePlatformApp();
  app.start().catch(error => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}