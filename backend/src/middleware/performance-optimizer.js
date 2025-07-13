/**
 * Performance Optimization Middleware for Fly.io Deployment
 * Handles caching, compression, and performance monitoring
 */

const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheMaxSize = 1000;
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Apply compression middleware optimized for Fly.io
     */
    getCompressionMiddleware() {
        return compression({
            // Only compress responses that are larger than 1kb
            threshold: 1024,
            // Compression level (1-9, where 9 is best compression but slowest)
            level: 6,
            // Only compress these content types
            filter: (req, res) => {
                const contentType = res.getHeader('content-type');
                if (!contentType) return false;
                
                return (
                    contentType.includes('text/') ||
                    contentType.includes('application/json') ||
                    contentType.includes('application/javascript') ||
                    contentType.includes('application/xml') ||
                    contentType.includes('image/svg+xml')
                );
            }
        });
    }

    /**
     * Security headers optimized for Fly.io
     */
    getSecurityMiddleware() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", 'wss:', 'ws:'],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: []
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }

    /**
     * CORS configuration for Fly.io deployment
     */
    getCorsMiddleware() {
        const allowedOrigins = [
            'https://exchange-platform-frontend.fly.dev',
            'https://exchange-platform-backend.fly.dev',
            process.env.FRONTEND_URL,
            process.env.CORS_ORIGIN
        ].filter(Boolean);

        // Add localhost for development
        if (process.env.NODE_ENV !== 'production') {
            allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
        }

        return cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.includes(origin)) {
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
                'X-Request-ID',
                'X-Tenant-ID'
            ],
            exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining']
        });
    }

    /**
     * Rate limiting optimized for Fly.io
     */
    getRateLimiters() {
        // General API rate limiter
        const apiLimiter = rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 100, // 100 requests per minute
            message: {
                error: 'Too many requests, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
                });
            }
        });

        // Auth endpoints rate limiter (stricter)
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 attempts
            message: {
                error: 'Too many authentication attempts, please try again later.',
                code: 'AUTH_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false
        });

        return { apiLimiter, authLimiter };
    }

    /**
     * Response caching middleware
     */
    getCacheMiddleware() {
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            // Skip caching for authenticated requests
            if (req.headers.authorization) {
                return next();
            }

            const cacheKey = `${req.method}:${req.originalUrl}`;
            const cached = this.cache.get(cacheKey);

            if (cached && Date.now() < cached.expires) {
                res.set('X-Cache', 'HIT');
                res.set('Cache-Control', `max-age=${Math.floor((cached.expires - Date.now()) / 1000)}`);
                return res.json(cached.data);
            }

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = (data) => {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    // Clean cache if it's getting too large
                    if (this.cache.size >= this.cacheMaxSize) {
                        const oldestKey = this.cache.keys().next().value;
                        this.cache.delete(oldestKey);
                    }

                    this.cache.set(cacheKey, {
                        data,
                        expires: Date.now() + this.cacheTimeout
                    });
                    
                    res.set('X-Cache', 'MISS');
                    res.set('Cache-Control', `max-age=${this.cacheTimeout / 1000}`);
                }

                return originalJson.call(res, data);
            };

            next();
        };
    }

    /**
     * Performance monitoring middleware
     */
    getPerformanceMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Add request ID for tracing
            req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            res.set('X-Request-ID', req.requestId);

            // Monitor response time
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                
                // Log slow requests
                if (responseTime > 1000) {
                    console.warn(`Slow request detected: ${req.method} ${req.originalUrl} - ${responseTime}ms`, {
                        requestId: req.requestId,
                        method: req.method,
                        url: req.originalUrl,
                        responseTime,
                        statusCode: res.statusCode,
                        userAgent: req.headers['user-agent']
                    });
                }

                // Add performance headers
                res.set('X-Response-Time', `${responseTime}ms`);
                res.set('X-Powered-By', 'Exchange-Platform-v3');
            });

            next();
        };
    }

    /**
     * Error handling middleware optimized for production
     */
    getErrorMiddleware() {
        return (err, req, res, next) => {
            const requestId = req.requestId || 'unknown';
            
            // Log error with context
            console.error('Request error:', {
                requestId,
                error: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.headers['user-agent'],
                ip: req.ip
            });

            // Determine status code
            let statusCode = err.statusCode || err.status || 500;
            
            // Handle different error types
            let message = 'Internal server error';
            if (statusCode < 500) {
                message = err.message;
            }

            // Send error response
            res.status(statusCode).json({
                error: message,
                requestId,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        };
    }

    /**
     * Health check optimization
     */
    getHealthCheckMiddleware() {
        return (req, res, next) => {
            // Skip all middleware for health checks
            if (req.path === '/health' || req.path === '/health/live' || req.path === '/health/ready') {
                return next();
            }
            next();
        };
    }

    /**
     * Apply all optimizations to Express app
     */
    applyOptimizations(app) {
        // Health check bypass (should be first)
        app.use(this.getHealthCheckMiddleware());

        // Performance monitoring
        app.use(this.getPerformanceMiddleware());

        // Security headers
        app.use(this.getSecurityMiddleware());

        // CORS
        app.use(this.getCorsMiddleware());

        // Compression
        app.use(this.getCompressionMiddleware());

        // Caching
        app.use(this.getCacheMiddleware());

        // Rate limiting
        const { apiLimiter, authLimiter } = this.getRateLimiters();
        
        // Apply strict rate limiting to auth endpoints
        app.use('/api/auth', authLimiter);
        app.use('/auth', authLimiter);
        
        // Apply general rate limiting to all API endpoints
        app.use('/api', apiLimiter);

        console.log('✅ Performance optimizations applied for Fly.io deployment');
    }
}

module.exports = PerformanceOptimizer;