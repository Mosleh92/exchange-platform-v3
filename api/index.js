const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const Joi = require('joi');
require('dotenv').config();

const SecurityMiddleware = require('./security');
const WebSocketManager = require('./websocket');
const HealthMonitor = require('./monitoring');
const { connectDB, initializeDB, models } = require('./database');

const app = express();
const server = http.createServer(app);

// Initialize monitoring
const healthMonitor = new HealthMonitor();
healthMonitor.startPerformanceMonitoring();

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(server);

// Metrics tracking middleware
app.use(healthMonitor.trackRequest.bind(healthMonitor));

// Security middleware
app.use(SecurityMiddleware.securityHeaders);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// Rate limiting with security middleware
app.use('/api/', SecurityMiddleware.apiRateLimit);

// Request logging
app.use(SecurityMiddleware.requestLogger);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(SecurityMiddleware.validateContentType());

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  tenantId: Joi.string().optional()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(50).required(),
  tenantId: Joi.string().optional()
});

const orderSchema = Joi.object({
  pair: Joi.string().required(),
  type: Joi.string().valid('buy', 'sell', 'limit', 'market').required(),
  amount: Joi.number().positive().required(),
  price: Joi.number().positive().optional()
});

// Database connection
const initializeDatabase = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      await initializeDB();
    } else {
      console.log('⚠️ MongoDB URI not configured, running in demo mode');
      healthMonitor.addAlert('warning', 'Database not configured - running in demo mode');
    }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    healthMonitor.addAlert('error', 'Database initialization failed', { error: error.message });
  }
};

// Initialize database connection
initializeDatabase();

// Enhanced health check endpoint with comprehensive monitoring
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await healthMonitor.getHealthStatus();
    const statusCode = healthStatus.status === 'OK' ? 200 : 
                      healthStatus.status === 'DEGRADED' ? 503 : 500;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check for Kubernetes/Docker
app.get('/api/ready', async (req, res) => {
  try {
    const readiness = await healthMonitor.isReady();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check for Kubernetes/Docker  
app.get('/api/alive', (req, res) => {
  res.json(healthMonitor.isAlive());
});

// System information endpoint
app.get('/api/info', (req, res) => {
  res.json(healthMonitor.getSystemInfo());
});

// Metrics endpoint for monitoring systems
app.get('/api/metrics', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.authorize(['super_admin']),
  (req, res) => {
  res.json({
    success: true,
    data: {
      ...healthMonitor.getMetrics(),
      alerts: healthMonitor.getAlerts('error', 10),
      resources: healthMonitor.getResourceUsage()
    }
  });
});

// System status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 12847,
      totalTrades: 45692,
      activeOrders: 156,
      systemStatus: 'operational',
      uptime: Math.floor(process.uptime()),
      lastUpdate: new Date().toISOString(),
      services: {
        api: 'operational',
        database: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
        trading: 'operational',
        notifications: 'operational'
      }
    }
  });
});

