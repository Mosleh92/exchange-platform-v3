const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'exchange-platform' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Security events log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/security.log'),
            level: 'warn',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        }),
        
        // Audit log for compliance
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/audit.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 20
        })
    ]
});

// Add request logging middleware with tenant context
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        
        // Add tenant context if available
        if (req.user) {
            logData.userId = req.user.userId;
            logData.tenantId = req.user.tenantId;
            logData.role = req.user.role;
        }
        
        // Add tenant ID from headers or params
        if (req.params.tenantId) {
            logData.requestTenantId = req.params.tenantId;
        }
        
        logger.info('HTTP Request', logData);
    });
    
    next();
};

// Add error logging middleware
const errorLogger = (err, req, res, next) => {
    const errorData = {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    };
    
    // Add tenant context if available
    if (req.user) {
        errorData.userId = req.user.userId;
        errorData.tenantId = req.user.tenantId;
        errorData.role = req.user.role;
    }
    
    logger.error('Application Error', errorData);
    
    next(err);
};

// Security event logger
const securityLogger = {
    logAuthSuccess: (req, user) => {
        logger.info('Authentication Success', {
            event: 'AUTH_SUCCESS',
            userId: user.userId || user._id,
            tenantId: user.tenantId,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
    },
    
    logAuthFailure: (req, reason) => {
        logger.warn('Authentication Failed', {
            event: 'AUTH_FAILED',
            reason,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
    },
    
    logUnauthorizedAccess: (req, resource) => {
        logger.warn('Unauthorized Access Attempt', {
            event: 'UNAUTHORIZED_ACCESS',
            resource,
            userId: req.user?.userId,
            tenantId: req.user?.tenantId,
            role: req.user?.role,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
    },
    
    logTenantIsolationViolation: (req, attemptedTenantId) => {
        logger.error('Tenant Isolation Violation', {
            event: 'TENANT_ISOLATION_VIOLATION',
            userId: req.user?.userId,
            userTenantId: req.user?.tenantId,
            attemptedTenantId,
            ip: req.ip,
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    },
    
    logSuspiciousActivity: (req, activity, details = {}) => {
        logger.warn('Suspicious Activity Detected', {
            event: 'SUSPICIOUS_ACTIVITY',
            activity,
            details,
            userId: req.user?.userId,
            tenantId: req.user?.tenantId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        });
    }
};

// Database operation logger
const dbLogger = {
    logQuery: (model, operation, filter, user) => {
        logger.info('Database Query', {
            event: 'DB_QUERY',
            model,
            operation,
            filter: JSON.stringify(filter),
            userId: user?.userId,
            tenantId: user?.tenantId,
            timestamp: new Date().toISOString()
        });
    },
    
    logDataModification: (model, operation, documentId, changes, user) => {
        logger.info('Data Modification', {
            event: 'DATA_MODIFICATION',
            model,
            operation,
            documentId,
            changes: JSON.stringify(changes),
            userId: user?.userId,
            tenantId: user?.tenantId,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    logger,
    requestLogger,
    errorLogger,
    securityLogger,
    dbLogger
}; 