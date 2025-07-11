const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrfProtection = require('./csrfProtection');
const logger = require('../utils/logger');

/**
 * Enhanced Security Middleware
 * Combines multiple security layers for comprehensive protection
 */
class EnhancedSecurityMiddleware {
  constructor() {
    this.initializeSecurityLayers();
  }

  /**
   * Initialize all security layers
   */
  initializeSecurityLayers() {
    // Configure rate limiting
    this.rateLimitConfig = {
      // General API rate limiting
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
          error: 'Too many requests from this IP',
          retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
          });
          res.status(429).json({
            error: 'Too many requests from this IP',
            retryAfter: '15 minutes'
          });
        }
      }),

      // Strict rate limiting for authentication endpoints
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: {
          error: 'Too many login attempts',
          retryAfter: '15 minutes'
        },
        skipSuccessfulRequests: true,
        handler: (req, res) => {
          logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
          });
          res.status(429).json({
            error: 'Too many login attempts from this IP',
            retryAfter: '15 minutes'
          });
        }
      }),

      // Strict rate limiting for password reset
      passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // limit each IP to 3 password reset attempts per hour
        message: {
          error: 'Too many password reset attempts',
          retryAfter: '1 hour'
        },
        handler: (req, res) => {
          logger.warn('Password reset rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          res.status(429).json({
            error: 'Too many password reset attempts',
            retryAfter: '1 hour'
          });
        }
      })
    };

    // Configure Helmet security headers
    this.helmetConfig = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow for API usage
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "same-origin" }
    });
  }

  /**
   * Apply all security middleware
   */
  applyAllSecurity() {
    return [
      // Apply Helmet security headers
      this.helmetConfig,
      
      // Apply general rate limiting
      this.rateLimitConfig.general,
      
      // Generate CSRF tokens
      csrfProtection.configure().generate,
      
      // Custom security headers
      this.customSecurityHeaders(),
      
      // Request sanitization
      this.sanitizeRequests(),
      
      // Security logging
      this.securityLogging()
    ];
  }

  /**
   * Apply authentication-specific security
   */
  applyAuthSecurity() {
    return [
      this.rateLimitConfig.auth,
      csrfProtection.configure().verify
    ];
  }

  /**
   * Apply password reset security
   */
  applyPasswordResetSecurity() {
    return [
      this.rateLimitConfig.passwordReset,
      csrfProtection.configure().verify
    ];
  }

  /**
   * Custom security headers middleware
   */
  customSecurityHeaders() {
    return (req, res, next) => {
      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      next();
    };
  }

  /**
   * Request sanitization middleware
   */
  sanitizeRequests() {
    return (req, res, next) => {
      // Remove potentially dangerous characters from query parameters
      if (req.query) {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            req.query[key] = req.query[key].replace(/[<>\"']/g, '');
          }
        }
      }

      // Basic input validation for common attacks
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /expression\s*\(/i
      ];

      const checkForSuspiciousContent = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            for (const pattern of suspiciousPatterns) {
              if (pattern.test(obj[key])) {
                logger.warn('Suspicious content detected', {
                  ip: req.ip,
                  userAgent: req.get('User-Agent'),
                  path: req.path,
                  field: key,
                  content: obj[key].substring(0, 100)
                });
                return res.status(400).json({
                  error: 'Invalid input detected',
                  code: 'SUSPICIOUS_CONTENT'
                });
              }
            }
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            checkForSuspiciousContent(obj[key]);
          }
        }
      };

      if (req.body) {
        checkForSuspiciousContent(req.body);
      }

      next();
    };
  }

  /**
   * Security logging middleware
   */
  securityLogging() {
    return (req, res, next) => {
      // Log suspicious requests
      const suspiciousHeaders = [
        'x-forwarded-for',
        'x-real-ip',
        'user-agent'
      ];

      const logData = {
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      // Log requests to sensitive endpoints
      const sensitiveEndpoints = ['/api/auth', '/api/admin', '/api/payment'];
      if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        logger.info('Sensitive endpoint access', logData);
      }

      // Log requests with suspicious patterns
      const suspiciousUA = /bot|crawler|spider|scraper/i;
      if (suspiciousUA.test(req.get('User-Agent'))) {
        logger.warn('Suspicious user agent detected', logData);
      }

      next();
    };
  }

  /**
   * Get CSRF token endpoint
   */
  getCSRFToken() {
    return csrfProtection.configure().getToken;
  }
}

module.exports = new EnhancedSecurityMiddleware();