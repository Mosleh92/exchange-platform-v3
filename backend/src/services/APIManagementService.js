const crypto = require('crypto');
const Redis = require('redis');
const logger = require('../utils/logger');
const APIKey = require('../models/APIKey');
const ImmutableAudit = require('../models/ImmutableAudit');

/**
 * Comprehensive API Management Service
 * Handles API key management, rate limiting, authentication, and monitoring
 */
class APIManagementService {
  constructor() {
    this.redis = null;
    this.rateLimiters = new Map();
    this.usageTrackers = new Map();
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for rate limiting and caching
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL
        });
        
        await this.redis.connect();
        logger.info('Redis connected for API management');
      } else {
        logger.warn('Redis not configured, using memory-based rate limiting');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  /**
   * Create a new API key
   */
  async createAPIKey(userId, tenantId, keyConfig) {
    try {
      // Generate unique key ID and secret
      const keyId = crypto.randomUUID();
      const keySecret = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(keySecret).digest('hex');

      // Create API key record
      const apiKey = new APIKey({
        keyId,
        keyHash,
        keyName: keyConfig.keyName,
        keySecret,
        userId,
        tenantId,
        keyType: keyConfig.keyType,
        permissions: keyConfig.permissions || [],
        scopes: keyConfig.scopes || [],
        rateLimits: {
          ...this.getDefaultRateLimits(keyConfig.keyType),
          ...keyConfig.rateLimits
        },
        security: {
          ...this.getDefaultSecurityConfig(),
          ...keyConfig.security
        },
        webhooks: keyConfig.webhooks || [],
        monitoring: {
          ...this.getDefaultMonitoringConfig(),
          ...keyConfig.monitoring
        },
        apiVersion: keyConfig.apiVersion || 'v1',
        environment: keyConfig.environment || 'PRODUCTION',
        metadata: keyConfig.metadata || {},
        auditInfo: {
          createdBy: keyConfig.createdBy
        },
        expiresAt: keyConfig.expiresAt,
        autoRotate: keyConfig.autoRotate || false,
        rotationPeriod: keyConfig.rotationPeriod || 90
      });

      await apiKey.save();

      // Create audit trail
      await this.createAuditEntry({
        entityInfo: {
          userId,
          tenantId,
          entityType: 'API_KEY',
          entityId: apiKey._id.toString()
        },
        eventInfo: {
          eventType: 'API_KEY_CREATED',
          action: 'CREATE_API_KEY',
          resource: 'API_KEY',
          resourceId: apiKey._id.toString(),
          outcome: 'SUCCESS'
        },
        metadata: {
          keyId: apiKey.keyId,
          keyType: apiKey.keyType,
          permissions: apiKey.permissions
        }
      });

      logger.info('API key created', { 
        keyId: apiKey.keyId, 
        userId, 
        tenantId, 
        keyType: apiKey.keyType 
      });

      // Return key details (secret only returned once)
      return {
        keyId: apiKey.keyId,
        keySecret, // Only returned on creation
        keyName: apiKey.keyName,
        keyType: apiKey.keyType,
        permissions: apiKey.permissions,
        rateLimits: apiKey.rateLimits,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt
      };

    } catch (error) {
      logger.error('Failed to create API key:', error);
      throw new Error('API key creation failed: ' + error.message);
    }
  }

  /**
   * Authenticate API request
   */
  async authenticateAPIRequest(request) {
    try {
      const { keyId, signature, timestamp, method, path, body } = this.extractAuthInfo(request);

      if (!keyId || !signature || !timestamp) {
        return { authenticated: false, error: 'Missing authentication parameters' };
      }

      // Find API key
      const apiKey = await APIKey.findByKeyId(keyId);
      if (!apiKey || !apiKey.isActive()) {
        await this.logSecurityEvent('INVALID_API_KEY', { keyId });
        return { authenticated: false, error: 'Invalid or inactive API key' };
      }

      // Check timestamp tolerance
      const now = Date.now();
      const requestTime = parseInt(timestamp) * 1000;
      if (Math.abs(now - requestTime) > apiKey.security.timestampTolerance * 1000) {
        await this.logSecurityEvent('TIMESTAMP_OUT_OF_RANGE', { keyId, timestamp });
        return { authenticated: false, error: 'Request timestamp out of range' };
      }

      // Verify signature
      if (apiKey.security.requireSignature) {
        const isValidSignature = this.verifySignature(
          apiKey.keySecret,
          signature,
          timestamp,
          method,
          path,
          body,
          apiKey.security.signatureMethod
        );

        if (!isValidSignature) {
          await this.logSecurityEvent('INVALID_SIGNATURE', { keyId });
          return { authenticated: false, error: 'Invalid signature' };
        }
      }

      // Check IP whitelist/blacklist
      const clientIP = this.getClientIP(request);
      if (!apiKey.checkIPAccess(clientIP)) {
        await this.logSecurityEvent('IP_ACCESS_DENIED', { keyId, clientIP });
        return { authenticated: false, error: 'IP access denied' };
      }

      // Check time-based access
      if (!apiKey.checkTimeAccess()) {
        await this.logSecurityEvent('TIME_ACCESS_DENIED', { keyId });
        return { authenticated: false, error: 'Access not allowed at this time' };
      }

      // Check geographic restrictions
      if (apiKey.security.allowedCountries.length > 0 || apiKey.security.blockedCountries.length > 0) {
        const country = await this.getCountryFromIP(clientIP);
        if (!this.checkGeographicAccess(apiKey, country)) {
          await this.logSecurityEvent('GEOGRAPHIC_ACCESS_DENIED', { keyId, country });
          return { authenticated: false, error: 'Geographic access denied' };
        }
      }

      return {
        authenticated: true,
        apiKey,
        userId: apiKey.userId,
        tenantId: apiKey.tenantId,
        permissions: apiKey.permissions,
        scopes: apiKey.scopes
      };

    } catch (error) {
      logger.error('API authentication failed:', error);
      return { authenticated: false, error: 'Authentication failed' };
    }
  }

  /**
   * Check rate limits for API request
   */
  async checkRateLimit(apiKey, endpoint, method, clientIP) {
    try {
      const keyId = apiKey.keyId;
      const now = Date.now();
      
      // Create rate limit keys
      const keys = {
        second: `rate_limit:${keyId}:second:${Math.floor(now / 1000)}`,
        minute: `rate_limit:${keyId}:minute:${Math.floor(now / 60000)}`,
        hour: `rate_limit:${keyId}:hour:${Math.floor(now / 3600000)}`,
        day: `rate_limit:${keyId}:day:${Math.floor(now / 86400000)}`
      };

      // Get current usage counts
      const currentUsage = await this.getCurrentUsage(keys);

      // Check against limits
      const limits = apiKey.rateLimits;
      const checks = [
        { period: 'second', current: currentUsage.second, limit: limits.requestsPerSecond },
        { period: 'minute', current: currentUsage.minute, limit: limits.requestsPerMinute },
        { period: 'hour', current: currentUsage.hour, limit: limits.requestsPerHour },
        { period: 'day', current: currentUsage.day, limit: limits.requestsPerDay }
      ];

      // Check endpoint-specific limits
      const endpointLimit = limits.endpointLimits.find(l => 
        l.endpoint === endpoint && l.method === method
      );

      if (endpointLimit) {
        const endpointKeys = {
          second: `rate_limit:${keyId}:endpoint:${endpoint}:${method}:second:${Math.floor(now / 1000)}`,
          minute: `rate_limit:${keyId}:endpoint:${endpoint}:${method}:minute:${Math.floor(now / 60000)}`,
          hour: `rate_limit:${keyId}:endpoint:${endpoint}:${method}:hour:${Math.floor(now / 3600000)}`
        };

        const endpointUsage = await this.getCurrentUsage(endpointKeys);
        
        if (endpointLimit.requestsPerSecond && endpointUsage.second >= endpointLimit.requestsPerSecond) {
          return this.createRateLimitResponse(false, 'endpoint_second', endpointLimit.requestsPerSecond, endpointUsage.second);
        }
        if (endpointLimit.requestsPerMinute && endpointUsage.minute >= endpointLimit.requestsPerMinute) {
          return this.createRateLimitResponse(false, 'endpoint_minute', endpointLimit.requestsPerMinute, endpointUsage.minute);
        }
        if (endpointLimit.requestsPerHour && endpointUsage.hour >= endpointLimit.requestsPerHour) {
          return this.createRateLimitResponse(false, 'endpoint_hour', endpointLimit.requestsPerHour, endpointUsage.hour);
        }
      }

      // Check general rate limits
      for (const check of checks) {
        if (check.current >= check.limit) {
          await this.logRateLimitExceeded(apiKey, check.period, check.current, check.limit);
          return this.createRateLimitResponse(false, check.period, check.limit, check.current);
        }
      }

      // Check burst limit
      if (currentUsage.second >= limits.burstLimit) {
        return this.createRateLimitResponse(false, 'burst', limits.burstLimit, currentUsage.second);
      }

      return {
        allowed: true,
        limits: {
          requestsPerSecond: limits.requestsPerSecond,
          requestsPerMinute: limits.requestsPerMinute,
          requestsPerHour: limits.requestsPerHour,
          requestsPerDay: limits.requestsPerDay
        },
        remaining: {
          second: limits.requestsPerSecond - currentUsage.second,
          minute: limits.requestsPerMinute - currentUsage.minute,
          hour: limits.requestsPerHour - currentUsage.hour,
          day: limits.requestsPerDay - currentUsage.day
        },
        resetTime: Math.floor(now / 1000) + 1
      };

    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Allow request if rate limiting fails (fail-open)
      return { allowed: true, error: 'Rate limit check failed' };
    }
  }

  /**
   * Record API usage
   */
  async recordAPIUsage(apiKey, endpoint, method, statusCode, responseTime, clientIP) {
    try {
      const now = Date.now();
      
      // Update Redis counters
      if (this.redis) {
        const keys = {
          second: `rate_limit:${apiKey.keyId}:second:${Math.floor(now / 1000)}`,
          minute: `rate_limit:${apiKey.keyId}:minute:${Math.floor(now / 60000)}`,
          hour: `rate_limit:${apiKey.keyId}:hour:${Math.floor(now / 3600000)}`,
          day: `rate_limit:${apiKey.keyId}:day:${Math.floor(now / 86400000)}`
        };

        // Increment counters with expiry
        const pipeline = this.redis.multi();
        pipeline.incr(keys.second).expire(keys.second, 1);
        pipeline.incr(keys.minute).expire(keys.minute, 60);
        pipeline.incr(keys.hour).expire(keys.hour, 3600);
        pipeline.incr(keys.day).expire(keys.day, 86400);
        await pipeline.exec();
      }

      // Update API key usage statistics
      apiKey.recordUsage(endpoint, method, responseTime, statusCode);
      apiKey.usage.lastIP = clientIP;
      await apiKey.save();

      // Check for usage alerts
      await this.checkUsageAlerts(apiKey, endpoint, method, statusCode);

    } catch (error) {
      logger.error('Failed to record API usage:', error);
    }
  }

  /**
   * Check permissions for specific resource and action
   */
  checkPermissions(apiKey, resource, action) {
    return apiKey.hasPermission(resource, action);
  }

  /**
   * Rotate API key
   */
  async rotateAPIKey(keyId, userId) {
    try {
      const apiKey = await APIKey.findByKeyId(keyId);
      if (!apiKey || apiKey.userId.toString() !== userId.toString()) {
        throw new Error('API key not found or access denied');
      }

      const newSecret = await apiKey.rotate();
      await apiKey.save();

      // Create audit trail
      await this.createAuditEntry({
        entityInfo: {
          userId: apiKey.userId,
          tenantId: apiKey.tenantId,
          entityType: 'API_KEY',
          entityId: apiKey._id.toString()
        },
        eventInfo: {
          eventType: 'API_KEY_ROTATED',
          action: 'ROTATE_API_KEY',
          resource: 'API_KEY',
          resourceId: apiKey._id.toString(),
          outcome: 'SUCCESS'
        }
      });

      logger.info('API key rotated', { keyId, userId });

      return {
        keyId: apiKey.keyId,
        keySecret: newSecret,
        rotatedAt: apiKey.lastRotated
      };

    } catch (error) {
      logger.error('Failed to rotate API key:', error);
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId, userId, reason) {
    try {
      const apiKey = await APIKey.findByKeyId(keyId);
      if (!apiKey || apiKey.userId.toString() !== userId.toString()) {
        throw new Error('API key not found or access denied');
      }

      apiKey.status = 'REVOKED';
      await apiKey.save();

      // Create audit trail
      await this.createAuditEntry({
        entityInfo: {
          userId: apiKey.userId,
          tenantId: apiKey.tenantId,
          entityType: 'API_KEY',
          entityId: apiKey._id.toString()
        },
        eventInfo: {
          eventType: 'API_KEY_REVOKED',
          action: 'REVOKE_API_KEY',
          resource: 'API_KEY',
          resourceId: apiKey._id.toString(),
          outcome: 'SUCCESS'
        },
        metadata: { reason }
      });

      logger.info('API key revoked', { keyId, userId, reason });

      return { success: true, revokedAt: new Date() };

    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw error;
    }
  }

  /**
   * Get API usage analytics
   */
  async getUsageAnalytics(userId, tenantId, startDate, endDate) {
    try {
      const query = {};
      if (userId) query.userId = userId;
      if (tenantId) query.tenantId = tenantId;

      const apiKeys = await APIKey.find(query);
      
      const analytics = {
        summary: {
          totalKeys: apiKeys.length,
          activeKeys: apiKeys.filter(k => k.status === 'ACTIVE').length,
          totalRequests: apiKeys.reduce((sum, k) => sum + k.usage.totalRequests, 0),
          avgRequestsPerKey: 0
        },
        keyBreakdown: apiKeys.map(key => ({
          keyId: key.keyId,
          keyName: key.keyName,
          keyType: key.keyType,
          status: key.status,
          totalRequests: key.usage.totalRequests,
          lastUsed: key.usage.lastUsed,
          topEndpoints: key.usage.endpointUsage
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        })),
        timeSeriesData: await this.getUsageTimeSeries(apiKeys, startDate, endDate),
        endpointAnalytics: await this.getEndpointAnalytics(apiKeys),
        errorAnalytics: await this.getErrorAnalytics(apiKeys)
      };

      analytics.summary.avgRequestsPerKey = analytics.summary.totalKeys > 0 ? 
        analytics.summary.totalRequests / analytics.summary.totalKeys : 0;

      return analytics;

    } catch (error) {
      logger.error('Failed to get usage analytics:', error);
      throw error;
    }
  }

  // Helper methods
  extractAuthInfo(request) {
    const authHeader = request.headers.authorization || '';
    const keyId = request.headers['x-api-key'];
    const signature = request.headers['x-api-signature'];
    const timestamp = request.headers['x-api-timestamp'];

    return {
      keyId,
      signature,
      timestamp,
      method: request.method,
      path: request.path,
      body: request.body
    };
  }

  verifySignature(secret, signature, timestamp, method, path, body, signatureMethod = 'HMAC-SHA256') {
    try {
      const data = `${timestamp}${method}${path}${JSON.stringify(body || {})}`;
      let expectedSignature;

      switch (signatureMethod) {
        case 'HMAC-SHA256':
          expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
          break;
        default:
          throw new Error(`Unsupported signature method: ${signatureMethod}`);
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  getClientIP(request) {
    return request.headers['x-forwarded-for'] || 
           request.headers['x-real-ip'] || 
           request.connection.remoteAddress || 
           request.ip;
  }

  async getCurrentUsage(keys) {
    if (!this.redis) {
      // Fallback to memory-based tracking
      return { second: 0, minute: 0, hour: 0, day: 0 };
    }

    try {
      const results = await this.redis.mGet(Object.values(keys));
      return {
        second: parseInt(results[0]) || 0,
        minute: parseInt(results[1]) || 0,
        hour: parseInt(results[2]) || 0,
        day: parseInt(results[3]) || 0
      };
    } catch (error) {
      logger.error('Failed to get current usage:', error);
      return { second: 0, minute: 0, hour: 0, day: 0 };
    }
  }

  createRateLimitResponse(allowed, period, limit, current) {
    return {
      allowed,
      limitExceeded: true,
      period,
      limit,
      current,
      retryAfter: this.getRetryAfter(period)
    };
  }

  getRetryAfter(period) {
    const now = Date.now();
    switch (period) {
      case 'second':
      case 'burst':
        return Math.ceil((1000 - (now % 1000)) / 1000);
      case 'minute':
        return Math.ceil((60000 - (now % 60000)) / 1000);
      case 'hour':
        return Math.ceil((3600000 - (now % 3600000)) / 1000);
      case 'day':
        return Math.ceil((86400000 - (now % 86400000)) / 1000);
      default:
        return 1;
    }
  }

  getDefaultRateLimits(keyType) {
    const defaults = {
      READ_ONLY: {
        requestsPerSecond: 20,
        requestsPerMinute: 1200,
        requestsPerHour: 72000,
        requestsPerDay: 1728000,
        burstLimit: 100
      },
      TRADING: {
        requestsPerSecond: 10,
        requestsPerMinute: 600,
        requestsPerHour: 36000,
        requestsPerDay: 864000,
        burstLimit: 50,
        tradingLimits: {
          ordersPerSecond: 5,
          ordersPerMinute: 100,
          ordersPerHour: 1000
        }
      },
      FULL_ACCESS: {
        requestsPerSecond: 15,
        requestsPerMinute: 900,
        requestsPerHour: 54000,
        requestsPerDay: 1296000,
        burstLimit: 75
      },
      WEBHOOK: {
        requestsPerSecond: 5,
        requestsPerMinute: 300,
        requestsPerHour: 18000,
        requestsPerDay: 432000,
        burstLimit: 25
      }
    };

    return defaults[keyType] || defaults.READ_ONLY;
  }

  getDefaultSecurityConfig() {
    return {
      ipWhitelist: [],
      ipBlacklist: [],
      requireIPWhitelist: false,
      allowedCountries: [],
      blockedCountries: [],
      allowedTimeRanges: [],
      requireSignature: true,
      signatureMethod: 'HMAC-SHA256',
      timestampTolerance: 300,
      requireTLS: true,
      allowedUserAgents: [],
      blockedUserAgents: []
    };
  }

  getDefaultMonitoringConfig() {
    return {
      enableRealTimeMonitoring: true,
      enableUsageAlerts: true,
      enableSecurityAlerts: true,
      alertThresholds: {
        usageThreshold: 80,
        errorRateThreshold: 10,
        consecutiveFailuresThreshold: 5
      },
      notificationChannels: []
    };
  }

  async createAuditEntry(auditData) {
    try {
      await ImmutableAudit.createAuditEntry(auditData);
    } catch (error) {
      logger.error('Failed to create audit entry:', error);
    }
  }

  async logSecurityEvent(eventType, details) {
    logger.warn('Security event detected', { eventType, details });
    // Additional security logging can be added here
  }

  async logRateLimitExceeded(apiKey, period, current, limit) {
    logger.info('Rate limit exceeded', {
      keyId: apiKey.keyId,
      period,
      current,
      limit
    });
  }

  async checkUsageAlerts(apiKey, endpoint, method, statusCode) {
    // Implementation for usage alerts
    if (apiKey.monitoring.enableUsageAlerts) {
      // Check thresholds and send alerts if needed
    }
  }

  async getCountryFromIP(ip) {
    // Implementation for IP geolocation
    return 'US'; // Placeholder
  }

  checkGeographicAccess(apiKey, country) {
    if (apiKey.security.blockedCountries.includes(country)) {
      return false;
    }
    if (apiKey.security.allowedCountries.length > 0) {
      return apiKey.security.allowedCountries.includes(country);
    }
    return true;
  }

  async getUsageTimeSeries(apiKeys, startDate, endDate) {
    // Implementation for time series data
    return [];
  }

  async getEndpointAnalytics(apiKeys) {
    // Implementation for endpoint analytics
    return {};
  }

  async getErrorAnalytics(apiKeys) {
    // Implementation for error analytics
    return {};
  }
}

module.exports = new APIManagementService();