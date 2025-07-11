// backend/src/utils/sessionSecurity.js
const redis = require('redis');
const crypto = require('crypto');
const logger = require('./logger');
const securityAudit = require('./securityAudit');

/**
 * Enhanced Session Security Management
 * Provides secure session handling, invalidation, and monitoring
 */
class SessionSecurityService {
    constructor() {
        this.redisClient = null;
        this.maxConcurrentSessions = 5;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.suspiciousActivityThreshold = {
            loginAttempts: 5,
            timeWindow: 15 * 60 * 1000, // 15 minutes
            ipChanges: 3,
            deviceChanges: 2
        };
        
        this.initializeRedisClient();
    }

    /**
     * Initialize Redis client for session storage
     */
    async initializeRedisClient() {
        try {
            if (process.env.NODE_ENV !== 'test' && process.env.REDIS_URL) {
                this.redisClient = redis.createClient({
                    url: process.env.REDIS_URL
                });
                
                await this.redisClient.connect();
                logger.info('Redis connected for session management');
            }
        } catch (error) {
            logger.warn('Redis not available for session management, using memory fallback', error);
        }
    }

    /**
     * Create secure session
     */
    async createSession(user, req) {
        const sessionId = this.generateSecureSessionId();
        const deviceFingerprint = this.generateDeviceFingerprint(req);
        
        const sessionData = {
            sessionId,
            userId: user._id.toString(),
            tenantId: user.tenantId?.toString(),
            deviceFingerprint,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
            securityFlags: {
                requiresReauth: false,
                suspiciousActivity: false,
                ipChanged: false,
                deviceChanged: false
            }
        };

        // Check for concurrent session limits
        await this.enforceSessionLimits(user._id.toString());
        
        // Store session
        await this.storeSession(sessionId, sessionData);
        
        // Log session creation
        securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_SUCCESS, {
            user,
            req,
            sessionId,
            deviceFingerprint
        });

