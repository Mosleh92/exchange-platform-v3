// backend/src/middleware/enhancedSecurity.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const sanitization = require('../utils/sanitization');
const securityAudit = require('../utils/securityAudit');
const sessionSecurity = require('../utils/sessionSecurity');
const csrf = require('./csrf');
const logger = require('../utils/logger');

/**
 * Enhanced Security Middleware Suite
 * Provides comprehensive security protection for the exchange platform
 */
class EnhancedSecurityMiddleware {
    constructor() {
        this.initializeSecurity();
    }

    /**
     * Initialize security configuration
     */
    initializeSecurity() {
        // Configure CORS
        this.corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:3001',
                    'http://localhost:5173',
                    'https://exchange-platform.com',
                    'https://admin.exchange-platform.com'
                ];

                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    securityAudit.logSecurityEvent(
                        securityAudit.securityEvents.SUSPICIOUS_ACTIVITY,
                        { origin, reason: 'CORS_VIOLATION' }
                    );
                    callback(new Error('CORS policy violation'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-API-Key',
                'X-CSRF-Token',
                'X-Requested-With',
                'X-Session-ID',
                'X-Tenant-ID'
            ],
            exposedHeaders: ['X-CSRF-Token', 'X-Rate-Limit-Remaining']
        };

        // Configure Helmet for security headers
        this.helmetOptions = {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", "wss:", "ws:"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: []
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            frameguard: { action: 'deny' },
            xssFilter: true,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
        };

