// backend/src/middleware/websocketSecurity.js
const jwt = require('jsonwebtoken');
const authTokenService = require('../services/authTokenService');
const logger = require('../utils/logger');

/**
 * WebSocket Security Middleware
 * Provides secure WebSocket authentication, authorization, and rate limiting
 */
class WebSocketSecurityMiddleware {
  constructor() {
    this.connections = new Map();
    this.rateLimits = new Map();
    this.initializeRateLimiting();
  }

  /**
   * Initialize rate limiting configuration
   */
  initializeRateLimiting() {
    this.rateLimitConfig = {
      // General message rate limiting
      general: {
        windowMs: 60 * 1000, // 1 minute
        maxMessages: 100
      },
      
      // Trading-specific rate limiting
      trading: {
        windowMs: 60 * 1000, // 1 minute  
        maxMessages: 30
      },
      
      // Authentication rate limiting
      auth: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxMessages: 5
      }
    };
  }

  /**
   * Authenticate WebSocket connection
   */
  authenticateConnection = async (socket, next) => {
    try {
      // Extract token from handshake
      const token = this.extractTokenFromHandshake(socket.handshake);
      
      if (!token) {
        logger.warn('WebSocket connection rejected - no token', {
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        });
        return next(new Error('Authentication required'));
      }

      // Verify token
      const decoded = await authTokenService.verifyAccessToken(token);
      
      // Get user data
      const User = require('../models/User');
      const user = await User.findById(decoded.id)
        .populate('tenantId')
        .select('-password -__v');

      if (!user || !user.isActive || user.isLocked) {
        logger.warn('WebSocket connection rejected - invalid user', {
          userId: decoded.id,
          ip: socket.handshake.address
        });
        return next(new Error('User not found or inactive'));
      }

      // Add user info to socket
      socket.userId = user.id;
      socket.user = user;
      socket.tenantId = user.tenantId?.id;
      socket.sessionId = decoded.sessionId;
      socket.tokenId = decoded.tokenId;

      // Store connection info
      this.connections.set(socket.id, {
        userId: user.id,
        tenantId: user.tenantId?.id,
        connectedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      });

      // Log successful connection
      logger.info('WebSocket connection authenticated', {
        socketId: socket.id,
        userId: user.id,
        tenantId: user.tenantId?.id,
        ip: socket.handshake.address
      });

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  };

  /**
   * Extract token from WebSocket handshake
   */
  extractTokenFromHandshake(handshake) {
    // Try query parameter first
    if (handshake.query && handshake.query.token) {
      return handshake.query.token;
    }

    // Try authorization header
    if (handshake.headers && handshake.headers.authorization) {
      const authHeader = handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    // Try cookies
    if (handshake.headers && handshake.headers.cookie) {
      const cookies = this.parseCookies(handshake.headers.cookie);
      if (cookies.accessToken) {
        return cookies.accessToken;
      }
    }

    return null;
  }

  /**
   * Parse cookies from header
   */
  parseCookies(cookieHeader) {
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      cookies[name?.trim()] = rest.join('=')?.trim();
    });
    return cookies;
  }

  /**
   * Authorize WebSocket message
   */
  authorizeMessage = (requiredRoles = []) => {
    return (socket, data, next) => {
      try {
        if (!socket.user) {
          return next(new Error('User not authenticated'));
        }

        // Check role authorization
        if (requiredRoles.length > 0 && !requiredRoles.includes(socket.user.role)) {
          logger.warn('WebSocket message unauthorized', {
            socketId: socket.id,
            userId: socket.userId,
            requiredRoles,
            userRole: socket.user.role,
            messageType: data.type
          });
          return next(new Error('Insufficient permissions'));
        }

        next();
      } catch (error) {
        logger.error('WebSocket authorization error:', error);
        next(new Error('Authorization failed'));
      }
    };
  };

  /**
   * Rate limit WebSocket messages
   */
  rateLimitMessage = (limitType = 'general') => {
    return (socket, data, next) => {
      try {
        const config = this.rateLimitConfig[limitType] || this.rateLimitConfig.general;
        const key = `${socket.userId}:${limitType}`;
        const now = Date.now();

        // Get or create rate limit entry
        let rateLimit = this.rateLimits.get(key);
        if (!rateLimit) {
          rateLimit = {
            count: 0,
            resetTime: now + config.windowMs
          };
          this.rateLimits.set(key, rateLimit);
        }

        // Reset if window expired
        if (now > rateLimit.resetTime) {
          rateLimit.count = 0;
          rateLimit.resetTime = now + config.windowMs;
        }

        // Check rate limit
        if (rateLimit.count >= config.maxMessages) {
          logger.warn('WebSocket rate limit exceeded', {
            socketId: socket.id,
            userId: socket.userId,
            limitType,
            count: rateLimit.count,
            maxMessages: config.maxMessages
          });
          
          socket.emit('error', {
            type: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
          });
          
          return;
        }

        // Increment counter
        rateLimit.count++;

        next();
      } catch (error) {
        logger.error('WebSocket rate limiting error:', error);
        next();
      }
    };
  };

  /**
   * Validate WebSocket message structure
   */
  validateMessage = (schema = null) => {
    return (socket, data, next) => {
      try {
        // Basic message validation
        if (!data || typeof data !== 'object') {
          socket.emit('error', {
            type: 'INVALID_MESSAGE',
            message: 'Message must be a valid object'
          });
          return;
        }

        if (!data.type) {
          socket.emit('error', {
            type: 'INVALID_MESSAGE',
            message: 'Message type is required'
          });
          return;
        }

        // Validate message size
        const messageSize = JSON.stringify(data).length;
        if (messageSize > 10240) { // 10KB limit
          socket.emit('error', {
            type: 'MESSAGE_TOO_LARGE',
            message: 'Message exceeds size limit'
          });
          return;
        }

        // Custom schema validation if provided
        if (schema) {
          const { error } = schema.validate(data);
          if (error) {
            socket.emit('error', {
              type: 'VALIDATION_ERROR',
              message: 'Message validation failed',
              details: error.details
            });
            return;
          }
        }

        // Sanitize message data
        data = this.sanitizeMessageData(data);

        next();
      } catch (error) {
        logger.error('WebSocket message validation error:', error);
        socket.emit('error', {
          type: 'VALIDATION_ERROR',
          message: 'Message validation failed'
        });
      }
    };
  };

  /**
   * Sanitize WebSocket message data
   */
  sanitizeMessageData(data) {
    if (typeof data === 'string') {
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeMessageData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeMessageData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Require tenant context for WebSocket operations
   */
  requireTenant = (socket, data, next) => {
    try {
      if (!socket.tenantId && socket.user.role !== 'super_admin') {
        socket.emit('error', {
          type: 'TENANT_REQUIRED',
          message: 'Tenant context is required'
        });
        return;
      }

      // Validate tenant access if specified in message
      if (data.tenantId && data.tenantId !== socket.tenantId && socket.user.role !== 'super_admin') {
        logger.warn('WebSocket tenant access violation', {
          socketId: socket.id,
          userId: socket.userId,
          requestedTenant: data.tenantId,
          userTenant: socket.tenantId
        });
        
        socket.emit('error', {
          type: 'TENANT_ACCESS_DENIED',
          message: 'Access denied to requested tenant'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('WebSocket tenant validation error:', error);
      next(new Error('Tenant validation failed'));
    }
  };

  /**
   * Monitor WebSocket connections
   */
  monitorConnection = (socket) => {
    // Update activity on any message
    socket.use((event, next) => {
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.lastActivity = new Date();
        connection.messageCount++;
      }
      next();
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('WebSocket connection error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message
      });
    });

    // Periodic connection health check
    const healthCheckInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      } else {
        clearInterval(healthCheckInterval);
      }
    }, 30000); // 30 seconds

    socket.on('pong', () => {
      // Update last activity on pong response
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.lastActivity = new Date();
      }
    });
  };

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnection(socket, reason) {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      const duration = Date.now() - connection.connectedAt.getTime();
      
      logger.info('WebSocket connection closed', {
        socketId: socket.id,
        userId: socket.userId,
        tenantId: socket.tenantId,
        reason,
        duration,
        messageCount: connection.messageCount
      });

      // Clean up connection data
      this.connections.delete(socket.id);
      
      // Clean up rate limit data for this user
      const rateLimitKeys = Array.from(this.rateLimits.keys())
        .filter(key => key.startsWith(`${socket.userId}:`));
      
      rateLimitKeys.forEach(key => {
        this.rateLimits.delete(key);
      });
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      connectionsByTenant: {},
      connectionsByUser: {},
      averageMessageCount: 0,
      timestamp: new Date()
    };

    let totalMessages = 0;

    for (const [socketId, connection] of this.connections) {
      // Count by tenant
      const tenantId = connection.tenantId || 'no-tenant';
      stats.connectionsByTenant[tenantId] = (stats.connectionsByTenant[tenantId] || 0) + 1;

      // Count by user
      stats.connectionsByUser[connection.userId] = (stats.connectionsByUser[connection.userId] || 0) + 1;

      totalMessages += connection.messageCount;
    }

    if (this.connections.size > 0) {
      stats.averageMessageCount = Math.round(totalMessages / this.connections.size);
    }

    return stats;
  }

  /**
   * Clean up expired rate limits
   */
  cleanupRateLimits() {
    const now = Date.now();
    
    for (const [key, rateLimit] of this.rateLimits) {
      if (now > rateLimit.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Setup WebSocket security for Socket.IO server
   */
  setupSocketSecurity(io) {
    // Authentication middleware
    io.use(this.authenticateConnection);

    // Connection monitoring
    io.on('connection', (socket) => {
      this.monitorConnection(socket);
      
      // Setup message-level middleware
      socket.use(this.rateLimitMessage('general'));
      socket.use(this.validateMessage());
      
      logger.info('WebSocket connection established', {
        socketId: socket.id,
        userId: socket.userId,
        ip: socket.handshake.address
      });
    });

    // Periodic cleanup
    setInterval(() => {
      this.cleanupRateLimits();
    }, 60000); // Every minute

    return io;
  }
}

module.exports = new WebSocketSecurityMiddleware();