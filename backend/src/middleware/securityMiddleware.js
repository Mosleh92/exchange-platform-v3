// backend/src/middleware/securityMiddleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { getRealIP } = require('./ipWhitelistMiddleware');

class SecurityMiddleware {
    /**
     * Configure Helmet for security headers
     */
    static configureHelmet() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: [],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            frameguard: { action: 'deny' },
            xssFilter: true,
            referrerPolicy: { policy: 'same-origin' }
        });
    }

    /**
     * Input sanitization middleware
     */
    static sanitizeInput() {
        return (req, res, next) => {
            try {
                // Sanitize request body
                if (req.body && typeof req.body === 'object') {
                    req.body = this.deepSanitize(req.body);
                }

                // Sanitize query parameters
                if (req.query && typeof req.query === 'object') {
                    req.query = this.deepSanitize(req.query);
                }

                // Sanitize URL parameters
                if (req.params && typeof req.params === 'object') {
                    req.params = this.deepSanitize(req.params);
                }

                next();
            } catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر'
                });
            }
        };
    }

    /**
     * Deep sanitize object
     */
    static deepSanitize(obj) {
        if (typeof obj === 'string') {
            return DOMPurify.sanitize(obj, { 
                ALLOWED_TAGS: [],
                ALLOWED_ATTR: []
            });
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepSanitize(item));
        }

        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = DOMPurify.sanitize(key, { 
                    ALLOWED_TAGS: [],
                    ALLOWED_ATTR: []
                });
                sanitized[sanitizedKey] = this.deepSanitize(value);
            }
            return sanitized;
        }

        return obj;
    }

    /**
     * SQL injection protection
     */
    static preventSQLInjection() {
        return (req, res, next) => {
            const sqlPatterns = [
                /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
                /('|(\\')|(;)|(\\)|(\-\-)|(\s+or\s+.*=.*)|(\/\*.*\*\/))/gi,
                /(script|javascript|vbscript|onload|onerror|onclick)/gi
            ];

            const checkForSQLInjection = (value) => {
                if (typeof value === 'string') {
                    return sqlPatterns.some(pattern => pattern.test(value));
                }
                return false;
            };

            const scanObject = (obj) => {
                if (typeof obj === 'string') {
                    return checkForSQLInjection(obj);
                }
                
                if (Array.isArray(obj)) {
                    return obj.some(item => scanObject(item));
                }
                
                if (obj && typeof obj === 'object') {
                    return Object.values(obj).some(value => scanObject(value));
                }
                
                return false;
            };

            if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
                // Log suspicious activity
                if (req.user) {
                    AuditLog.create({
                        userId: req.user.id,
                        action: 'SUSPICIOUS_SQL_INJECTION',
                        resource: 'Security',
                        details: 'تلاش SQL Injection شناسایی شد',
                        metadata: {
                            url: req.originalUrl,
                            method: req.method,
                            ip: getRealIP(req),
                            userAgent: req.headers['user-agent']
                        },
                        severity: 'high'
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'درخواست نامعتبر شناسایی شد'
                });
            }

            next();
        };
    }

    /**
     * XSS protection middleware
     */
    static preventXSS() {
        return (req, res, next) => {
            const xssPatterns = [
                /<script[^>]*>.*?<\/script>/gi,
                /<iframe[^>]*>.*?<\/iframe>/gi,
                /javascript:/gi,
                /on\w+\s*=/gi,
                /<.*?(?:onload|onerror|onclick|onmouseover).*?>/gi
            ];

            const checkForXSS = (value) => {
                if (typeof value === 'string') {
                    return xssPatterns.some(pattern => pattern.test(value));
                }
                return false;
            };

            const scanObject = (obj) => {
                if (typeof obj === 'string') {
                    return checkForXSS(obj);
                }
                
                if (Array.isArray(obj)) {
                    return obj.some(item => scanObject(item));
                }
                
                if (obj && typeof obj === 'object') {
                    return Object.values(obj).some(value => scanObject(value));
                }
                
                return false;
            };

            if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
                // Log XSS attempt
                if (req.user) {
                    AuditLog.create({
                        userId: req.user.id,
                        action: 'SUSPICIOUS_XSS_ATTEMPT',
                        resource: 'Security',
                        details: 'تلاش XSS شناسایی شد',
                        metadata: {
                            url: req.originalUrl,
                            method: req.method,
                            ip: getRealIP(req),
                            userAgent: req.headers['user-agent']
                        },
                        severity: 'high'
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'محتوای مشکوک شناسایی شد'
                });
            }

            next();
        };
    }

    /**
     * File upload security
     */
    static secureFileUpload(options = {}) {
        const {
            allowedMimeTypes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ],
            maxFileSize = 10 * 1024 * 1024, // 10MB
            maxFiles = 5
        } = options;

        return (req, res, next) => {
            if (!req.files || req.files.length === 0) {
                return next();
            }

            const files = Array.isArray(req.files) ? req.files : [req.files];

            // Check number of files
            if (files.length > maxFiles) {
                return res.status(400).json({
                    success: false,
                    message: `حداکثر ${maxFiles} فایل مجاز است`
                });
            }

            for (const file of files) {
                // Check file size
                if (file.size > maxFileSize) {
                    return res.status(400).json({
                        success: false,
                        message: `حجم فایل نباید از ${maxFileSize / 1024 / 1024}MB بیشتر باشد`
                    });
                }

                // Check MIME type
                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: 'نوع فایل مجاز نیست'
                    });
                }

                // Check file extension
                const allowedExtensions = this.getExtensionsFromMimeTypes(allowedMimeTypes);
                const fileExtension = file.originalname.split('.').pop().toLowerCase();
                
                if (!allowedExtensions.includes(fileExtension)) {
                    return res.status(400).json({
                        success: false,
                        message: 'پسوند فایل مجاز نیست'
                    });
                }

                // Basic malware detection (simple patterns)
                if (this.containsSuspiciousContent(file.buffer)) {
                    // Log malware attempt
                    if (req.user) {
                        AuditLog.create({
                            userId: req.user.id,
                            action: 'MALWARE_UPLOAD_ATTEMPT',
                            resource: 'Security',
                            details: 'تلاش آپلود فایل مشکوک',
                            metadata: {
                                filename: file.originalname,
                                mimetype: file.mimetype,
                                size: file.size,
                                ip: getRealIP(req)
                            },
                            severity: 'critical'
                        });
                    }

                    return res.status(400).json({
                        success: false,
                        message: 'فایل مشکوک شناسایی شد'
                    });
                }
            }

            next();
        };
    }

    /**
     * Get file extensions from MIME types
     */
    static getExtensionsFromMimeTypes(mimeTypes) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
            'text/plain': 'txt',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
        };

        return mimeTypes.map(mime => mimeToExt[mime]).filter(Boolean);
    }

    /**
     * Basic malware detection
     */
    static containsSuspiciousContent(buffer) {
        const suspiciousPatterns = [
            Buffer.from('MZ'), // PE executable header
            Buffer.from('PK'), // ZIP header (might contain malware)
            Buffer.from('<!DOCTYPE html'), // HTML content
            Buffer.from('<script'), // JavaScript
            Buffer.from('<?php'), // PHP code
        ];

        const content = buffer.toString('ascii', 0, Math.min(1024, buffer.length));
        
        // Check for suspicious strings
        const suspiciousStrings = [
            'eval(', 'exec(', 'system(', 'shell_exec(',
            'passthru(', 'base64_decode(', 'file_get_contents(',
            'curl_exec(', 'wget', 'chmod', 'rm -rf'
        ];

        return suspiciousStrings.some(str => content.includes(str));
    }

    /**
     * Request signature verification
     */
    static verifyRequestSignature(options = {}) {
        const { requireSignature = false } = options;

        return async (req, res, next) => {
            try {
                const signature = req.headers['x-signature'];
                const timestamp = req.headers['x-timestamp'];

                if (requireSignature && (!signature || !timestamp)) {
                    return res.status(400).json({
                        success: false,
                        message: 'امضای درخواست الزامی است'
                    });
                }

                if (signature && timestamp) {
                    // Get user's API secret
                    const user = await User.findById(req.user.id).select('apiKeys');
                    if (!user || !user.apiKeys || user.apiKeys.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'کلید API یافت نشد'
                        });
                    }

                    const apiKey = user.apiKeys.find(key => key.isActive);
                    if (!apiKey) {
                        return res.status(400).json({
                            success: false,
                            message: 'کلید API فعال یافت نشد'
                        });
                    }

                    // Verify signature
                    const DigitalSignatureService = require('../services/digitalSignatureService');
                    const verification = DigitalSignatureService.verifyAPISignature(
                        signature,
                        req.method,
                        req.originalUrl,
                        req.body,
                        parseInt(timestamp),
                        apiKey.secret
                    );

                    if (!verification.isValid) {
                        // Log failed verification
                        await AuditLog.create({
                            userId: req.user.id,
                            action: 'INVALID_REQUEST_SIGNATURE',
                            resource: 'Security',
                            details: `امضای درخواست نامعتبر: ${verification.error}`,
                            metadata: {
                                url: req.originalUrl,
                                method: req.method,
                                timestamp: timestamp,
                                ip: getRealIP(req)
                            },
                            severity: 'high'
                        });

                        return res.status(400).json({
                            success: false,
                            message: 'امضای درخواست نامعتبر است'
                        });
                    }

                    // Update API key usage
                    apiKey.lastUsed = new Date();
                    await user.save();
                }

                next();
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'خطا در تایید امضای درخواست'
                });
            }
        };
    }

    /**
     * Device fingerprinting
     */
    static trackDeviceFingerprint() {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return next();
                }

                const fingerprint = {
                    userAgent: req.headers['user-agent'],
                    acceptLanguage: req.headers['accept-language'],
                    acceptEncoding: req.headers['accept-encoding'],
                    ip: getRealIP(req),
                    timestamp: new Date()
                };

                // Store fingerprint in session or user record
                req.deviceFingerprint = fingerprint;

                // Check for device changes
                const user = await User.findById(req.user.id).select('lastKnownDevices');
                const fingerprintHash = require('crypto')
                    .createHash('sha256')
                    .update(JSON.stringify(fingerprint))
                    .digest('hex');

                if (user.lastKnownDevices && user.lastKnownDevices.length > 0) {
                    const isKnownDevice = user.lastKnownDevices.some(
                        device => device.hash === fingerprintHash
                    );

                    if (!isKnownDevice) {
                        // Log new device
                        await AuditLog.create({
                            userId: req.user.id,
                            action: 'NEW_DEVICE_DETECTED',
                            resource: 'Security',
                            details: 'دستگاه جدید شناسایی شد',
                            metadata: {
                                fingerprint: fingerprint,
                                fingerprintHash: fingerprintHash
                            },
                            severity: 'medium'
                        });

                        // Add to known devices (keep last 5)
                        user.lastKnownDevices = user.lastKnownDevices || [];
                        user.lastKnownDevices.unshift({
                            hash: fingerprintHash,
                            firstSeen: new Date(),
                            lastSeen: new Date(),
                            userAgent: fingerprint.userAgent
                        });
                        user.lastKnownDevices = user.lastKnownDevices.slice(0, 5);
                        await user.save();
                    } else {
                        // Update last seen for known device
                        const deviceIndex = user.lastKnownDevices.findIndex(
                            device => device.hash === fingerprintHash
                        );
                        if (deviceIndex !== -1) {
                            user.lastKnownDevices[deviceIndex].lastSeen = new Date();
                            await user.save();
                        }
                    }
                } else {
                    // First time device tracking
                    user.lastKnownDevices = [{
                        hash: fingerprintHash,
                        firstSeen: new Date(),
                        lastSeen: new Date(),
                        userAgent: fingerprint.userAgent
                    }];
                    await user.save();
                }

                next();
            } catch (error) {
                console.error('خطا در device fingerprinting:', error);
                next();
            }
        };
    }

    /**
     * Session security middleware
     */
    static secureSession() {
        return async (req, res, next) => {
            try {
                if (!req.user || !req.session) {
                    return next();
                }

                // Check session timeout
                const sessionTimeout = 30 * 60 * 1000; // 30 minutes
                const lastActivity = req.session.lastActivity || Date.now();
                
                if (Date.now() - lastActivity > sessionTimeout) {
                    req.session.destroy();
                    return res.status(401).json({
                        success: false,
                        message: 'جلسه منقضی شده است',
                        code: 'SESSION_EXPIRED'
                    });
                }

                // Update last activity
                req.session.lastActivity = Date.now();

                // Check for session hijacking
                const currentIP = getRealIP(req);
                const sessionIP = req.session.ipAddress;

                if (sessionIP && sessionIP !== currentIP) {
                    // Log suspicious activity
                    await AuditLog.create({
                        userId: req.user.id,
                        action: 'SESSION_IP_MISMATCH',
                        resource: 'Security',
                        details: `تغییر IP در جلسه: ${sessionIP} → ${currentIP}`,
                        metadata: {
                            originalIP: sessionIP,
                            currentIP: currentIP,
                            sessionId: req.sessionID
                        },
                        severity: 'high'
                    });

                    // Optionally terminate session
                    req.session.destroy();
                    return res.status(401).json({
                        success: false,
                        message: 'جلسه امنیتی منقضی شد',
                        code: 'SESSION_SECURITY_VIOLATION'
                    });
                }

                // Store IP in session
                if (!sessionIP) {
                    req.session.ipAddress = currentIP;
                }

                next();
            } catch (error) {
                console.error('خطا در بررسی امنیت جلسه:', error);
                next();
            }
        };
    }

    /**
     * API abuse detection
     */
    static detectAPIAbuse() {
        const suspiciousPatterns = new Map();

        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return next();
                }

                const userId = req.user.id;
                const endpoint = req.route?.path || req.originalUrl;
                const method = req.method;
                const key = `${userId}:${method}:${endpoint}`;
                
                const now = Date.now();
                const windowSize = 60 * 1000; // 1 minute
                
                if (!suspiciousPatterns.has(userId)) {
                    suspiciousPatterns.set(userId, {
                        requests: [],
                        errors: [],
                        lastCleanup: now
                    });
                }

                const userPattern = suspiciousPatterns.get(userId);

                // Cleanup old entries
                if (now - userPattern.lastCleanup > windowSize) {
                    userPattern.requests = userPattern.requests.filter(
                        req => now - req.timestamp < windowSize
                    );
                    userPattern.errors = userPattern.errors.filter(
                        err => now - err.timestamp < windowSize
                    );
                    userPattern.lastCleanup = now;
                }

                // Track request
                userPattern.requests.push({
                    endpoint,
                    method,
                    timestamp: now
                });

                // Check for abuse patterns
                const recentRequests = userPattern.requests.filter(
                    req => now - req.timestamp < windowSize
                );

                // Pattern 1: Too many requests to same endpoint
                const sameEndpointRequests = recentRequests.filter(
                    req => req.endpoint === endpoint && req.method === method
                );

                if (sameEndpointRequests.length > 50) { // 50 requests per minute to same endpoint
                    await this.logAbusePattern(req.user.id, 'ENDPOINT_FLOODING', {
                        endpoint,
                        method,
                        count: sameEndpointRequests.length
                    });

                    return res.status(429).json({
                        success: false,
                        message: 'تعداد درخواست به این endpoint زیاد است',
                        code: 'ENDPOINT_ABUSE'
                    });
                }

                // Pattern 2: Too many different endpoints
                const uniqueEndpoints = new Set(recentRequests.map(req => req.endpoint));
                if (uniqueEndpoints.size > 20) { // More than 20 different endpoints
                    await this.logAbusePattern(req.user.id, 'ENDPOINT_SCANNING', {
                        uniqueEndpoints: uniqueEndpoints.size,
                        totalRequests: recentRequests.length
                    });
                }

                // Monitor response for errors
                const originalSend = res.send;
                res.send = function(data) {
                    if (res.statusCode >= 400) {
                        userPattern.errors.push({
                            endpoint,
                            method,
                            statusCode: res.statusCode,
                            timestamp: now
                        });

                        // Check error rate
                        const recentErrors = userPattern.errors.filter(
                            err => now - err.timestamp < windowSize
                        );

                        if (recentErrors.length > 10) { // More than 10 errors per minute
                            setImmediate(async () => {
                                await SecurityMiddleware.logAbusePattern(req.user.id, 'HIGH_ERROR_RATE', {
                                    errorCount: recentErrors.length,
                                    totalRequests: recentRequests.length
                                });
                            });
                        }
                    }

                    originalSend.call(this, data);
                };

                next();
            } catch (error) {
                console.error('خطا در تشخیص سوء استفاده API:', error);
                next();
            }
        };
    }

    /**
     * Log abuse pattern
     */
    static async logAbusePattern(userId, pattern, metadata) {
        try {
            await AuditLog.create({
                userId: userId,
                action: 'API_ABUSE_DETECTED',
                resource: 'Security',
                details: `الگوی سوء استفاده شناسایی شد: ${pattern}`,
                metadata: {
                    pattern,
                    ...metadata
                },
                severity: 'high'
            });
        } catch (error) {
            console.error('خطا در ثبت الگوی سوء استفاده:', error);
        }
    }

    /**
     * Geo-location verification
     */
    static verifyGeolocation(options = {}) {
        const { 
            allowedCountries = [],
            blockedCountries = [],
            requireVerification = false 
        } = options;

        return async (req, res, next) => {
            try {
                if (!requireVerification && allowedCountries.length === 0 && blockedCountries.length === 0) {
                    return next();
                }

                const ip = getRealIP(req);
                
                // Mock geolocation (در پیاده‌سازی واقعی از سرویس‌هایی مثل MaxMind استفاده کنید)
                const location = await this.getIPLocation(ip);
                
                if (!location) {
                    if (requireVerification) {
                        return res.status(403).json({
                            success: false,
                            message: 'تشخیص موقعیت جغرافیایی امکان‌پذیر نیست'
                        });
                    }
                    return next();
                }

                // Check blocked countries
                if (blockedCountries.includes(location.country)) {
                    await AuditLog.create({
                        userId: req.user?.id,
                        action: 'BLOCKED_COUNTRY_ACCESS',
                        resource: 'Security',
                        details: `تلاش دسترسی از کشور مسدود: ${location.country}`,
                        metadata: {
                            ip,
                            location,
                            userAgent: req.headers['user-agent']
                        },
                        severity: 'high'
                    });

                    return res.status(403).json({
                        success: false,
                        message: 'دسترسی از این منطقه جغرافیایی مجاز نیست'
                    });
                }

                // Check allowed countries
                if (allowedCountries.length > 0 && !allowedCountries.includes(location.country)) {
                    return res.status(403).json({
                        success: false,
                        message: 'دسترسی فقط از مناطق مجاز امکان‌پذیر است'
                    });
                }

                // Store location in request
                req.userLocation = location;
                next();
            } catch (error) {
                console.error('خطا در تایید موقعیت جغرافیایی:', error);
                if (requireVerification) {
                    return res.status(500).json({
                        success: false,
                        message: 'خطا در تایید موقعیت جغرافیایی'
                    });
                }
                next();
            }
        };
    }

    /**
     * Mock geolocation service
     */
    static async getIPLocation(ip) {
        // در پیاده‌سازی واقعی از MaxMind، IP-API یا سرویس‌های مشابه استفاده کنید
        try {
            // Mock data
            return {
                ip: ip,
                country: 'IR',
                region: 'Tehran',
                city: 'Tehran',
                timezone: 'Asia/Tehran',
                isp: 'Unknown'
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Comprehensive security headers
     */
    static setSecurityHeaders() {
        return (req, res, next) => {
            // Security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
            
            // Remove server information
            res.removeHeader('X-Powered-By');
            res.setHeader('Server', 'Exchange-Platform');
            
            // Cache control for sensitive endpoints
            if (req.originalUrl.includes('/api/')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }

            next();
        };
    }

    /**
     * Request timeout middleware
     */
    static requestTimeout(timeout = 30000) {
        return (req, res, next) => {
            const timeoutId = setTimeout(() => {
                if (!res.headersSent) {
                    res.status(408).json({
                        success: false,
                        message: 'درخواست منقضی شد'
                    });
                }
            }, timeout);

            res.on('finish', () => {
                clearTimeout(timeoutId);
            });

            res.on('close', () => {
                clearTimeout(timeoutId);
            });

            next();
        };
    }

    /**
     * Create complete security stack
     */
    static createSecurityStack(options = {}) {
        return [
            this.configureHelmet(),
            this.setSecurityHeaders(),
            this.requestTimeout(options.timeout),
            this.sanitizeInput(),
            this.preventSQLInjection(),
            this.preventXSS(),
            this.trackDeviceFingerprint(),
            this.secureSession(),
            this.detectAPIAbuse(),
            this.verifyGeolocation(options.geolocation || {})
        ];
    }
}

module.exports = SecurityMiddleware;
