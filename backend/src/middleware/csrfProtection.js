const Tokens = require('csrf');
const logger = require('../utils/logger');

/**
 * CSRF Protection Middleware
 * Implements CSRF token validation for enhanced security
 */
class CSRFProtection {
  constructor() {
    this.tokens = new Tokens();
    this.secret = process.env.CSRF_SECRET || require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Generate CSRF token middleware
   */
  generateToken() {
    return (req, res, next) => {
      try {
        if (!req.session) {
          return res.status(500).json({ 
            error: 'Session middleware required for CSRF protection' 
          });
        }

        // Generate new secret if not exists
        if (!req.session.csrfSecret) {
          req.session.csrfSecret = this.tokens.secretSync();
        }

        // Generate token
        const token = this.tokens.create(req.session.csrfSecret);
        req.csrfToken = token;
        
        // Add token to response locals for templates
        res.locals.csrfToken = token;
        
        next();
      } catch (error) {
        logger.error('CSRF token generation failed:', error);
        return res.status(500).json({ 
          error: 'CSRF token generation failed' 
        });
      }
    };
  }

  /**
   * Verify CSRF token middleware
   */
  verifyToken() {
    return (req, res, next) => {
      try {
        // Skip verification for safe methods
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        // Skip for API endpoints with proper authentication
        if (req.path.startsWith('/api/') && req.headers.authorization) {
          return next();
        }

        const token = req.headers['x-csrf-token'] || 
                     req.body._csrf || 
                     req.query._csrf;

        if (!token) {
          logger.warn('CSRF token missing', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
          });
          return res.status(403).json({ 
            error: 'CSRF token required',
            code: 'CSRF_TOKEN_MISSING'
          });
        }

        if (!req.session || !req.session.csrfSecret) {
          logger.warn('CSRF secret missing from session', {
            ip: req.ip,
            path: req.path
          });
          return res.status(403).json({ 
            error: 'Invalid session for CSRF validation',
            code: 'CSRF_SESSION_INVALID'
          });
        }

        // Verify token
        const isValid = this.tokens.verify(req.session.csrfSecret, token);
        
        if (!isValid) {
          logger.warn('Invalid CSRF token', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            token: token.substring(0, 8) + '...'
          });
          return res.status(403).json({ 
            error: 'Invalid CSRF token',
            code: 'CSRF_TOKEN_INVALID'
          });
        }

        next();
      } catch (error) {
        logger.error('CSRF token verification failed:', error);
        return res.status(500).json({ 
          error: 'CSRF token verification failed' 
        });
      }
    };
  }

  /**
   * Get CSRF token endpoint
   */
  getTokenEndpoint() {
    return (req, res) => {
      try {
        if (!req.csrfToken) {
          return res.status(500).json({ 
            error: 'CSRF token not generated' 
          });
        }

        res.json({
          csrfToken: req.csrfToken,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error('CSRF token retrieval failed:', error);
        res.status(500).json({ 
          error: 'Failed to retrieve CSRF token' 
        });
      }
    };
  }

  /**
   * Configure CSRF protection for the application
   */
  configure() {
    return {
      generate: this.generateToken(),
      verify: this.verifyToken(),
      getToken: this.getTokenEndpoint()
    };
  }
}

module.exports = new CSRFProtection();