// Authentication endpoints with enhanced security
app.post('/api/auth/login', 
  SecurityMiddleware.authRateLimit,
  SecurityMiddleware.validateInput(loginSchema),
  async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    // Mock authentication (replace with real authentication)
    const mockUsers = {
      'admin@exchange.com': { id: 1, name: 'Super Admin', role: 'super_admin', tenant: null },
      'tenant@exchange.com': { id: 2, name: 'Tenant Admin', role: 'tenant_admin', tenant: tenantId || 'default' },
      'manager@exchange.com': { id: 3, name: 'Manager', role: 'manager', tenant: tenantId || 'default' },
      'customer@exchange.com': { id: 4, name: 'Customer', role: 'customer', tenant: tenantId || 'default' }
    };

    const user = mockUsers[email];
    if (!user || password !== 'password123') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate mock JWT token
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: email,
      role: user.role,
      tenant: user.tenant,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    })).toString('base64');

    // Send notification via WebSocket
    wsManager.sendToUser(user.id, 'login_notification', {
      message: 'Successful login',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: token,
        user: {
          id: user.id,
          email: email,
          name: user.name,
          role: user.role,
          tenant: user.tenant
        },
        permissions: ['read', 'write', 'trade'],
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

app.post('/api/auth/register', 
  SecurityMiddleware.authRateLimit,
  SecurityMiddleware.validateInput(registerSchema),
  async (req, res) => {
  try {
    const { email, password, name, tenantId } = req.body;

    // Mock registration
    const newUser = {
      id: Math.floor(Math.random() * 10000),
      email: email,
      name: name,
      role: 'customer',
      tenant: tenantId || 'default'
    };

    // Send welcome notification via WebSocket
    wsManager.sendToUser(newUser.id, 'welcome_notification', {
      message: 'Welcome to Exchange Platform V3!',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Registration successful',
      data: { user: newUser }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Trading endpoints with authentication and rate limiting
app.get('/api/trading/pairs', (req, res) => {
  res.json({
    success: true,
    data: [
      { symbol: 'BTC/USD', price: 43250.50, change: 2.45, volume: 156789.50 },
      { symbol: 'ETH/USD', price: 2640.30, change: -1.20, volume: 89234.20 },
      { symbol: 'EUR/USD', price: 1.0856, change: 0.34, volume: 245678.90 },
      { symbol: 'GBP/USD', price: 1.2734, change: -0.12, volume: 134567.80 }
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/trading/order', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.tradingRateLimit,
  SecurityMiddleware.validateInput(orderSchema),
  (req, res) => {
  try {
    const { pair, type, amount, price } = req.body;
    const order = {
      orderId: `ORD-${Date.now()}`,
      userId: req.user.id,
      pair,
      type,
      amount,
      price: price || 'market',
      status: 'pending',
      timestamp: new Date().toISOString(),
      tenant: req.user.tenant
    };

    // Send order confirmation via WebSocket
    wsManager.sendToUser(req.user.id, 'order_confirmed', order);
    
    // Broadcast to trading room
    wsManager.io.to(`trading-${pair}`).emit('new_order', {
      pair,
      type,
      amount: type === 'sell' ? amount : undefined // Hide buy amounts for privacy
    });

    res.json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    console.error('Order placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      code: 'ORDER_ERROR'
    });
  }
});

// P2P endpoints with authentication
app.get('/api/p2p/orders', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.tenantIsolation,
  (req, res) => {
  const { status = 'active', limit = 10, page = 1 } = req.query;
  
  res.json({
    success: true,
    data: [
      {
        id: 'P2P-001',
        type: 'buy',
        amount: 1000,
        currency: 'USD',
        rate: 1.05,
        user: 'User123',
        status: 'active',
        tenant: req.user.tenant,
        createdAt: new Date().toISOString()
      },
      {
        id: 'P2P-002',
        type: 'sell',
        amount: 500,
        currency: 'EUR',
        rate: 0.95,
        user: 'User456',
        status: 'active',
        tenant: req.user.tenant,
        createdAt: new Date().toISOString()
      }
    ].filter(order => order.tenant === req.user.tenant),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 2,
      pages: 1
    }
  });
});

// Account endpoints with authentication
app.get('/api/account/balance', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.tenantIsolation,
  (req, res) => {
  res.json({
    success: true,
    data: {
      USD: 5420.50,
      EUR: 3240.80,
      BTC: 0.15234,
      ETH: 2.45678,
      lastUpdated: new Date().toISOString(),
      tenant: req.user.tenant
    }
  });
});

// Transaction endpoints with authentication and pagination
app.get('/api/transactions', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.tenantIsolation,
  (req, res) => {
  const { page = 1, limit = 10, type, status } = req.query;
  
  res.json({
    success: true,
    data: {
      transactions: [
        {
          id: 'TXN-001',
          type: 'exchange',
          amount: 1000,
          from: 'USD',
          to: 'EUR',
          rate: 0.85,
          timestamp: new Date().toISOString(),
          status: 'completed',
          tenant: req.user.tenant,
          userId: req.user.id
        }
      ],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 1,
        pages: 1
      }
    }
  });
});

// User profile endpoints
app.get('/api/user/profile', 
  SecurityMiddleware.authenticate,
  (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tenant: req.user.tenant,
      lastLogin: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true
      }
    }
  });
});

// Admin endpoints
app.get('/api/admin/users', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.authorize(['super_admin', 'tenant_admin']),
  SecurityMiddleware.tenantIsolation,
  (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        email: 'user1@example.com',
        name: 'User One',
        role: 'customer',
        tenant: req.user.tenant,
        isActive: true,
        lastLogin: new Date().toISOString()
      }
    ]
  });
});

