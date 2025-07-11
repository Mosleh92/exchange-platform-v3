// backend/src/utils/securityAudit.js
const logger = require('./logger');
const encryption = require('./encryption');

/**
 * Enhanced Security Audit Service
 * Provides comprehensive security event logging and monitoring
 */
class SecurityAuditService {
    constructor() {
        this.securityEvents = {
            // Authentication events
            LOGIN_SUCCESS: 'login_success',
            LOGIN_FAILED: 'login_failed',
            LOGIN_BLOCKED: 'login_blocked',
            LOGOUT: 'logout',
            TOKEN_REFRESH: 'token_refresh',
            TOKEN_EXPIRED: 'token_expired',
            
            // Authorization events
            ACCESS_DENIED: 'access_denied',
            PRIVILEGE_ESCALATION: 'privilege_escalation',
            ROLE_CHANGE: 'role_change',
            
            // 2FA events
            TWO_FA_ENABLED: 'two_fa_enabled',
            TWO_FA_DISABLED: 'two_fa_disabled',
            TWO_FA_SUCCESS: 'two_fa_success',
            TWO_FA_FAILED: 'two_fa_failed',
            BACKUP_CODE_USED: 'backup_code_used',
            
            // Security violations
            RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
            SUSPICIOUS_ACTIVITY: 'suspicious_activity',
            BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
            XSS_ATTEMPT: 'xss_attempt',
            SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
            CSRF_VIOLATION: 'csrf_violation',
            
            // Data access events
            SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
            DATA_EXPORT: 'data_export',
            BULK_OPERATION: 'bulk_operation',
            
            // Financial events
            TRANSACTION_CREATED: 'transaction_created',
            TRANSACTION_FAILED: 'transaction_failed',
            LARGE_TRANSACTION: 'large_transaction',
            PAYMENT_FRAUD_SUSPECTED: 'payment_fraud_suspected',
            
            // Administrative events
            USER_CREATED: 'user_created',
            USER_DELETED: 'user_deleted',
            PERMISSION_CHANGED: 'permission_changed',
            CONFIGURATION_CHANGED: 'configuration_changed',
            
            // System events
            SYSTEM_ERROR: 'system_error',
            BACKUP_CREATED: 'backup_created',
            MAINTENANCE_MODE: 'maintenance_mode'
        };
        
        this.riskLevels = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };
    }

    /**
     * Log security event with comprehensive context
     */
    logSecurityEvent(eventType, details = {}) {
        const timestamp = new Date().toISOString();
        const eventId = encryption.generateSecureToken(16);
        
        const securityEvent = {
            eventId,
            timestamp,
            eventType,
            riskLevel: this.determineRiskLevel(eventType),
            ...this.extractContext(details),
            ...details
        };

        // Log to different levels based on risk
        switch (securityEvent.riskLevel) {
            case this.riskLevels.CRITICAL:
                logger.error('CRITICAL SECURITY EVENT', securityEvent);
                this.alertSecurityTeam(securityEvent);
                break;
            case this.riskLevels.HIGH:
                logger.warn('HIGH RISK SECURITY EVENT', securityEvent);
                this.notifyAdministrators(securityEvent);
                break;
            case this.riskLevels.MEDIUM:
                logger.warn('SECURITY EVENT', securityEvent);
                break;
            case this.riskLevels.LOW:
            default:
                logger.info('SECURITY EVENT', securityEvent);
                break;
        }

        // Store in audit trail
        this.storeAuditRecord(securityEvent);
        
        return eventId;
    }

    /**
     * Extract request context information
     */
    extractContext(details) {
        const context = {};
        
        if (details.req) {
            context.request = {
                method: details.req.method,
                url: details.req.originalUrl,
                ip: details.req.ip,
                userAgent: details.req.get('User-Agent'),
                headers: this.sanitizeHeaders(details.req.headers),
                sessionId: details.req.sessionID
            };
        }

        if (details.user) {
            context.user = {
                id: details.user.id || details.user._id,
                email: details.user.email,
                role: details.user.role,
                tenantId: details.user.tenantId
            };
        }

        if (details.tenant) {
            context.tenant = {
                id: details.tenant.id || details.tenant._id,
                name: details.tenant.name,
                code: details.tenant.code
            };
        }

        return context;
    }

    /**
     * Determine risk level based on event type
     */
    determineRiskLevel(eventType) {
        const criticalEvents = [
            this.securityEvents.PRIVILEGE_ESCALATION,
            this.securityEvents.BRUTE_FORCE_ATTEMPT,
            this.securityEvents.SQL_INJECTION_ATTEMPT,
            this.securityEvents.PAYMENT_FRAUD_SUSPECTED
        ];

        const highRiskEvents = [
            this.securityEvents.LOGIN_BLOCKED,
            this.securityEvents.ACCESS_DENIED,
            this.securityEvents.SUSPICIOUS_ACTIVITY,
            this.securityEvents.XSS_ATTEMPT,
            this.securityEvents.CSRF_VIOLATION,
            this.securityEvents.LARGE_TRANSACTION
        ];

        const mediumRiskEvents = [
            this.securityEvents.LOGIN_FAILED,
            this.securityEvents.TWO_FA_FAILED,
            this.securityEvents.RATE_LIMIT_EXCEEDED,
            this.securityEvents.SENSITIVE_DATA_ACCESS
        ];

        if (criticalEvents.includes(eventType)) {
            return this.riskLevels.CRITICAL;
        } else if (highRiskEvents.includes(eventType)) {
            return this.riskLevels.HIGH;
        } else if (mediumRiskEvents.includes(eventType)) {
            return this.riskLevels.MEDIUM;
        } else {
            return this.riskLevels.LOW;
        }
    }

    /**
     * Sanitize headers for logging
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        
        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-api-key'];
        
        return sanitized;
    }

    /**
     * Store audit record in database
     */
    async storeAuditRecord(event) {
        try {
            // Import AuditLog model dynamically to avoid circular dependencies
            const AuditLog = require('../models/AuditLog');
            
            const auditRecord = new AuditLog({
                eventId: event.eventId,
                eventType: event.eventType,
                riskLevel: event.riskLevel,
                timestamp: event.timestamp,
                userId: event.user?.id,
                tenantId: event.tenant?.id || event.user?.tenantId,
                ipAddress: event.request?.ip,
                userAgent: event.request?.userAgent,
                details: event,
                encrypted: true
            });

            await auditRecord.save();
        } catch (error) {
            logger.error('Failed to store audit record', {
                error: error.message,
                eventId: event.eventId
            });
        }
    }

    /**
     * Alert security team for critical events
     */
    async alertSecurityTeam(event) {
        try {
            // In a real implementation, this would send alerts via email, Slack, etc.
            logger.error('SECURITY ALERT - IMMEDIATE ATTENTION REQUIRED', {
                eventType: event.eventType,
                eventId: event.eventId,
                timestamp: event.timestamp,
                summary: this.generateEventSummary(event)
            });
            
            // Could integrate with external alerting systems here
        } catch (error) {
            logger.error('Failed to send security alert', error);
        }
    }

    /**
     * Notify administrators for high-risk events
     */
    async notifyAdministrators(event) {
        try {
            logger.warn('SECURITY NOTIFICATION - ADMINISTRATIVE REVIEW REQUIRED', {
                eventType: event.eventType,
                eventId: event.eventId,
                summary: this.generateEventSummary(event)
            });
        } catch (error) {
            logger.error('Failed to send admin notification', error);
        }
    }

    /**
     * Generate human-readable event summary
     */
    generateEventSummary(event) {
        const summaries = {
            [this.securityEvents.LOGIN_FAILED]: `Failed login attempt for ${event.user?.email || 'unknown user'}`,
            [this.securityEvents.BRUTE_FORCE_ATTEMPT]: `Brute force attack detected from IP ${event.request?.ip}`,
            [this.securityEvents.PRIVILEGE_ESCALATION]: `Privilege escalation attempt by user ${event.user?.id}`,
            [this.securityEvents.SQL_INJECTION_ATTEMPT]: `SQL injection attempt detected on ${event.request?.url}`,
            [this.securityEvents.XSS_ATTEMPT]: `XSS attack attempt detected`,
            [this.securityEvents.PAYMENT_FRAUD_SUSPECTED]: `Suspicious payment activity detected`
        };

        return summaries[event.eventType] || `Security event: ${event.eventType}`;
    }

    /**
     * Middleware to automatically log security events
     */
    middleware() {
        return (req, res, next) => {
            // Track response for security analysis
            const originalSend = res.send;
            
            res.send = function(data) {
                // Analyze response for security events
                if (res.statusCode === 401) {
                    securityAudit.logSecurityEvent(
                        securityAudit.securityEvents.ACCESS_DENIED,
                        { req, statusCode: res.statusCode }
                    );
                } else if (res.statusCode === 429) {
                    securityAudit.logSecurityEvent(
                        securityAudit.securityEvents.RATE_LIMIT_EXCEEDED,
                        { req, statusCode: res.statusCode }
                    );
                }
                
                return originalSend.call(this, data);
            };
            
            next();
        };
    }

    /**
     * Track user authentication events
     */
    trackAuth(eventType, details) {
        return this.logSecurityEvent(eventType, details);
    }

    /**
     * Track financial transaction events
     */
    trackTransaction(eventType, details) {
        return this.logSecurityEvent(eventType, details);
    }

    /**
     * Track data access events
     */
    trackDataAccess(eventType, details) {
        return this.logSecurityEvent(eventType, details);
    }

    /**
     * Track administrative events
     */
    trackAdmin(eventType, details) {
        return this.logSecurityEvent(eventType, details);
    }
}

const securityAudit = new SecurityAuditService();
module.exports = securityAudit;