        // Configure rate limiters
        this.rateLimiters = this.createRateLimiters();
    }

    /**
     * Create various rate limiters for different endpoints
     */
    createRateLimiters() {
        return {
            // General API rate limiter
            general: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 1000, // 1000 requests per window
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `${req.ip}:${req.user?.id || 'anonymous'}`;
                },
                handler: this.rateLimitHandler.bind(this),
                skip: (req) => {
                    // Skip rate limiting for health checks
                    return req.path === '/health' || req.path === '/api/health';
                }
            }),

            // Authentication endpoints (stricter)
            auth: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 10, // 10 attempts per window
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `auth:${req.ip}:${req.body?.email || 'unknown'}`;
                },
                handler: this.rateLimitHandler.bind(this)
            }),

            // Password reset (very strict)
            passwordReset: rateLimit({
                windowMs: 60 * 60 * 1000, // 1 hour
                max: 3, // 3 attempts per hour
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `reset:${req.ip}:${req.body?.email || 'unknown'}`;
                },
                handler: this.rateLimitHandler.bind(this)
            }),

            // Trading operations
            trading: rateLimit({
                windowMs: 60 * 1000, // 1 minute
                max: 60, // 60 requests per minute
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `trading:${req.user?.id}:${req.ip}`;
                },
                handler: this.rateLimitHandler.bind(this)
            }),

            // Administrative operations
            admin: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // 100 requests per window
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `admin:${req.user?.id}:${req.ip}`;
                },
                handler: this.rateLimitHandler.bind(this)
            }),

            // 2FA operations
            twoFactor: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 20, // 20 attempts per window
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: (req) => {
                    return `2fa:${req.user?.id}:${req.ip}`;
                },
                handler: this.rateLimitHandler.bind(this)
            })
        };
    }

    /**
     * Rate limit handler with security logging
     */
    rateLimitHandler(req, res) {
        securityAudit.logSecurityEvent(
            securityAudit.securityEvents.RATE_LIMIT_EXCEEDED,
            {
                req,
                user: req.user,
                path: req.path,
                method: req.method
            }
        );

        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        });

        res.status(429).json({
            success: false,
            message: 'درخواست‌های شما بیش از حد مجاز است. لطفاً مدتی صبر کنید.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }

    /**
     * Input validation and sanitization middleware
     */
    inputSanitization(fieldRules = {}) {
        return (req, res, next) => {
            try {
                // Log potential XSS attempts
                if (this.detectXSSAttempt(req)) {
                    securityAudit.logSecurityEvent(
                        securityAudit.securityEvents.XSS_ATTEMPT,
                        { req, user: req.user }
                    );
                }

                // Log potential SQL injection attempts
                if (this.detectSQLInjection(req)) {
                    securityAudit.logSecurityEvent(
                        securityAudit.securityEvents.SQL_INJECTION_ATTEMPT,
                        { req, user: req.user }
                    );
                }

                // Apply sanitization
                req.body = sanitization.sanitizeObject(req.body, fieldRules);
                req.query = sanitization.sanitizeObject(req.query, fieldRules);
                req.params = sanitization.sanitizeObject(req.params, fieldRules);

                next();
            } catch (error) {
                logger.error('Input sanitization error', error);
                res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر است',
                    code: 'INVALID_INPUT'
                });
            }
        };
    }

    /**
     * Detect XSS attempts
     */
    detectXSSAttempt(req) {
        const xssPatterns = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /eval\s*\(/gi,
            /alert\s*\(/gi
        ];

        const content = JSON.stringify({ ...req.body, ...req.query, ...req.params });
        return xssPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Detect SQL injection attempts
     */
    detectSQLInjection(req) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
            /(--|\#|\/\*|\*\/)/g,
            /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
            /(\bAND\b\s+\d+\s*=\s*\d+)/gi
        ];

        const content = JSON.stringify({ ...req.body, ...req.query, ...req.params });
        return sqlPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Security headers middleware
     */
    securityHeaders() {
        return [
            helmet(this.helmetOptions),
            (req, res, next) => {
                // Additional custom security headers
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('X-XSS-Protection', '1; mode=block');
                res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
                res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
                res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
                
                // Remove server information
                res.removeHeader('X-Powered-By');
                res.removeHeader('Server');
                
                next();
            }
        ];
    }

    /**
     * CORS middleware
     */
    corsMiddleware() {
        return cors(this.corsOptions);
    }

    /**
     * Request logging middleware
     */
    requestLogging() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Log request
            logger.info('Request received', {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                tenantId: req.headers['x-tenant-id']
            });

            // Log response
            const originalSend = res.send;
            res.send = function(data) {
                const duration = Date.now() - startTime;
                
                logger.info('Request completed', {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration,
                    ip: req.ip,
                    userId: req.user?.id
                });

                return originalSend.call(this, data);
            };

            next();
        };
    }

    /**
     * Apply all security middleware
     */
    applyAllSecurity() {
        return [
            // CORS
            this.corsMiddleware(),
            
            // Security headers
            ...this.securityHeaders(),
            
            // General rate limiting
            this.rateLimiters.general,
            
            // Input sanitization
            this.inputSanitization(),
            
            // Request logging
            this.requestLogging(),
            
            // Security audit middleware
            securityAudit.middleware(),
            
            // Session security
            sessionSecurity.middleware()
        ];
    }

    /**
     * Get rate limiter by type
     */
    getRateLimiter(type) {
        return this.rateLimiters[type] || this.rateLimiters.general;
    }

    /**
     * CSRF protection for sensitive operations
     */
    csrfProtection() {
        return [
            csrf.csrfProtection,
            csrf.generateToken,
            csrf.csrfErrorHandler
        ];
    }

    /**
     * Middleware for sensitive financial operations
     */
    financialSecurity() {
        return [
            this.getRateLimiter('trading'),
            this.inputSanitization({
                amount: 'amount',
                toAddress: 'string',
                memo: 'string'
            }),
            (req, res, next) => {
                securityAudit.trackTransaction(
                    securityAudit.securityEvents.TRANSACTION_CREATED,
                    { req, user: req.user }
                );
                next();
            }
        ];
    }

    /**
     * Middleware for administrative operations
     */
    adminSecurity() {
        return [
            this.getRateLimiter('admin'),
            ...this.csrfProtection(),
            (req, res, next) => {
                securityAudit.trackAdmin(
                    securityAudit.securityEvents.CONFIGURATION_CHANGED,
                    { req, user: req.user }
                );
                next();
            }
        ];
    }
}

module.exports = new EnhancedSecurityMiddleware();