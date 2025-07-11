const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Modern CSRF Protection Middleware
 * Replaces deprecated csurf package with secure token-based protection
 */
class CSRFProtection {
    constructor() {
        this.tokenStore = new Map();
        this.tokenExpiry = 60 * 60 * 1000; // 1 hour
    }

    /**
     * Generate secure CSRF token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Store token with expiry
     */
    storeToken(sessionId, token) {
        this.tokenStore.set(sessionId, {
            token,
            expires: Date.now() + this.tokenExpiry
        });
    }

    /**
     * Validate CSRF token
     */
    validateToken(sessionId, providedToken) {
        const stored = this.tokenStore.get(sessionId);
        
        if (!stored) {
            return false;
        }

        if (Date.now() > stored.expires) {
            this.tokenStore.delete(sessionId);
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(stored.token, 'hex'),
            Buffer.from(providedToken, 'hex')
        );
    }

    /**
     * Clean expired tokens
     */
    cleanExpiredTokens() {
        const now = Date.now();
        for (const [sessionId, data] of this.tokenStore.entries()) {
            if (now > data.expires) {
                this.tokenStore.delete(sessionId);
            }
        }
    }
}

const csrfProtection = new CSRFProtection();

// Clean expired tokens every 10 minutes (only in production)
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        csrfProtection.cleanExpiredTokens();
    }, 10 * 60 * 1000);
}

// CSRF middleware for generating tokens
const generateCSRFToken = (req, res, next) => {
    const sessionId = req.sessionID || req.headers['x-session-id'] || 'default';
    const token = csrfProtection.generateToken();
    
    csrfProtection.storeToken(sessionId, token);
    
    // Set token in cookie for frontend access
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour
    });

    req.csrfToken = () => token;
    next();
};

// CSRF validation middleware
const validateCSRFToken = (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const sessionId = req.sessionID || req.headers['x-session-id'] || 'default';
    const token = req.headers['x-csrf-token'] || 
                  req.headers['x-xsrf-token'] || 
                  req.body._csrf;

    if (!token) {
        logger.warn('CSRF token missing', {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        
        return res.status(403).json({
            success: false,
            message: 'توکن CSRF مورد نیاز است',
            code: 'CSRF_TOKEN_MISSING'
        });
    }

    if (!csrfProtection.validateToken(sessionId, token)) {
        logger.warn('CSRF token validation failed', {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        
        return res.status(403).json({
            success: false,
            message: 'توکن CSRF نامعتبر است',
            code: 'CSRF_TOKEN_INVALID'
        });
    }

    next();
};

// CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
    if (err.code === 'CSRF_TOKEN_INVALID' || err.code === 'CSRF_TOKEN_MISSING') {
        return res.status(403).json({
            success: false,
            message: 'خطای احراز هویت CSRF',
            code: err.code
        });
    }
    next(err);
};

module.exports = {
    generateCSRFToken,
    validateCSRFToken,
    csrfErrorHandler,
    // Legacy compatibility
    csrfProtection: validateCSRFToken,
    generateToken: generateCSRFToken
}; 