// System monitoring endpoints
app.get('/api/system/metrics', 
  SecurityMiddleware.authenticate,
  SecurityMiddleware.authorize(['super_admin']),
  (req, res) => {
  res.json({
    success: true,
    data: {
      activeUsers: 1247,
      totalTransactions: 45692,
      systemLoad: 0.65,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Exchange Platform V3 API',
    version: '3.0.0',
    description: 'Production-ready multi-tenant exchange platform API',
    endpoints: {
      health: {
        'GET /api/health': 'Comprehensive health check with system metrics',
        'GET /api/ready': 'Readiness check for container orchestration',
        'GET /api/alive': 'Liveness check for container orchestration',
        'GET /api/info': 'System information and feature flags',
        'GET /api/docs': 'API documentation'
      },
      authentication: {
        'POST /api/auth/login': 'User authentication with email/password',
        'POST /api/auth/register': 'User registration (customers only)'
      },
      trading: {
        'GET /api/trading/pairs': 'Get available trading pairs and current prices',
        'POST /api/trading/order': 'Place a trading order (requires auth)'
      },
      p2p: {
        'GET /api/p2p/orders': 'Get P2P orders (requires auth, tenant-isolated)'
      },
      account: {
        'GET /api/account/balance': 'Get user wallet balances (requires auth)',
        'GET /api/user/profile': 'Get user profile information (requires auth)'
      },
      admin: {
        'GET /api/admin/users': 'List users (admin only, tenant-isolated)',
        'GET /api/system/metrics': 'System metrics (super admin only)',
        'GET /api/metrics': 'Detailed metrics and alerts (super admin only)'
      },
      transactions: {
        'GET /api/transactions': 'Get transaction history (requires auth, paginated)'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer {token}',
      note: 'Obtain token via POST /api/auth/login',
      testCredentials: {
        'admin@exchange.com': 'password123 (super_admin)',
        'tenant@exchange.com': 'password123 (tenant_admin)', 
        'manager@exchange.com': 'password123 (manager)',
        'customer@exchange.com': 'password123 (customer)'
      }
    },
    roles: ['super_admin', 'tenant_admin', 'manager', 'staff', 'customer'],
    features: [
      'Multi-tenant architecture',
      'Real-time WebSocket updates',
      'Rate limiting and security',
      'Comprehensive monitoring',
      'Input validation',
      'Audit logging',
      'Health checks'
    ],
    websocket: {
      url: `ws://${req.headers.host}`,
      events: {
        authenticate: 'Authenticate WebSocket connection',
        subscribe_trading: 'Subscribe to trading pair updates', 
        subscribe_p2p: 'Subscribe to P2P order updates',
        place_order: 'Place order via WebSocket',
        create_p2p_order: 'Create P2P order via WebSocket'
      }
    }
  });
});

// Serve static demo file
app.get('/demo.html', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'demo.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'SERVER_ERROR',
    requestId: req.headers['x-request-id'] || Math.random().toString(36)
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      'GET /api/health - Health check',
      'GET /api/docs - API documentation', 
      'GET /api/status - System status',
      'POST /api/auth/login - User login',
      'POST /api/auth/register - User registration',
      'GET /api/trading/pairs - Trading pairs',
      'POST /api/trading/order - Place order (auth required)',
      'GET /api/p2p/orders - P2P orders (auth required)',
      'GET /api/account/balance - Account balance (auth required)',
      'GET /api/transactions - Transaction history (auth required)'
    ],
    documentation: `${req.protocol}://${req.headers.host}/api/docs`
  });
});

// Export for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Exchange Platform V3 API with WebSocket running on port ${PORT}`);
    console.log(`📡 WebSocket server ready for real-time trading`);
    console.log(`🔒 Security middleware enabled`);
    console.log(`🏢 Multi-tenant support active`);
  });
}