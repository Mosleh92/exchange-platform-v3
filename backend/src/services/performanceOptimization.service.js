const logger = require('../utils/logger');
const Redis = require('ioredis');
const compression = require('compression');
const { EventEmitter } = require('events');

/**
 * Performance Optimization Service
 * Handles memory management, caching, compression, and performance monitoring
 */
class PerformanceOptimizationService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.memoryUsage = new Map();
    this.activeConnections = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    this.initializeOptimizations();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize performance optimizations
   */
  initializeOptimizations() {
    this.setupMemoryManagement();
    this.setupWebSocketOptimization();
    this.setupCachingStrategies();
    this.setupCompression();
    this.setupLoopProtection();
  }

  /**
   * Setup memory management
   */
  setupMemoryManagement() {
    // Monitor memory usage
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 30000); // Every 30 seconds

    // Garbage collection optimization
    setInterval(() => {
      if (global.gc) {
        global.gc();
        logger.info('Garbage collection performed');
      }
    }, 300000); // Every 5 minutes

    // Memory leak detection
    this.memoryLeakThreshold = 100 * 1024 * 1024; // 100MB
    this.lastMemoryUsage = process.memoryUsage();
  }

  /**
   * Setup WebSocket optimization
   */
  setupWebSocketOptimization() {
    this.websocketConnections = new Map();
    this.websocketHeartbeatInterval = 30000; // 30 seconds
    this.websocketMaxConnections = 1000;
  }

  /**
   * Setup caching strategies
   */
  setupCachingStrategies() {
    this.cacheConfig = {
      defaultTTL: 300, // 5 minutes
      maxSize: 1000,
      compression: true,
      strategies: {
        LRU: 'least-recently-used',
        LFU: 'least-frequently-used',
        FIFO: 'first-in-first-out'
      }
    };
  }

  /**
   * Setup compression
   */
  setupCompression() {
    this.compressionOptions = {
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    };
  }

  /**
   * Setup loop protection
   */
  setupLoopProtection() {
    this.loopProtection = {
      maxIterations: 10000,
      maxRecursionDepth: 100,
      timeout: 5000 // 5 seconds
    };
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    const currentUsage = process.memoryUsage();
    const memoryIncrease = currentUsage.heapUsed - this.lastMemoryUsage.heapUsed;

    this.memoryUsage.set(Date.now(), {
      heapUsed: currentUsage.heapUsed,
      heapTotal: currentUsage.heapTotal,
      external: currentUsage.external,
      rss: currentUsage.rss
    });

    // Detect memory leaks
    if (memoryIncrease > this.memoryLeakThreshold) {
      logger.warn('Potential memory leak detected', {
        increase: memoryIncrease,
        currentUsage: currentUsage.heapUsed,
        threshold: this.memoryLeakThreshold
      });

      this.emit('memoryLeakDetected', {
        increase: memoryIncrease,
        currentUsage: currentUsage.heapUsed
      });
    }

    // Clean up old memory usage records
    const oneHourAgo = Date.now() - 3600000;
    for (const [timestamp] of this.memoryUsage) {
      if (timestamp < oneHourAgo) {
        this.memoryUsage.delete(timestamp);
      }
    }

    this.lastMemoryUsage = currentUsage;
  }

  /**
   * Optimize WebSocket connections
   */
  optimizeWebSocketConnection(socket) {
    const connectionId = socket.id;
    
    // Store connection info
    this.websocketConnections.set(connectionId, {
      socket,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0
    });

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
        socket.once('pong', () => {
          const connection = this.websocketConnections.get(connectionId);
          if (connection) {
            connection.lastActivity = Date.now();
          }
        });
      } else {
        clearInterval(heartbeat);
        this.websocketConnections.delete(connectionId);
      }
    }, this.websocketHeartbeatInterval);

    // Monitor connection limits
    if (this.websocketConnections.size > this.websocketMaxConnections) {
      logger.warn('WebSocket connection limit reached', {
        current: this.websocketConnections.size,
        max: this.websocketMaxConnections
      });
    }

    // Clean up on disconnect
    socket.on('disconnect', () => {
      this.websocketConnections.delete(connectionId);
      clearInterval(heartbeat);
    });

    return connectionId;
  }

  /**
   * Optimize database queries with connection pooling
   */
  async optimizeDatabaseQuery(query, params = [], options = {}) {
    const {
      useCache = true,
      cacheTTL = this.cacheConfig.defaultTTL,
      compression = this.cacheConfig.compression
    } = options;

    try {
      // Check cache first
      if (useCache) {
        const cachedResult = await this.getCachedResult(query, params);
        if (cachedResult) {
          this.cacheStats.hits++;
          return cachedResult;
        }
      }

      // Execute query
      const startTime = Date.now();
      const result = await this.executeQueryWithTimeout(query, params);
      const executionTime = Date.now() - startTime;

      // Cache result
      if (useCache && result) {
        await this.cacheResult(query, params, result, cacheTTL, compression);
        this.cacheStats.sets++;
      }

      // Log slow queries
      if (executionTime > 1000) {
        logger.warn('Slow query detected', {
          query: query.substring(0, 100) + '...',
          executionTime,
          params
        });
      }

      this.cacheStats.misses++;
      return result;

    } catch (error) {
      logger.error('Query optimization failed:', error);
      throw error;
    }
  }

  /**
   * Execute query with timeout protection
   */
  async executeQueryWithTimeout(query, params, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, timeout);

      // Execute query
      const db = require('../config/database');
      db.query(query, params)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Cache result with compression
   */
  async cacheResult(key, params, result, ttl, useCompression = true) {
    try {
      const cacheKey = this.generateCacheKey(key, params);
      const cacheData = {
        result,
        timestamp: Date.now(),
        ttl
      };

      let dataToCache = JSON.stringify(cacheData);
      
      if (useCompression) {
        const zlib = require('zlib');
        dataToCache = await new Promise((resolve, reject) => {
          zlib.gzip(dataToCache, (err, compressed) => {
            if (err) reject(err);
            else resolve(compressed);
          });
        });
      }

      await this.redis.setex(cacheKey, ttl, dataToCache);

    } catch (error) {
      logger.error('Failed to cache result:', error);
    }
  }

  /**
   * Get cached result with decompression
   */
  async getCachedResult(key, params) {
    try {
      const cacheKey = this.generateCacheKey(key, params);
      const cachedData = await this.redis.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      let decompressedData;
      
      // Try to decompress first
      try {
        const zlib = require('zlib');
        decompressedData = await new Promise((resolve, reject) => {
          zlib.gunzip(cachedData, (err, decompressed) => {
            if (err) reject(err);
            else resolve(decompressed);
          });
        });
      } catch (error) {
        // If decompression fails, treat as uncompressed
        decompressedData = cachedData;
      }

      const parsed = JSON.parse(decompressedData);
      
      // Check if cache is still valid
      if (Date.now() - parsed.timestamp > parsed.ttl * 1000) {
        await this.redis.del(cacheKey);
        return null;
      }

      return parsed.result;

    } catch (error) {
      logger.error('Failed to get cached result:', error);
      return null;
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(key, params) {
    const crypto = require('crypto');
    const keyHash = crypto.createHash('md5').update(key).digest('hex');
    const paramsHash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `cache:${keyHash}:${paramsHash}`;
  }

  /**
   * Protect against infinite loops
   */
  protectAgainstInfiniteLoop(fn, maxIterations = this.loopProtection.maxIterations) {
    return function(...args) {
      let iterations = 0;
      const originalFn = fn;

      const protectedFn = function(...innerArgs) {
        iterations++;
        
        if (iterations > maxIterations) {
          throw new Error(`Infinite loop detected: ${iterations} iterations exceeded limit of ${maxIterations}`);
        }

        return originalFn.apply(this, innerArgs);
      };

      return protectedFn.apply(this, args);
    };
  }

  /**
   * Protect against deep recursion
   */
  protectAgainstDeepRecursion(fn, maxDepth = this.loopProtection.maxRecursionDepth) {
    return function(...args) {
      const recursionStack = new Set();
      
      const protectedFn = function(...innerArgs) {
        const stackTrace = new Error().stack;
        const callSignature = `${fn.name}:${JSON.stringify(innerArgs)}`;
        
        if (recursionStack.has(callSignature)) {
          throw new Error(`Deep recursion detected: ${callSignature}`);
        }
        
        if (recursionStack.size >= maxDepth) {
          throw new Error(`Recursion depth limit exceeded: ${maxDepth}`);
        }
        
        recursionStack.add(callSignature);
        
        try {
          return fn.apply(this, innerArgs);
        } finally {
          recursionStack.delete(callSignature);
        }
      };

      return protectedFn.apply(this, args);
    };
  }

  /**
   * Optimize response compression
   */
  optimizeResponseCompression(req, res, next) {
    const compression = require('compression');
    const compress = compression(this.compressionOptions);
    
    return compress(req, res, next);
  }

  /**
   * Optimize API pagination
   */
  optimizePagination(query, page = 1, limit = 20, options = {}) {
    const offset = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100); // Prevent excessive data retrieval
    
    return {
      query: `${query} LIMIT ${maxLimit} OFFSET ${offset}`,
      pagination: {
        page,
        limit: maxLimit,
        offset
      }
    };
  }

  /**
   * Optimize bulk operations
   */
  async optimizeBulkOperation(operations, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      try {
        const batchResult = await this.executeBatchOperations(batch);
        results.push(...batchResult);
        
        // Add delay between batches to prevent overwhelming the system
        if (i + batchSize < operations.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        logger.error('Batch operation failed:', error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Execute batch operations
   */
  async executeBatchOperations(operations) {
    const db = require('../config/database');
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const operation of operations) {
        const result = await client.query(operation.query, operation.params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor system performance
    setInterval(() => {
      this.monitorSystemPerformance();
    }, 60000); // Every minute

    // Monitor cache performance
    setInterval(() => {
      this.monitorCachePerformance();
    }, 300000); // Every 5 minutes

    // Clean up inactive connections
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000); // Every 5 minutes
  }

  /**
   * Monitor system performance
   */
  monitorSystemPerformance() {
    const usage = process.memoryUsage();
    const performanceMetrics = {
      memory: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      },
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      websocketConnections: this.websocketConnections.size,
      cacheStats: this.cacheStats
    };

    // Emit performance metrics
    this.emit('performanceMetrics', performanceMetrics);

    // Log performance warnings
    if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
      logger.warn('High memory usage detected', {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal
      });
    }

    if (this.websocketConnections.size > this.websocketMaxConnections * 0.8) {
      logger.warn('WebSocket connections approaching limit', {
        current: this.websocketConnections.size,
        max: this.websocketMaxConnections
      });
    }
  }

  /**
   * Monitor cache performance
   */
  monitorCachePerformance() {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses);
    
    logger.info('Cache performance metrics', {
      hitRate: hitRate.toFixed(2),
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      sets: this.cacheStats.sets
    });

    // Reset cache stats
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactiveThreshold = 300000; // 5 minutes

    for (const [connectionId, connection] of this.websocketConnections) {
      if (now - connection.lastActivity > inactiveThreshold) {
        connection.socket.disconnect();
        this.websocketConnections.delete(connectionId);
        
        logger.info('Cleaned up inactive WebSocket connection', {
          connectionId,
          inactiveTime: now - connection.lastActivity
        });
      }
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      memory: process.memoryUsage(),
      cache: this.cacheStats,
      connections: {
        websocket: this.websocketConnections.size,
        max: this.websocketMaxConnections
      },
      uptime: process.uptime()
    };
  }
}

module.exports = new PerformanceOptimizationService(); 