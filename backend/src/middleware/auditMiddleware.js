const auditLogger = require('../utils/auditLogger');
const logger = require('../utils/logger');
const websocketService = require('../services/websocketService');

/**
 * Advanced audit middleware with comprehensive request tracking and real-time monitoring
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
            
            // Send real-time security alert
            this.sendSecurityAlert({
              type: 'UNAUTHORIZED_ACCESS',
              severity: res.statusCode === 401 ? 'MEDIUM' : 'HIGH',
              details: {
                statusCode: res.statusCode,
                method: req.method,
                url: req.originalUrl,
                ip: requestDetails.ip,
                userId: requestDetails.userId,
                userAgent: requestDetails.userAgent
              },
              timestamp: new Date()
            });
          }

          // Detect suspicious activity patterns
          await this.detectSuspiciousActivity(requestDetails, res);

          // Send real-time activity update
          this.sendActivityUpdate({
            action,
            resource,
            userId: requestDetails.userId,
            tenantId: requestDetails.tenantId,
            status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
            timestamp: new Date(),
            duration
          });

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
   * Send real-time security alert
   */
  static sendSecurityAlert(alert) {
    try {
      // Emit to admin users via WebSocket
      websocketService.emitToRole('super_admin', 'security_alert', alert);
      websocketService.emitToRole('tenant_admin', 'security_alert', alert);
      
      logger.info('Security alert sent via WebSocket', { alert });
    } catch (error) {
      logger.error('Failed to send security alert:', error);
    }
  }

  /**
   * Send real-time activity update
   */
  static sendActivityUpdate(activity) {
    try {
      // Emit activity to tenant admins and super admins
      if (activity.tenantId) {
        websocketService.emitToTenant(activity.tenantId, 'activity_update', activity);
      }
      
      websocketService.emitToRole('super_admin', 'global_activity', activity);
    } catch (error) {
      logger.error('Failed to send activity update:', error);
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  static async detectSuspiciousActivity(requestDetails, res) {
    try {
      const suspiciousPatterns = [];

      // Multiple failed login attempts
      if (requestDetails.url.includes('/auth/login') && res.statusCode === 401) {
        const recentFailedAttempts = await this.getRecentFailedLogins(requestDetails.ip);
        if (recentFailedAttempts >= 3) {
          suspiciousPatterns.push({
            type: 'MULTIPLE_FAILED_LOGINS',
            severity: 'HIGH',
            count: recentFailedAttempts
          });
        }
      }

      // Unusual request frequency
      const recentRequests = await this.getRecentRequests(requestDetails.ip);
      if (recentRequests > 100) { // More than 100 requests in the last minute
        suspiciousPatterns.push({
          type: 'HIGH_REQUEST_FREQUENCY',
          severity: 'MEDIUM',
          count: recentRequests
        });
      }

      // Access to sensitive endpoints
      const sensitiveEndpoints = ['/api/admin', '/api/super-admin', '/api/audit'];
      if (sensitiveEndpoints.some(endpoint => requestDetails.url.includes(endpoint))) {
        suspiciousPatterns.push({
          type: 'SENSITIVE_ENDPOINT_ACCESS',
          severity: 'MEDIUM',
          endpoint: requestDetails.url
        });
      }

      // Send alerts for detected patterns
      for (const pattern of suspiciousPatterns) {
        this.sendSecurityAlert({
          type: pattern.type,
          severity: pattern.severity,
          details: {
            ...pattern,
            ip: requestDetails.ip,
            userId: requestDetails.userId,
            userAgent: requestDetails.userAgent,
            url: requestDetails.url
          },
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to detect suspicious activity:', error);
    }
  }

  /**
   * Get recent failed login attempts from cache/database
   */
  static async getRecentFailedLogins(ip) {
    // This would typically query a cache or database
    // For now, return a mock value
    return 0;
  }

  /**
   * Get recent requests count from cache/database
   */
  static async getRecentRequests(ip) {
    // This would typically query a rate limiting cache
    // For now, return a mock value
    return 0;
  }
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