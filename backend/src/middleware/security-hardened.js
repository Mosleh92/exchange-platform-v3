const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Comprehensive Security Middleware
 * Implements all critical security measures for production deployment
 */
class SecurityHardenedMiddleware {
  constructor() {
    this.securityLogger = new SecurityLogger();
    this.suspiciousIPs = new Map();
    this.blockedIPs = new Set();
  }

  /**
   * Apply all security middleware
   */
  applySecurityMiddleware(app) {
    // 1. Basic security headers
    this.applySecurityHeaders(app);

    // 2. Rate limiting
    this.applyRateLimiting(app);

    // 3. Input sanitization
    this.applyInputSanitization(app);

    // 4. CSRF protection
    this.applyCSRFProtection(app);

    // 5. SQL injection prevention
    this.applySQLInjectionPrevention(app);

    // 6. XSS protection
    this.applyXSSProtection(app);

    // 7. Parameter pollution prevention
    this.applyParameterPollutionPrevention(app);

    // 8. Custom security middleware
    this.applyCustomSecurityMiddleware(app);
  }

  /**
   * Apply security headers using Helmet
   */
  applySecurityHeaders(app) {
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
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      xssFilter: true,
      hidePoweredBy: true
    }));

    // Additional custom headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    });
  }

  /**
   * Apply comprehensive rate limiting
   */
  applyRateLimiting(app) {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logRateLimitViolation(req);
        res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP'
        });
      }
    });

    // Strict rate limiting for sensitive endpoints
    const strictLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: {
        success: false,
        code: 'STRICT_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests to sensitive endpoint'
      },
      handler: (req, res) => {
        this.logSecurityEvent('STRICT_RATE_LIMIT_VIOLATION', req);
        res.status(429).json({
          success: false,
          code: 'STRICT_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests to sensitive endpoint'
        });
      }
    });

    // Apply general limiter to all routes
    app.use(generalLimiter);

    // Apply strict limiter to sensitive routes
    app.use('/api/auth', strictLimiter);
    app.use('/api/admin', strictLimiter);
    app.use('/api/transactions', strictLimiter);
  }

  /**
   * Apply input sanitization
   */
  applyInputSanitization(app) {
    // Sanitize all input data
    app.use((req, res, next) => {
      // Sanitize query parameters
      if (req.query) {
        Object.keys(req.query).forEach(key => {
          if (typeof req.query[key] === 'string') {
            req.query[key] = this.sanitizeInput(req.query[key]);
          }
        });
      }

      // Sanitize body parameters
      if (req.body) {
        this.sanitizeObject(req.body);
      }

      // Sanitize URL parameters
      if (req.params) {
        Object.keys(req.params).forEach(key => {
          if (typeof req.params[key] === 'string') {
            req.params[key] = this.sanitizeInput(req.params[key]);
          }
        });
      }

      next();
    });
  }

  /**
   * Apply CSRF protection
   */
  applyCSRFProtection(app) {
    app.use((req, res, next) => {
      // Skip CSRF for GET requests
      if (req.method === 'GET') {
        return next();
      }

      // Check for CSRF token
      const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
      const sessionToken = req.session?.csrfToken;

      if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
        this.logSecurityEvent('CSRF_ATTEMPT', req);
        return res.status(403).json({
          success: false,
          code: 'CSRF_VIOLATION',
          message: 'CSRF token validation failed'
        });
      }

      next();
    });
  }

  /**
   * Apply SQL injection prevention
   */
  applySQLInjectionPrevention(app) {
    // Use mongo-sanitize for MongoDB injection prevention
    app.use(mongoSanitize());

    // Custom SQL injection detection
    app.use((req, res, next) => {
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
        /(\b(exec|execute|script|javascript|vbscript)\b)/i,
        /(\b(and|or)\s+\d+\s*=\s*\d+)/i,
        /(\b(union|select).*from)/i,
        /(\b(insert|update|delete).*where)/i
      ];

      const requestData = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(requestData)) {
          this.logSecurityEvent('SQL_INJECTION_ATTEMPT', req, { pattern: pattern.source });
          return res.status(403).json({
            success: false,
            code: 'SQL_INJECTION_DETECTED',
            message: 'Malicious input detected'
          });
        }
      }

      next();
    });
  }

  /**
   * Apply XSS protection
   */
  applyXSSProtection(app) {
    // Use xss-clean middleware
    app.use(xss());

    // Custom XSS detection
    app.use((req, res, next) => {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi,
        /onmouseover\s*=/gi
      ];

      const requestData = JSON.stringify(req.body) + JSON.stringify(req.query);
      
      for (const pattern of xssPatterns) {
        if (pattern.test(requestData)) {
          this.logSecurityEvent('XSS_ATTEMPT', req, { pattern: pattern.source });
          return res.status(403).json({
            success: false,
            code: 'XSS_DETECTED',
            message: 'Malicious script detected'
          });
        }
      }

      next();
    });
  }

  /**
   * Apply parameter pollution prevention
   */
  applyParameterPollutionPrevention(app) {
    app.use(hpp({
      whitelist: ['tags', 'categories'] // Allow specific parameters to be repeated
    }));
  }

  /**
   * Apply custom security middleware
   */
  applyCustomSecurityMiddleware(app) {
    // IP blocking middleware
    app.use((req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        return res.status(403).json({
          success: false,
          code: 'IP_BLOCKED',
          message: 'Access denied from this IP'
        });
      }

      // Check for suspicious activity
      this.checkSuspiciousActivity(req, clientIP);

      next();
    });

    // Request size limiting
    app.use((req, res, next) => {
      const contentLength = parseInt(req.headers['content-length'] || 0);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength > maxSize) {
        this.logSecurityEvent('LARGE_REQUEST_ATTEMPT', req, { size: contentLength });
        return res.status(413).json({
          success: false,
          code: 'REQUEST_TOO_LARGE',
          message: 'Request size exceeds limit'
        });
      }

      next();
    });

    // Method validation
    app.use((req, res, next) => {
      const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      
      if (!allowedMethods.includes(req.method)) {
        this.logSecurityEvent('INVALID_METHOD_ATTEMPT', req, { method: req.method });
        return res.status(405).json({
          success: false,
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed'
        });
      }

      next();
    });

    // User agent validation
    app.use((req, res, next) => {
      const userAgent = req.get('User-Agent');
      
      if (!userAgent) {
        this.logSecurityEvent('MISSING_USER_AGENT', req);
        return res.status(400).json({
          success: false,
          code: 'MISSING_USER_AGENT',
          message: 'User-Agent header required'
        });
      }

      // Check for suspicious user agents
      const suspiciousPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(userAgent)) {
          this.logSecurityEvent('SUSPICIOUS_USER_AGENT', req, { userAgent });
          // Don't block, just log
        }
      }

      next();
    });
  }

  /**
   * Sanitize input string
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove null bytes
    input = input.replace(/\0/g, '');

    // Remove control characters
    input = input.replace(/[\x00-\x1F\x7F]/g, '');

    // HTML encode
    input = validator.escape(input);

    // Remove script tags
    input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    return input.trim();
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeObject(obj[key]);
        }
      }
    }
  }

  /**
   * Check for suspicious activity
   */
  checkSuspiciousActivity(req, clientIP) {
    const suspiciousPatterns = [
      /\.\.\//, // Directory traversal
      /union\s+select/i, // SQL injection
      /<script/i, // XSS
      /javascript:/i, // XSS
      /eval\s*\(/i, // Code injection
      /document\.cookie/i, // Cookie theft
      /alert\s*\(/i, // XSS
      /onload\s*=/i, // XSS
      /onerror\s*=/i // XSS
    ];

    const requestData = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        this.logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', req, {
          pattern: pattern.source,
          ip: clientIP
        });

        // Increment suspicious activity counter
        const currentCount = this.suspiciousIPs.get(clientIP) || 0;
        this.suspiciousIPs.set(clientIP, currentCount + 1);

        // Block IP if too many suspicious activities
        if (currentCount >= 5) {
          this.blockedIPs.add(clientIP);
          this.logSecurityEvent('IP_BLOCKED', req, { ip: clientIP, reason: 'Suspicious activity' });
        }

        break;
      }
    }
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(req) {
    this.logSecurityEvent('RATE_LIMIT_VIOLATION', req, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, req, additionalData = {}) {
    const eventData = {
      eventType,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      ...additionalData
    };

    this.securityLogger.logSecurityEvent(eventType, eventData);
  }

  /**
   * Sanitize headers for logging
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token, sessionToken) {
    return token && sessionToken && token === sessionToken;
  }
}

// Export middleware instance
const securityMiddleware = new SecurityHardenedMiddleware();

module.exports = {
  applySecurityMiddleware: securityMiddleware.applySecurityMiddleware.bind(securityMiddleware),
  generateCSRFToken: securityMiddleware.generateCSRFToken.bind(securityMiddleware),
  validateCSRFToken: securityMiddleware.validateCSRFToken.bind(securityMiddleware)
}; 