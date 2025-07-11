const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

/**
 * Security Middleware - Enhanced for Phase 1 fixes
 */

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS with enhanced security
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://exchange-platform-v3.onrender.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Enhanced Input Sanitization - Fix for multi-character sanitization vulnerability
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  let sanitized = input.trim();
  let previousLength;
  
  // Iterative sanitization loop to handle multi-character patterns
  do {
    previousLength = sanitized.length;
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/eval\s*\(/gi, '') // Remove eval calls
      .replace(/expression\s*\(/gi, '') // Remove CSS expression
      .replace(/script/gi, '') // Remove script tags
      .replace(/iframe/gi, '') // Remove iframe tags
      .replace(/object/gi, '') // Remove object tags
      .replace(/embed/gi, '') // Remove embed tags
      .replace(/form/gi, ''); // Remove form tags
  } while (sanitized.length !== previousLength);
  
  return sanitized;
};

// Apply sanitization middleware to all requests
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  
  next();
});

/**
 * Enhanced Rate Limiting - Configurable per endpoint
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limiting
app.use(createRateLimit(15 * 60 * 1000, 100, 'Too many requests from this IP'));

// Strict rate limiting for auth endpoints
const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');

/**
 * Request logging
 */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

/**
 * Database Connection
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange-platform-v3';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

/**
 * Import User model safely
 */
let User;
try {
  User = require('./models/User');
  console.log('✅ User model loaded successfully');
} catch (error) {
  console.error('❌ Failed to load User model:', error.message);
  // Create a minimal User model if the main one fails
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, default: 'customer' },
    isActive: { type: Boolean, default: true }
  }, { timestamps: true });
  
  User = mongoose.model('User', userSchema);
  console.log('✅ Fallback User model created');
}

/**
 * JWT Utility Functions with Enhanced Security
 */
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };
  
  // Access token - 15 minutes
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '15m',
    issuer: 'exchange-platform-v3',
    audience: 'exchange-users'
  });
  
  // Refresh token - 7 days
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret', {
    expiresIn: '7d',
    issuer: 'exchange-platform-v3',
    audience: 'exchange-users'
  });
  
  return { accessToken, refreshToken };
};

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Exchange Platform V3 Backend is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'production',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * API Test Endpoint
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API is working perfectly!',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    status: 'success',
    features: [
      'Enhanced Security',
      'Input Sanitization',
      'Rate Limiting',
      'JWT Authentication',
      'Database Connection'
    ]
  });
});

/**
 * Authentication Endpoints with Enhanced Security
 */
app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // For now, return mock data (will be replaced with real auth later)
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: email,
      firstName: 'Demo',
      lastName: 'User',
      role: 'customer'
    };
    
    const tokens = generateTokens(mockUser);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: mockUser._id,
        email: mockUser.email,
        name: `${mockUser.firstName} ${mockUser.lastName}`,
        role: mockUser.role
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // For now, return mock registration success
    const mockUser = {
      _id: '507f1f77bcf86cd799439012',
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: 'customer'
    };
    
    const tokens = generateTokens(mockUser);
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: mockUser._id,
        email: mockUser.email,
        name: `${mockUser.firstName} ${mockUser.lastName}`,
        role: mockUser.role
      },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Token Refresh Endpoint
 */
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    const newTokens = generateTokens(decoded);
    
    res.json({
      success: true,
      ...newTokens
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * Status Endpoint
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 1001,
      totalTrades: 2567,
      systemStatus: 'operational',
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString(),
      security: {
        sanitizationEnabled: true,
        rateLimitingEnabled: true,
        jwtTokensEnabled: true,
        corsConfigured: true
      }
    }
  });
});

/**
 * Error Handling Middleware
 */
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

/**
 * Server Startup
 */
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to database
    const dbConnected = await connectDB();
    
    if (!dbConnected) {
      console.log('⚠️  Starting server without database connection');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Exchange Platform V3 Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🔐 Security features enabled: Sanitization, Rate Limiting, JWT`);
      console.log(`🌐 Access: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}