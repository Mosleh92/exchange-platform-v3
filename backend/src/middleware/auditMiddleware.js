const auditLogger = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Advanced audit middleware with comprehensive request tracking
 */
class AuditMiddleware {
  /**
   * Create audit middleware for Express
   */
  static createAuditMiddleware(options = {}) {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = require('crypto').randomUUID();
      
      // Set request context
      auditLogger.setRequestContext('requestId', requestId);
      auditLogger.setRequestContext('sessionId', req.session?.id || 'unknown');
      
      // Capture request details
      const requestDetails = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeBody(req.body),
        query: req.query,
        params: req.params,
        tenantId: req.headers['tenant-id'] || req.user?.tenantId,
        userId: req.user?.id || 'anonymous'
      };

      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      let responseBody = null;
      let responseSize = 0;

      // Override response methods to capture response data
      res.send = function(data) {
        responseBody = data;
        responseSize = Buffer.byteLength(data, 'utf8');
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        responseBody = data;
        responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        return originalJson.call(this, data);
      };

      res.end = function(data) {
        if (data) {
          responseBody = data;
          responseSize = Buffer.byteLength(data, 'utf8');
        }
        return originalEnd.call(this, data);
      };

      // Handle response finish
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        try {
          // Determine action and resource from request
          const action = this.determineAction(req);
          const resource = this.determineResource(req);
          
          // Create audit log entry
          await auditLogger.logAuditEvent({
            action,
            resource,
            tenantId: requestDetails.tenantId,
            userId: requestDetails.userId,
            payload: {
              method: requestDetails.method,
              url: requestDetails.url,
              headers: requestDetails.headers,
              body: requestDetails.body,
              query: requestDetails.query,
              params: requestDetails.params
            },
            result: {
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: this.sanitizeHeaders(res.getHeaders()),
              body: this.sanitizeResponseBody(responseBody)
            },
            ip: requestDetails.ip,
            userAgent: requestDetails.userAgent,
            duration,
            status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
            errorMessage: res.statusCode >= 400 ? this.getErrorMessage(res.statusCode) : null,
            metadata: {
              requestId,
              sessionId: req.session?.id,
              userRole: req.user?.role,
              userPermissions: req.user?.permissions,
              apiVersion: req.headers['api-version'] || 'v1',
              clientType: this.determineClientType(req),
              requestSize: this.calculateRequestSize(requestDetails),
              responseSize,
              cacheHit: res.getHeader('X-Cache') === 'HIT',
              rateLimited: res.getHeader('X-RateLimit-Remaining') === '0'
            }
          });

          // Log performance metrics for slow requests
          if (duration > 1000) {
            logger.warn(`Slow request detected: ${duration}ms - ${req.method} ${req.originalUrl}`);
          }

          // Log security events
          if (res.statusCode === 401 || res.statusCode === 403) {
            logger.warn(`Security event: ${res.statusCode} - ${req.method} ${req.originalUrl} from ${requestDetails.ip}`);
          }

        } catch (error) {
          logger.error('Failed to create audit log:', error);
        } finally {
          // Clear request context
          auditLogger.clearRequestContext();
        }
      });

      next();
    };
  }

  /**
   * Determine action from request
   */
  static determineAction(req) {
    const method = req.method.toUpperCase();
    const path = req.originalUrl.toLowerCase();
    
    if (path.includes('/auth')) {
      return `${method}_AUTH`;
    } else if (path.includes('/transactions')) {
      return `${method}_TRANSACTION`;
    } else if (path.includes('/users')) {
      return `${method}_USER`;
    } else if (path.includes('/p2p')) {
      return `${method}_P2P`;
    } else if (path.includes('/remittance')) {
      return `${method}_REMITTANCE`;
    } else if (path.includes('/reports')) {
      return `${method}_REPORT`;
    } else if (path.includes('/settings')) {
      return `${method}_SETTING`;
    } else {
      return `${method}_GENERAL`;
    }
  }

  /**
   * Determine resource from request
   */
  static determineResource(req) {
    const path = req.originalUrl.toLowerCase();
    
    if (path.includes('/auth')) return 'AUTH';
    if (path.includes('/transactions')) return 'TRANSACTION';
    if (path.includes('/users')) return 'USER';
    if (path.includes('/p2p')) return 'P2P_ORDER';
    if (path.includes('/remittance')) return 'REMITTANCE';
    if (path.includes('/reports')) return 'REPORT';
    if (path.includes('/settings')) return 'SETTING';
    if (path.includes('/accounts')) return 'ACCOUNT';
    if (path.includes('/audit')) return 'AUDIT_LOG';
    
    return 'GENERAL';
  }

  /**
   * Determine client type from request
   */
  static determineClientType(req) {
    const userAgent = req.get('User-Agent') || '';
    
    if (userAgent.includes('Mobile')) return 'MOBILE';
    if (userAgent.includes('Postman')) return 'API_CLIENT';
    if (userAgent.includes('curl')) return 'CURL';
    if (userAgent.includes('Mozilla')) return 'WEB_BROWSER';
    
    return 'UNKNOWN';
  }

  /**
   * Sanitize headers for logging
   */
  static sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  static sanitizeBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize response body for logging
   */
  static sanitizeResponseBody(body) {
    if (!body) return null;
    
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      const sanitized = { ...parsed };
      
      const sensitiveFields = ['token', 'secret', 'key', 'password'];
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      return sanitized;
    } catch (error) {
      return body;
    }
  }

  /**
   * Calculate request size
   */
  static calculateRequestSize(requestDetails) {
    try {
      const requestData = {
        headers: requestDetails.headers,
        body: requestDetails.body,
        query: requestDetails.query,
        params: requestDetails.params
      };
      
      return Buffer.byteLength(JSON.stringify(requestData), 'utf8');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get error message for status code
   */
  static getErrorMessage(statusCode) {
    const errorMessages = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    
    return errorMessages[statusCode] || 'Unknown Error';
  }

  /**
   * Create audit middleware for specific routes
   */
  static createRouteAuditMiddleware(action, resource) {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        await auditLogger.logAuditEvent({
          action,
          resource,
          tenantId: req.headers['tenant-id'] || req.user?.tenantId,
          userId: req.user?.id || 'anonymous',
          payload: {
            method: req.method,
            url: req.originalUrl,
            body: this.sanitizeBody(req.body),
            params: req.params
          },
          result: {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage
          },
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          duration,
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          errorMessage: res.statusCode >= 400 ? this.getErrorMessage(res.statusCode) : null
        });
      });
      
      next();
    };
  }
}

module.exports = AuditMiddleware; 