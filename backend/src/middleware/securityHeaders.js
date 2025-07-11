// middleware/securityHeaders.js - Advanced Security Headers Configuration
const helmet = require('helmet');

/**
 * Advanced security headers configuration
 * Implements CSP, HSTS, and other security headers
 */
class SecurityHeaders {
  /**
   * Get Content Security Policy configuration
   * @param {boolean} isDevelopment - Whether in development mode
   * @returns {Object} - CSP configuration
   */
  getCSPConfig(isDevelopment = process.env.NODE_ENV !== 'production') {
    const allowedDomains = [
      "'self'",
      'https://api.exchangeplatform.com',
      'https://cdn.exchangeplatform.com'
    ];

    // Add localhost for development
    if (isDevelopment) {
      allowedDomains.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      );
    }

    return {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Only for development - remove in production
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          ...(isDevelopment ? ["'unsafe-eval'"] : [])
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdn.jsdelivr.net',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://api.qrserver.com', // For QR codes
          'https://chart.googleapis.com',
          'https://cdn.exchangeplatform.com'
        ],
        connectSrc: [
          "'self'",
          'https://api.exchangeplatform.com',
          'wss://api.exchangeplatform.com',
          ...(isDevelopment ? [
            'http://localhost:3000',
            'http://localhost:3001',
            'ws://localhost:3000',
            'ws://localhost:3001'
          ] : [])
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: !isDevelopment ? [] : undefined
      },
      reportUri: '/api/security/csp-report',
      reportOnly: isDevelopment // Only report in development, enforce in production
    };
  }

  /**
   * Get HSTS configuration
   * @param {boolean} isProduction - Whether in production mode
   * @returns {Object} - HSTS configuration
   */
  getHSTSConfig(isProduction = process.env.NODE_ENV === 'production') {
    return {
      maxAge: isProduction ? 31536000 : 0, // 1 year in production, disabled in dev
      includeSubDomains: isProduction,
      preload: isProduction
    };
  }

  /**
   * Get Referrer Policy configuration
   * @returns {Object} - Referrer policy configuration
   */
  getReferrerPolicyConfig() {
    return {
      policy: ['strict-origin-when-cross-origin']
    };
  }

  /**
   * Get Permissions Policy configuration
   * @returns {Object} - Permissions policy configuration
   */
  getPermissionsPolicyConfig() {
    return {
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'self'"],
        notifications: ["'self'"],
        payment: ["'self'"],
        accelerometer: ["'none'"],
        autoplay: ["'none'"],
        encryptedMedia: ["'none'"],
        fullscreen: ["'self'"],
        gyroscope: ["'none'"],
        magnetometer: ["'none'"],
        midi: ["'none'"],
        sync: ["'none'"],
        usb: ["'none'"],
        vr: ["'none'"],
        webauthn: ["'self'"]
      }
    };
  }

  /**
   * Apply all security headers
   * @returns {Function} - Express middleware
   */
  applyAllSecurityHeaders() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    return helmet({
      // Content Security Policy
      contentSecurityPolicy: this.getCSPConfig(isDevelopment),

      // HTTP Strict Transport Security
      hsts: this.getHSTSConfig(!isDevelopment),

      // X-Frame-Options
      frameguard: {
        action: 'deny' // Prevent clickjacking
      },

      // X-Content-Type-Options
      noSniff: true,

      // X-XSS-Protection (deprecated but still used by older browsers)
      xssFilter: {
        setOnOldIE: true
      },

      // Referrer Policy
      referrerPolicy: this.getReferrerPolicyConfig(),

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin'
      },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin' // Allow cross-origin requests for API
      },

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false
      },

      // Expect-CT (deprecated but might be useful)
      expectCt: false,

      // Hide Powered-By header
      hidePoweredBy: true,

      // HPKP (HTTP Public Key Pinning) - disabled as it's deprecated
      hpkp: false,

      // IE No Open
      ieNoOpen: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Permissions Policy
      permissionsPolicy: this.getPermissionsPolicyConfig()
    });
  }

  /**
   * Security headers specifically for API endpoints
   * @returns {Function} - Express middleware
   */
  apiSecurityHeaders() {
    return (req, res, next) => {
      // API-specific headers
      res.setHeader('X-API-Version', process.env.API_VERSION || '3.0.0');
      res.setHeader('X-RateLimit-Limit', req.rateLimit?.limit || 'N/A');
      res.setHeader('X-RateLimit-Remaining', req.rateLimit?.remaining || 'N/A');
      res.setHeader('X-RateLimit-Reset', req.rateLimit?.reset || 'N/A');

      // Prevent caching of sensitive API responses
      if (req.path.includes('/auth') || req.path.includes('/user') || req.path.includes('/admin')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Add security headers for JSON responses
      if (req.accepts('json')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
      }

      next();
    };
  }

  /**
   * CSP violation reporting endpoint
   * @returns {Function} - Express middleware
   */
  cspReportHandler() {
    return (req, res) => {
      const report = req.body;
      
      // Log CSP violations
      console.warn('CSP Violation Report:', {
        'blocked-uri': report['blocked-uri'],
        'document-uri': report['document-uri'],
        'original-policy': report['original-policy'],
        'referrer': report.referrer,
        'violated-directive': report['violated-directive'],
        'effective-directive': report['effective-directive'],
        'disposition': report.disposition,
        'script-sample': report['script-sample'],
        'status-code': report['status-code'],
        'line-number': report['line-number'],
        'column-number': report['column-number'],
        'source-file': report['source-file'],
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // You could also send this to a logging service
      // await logSecurityViolation('CSP_VIOLATION', report);

      res.status(204).end();
    };
  }

  /**
   * Security headers for file uploads
   * @returns {Function} - Express middleware
   */
  fileUploadSecurityHeaders() {
    return (req, res, next) => {
      // Additional headers for file upload endpoints
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
      
      next();
    };
  }

  /**
   * CORS configuration with security considerations
   * @param {Array} allowedOrigins - Allowed origins
   * @returns {Object} - CORS configuration
   */
  getSecureCORSConfig(allowedOrigins = []) {
    return {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const defaultAllowedOrigins = [
          'https://exchangeplatform.com',
          'https://www.exchangeplatform.com',
          'https://app.exchangeplatform.com'
        ];

        // Add development origins if in development
        if (process.env.NODE_ENV !== 'production') {
          defaultAllowedOrigins.push(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
          );
        }

        const finalAllowedOrigins = [...defaultAllowedOrigins, ...allowedOrigins];
        
        if (finalAllowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-Request-ID',
        'X-Client-Version',
        'X-API-Key'
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ],
      maxAge: 86400 // 24 hours
    };
  }

  /**
   * Additional security middleware for admin routes
   * @returns {Function} - Express middleware
   */
  adminSecurityHeaders() {
    return (req, res, next) => {
      // Extra strict headers for admin routes
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Add custom admin security headers
      res.setHeader('X-Admin-Protection', 'enabled');
      res.setHeader('X-Sensitive-Route', 'true');
      
      next();
    };
  }
}

// Singleton instance
const securityHeaders = new SecurityHeaders();

module.exports = securityHeaders;