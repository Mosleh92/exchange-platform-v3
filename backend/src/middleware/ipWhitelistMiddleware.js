// backend/src/middleware/ipWhitelistMiddleware.js
const IPWhitelistService = require('../services/ipWhitelistService');
const User = require('../models/User');

/**
 * Get real IP address from request
 */
const getRealIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip ||
           '127.0.0.1';
};

/**
 * Middleware to check IP whitelist
 */
const checkIPWhitelist = async (req, res, next) => {
    try {
        // Skip if user is not authenticated
        if (!req.user) {
            return next();
        }

        const userIP = getRealIP(req);
        const userId = req.user.id;

        // Get user to check if IP whitelisting is enabled
        const user = await User.findById(userId).select('ipWhitelistEnabled ipWhitelist');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        // If IP whitelisting is not enabled, allow access
        if (!user.ipWhitelistEnabled) {
            return next();
        }

        // Check if IP is whitelisted
        const isWhitelisted = await IPWhitelistService.isIPWhitelisted(userId, userIP);
        
        if (!isWhitelisted) {
            // Log suspicious activity
            await IPWhitelistService.logSuspiciousActivity(
                userId, 
                userIP, 
                `تلاش دسترسی از IP غیرمجاز: ${req.method} ${req.originalUrl}`
            );

            return res.status(403).json({
                success: false,
                message: 'دسترسی از این آدرس IP مجاز نیست',
                code: 'IP_NOT_WHITELISTED',
                data: {
                    ip: userIP,
                    action: 'add_to_whitelist'
                }
            });
        }

        // Add IP info to request for logging
        req.clientIP = userIP;
        next();
    } catch (error) {
        console.error('خطا در بررسی لیست سفید IP:', error);
        res.status(500).json({
            success: false,
            message: 'خطا در بررسی امنیت IP'
        });
    }
};

/**
 * Middleware to enforce IP whitelisting for sensitive operations
 */
const enforceIPWhitelist = (options = {}) => {
    const {
        actions = ['*'], // Actions that require IP whitelisting
        allowAdmins = true, // Allow super admins to bypass
        logActivity = true
    } = options;

    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next();
            }

            const userIP = getRealIP(req);
            const userId = req.user.id;
            const currentAction = `${req.method}:${req.route?.path || req.originalUrl}`;

            // Check if current action requires IP whitelisting
            const requiresWhitelist = actions.includes('*') || 
                                    actions.some(action => currentAction.includes(action));

            if (!requiresWhitelist) {
                return next();
            }

            // Allow super admins to bypass if configured
            if (allowAdmins && req.user.role === 'super_admin') {
                if (logActivity) {
                    await IPWhitelistService.logSuspiciousActivity(
                        userId,
                        userIP,
                        `Admin bypass لیست سفید IP برای ${currentAction}`
                    );
                }
                return next();
            }

            // Check if IP is whitelisted
            const isWhitelisted = await IPWhitelistService.isIPWhitelisted(userId, userIP);
            
            if (!isWhitelisted) {
                await IPWhitelistService.logSuspiciousActivity(
                    userId,
                    userIP,
                    `تلاش عملیات حساس از IP غیرمجاز: ${currentAction}`
                );

                return res.status(403).json({
                    success: false,
                    message: 'این عملیات نیاز به تایید آدرس IP دارد',
                    code: 'REQUIRE_IP_WHITELIST',
                    data: {
                        ip: userIP,
                        action: currentAction
                    }
                });
            }

            next();
        } catch (error) {
            console.error('خطا در اعمال لیست سفید IP:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در بررسی امنیت IP'
            });
        }
    };
};

/**
 * Middleware to detect and block suspicious IP patterns
 */
const detectSuspiciousIP = (options = {}) => {
    const {
        maxRequestsPerMinute = 60,
        maxFailedAttempts = 5,
        blockDuration = 15 * 60 * 1000, // 15 minutes
        whitelist = []
    } = options;

    const requestCounts = new Map();
    const blockedIPs = new Map();

    return async (req, res, next) => {
        try {
            const userIP = getRealIP(req);
            
            // Skip whitelisted IPs
            if (whitelist.includes(userIP)) {
                return next();
            }

            // Check if IP is currently blocked
            if (blockedIPs.has(userIP)) {
                const blockInfo = blockedIPs.get(userIP);
                if (Date.now() < blockInfo.until) {
                    return res.status(429).json({
                        success: false,
                        message: 'آدرس IP شما موقتاً مسدود شده است',
                        code: 'IP_BLOCKED',
                        data: {
                            blockedUntil: new Date(blockInfo.until),
                            reason: blockInfo.reason
                        }
                    });
                } else {
                    // Remove expired block
                    blockedIPs.delete(userIP);
                }
            }

            // Track request count
            const now = Date.now();
            const minute = Math.floor(now / 60000);
            const key = `${userIP}:${minute}`;
            
            const currentCount = requestCounts.get(key) || 0;
            requestCounts.set(key, currentCount + 1);

            // Clean old entries
            for (const [k] of requestCounts) {
                const [, keyMinute] = k.split(':');
                if (parseInt(keyMinute) < minute - 1) {
                    requestCounts.delete(k);
                }
            }

            // Check rate limit
            if (currentCount > maxRequestsPerMinute) {
                blockedIPs.set(userIP, {
                    until: now + blockDuration,
                    reason: 'Rate limit exceeded'
                });

                if (req.user) {
                    await IPWhitelistService.logSuspiciousActivity(
                        req.user.id,
                        userIP,
                        `تجاوز از حد مجاز درخواست: ${currentCount} درخواست در دقیقه`
                    );
                }

                return res.status(429).json({
                    success: false,
                    message: 'تعداد درخواست‌ها از حد مجاز تجاوز کرده است',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }

            next();
        } catch (error) {
            console.error('خطا در تشخیص IP مشکوک:', error);
            next();
        }
    };
};

/**
 * Middleware to log IP activities
 */
const logIPActivity = async (req, res, next) => {
    const userIP = getRealIP(req);
    req.clientIP = userIP;
    
    // Store original send method
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log after response is sent
        if (req.user && (res.statusCode >= 400 || req.originalUrl.includes('login'))) {
            setImmediate(async () => {
                try {
                    const action = res.statusCode >= 400 ? 'FAILED_REQUEST' : 'REQUEST';
                    await IPWhitelistService.logSuspiciousActivity(
                        req.user.id,
                        userIP,
                        `${action}: ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`
                    );
                } catch (error) {
                    console.error('خطا در ثبت فعالیت IP:', error);
                }
            });
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    checkIPWhitelist,
    enforceIPWhitelist,
    detectSuspiciousIP,
    logIPActivity,
    getRealIP
};
