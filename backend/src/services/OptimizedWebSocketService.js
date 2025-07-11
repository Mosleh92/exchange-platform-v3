const WebSocket = require('ws');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const APIManagementService = require('./APIManagementService');

/**
 * High-Performance WebSocket Service with Redis Optimization
 * Handles real-time market data, order updates, and trading notifications
 */
class WebSocketService extends EventEmitter {
  constructor() {
    super();
    
    // Redis for pub/sub and caching
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.redisPublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // WebSocket server
    this.wss = null;
    this.connections = new Map(); // connectionId -> connection info
    this.subscriptions = new Map(); // channel -> Set of connectionIds
    this.userConnections = new Map(); // userId -> Set of connectionIds
    this.tenantConnections = new Map(); // tenantId -> Set of connectionIds
    
    // Performance metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      subscriptions: 0,
      errors: 0,
      lastReset: Date.now()
    };
    
    // Connection management
    this.connectionTimeout = 30000; // 30 seconds
    this.maxConnectionsPerUser = 5;
    this.maxConnectionsPerIP = 10;
    this.ipConnections = new Map(); // IP -> count
    
    // Rate limiting
    this.rateLimits = {
      messagesPerSecond: 100,
      subscriptionsPerConnection: 50,
      maxMessageSize: 1024 * 1024 // 1MB
    };
    
    // Message queues for high-frequency updates
    this.messageQueues = new Map();
    this.batchInterval = 100; // 100ms batching
    