        return {
            sessionId,
            deviceFingerprint,
            expiresAt: new Date(Date.now() + this.sessionTimeout)
        };
    }

    /**
     * Validate and update session
     */
    async validateSession(sessionId, req) {
        try {
            const sessionData = await this.getSession(sessionId);
            
            if (!sessionData || !sessionData.isActive) {
                return { valid: false, reason: 'SESSION_NOT_FOUND' };
            }

            // Check expiration
            const now = new Date();
            const lastActivity = new Date(sessionData.lastActivity);
            if (now - lastActivity > this.sessionTimeout) {
                await this.invalidateSession(sessionId, 'TIMEOUT');
                return { valid: false, reason: 'SESSION_EXPIRED' };
            }

            // Check for suspicious activity
            const suspiciousActivity = await this.detectSuspiciousActivity(sessionData, req);
            if (suspiciousActivity.detected) {
                await this.flagSuspiciousSession(sessionId, suspiciousActivity);
                return { 
                    valid: false, 
                    reason: 'SUSPICIOUS_ACTIVITY',
                    details: suspiciousActivity 
                };
            }

            // Update session activity
            await this.updateSessionActivity(sessionId, req);
            
            return {
                valid: true,
                sessionData,
                userId: sessionData.userId,
                tenantId: sessionData.tenantId
            };
        } catch (error) {
            logger.error('Session validation error', error);
            return { valid: false, reason: 'VALIDATION_ERROR' };
        }
    }

    /**
     * Detect suspicious session activity
     */
    async detectSuspiciousActivity(sessionData, req) {
        const suspiciousFlags = {
            detected: false,
            reasons: []
        };

        // Check IP address change
        if (sessionData.ipAddress !== req.ip) {
            suspiciousFlags.detected = true;
            suspiciousFlags.reasons.push('IP_ADDRESS_CHANGED');
            
            securityAudit.logSecurityEvent(
                securityAudit.securityEvents.SUSPICIOUS_ACTIVITY,
                {
                    sessionId: sessionData.sessionId,
                    oldIp: sessionData.ipAddress,
                    newIp: req.ip,
                    userId: sessionData.userId
                }
            );
        }

        // Check device fingerprint change
        const currentFingerprint = this.generateDeviceFingerprint(req);
        if (sessionData.deviceFingerprint !== currentFingerprint) {
            suspiciousFlags.detected = true;
            suspiciousFlags.reasons.push('DEVICE_CHANGED');
            
            securityAudit.logSecurityEvent(
                securityAudit.securityEvents.SUSPICIOUS_ACTIVITY,
                {
                    sessionId: sessionData.sessionId,
                    oldDevice: sessionData.deviceFingerprint,
                    newDevice: currentFingerprint,
                    userId: sessionData.userId
                }
            );
        }

        // Check for rapid successive requests (potential bot)
        const recentActivity = await this.getRecentActivity(sessionData.userId);
        if (recentActivity.requestCount > 100) { // 100 requests in last minute
            suspiciousFlags.detected = true;
            suspiciousFlags.reasons.push('EXCESSIVE_REQUESTS');
        }

        return suspiciousFlags;
    }

    /**
     * Generate device fingerprint
     */
    generateDeviceFingerprint(req) {
        const components = [
            req.get('User-Agent') || '',
            req.get('Accept-Language') || '',
            req.get('Accept-Encoding') || '',
            req.headers['sec-ch-ua'] || '',
            req.headers['sec-ch-ua-platform'] || ''
        ];
        
        return crypto
            .createHash('sha256')
            .update(components.join('|'))
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Generate secure session ID
     */
    generateSecureSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Enforce concurrent session limits
     */
    async enforceSessionLimits(userId) {
        try {
            const userSessions = await this.getUserSessions(userId);
            
            if (userSessions.length >= this.maxConcurrentSessions) {
                // Remove oldest session
                const oldestSession = userSessions
                    .sort((a, b) => new Date(a.lastActivity) - new Date(b.lastActivity))[0];
                
                await this.invalidateSession(oldestSession.sessionId, 'CONCURRENT_LIMIT');
                
                securityAudit.logSecurityEvent(
                    securityAudit.securityEvents.LOGIN_SUCCESS,
                    {
                        userId,
                        reason: 'session_limit_enforced',
                        removedSession: oldestSession.sessionId
                    }
                );
            }
        } catch (error) {
            logger.error('Error enforcing session limits', error);
        }
    }

    /**
     * Store session data
     */
    async storeSession(sessionId, sessionData) {
        const key = `session:${sessionId}`;
        const data = JSON.stringify(sessionData);
        
        if (this.redisClient) {
            await this.redisClient.setEx(key, this.sessionTimeout / 1000, data);
        } else {
            // Fallback to memory storage (not recommended for production)
            if (!this.memoryStore) {
                this.memoryStore = new Map();
            }
            this.memoryStore.set(key, {
                data: sessionData,
                expires: Date.now() + this.sessionTimeout
            });
        }
    }

    /**
     * Get session data
     */
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        
        if (this.redisClient) {
            const data = await this.redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } else {
            if (!this.memoryStore) return null;
            
            const stored = this.memoryStore.get(key);
            if (!stored || stored.expires < Date.now()) {
                this.memoryStore.delete(key);
                return null;
            }
            return stored.data;
        }
    }

    /**
     * Update session activity
     */
    async updateSessionActivity(sessionId, req) {
        const sessionData = await this.getSession(sessionId);
        if (sessionData) {
            sessionData.lastActivity = new Date();
            sessionData.ipAddress = req.ip; // Update current IP
            await this.storeSession(sessionId, sessionData);
        }
    }

    /**
     * Invalidate session
     */
    async invalidateSession(sessionId, reason = 'USER_LOGOUT') {
        const sessionData = await this.getSession(sessionId);
        
        if (sessionData) {
            securityAudit.trackAuth(securityAudit.securityEvents.LOGOUT, {
                sessionId,
                userId: sessionData.userId,
                reason
            });
        }

        const key = `session:${sessionId}`;
        
        if (this.redisClient) {
            await this.redisClient.del(key);
        } else if (this.memoryStore) {
            this.memoryStore.delete(key);
        }
    }

    /**
     * Invalidate all user sessions
     */
    async invalidateAllUserSessions(userId, currentSessionId = null) {
        const userSessions = await this.getUserSessions(userId);
        
        for (const session of userSessions) {
            if (session.sessionId !== currentSessionId) {
                await this.invalidateSession(session.sessionId, 'LOGOUT_ALL');
            }
        }

        securityAudit.trackAuth(securityAudit.securityEvents.LOGOUT, {
            userId,
            reason: 'logout_all_devices',
            sessionCount: userSessions.length
        });
    }

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId) {
        const sessions = [];
        
        if (this.redisClient) {
            const keys = await this.redisClient.keys('session:*');
            
            for (const key of keys) {
                const data = await this.redisClient.get(key);
                const sessionData = JSON.parse(data);
                
                if (sessionData.userId === userId) {
                    sessions.push(sessionData);
                }
            }
        } else if (this.memoryStore) {
            for (const [key, stored] of this.memoryStore.entries()) {
                if (stored.expires > Date.now() && stored.data.userId === userId) {
                    sessions.push(stored.data);
                }
            }
        }
        
        return sessions;
    }

    /**
     * Flag suspicious session
     */
    async flagSuspiciousSession(sessionId, suspiciousActivity) {
        const sessionData = await this.getSession(sessionId);
        
        if (sessionData) {
            sessionData.securityFlags.suspiciousActivity = true;
            sessionData.securityFlags.requiresReauth = true;
            await this.storeSession(sessionId, sessionData);
            
            securityAudit.logSecurityEvent(
                securityAudit.securityEvents.SUSPICIOUS_ACTIVITY,
                {
                    sessionId,
                    userId: sessionData.userId,
                    suspiciousActivity
                }
            );
        }
    }

    /**
     * Get recent activity for rate limiting
     */
    async getRecentActivity(userId) {
        // Implementation would track recent API calls per user
        return { requestCount: 0 }; // Placeholder
    }

    /**
     * Session security middleware
     */
    middleware() {
        return async (req, res, next) => {
            const sessionId = req.headers['x-session-id'] || req.session?.id;
            
            if (sessionId) {
                const validation = await this.validateSession(sessionId, req);
                
                if (!validation.valid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid or expired session',
                        code: validation.reason
                    });
                }
                
                req.sessionData = validation.sessionData;
                req.userId = validation.userId;
                req.tenantId = validation.tenantId;
            }
            
            next();
        };
    }
}

module.exports = new SessionSecurityService();