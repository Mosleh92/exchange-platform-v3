// backend/src/middleware/security.js
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('../utils/logger');

/**
 * Comprehensive Security Middleware
 * Handles API security, CORS, rate limiting, request signing, and webhook verification
 */
class SecurityMiddleware {
  constructor() {
    this.initializeSecurityConfig();
  }

  /**
   * Initialize security configuration
   */
  initializeSecurityConfig() {
    // CORS configuration
    this.corsOptions = {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://exchange-platform.com',
          'https://admin.exchange-platform.com'
        ];

        if (!origin || allowedOrigins.includes(origin)) {
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
        'X-API-Key',
        'X-Signature',
        'X-Timestamp',
        'X-Request-ID',
        'X-Tenant-ID'
      ],
      exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining']
    };

    // Rate limiting configuration
    this.rateLimiters = {
      // General API rate limiter
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          return req.headers['tenant-id'] + ':' + req.ip;
        },
        handler: (req, res) => {
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            tenantId: req.headers['tenant-id'],
            path: req.path
          });
          res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil(15 * 60 / 1000)
          });
        }
      }),

      // Authentication rate limiter
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many authentication attempts',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          return req.ip;
        },
        handler: (req, res) => {
          logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            path: req.path
          });
          res.status(429).json({
            error: 'Too many authentication attempts',
            retryAfter: Math.ceil(15 * 60 / 1000)
          });
        }
      }),

      // Trading API rate limiter (stricter)
      trading: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 requests per minute
        message: 'Too many trading requests',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          return req.headers['tenant-id'] + ':' + req.user?.id + ':' + req.ip;
        },
        handler: (req, res) => {
          logger.warn('Trading rate limit exceeded', {
            ip: req.ip,
            tenantId: req.headers['tenant-id'],
            userId: req.user?.id,
            path: req.path
          });
          res.status(429).json({
            error: 'Too many trading requests',
            retryAfter: Math.ceil(60 / 1000)
          });
        }
      }),

      // Admin API rate limiter
      admin: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // 50 requests per window
        message: 'Too many admin requests',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          return req.headers['tenant-id'] + ':' + req.user?.id + ':' + req.ip;
        },
        handler: (req, res) => {
          logger.warn('Admin rate limit exceeded', {
            ip: req.ip,
            tenantId: req.headers['tenant-id'],
            userId: req.user?.id,
            path: req.path
          });
          res.status(429).json({
            error: 'Too many admin requests',
            retryAfter: Math.ceil(15 * 60 / 1000)
          });
        }
      })
    };
  }

  /**
   * Apply security headers
   */
  applySecurityHeaders() {
    return helmet({
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
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  /**
   * Apply CORS configuration
   */
  applyCORS() {
    return cors(this.corsOptions);
  }

  /**
   * Apply rate limiting based on route
   */
  applyRateLimiting(routeType = 'general') {
    const limiter = this.rateLimiters[routeType] || this.rateLimiters.general;
    return limiter;
  }

  /**
   * Verify request signature for trading APIs
   */
  verifyRequestSignature(req, res, next) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const apiKey = req.headers['x-api-key'];

    // Skip signature verification for non-trading routes
    if (!req.path.startsWith('/api/trading') && !req.path.startsWith('/api/order')) {
      return next();
    }

    if (!signature || !timestamp || !apiKey) {
      logger.warn('Missing authentication headers for trading API', {
        ip: req.ip,
        path: req.path,
        headers: req.headers
      });
      return res.status(401).json({
        error: 'Missing authentication headers',
        required: ['X-Signature', 'X-Timestamp', 'X-API-Key']
      });
    }

    // Verify timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) { // 5 minutes
      logger.warn('Request timestamp expired', {
        ip: req.ip,
        path: req.path,
        timestamp,
        now
      });
      return res.status(401).json({
        error: 'Request timestamp expired',
        message: 'Request must be sent within 5 minutes'
      });
    }

    // Verify signature
    const expectedSignature = this.generateRequestSignature(
      req.method,
      req.path,
      req.body,
      timestamp,
      apiKey
    );

    if (signature !== expectedSignature) {
      logger.warn('Invalid request signature', {
        ip: req.ip,
        path: req.path,
        expectedSignature,
        actualSignature: signature
      });
      return res.status(401).json({
        error: 'Invalid request signature',
        message: 'Request signature verification failed'
      });
    }

    // Verify API key
    this.verifyAPIKey(apiKey, req, res, next);
  }

  /**
   * Generate request signature
   */
  generateRequestSignature(method, path, body, timestamp, apiKey) {
    const payload = `${method}${path}${JSON.stringify(body)}${timestamp}${apiKey}`;
    return crypto.createHmac('sha256', process.env.API_SECRET_KEY).update(payload).digest('hex');
  }

  /**
   * Verify API key
   */
  async verifyAPIKey(apiKey, req, res, next) {
    try {
      // Query database to verify API key
      const query = `
        SELECT user_id, tenant_id, permissions, status
        FROM api_keys 
        WHERE key_hash = $1 AND status = 'ACTIVE'
      `;
      
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const result = await req.app.locals.db.query(query, [keyHash]);
      
      if (result.rows.length === 0) {
        logger.warn('Invalid API key', { ip: req.ip, path: req.path });
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'API key not found or inactive'
        });
      }

      const apiKeyData = result.rows[0];
      
      // Add API key data to request
      req.apiKey = apiKeyData;
      
      next();
    } catch (error) {
      logger.error('API key verification failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify API key'
      });
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!signature) {
      logger.warn('Missing webhook signature', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Missing webhook signature',
        message: 'Webhook signature is required'
      });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        path: req.path,
        expectedSignature,
        actualSignature: signature
      });
      return res.status(401).json({
        error: 'Invalid webhook signature',
        message: 'Webhook signature verification failed'
      });
    }

    next();
  }

  /**
   * Validate request body
   */
  validateRequestBody(schema) {
    return (req, res, next) => {
      try {
        const { error } = schema.validate(req.body);
        if (error) {
          logger.warn('Request validation failed', {
            ip: req.ip,
            path: req.path,
            errors: error.details
          });
          return res.status(400).json({
            error: 'Validation failed',
            details: error.details.map(detail => detail.message)
          });
        }
        next();
      } catch (error) {
        logger.error('Request validation error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate request'
        });
      }
    };
  }

  /**
   * Sanitize request data
   */
  sanitizeRequestData(req, res, next) {
    // Sanitize request body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  /**
   * Sanitize individual value
   */
  sanitizeValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove potentially dangerous characters
    return value
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Add request ID for tracking
   */
  addRequestId(req, res, next) {
    const requestId = crypto.randomBytes(16).toString('hex');
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }

  /**
   * Log security events
   */
  logSecurityEvent(event, req, details = {}) {
    const securityLog = {
      event,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      tenantId: req.headers['tenant-id'],
      userId: req.user?.id,
      requestId: req.requestId,
      details
    };

    logger.warn('Security event detected', securityLog);
  }

  /**
   * Block suspicious IPs
   */
  blockSuspiciousIPs(req, res, next) {
    const suspiciousIPs = process.env.SUSPICIOUS_IPS?.split(',') || [];
    
    if (suspiciousIPs.includes(req.ip)) {
      this.logSecurityEvent('SUSPICIOUS_IP_BLOCKED', req);
      return res.status(403).json({
        error: 'Access denied',
        message: 'IP address is blocked'
      });
    }

    next();
  }

  /**
   * Validate API version
   */
  validateAPIVersion(req, res, next) {
    const apiVersion = req.headers['x-api-version'] || req.query.version;
    const supportedVersions = ['v1', 'v2', 'v3'];
    
    if (apiVersion && !supportedVersions.includes(apiVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        message: `API version ${apiVersion} is not supported`,
        supportedVersions
      });
    }

    req.apiVersion = apiVersion || 'v1';
    next();
  }

  /**
   * Apply all security middleware
   */
  applyAllSecurity() {
    return [
      this.applySecurityHeaders(),
      this.applyCORS(),
      this.addRequestId,
      this.blockSuspiciousIPs,
      this.validateAPIVersion,
      this.sanitizeRequestData
    ];
  }

  /**
   * Get rate limiter for specific route
   */
  getRateLimiter(routeType) {
    return this.rateLimiters[routeType] || this.rateLimiters.general;
  }
}

module.exports = new SecurityMiddleware();
