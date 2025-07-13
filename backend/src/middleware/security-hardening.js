/**
 * Security Hardening Configuration for Fly.io Production Deployment
 * Implements additional security measures beyond existing middleware
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

class SecurityHardening {
    constructor() {
        this.suspiciousIPs = new Set();
        this.failedAttempts = new Map();
        this.maxFailedAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Advanced rate limiting with progressive penalties
     */
    getAdaptiveRateLimiter() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: (req) => {
                // Stricter limits for suspicious IPs
                if (this.suspiciousIPs.has(req.ip)) {
                    return 10; // 10 requests per minute for suspicious IPs
                }
                return 100; // 100 requests per minute for normal IPs
            },
            keyGenerator: (req) => {
                // Use IP + User-Agent for more granular rate limiting
                return `${req.ip}:${crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex')}`;
            },
            handler: (req, res) => {
                this.flagSuspiciousIP(req.ip);
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    retryAfter: 60,
                    requestId: req.requestId || 'unknown'
                });
            }
        });
    }

    /**
     * Input validation and sanitization middleware
     */
    getInputValidationMiddleware() {
        return (req, res, next) => {
            // Validate request size
            const contentLength = parseInt(req.headers['content-length'] || '0');
            if (contentLength > 10 * 1024 * 1024) { // 10MB limit
                return res.status(413).json({
                    error: 'Request entity too large',
                    maxSize: '10MB'
                });
            }

            // Validate headers
            const suspiciousHeaders = [
                'x-forwarded-host',
                'x-original-url',
                'x-rewrite-url'
            ];

            for (const header of suspiciousHeaders) {
                if (req.headers[header]) {
                    this.logSecurityEvent('suspicious_header', {
                        ip: req.ip,
                        header,
                        value: req.headers[header],
                        userAgent: req.headers['user-agent']
                    });
                }
            }

            // Sanitize query parameters
            if (req.query) {
                this.sanitizeObject(req.query);
            }

            // Sanitize request body
            if (req.body && typeof req.body === 'object') {
                this.sanitizeObject(req.body);
            }

            next();
        };
    }

    /**
     * SQL injection and XSS protection
     */
    sanitizeObject(obj) {
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /(\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi,
            /(union|select|insert|update|delete|drop|create|alter)\s/gi
        ];

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                for (const pattern of dangerousPatterns) {
                    if (pattern.test(obj[key])) {
                        this.logSecurityEvent('malicious_input_detected', {
                            key,
                            value: obj[key],
                            pattern: pattern.toString()
                        });
                        // Replace with safe placeholder
                        obj[key] = '[FILTERED]';
                    }
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.sanitizeObject(obj[key]);
            }
        }
    }

    /**
     * API authentication middleware with enhanced security
     */
    getEnhancedAuthMiddleware() {
        return (req, res, next) => {
            // Skip health checks
            if (req.path.startsWith('/health')) {
                return next();
            }

            const token = req.headers.authorization?.split(' ')[1];
            const apiKey = req.headers['x-api-key'];

            // Check for missing authentication
            if (!token && !apiKey && this.requiresAuth(req.path)) {
                this.trackFailedAuth(req.ip);
                return res.status(401).json({
                    error: 'Authentication required',
                    requestId: req.requestId
                });
            }

            // Validate token format
            if (token && !this.isValidTokenFormat(token)) {
                this.trackFailedAuth(req.ip);
                return res.status(401).json({
                    error: 'Invalid token format',
                    requestId: req.requestId
                });
            }

            // Check for account lockout
            if (this.isIPLocked(req.ip)) {
                return res.status(423).json({
                    error: 'Account temporarily locked due to suspicious activity',
                    retryAfter: this.getLockoutRemaining(req.ip)
                });
            }

            next();
        };
    }

    /**
     * File upload security middleware
     */
    getFileUploadSecurityMiddleware() {
        return (req, res, next) => {
            if (!req.files && !req.file) {
                return next();
            }

            const files = req.files || [req.file];
            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'text/plain'
            ];

            const maxFileSize = 5 * 1024 * 1024; // 5MB

            for (const file of files) {
                // Check file type
                if (!allowedTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        error: 'File type not allowed',
                        allowedTypes
                    });
                }

                // Check file size
                if (file.size > maxFileSize) {
                    return res.status(400).json({
                        error: 'File too large',
                        maxSize: '5MB'
                    });
                }

                // Check for suspicious file names
                if (this.isSuspiciousFileName(file.originalname)) {
                    this.logSecurityEvent('suspicious_file_upload', {
                        filename: file.originalname,
                        ip: req.ip
                    });
                    return res.status(400).json({
                        error: 'Invalid filename'
                    });
                }
            }

            next();
        };
    }

    /**
     * Request signing verification
     */
    getRequestSigningMiddleware() {
        return (req, res, next) => {
            // Only verify signatures for webhook endpoints
            if (!req.path.includes('/webhook')) {
                return next();
            }

            const signature = req.headers['x-signature'];
            const timestamp = req.headers['x-timestamp'];

            if (!signature || !timestamp) {
                return res.status(400).json({
                    error: 'Missing signature or timestamp'
                });
            }

            // Check timestamp (prevent replay attacks)
            const requestTime = parseInt(timestamp);
            const currentTime = Date.now();
            const timeDiff = Math.abs(currentTime - requestTime);

            if (timeDiff > 5 * 60 * 1000) { // 5 minutes tolerance
                return res.status(400).json({
                    error: 'Request timestamp too old or too far in future'
                });
            }

            // Verify signature
            const payload = JSON.stringify(req.body) + timestamp;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-secret')
                .update(payload)
                .digest('hex');

            if (!crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            )) {
                this.logSecurityEvent('invalid_webhook_signature', {
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({
                    error: 'Invalid signature'
                });
            }

            next();
        };
    }

    /**
     * Security event logging
     */
    logSecurityEvent(type, details) {
        const event = {
            timestamp: new Date().toISOString(),
            type,
            details,
            severity: this.getEventSeverity(type),
            environment: process.env.NODE_ENV,
            flyRegion: process.env.FLY_REGION
        };

        // Log to console (will be captured by Fly.io logging)
        console.warn(`Security Event: ${type}`, event);

        // In production, you might want to send this to an external security monitoring service
        if (process.env.SECURITY_WEBHOOK_URL) {
            this.sendSecurityAlert(event);
        }
    }

    /**
     * Helper methods
     */
    requiresAuth(path) {
        const publicPaths = [
            '/health',
            '/metrics',
            '/api/auth/login',
            '/api/auth/register',
            '/api/exchange-rates'
        ];
        
        return !publicPaths.some(publicPath => path.startsWith(publicPath));
    }

    isValidTokenFormat(token) {
        // Basic JWT format validation
        return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
    }

    trackFailedAuth(ip) {
        const attempts = this.failedAttempts.get(ip) || 0;
        this.failedAttempts.set(ip, attempts + 1);

        if (attempts >= this.maxFailedAttempts) {
            this.lockIP(ip);
        }
    }

    lockIP(ip) {
        this.suspiciousIPs.add(ip);
        setTimeout(() => {
            this.suspiciousIPs.delete(ip);
            this.failedAttempts.delete(ip);
        }, this.lockoutDuration);

        this.logSecurityEvent('ip_locked', { ip });
    }

    isIPLocked(ip) {
        return this.suspiciousIPs.has(ip);
    }

    getLockoutRemaining(ip) {
        // This is a simplified implementation
        return Math.ceil(this.lockoutDuration / 1000);
    }

    flagSuspiciousIP(ip) {
        this.suspiciousIPs.add(ip);
        this.logSecurityEvent('suspicious_ip_flagged', { ip });
    }

    isSuspiciousFileName(filename) {
        const suspiciousPatterns = [
            /\.(php|jsp|asp|aspx|exe|bat|cmd|sh)$/i,
            /\.\./,
            /[<>:"|?*]/,
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(filename));
    }

    getEventSeverity(type) {
        const severityMap = {
            'suspicious_header': 'medium',
            'malicious_input_detected': 'high',
            'invalid_webhook_signature': 'high',
            'suspicious_file_upload': 'medium',
            'ip_locked': 'high',
            'suspicious_ip_flagged': 'medium'
        };

        return severityMap[type] || 'low';
    }

    async sendSecurityAlert(event) {
        try {
            const response = await fetch(process.env.SECURITY_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Exchange-Platform-Security'
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                console.error('Failed to send security alert:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending security alert:', error);
        }
    }

    /**
     * Apply all security hardening to Express app
     */
    applySecurityHardening(app) {
        // Apply security middleware in order
        app.use(this.getInputValidationMiddleware());
        app.use(this.getAdaptiveRateLimiter());
        app.use(this.getEnhancedAuthMiddleware());
        app.use(this.getFileUploadSecurityMiddleware());
        app.use(this.getRequestSigningMiddleware());

        console.log('✅ Security hardening applied for Fly.io production deployment');
    }
}

module.exports = SecurityHardening;