    this.initializeRedisSubscriptions();
    this.startMetricsCollection();
  }

  /**
   * Initialize WebSocket server
   */
  async start(server, options = {}) {
    try {
      const wsOptions = {
        server,
        path: '/ws',
        clientTracking: true,
        maxPayload: this.rateLimits.maxMessageSize,
        ...options
      };

      this.wss = new WebSocket.Server(wsOptions);
      
      // Setup connection handling
      this.wss.on('connection', (ws, request) => {
        this.handleConnection(ws, request);
      });

      // Setup cleanup on server close
      this.wss.on('close', () => {
        this.cleanup();
      });

      // Start message batching
      this.startMessageBatching();

      logger.info('WebSocket service started successfully', {
        path: wsOptions.path,
        maxPayload: wsOptions.maxPayload
      });

    } catch (error) {
      logger.error('Failed to start WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, request) {
    const connectionId = this.generateConnectionId();
    const clientIP = this.getClientIP(request);
    
    try {
      // Check IP-based rate limiting
      if (!this.checkIPLimit(clientIP)) {
        ws.close(1008, 'Too many connections from this IP');
        return;
      }

      // Authenticate connection
      const authResult = await this.authenticateConnection(request);
      if (!authResult.authenticated) {
        ws.close(1008, 'Authentication failed');
        return;
      }

      const { userId, tenantId, permissions } = authResult;

      // Check user connection limit
      if (!this.checkUserConnectionLimit(userId)) {
        ws.close(1008, 'Too many connections for this user');
        return;
      }

      // Create connection info
      const connectionInfo = {
        id: connectionId,
        ws,
        userId,
        tenantId,
        permissions,
        clientIP,
        userAgent: request.headers['user-agent'],
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        subscriptions: new Set(),
        messageCount: 0,
        rateLimitTokens: this.rateLimits.messagesPerSecond,
        lastTokenRefill: Date.now()
      };

      // Store connection
      this.connections.set(connectionId, connectionInfo);
      this.addUserConnection(userId, connectionId);
      this.addTenantConnection(tenantId, connectionId);
      this.incrementIPConnection(clientIP);

      // Setup connection handlers
      this.setupConnectionHandlers(ws, connectionInfo);

      // Send connection acknowledgment
      this.sendMessage(connectionId, {
        type: 'connection',
        status: 'connected',
        connectionId,
        serverTime: Date.now()
      });

      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      logger.info('WebSocket connection established', {
        connectionId,
        userId,
        tenantId,
        clientIP
      });

    } catch (error) {
      logger.error('Failed to handle WebSocket connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers(ws, connectionInfo) {
    const { id: connectionId } = connectionInfo;

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        await this.handleMessage(connectionId, data);
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        this.sendError(connectionId, 'Message processing failed');
      }
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      this.handleDisconnection(connectionId, code, reason);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error:', error);
      this.handleConnectionError(connectionId, error);
    });

    // Setup ping/pong for keep-alive
    ws.on('pong', () => {
      connectionInfo.lastActivity = Date.now();
    });

    // Start keep-alive interval
    const keepAliveInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000);
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(connectionId, data) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // Rate limiting
    if (!this.checkRateLimit(connectionInfo)) {
      this.sendError(connectionId, 'Rate limit exceeded');
      return;
    }

    // Parse message
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      this.sendError(connectionId, 'Invalid JSON format');
      return;
    }

    // Update activity
    connectionInfo.lastActivity = Date.now();
    connectionInfo.messageCount++;
    this.metrics.messagesReceived++;

    // Handle different message types
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(connectionId, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(connectionId, message);
        break;
      case 'ping':
        this.sendMessage(connectionId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'order':
        await this.handleOrderMessage(connectionId, message);
        break;
      case 'market_data_request':
        await this.handleMarketDataRequest(connectionId, message);
        break;
      default:
        this.sendError(connectionId, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle subscription requests
   */
  async handleSubscribe(connectionId, message) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    const { channel, symbol, filters } = message;

    // Validate subscription
    if (!this.validateSubscription(connectionInfo, channel, symbol)) {
      this.sendError(connectionId, 'Invalid subscription');
      return;
    }

    // Check subscription limits
    if (connectionInfo.subscriptions.size >= this.rateLimits.subscriptionsPerConnection) {
      this.sendError(connectionId, 'Subscription limit exceeded');
      return;
    }

    const subscriptionKey = this.getSubscriptionKey(channel, symbol, filters);

    // Add to subscriptions
    connectionInfo.subscriptions.add(subscriptionKey);
    
    if (!this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.set(subscriptionKey, new Set());
    }
    this.subscriptions.get(subscriptionKey).add(connectionId);

    // Subscribe to Redis channel if first subscriber
    if (this.subscriptions.get(subscriptionKey).size === 1) {
      await this.redisSubscriber.subscribe(subscriptionKey);
    }

    // Send subscription confirmation
    this.sendMessage(connectionId, {
      type: 'subscription_confirmed',
      channel,
      symbol,
      subscriptionKey
    });

    // Send initial data if available
    await this.sendInitialData(connectionId, channel, symbol, filters);

    this.metrics.subscriptions++;

    logger.debug('Subscription added', {
      connectionId,
      channel,
      symbol,
      subscriptionKey
    });
  }

  /**
   * Handle unsubscription requests
   */
  async handleUnsubscribe(connectionId, message) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    const { channel, symbol, filters } = message;
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, filters);

    // Remove from subscriptions
    connectionInfo.subscriptions.delete(subscriptionKey);
    
    if (this.subscriptions.has(subscriptionKey)) {
      this.subscriptions.get(subscriptionKey).delete(connectionId);
      
      // Unsubscribe from Redis if no more subscribers
      if (this.subscriptions.get(subscriptionKey).size === 0) {
        await this.redisSubscriber.unsubscribe(subscriptionKey);
        this.subscriptions.delete(subscriptionKey);
      }
    }

    // Send unsubscription confirmation
    this.sendMessage(connectionId, {
      type: 'unsubscription_confirmed',
      channel,
      symbol,
      subscriptionKey
    });

    logger.debug('Subscription removed', {
      connectionId,
      channel,
      symbol,
      subscriptionKey
    });
  }

  /**
   * Handle order-related messages
   */
  async handleOrderMessage(connectionId, message) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // Check trading permissions
    if (!this.hasPermission(connectionInfo, 'TRADING')) {
      this.sendError(connectionId, 'Trading permission required');
      return;
    }

    // Forward to trading engine or order management system
    this.emit('orderMessage', {
      connectionId,
      userId: connectionInfo.userId,
      tenantId: connectionInfo.tenantId,
      message
    });
  }

  /**
   * Handle market data requests
   */
  async handleMarketDataRequest(connectionId, message) {
    const { symbol, timeframe, limit } = message;

    try {
      // Get cached market data from Redis
      const cacheKey = `market_data:${symbol}:${timeframe}`;
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        this.sendMessage(connectionId, {
          type: 'market_data_response',
          symbol,
          timeframe,
          data: JSON.parse(cachedData),
          cached: true,
          timestamp: Date.now()
        });
      } else {
        // Request fresh data
        this.emit('marketDataRequest', {
          connectionId,
          symbol,
          timeframe,
          limit
        });
      }
    } catch (error) {
      logger.error('Error handling market data request:', error);
      this.sendError(connectionId, 'Market data request failed');
    }
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  async broadcast(channel, symbol, data, filters = {}) {
    const subscriptionKey = this.getSubscriptionKey(channel, symbol, filters);
    const subscribers = this.subscriptions.get(subscriptionKey);

    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'broadcast',
      channel,
      symbol,
      data,
      timestamp: Date.now()
    };

    // Use message batching for high-frequency updates
    if (this.isHighFrequencyChannel(channel)) {
      this.queueMessage(subscriptionKey, message);
    } else {
      // Send immediately for low-frequency updates
      for (const connectionId of subscribers) {
        this.sendMessage(connectionId, message);
      }
    }

    // Publish to Redis for other server instances
    await this.redisPublisher.publish(subscriptionKey, JSON.stringify(message));
  }

  /**
   * Send message to specific connection
   */
  sendMessage(connectionId, message) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo || connectionInfo.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connectionInfo.ws.send(JSON.stringify(message));
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
      this.handleConnectionError(connectionId, error);
      return false;
    }
  }

  /**
   * Send error message
   */
  sendError(connectionId, error, code = 'GENERAL_ERROR') {
    this.sendMessage(connectionId, {
      type: 'error',
      code,
      message: error,
      timestamp: Date.now()
    });
    this.metrics.errors++;
  }

  /**
   * Initialize Redis subscriptions for cross-server communication
   */
  initializeRedisSubscriptions() {
    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        const subscribers = this.subscriptions.get(channel);

        if (subscribers && subscribers.size > 0) {
          for (const connectionId of subscribers) {
            this.sendMessage(connectionId, parsedMessage);
          }
        }
      } catch (error) {
        logger.error('Error processing Redis message:', error);
      }
    });

    logger.info('Redis subscriptions initialized');
  }

  /**
   * Start message batching for high-frequency updates
   */
  startMessageBatching() {
    setInterval(() => {
      this.processBatchedMessages();
    }, this.batchInterval);
  }

  /**
   * Process batched messages
   */
  processBatchedMessages() {
    for (const [subscriptionKey, messages] of this.messageQueues) {
      if (messages.length === 0) continue;

      const subscribers = this.subscriptions.get(subscriptionKey);
      if (!subscribers || subscribers.size === 0) {
        messages.length = 0; // Clear queue
        continue;
      }

      // Batch messages by type and send latest for each type
      const batchedByType = new Map();
      for (const message of messages) {
        const key = `${message.channel}:${message.symbol}`;
        batchedByType.set(key, message); // Keep only latest
      }

      // Send batched messages
      for (const message of batchedByType.values()) {
        for (const connectionId of subscribers) {
          this.sendMessage(connectionId, message);
        }
      }

      // Clear processed messages
      messages.length = 0;
    }
  }

  /**
   * Queue message for batching
   */
  queueMessage(subscriptionKey, message) {
    if (!this.messageQueues.has(subscriptionKey)) {
      this.messageQueues.set(subscriptionKey, []);
    }
    this.messageQueues.get(subscriptionKey).push(message);
  }

  /**
   * Check if channel requires high-frequency batching
   */
  isHighFrequencyChannel(channel) {
    const highFrequencyChannels = [
      'ticker',
      'orderbook',
      'trades',
      'price_updates'
    ];
    return highFrequencyChannels.includes(channel);
  }

  /**
   * Handle connection disconnection
   */
  handleDisconnection(connectionId, code, reason) {
    const connectionInfo = this.connections.get(connectionId);
    if (!connectionInfo) return;

    // Remove all subscriptions
    for (const subscriptionKey of connectionInfo.subscriptions) {
      if (this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.get(subscriptionKey).delete(connectionId);
        
        // Clean up empty subscription channels
        if (this.subscriptions.get(subscriptionKey).size === 0) {
          this.redisSubscriber.unsubscribe(subscriptionKey);
          this.subscriptions.delete(subscriptionKey);
        }
      }
    }

    // Remove from user and tenant connections
    this.removeUserConnection(connectionInfo.userId, connectionId);
    this.removeTenantConnection(connectionInfo.tenantId, connectionId);
    this.decrementIPConnection(connectionInfo.clientIP);

    // Remove connection
    this.connections.delete(connectionId);

    // Update metrics
    this.metrics.activeConnections--;

    logger.info('WebSocket connection closed', {
      connectionId,
      userId: connectionInfo.userId,
      code,
      reason: reason?.toString()
    });
  }

  /**
   * Handle connection errors
   */
  handleConnectionError(connectionId, error) {
    logger.error('WebSocket connection error:', error);
    
    const connectionInfo = this.connections.get(connectionId);
    if (connectionInfo && connectionInfo.ws.readyState === WebSocket.OPEN) {
      connectionInfo.ws.close(1011, 'Internal server error');
    }
    
    this.metrics.errors++;
  }

  /**
   * Authenticate WebSocket connection
   */
  async authenticateConnection(request) {
    try {
      // Extract token from URL params or headers
      const url = new URL(request.url, 'http://localhost');
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return { authenticated: false, error: 'No authentication token provided' };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Additional validation can be added here
      return {
        authenticated: true,
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        permissions: decoded.permissions || []
      };

    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      return { authenticated: false, error: 'Invalid authentication token' };
    }
  }

  // Helper methods
  generateConnectionId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0] || 
           request.headers['x-real-ip'] || 
           request.connection.remoteAddress;
  }

  getSubscriptionKey(channel, symbol, filters = {}) {
    const filterString = Object.keys(filters).length > 0 ? 
      `:${Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(',')}` : '';
    return `${channel}:${symbol}${filterString}`;
  }

  validateSubscription(connectionInfo, channel, symbol) {
    // Add validation logic based on user permissions and subscription rules
    const validChannels = ['ticker', 'orderbook', 'trades', 'orders', 'balance'];
    return validChannels.includes(channel);
  }

  hasPermission(connectionInfo, permission) {
    return connectionInfo.permissions.includes(permission) || 
           connectionInfo.permissions.includes('ALL');
  }

  checkRateLimit(connectionInfo) {
    const now = Date.now();
    const timeSinceLastRefill = now - connectionInfo.lastTokenRefill;
    
    // Refill tokens based on time elapsed
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000) * this.rateLimits.messagesPerSecond;
    connectionInfo.rateLimitTokens = Math.min(
      this.rateLimits.messagesPerSecond,
      connectionInfo.rateLimitTokens + tokensToAdd
    );
    connectionInfo.lastTokenRefill = now;
    
    // Check if tokens available
    if (connectionInfo.rateLimitTokens > 0) {
      connectionInfo.rateLimitTokens--;
      return true;
    }
    
    return false;
  }

  checkIPLimit(clientIP) {
    const currentCount = this.ipConnections.get(clientIP) || 0;
    return currentCount < this.maxConnectionsPerIP;
  }

  checkUserConnectionLimit(userId) {
    const userConns = this.userConnections.get(userId);
    return !userConns || userConns.size < this.maxConnectionsPerUser;
  }

  addUserConnection(userId, connectionId) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(connectionId);
  }

  removeUserConnection(userId, connectionId) {
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  addTenantConnection(tenantId, connectionId) {
    if (!this.tenantConnections.has(tenantId)) {
      this.tenantConnections.set(tenantId, new Set());
    }
    this.tenantConnections.get(tenantId).add(connectionId);
  }

  removeTenantConnection(tenantId, connectionId) {
    const tenantConns = this.tenantConnections.get(tenantId);
    if (tenantConns) {
      tenantConns.delete(connectionId);
      if (tenantConns.size === 0) {
        this.tenantConnections.delete(tenantId);
      }
    }
  }

  incrementIPConnection(clientIP) {
    const currentCount = this.ipConnections.get(clientIP) || 0;
    this.ipConnections.set(clientIP, currentCount + 1);
  }

  decrementIPConnection(clientIP) {
    const currentCount = this.ipConnections.get(clientIP) || 0;
    if (currentCount <= 1) {
      this.ipConnections.delete(clientIP);
    } else {
      this.ipConnections.set(clientIP, currentCount - 1);
    }
  }

  async sendInitialData(connectionId, channel, symbol, filters) {
    // Send cached initial data based on channel type
    try {
      const cacheKey = `initial_${channel}:${symbol}`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (cachedData) {
        this.sendMessage(connectionId, {
          type: 'initial_data',
          channel,
          symbol,
          data: JSON.parse(cachedData),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  startMetricsCollection() {
    setInterval(() => {
      this.collectAndPublishMetrics();
    }, 60000); // Every minute
  }

  async collectAndPublishMetrics() {
    const now = Date.now();
    const metricsData = {
      ...this.metrics,
      timestamp: now,
      connections: {
        total: this.connections.size,
        byTenant: {},
        byIP: Object.fromEntries(this.ipConnections)
      },
      subscriptions: {
        total: this.subscriptions.size,
        byChannel: {}
      }
    };

    // Collect tenant metrics
    for (const [tenantId, connections] of this.tenantConnections) {
      metricsData.connections.byTenant[tenantId] = connections.size;
    }

    // Collect subscription metrics
    for (const [subscriptionKey] of this.subscriptions) {
      const [channel] = subscriptionKey.split(':');
      metricsData.subscriptions.byChannel[channel] = 
        (metricsData.subscriptions.byChannel[channel] || 0) + 1;
    }

    // Store metrics in Redis
    await this.redis.setex('websocket_metrics', 300, JSON.stringify(metricsData));

    // Reset counters
    this.metrics.messagesSent = 0;
    this.metrics.messagesReceived = 0;
    this.metrics.errors = 0;
    this.metrics.lastReset = now;

    logger.debug('WebSocket metrics collected', {
      activeConnections: metricsData.connections.total,
      totalSubscriptions: metricsData.subscriptions.total
    });
  }

  async cleanup() {
    // Close all connections
    for (const [connectionId] of this.connections) {
      const connectionInfo = this.connections.get(connectionId);
      if (connectionInfo && connectionInfo.ws.readyState === WebSocket.OPEN) {
        connectionInfo.ws.close(1001, 'Server shutting down');
      }
    }

    // Close Redis connections
    await this.redis.quit();
    await this.redisSubscriber.quit();
    await this.redisPublisher.quit();

    logger.info('WebSocket service cleanup completed');
  }

  /**
   * Get current service statistics
   */
  getStatistics() {
    return {
      connections: {
        active: this.connections.size,
        total: this.metrics.totalConnections,
        byTenant: Object.fromEntries(this.tenantConnections.entries())
      },
      subscriptions: {
        total: this.subscriptions.size,
        channels: Array.from(this.subscriptions.keys())
      },
      metrics: this.metrics,
      performance: {
        messageQueueSizes: Object.fromEntries(
          Array.from(this.messageQueues.entries()).map(([k, v]) => [k, v.length])
        )
      }
    };
  }
}

module.exports = new WebSocketService();