// backend/src/services/performance/PerformanceOptimizationService.js
const os = require('os');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const CachingService = require('../caching/CachingService');

/**
 * Performance Optimization Service
 * Handles memory leaks, slow queries, pagination, and overall performance optimization
 */
class PerformanceOptimizationService {
  constructor() {
    this.memoryUsageHistory = [];
    this.slowQueries = new Map();
    this.connectionPoolStats = {
      active: 0,
      idle: 0,
      total: 0
    };
    this.queryOptimizations = new Map();
    this.memoryLeakDetectors = new Map();
    this.isMonitoring = false;
  }

  /**
   * Initialize performance optimization service
   */
  async initialize() {
    try {
      // Setup query monitoring
      this.setupQueryMonitoring();
      
      // Setup memory leak detection
      this.setupMemoryLeakDetection();
      
      // Setup connection pool optimization
      this.setupConnectionPoolOptimization();
      
      // Setup pagination helpers
      this.setupPaginationHelpers();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      logger.info('Performance optimization service initialized');
      
    } catch (error) {
      logger.error('Failed to initialize performance optimization service:', error);
      throw error;
    }
  }

  /**
   * Setup query monitoring to detect slow queries
   */
  setupQueryMonitoring() {
    // MongoDB query monitoring
    if (mongoose.connection.readyState === 1) {
      this.enableMongooseQueryLogging();
    } else {
      mongoose.connection.once('open', () => {
        this.enableMongooseQueryLogging();
      });
    }
  }

  /**
   * Enable Mongoose query logging and optimization
   */
  enableMongooseQueryLogging() {
    // Set mongoose debug mode for development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collection, method, query, doc) => {
        logger.debug(`Mongoose: ${collection}.${method}`, { query, doc });
      });
    }

    // Monitor slow queries
    mongoose.connection.on('queryLog', (event) => {
      if (event.duration > 1000) { // Queries slower than 1 second
        this.recordSlowQuery(event);
      }
    });

    // Add query execution time tracking
    const originalExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = function() {
      const startTime = Date.now();
      const queryString = this.getQuery();
      const collection = this.model.collection.name;
      
      return originalExec.apply(this, arguments).then(result => {
        const duration = Date.now() - startTime;
        
        if (duration > 1000) {
          logger.warn(`Slow query detected: ${collection}`, {
            query: queryString,
            duration: `${duration}ms`,
            collection
          });
          
          this.recordSlowQuery({
            collection,
            query: queryString,
            duration,
            timestamp: new Date()
          });
        }
        
        return result;
      }).catch(error => {
        const duration = Date.now() - startTime;
        logger.error(`Query failed: ${collection}`, {
          query: queryString,
          duration: `${duration}ms`,
          error: error.message
        });
        throw error;
      });
    }.bind(this);
  }

  /**
   * Record slow query for analysis
   */
  recordSlowQuery(queryInfo) {
    const key = `${queryInfo.collection}_${JSON.stringify(queryInfo.query)}`;
    
    if (this.slowQueries.has(key)) {
      const existing = this.slowQueries.get(key);
      existing.count++;
      existing.totalDuration += queryInfo.duration;
      existing.averageDuration = existing.totalDuration / existing.count;
      existing.lastOccurrence = queryInfo.timestamp;
    } else {
      this.slowQueries.set(key, {
        collection: queryInfo.collection,
        query: queryInfo.query,
        count: 1,
        totalDuration: queryInfo.duration,
        averageDuration: queryInfo.duration,
        firstOccurrence: queryInfo.timestamp,
        lastOccurrence: queryInfo.timestamp
      });
    }

    // Auto-optimize if query is frequently slow
    if (this.slowQueries.get(key).count >= 5) {
      this.autoOptimizeQuery(queryInfo);
    }
  }

  /**
   * Auto-optimize frequently slow queries
   */
  async autoOptimizeQuery(queryInfo) {
    try {
      const collection = mongoose.connection.db.collection(queryInfo.collection);
      
      // Analyze query pattern and suggest indexes
      const indexSuggestions = this.analyzeQueryForIndexes(queryInfo.query);
      
      for (const indexSuggestion of indexSuggestions) {
        try {
          await collection.createIndex(indexSuggestion.keys, {
            background: true,
            name: indexSuggestion.name
          });
          
          logger.info(`Auto-created index for slow query: ${indexSuggestion.name}`, {
            collection: queryInfo.collection,
            keys: indexSuggestion.keys
          });
          
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.error(`Failed to create auto-index: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      logger.error('Failed to auto-optimize query:', error);
    }
  }

  /**
   * Analyze query patterns and suggest indexes
   */
  analyzeQueryForIndexes(query) {
    const suggestions = [];
    
    // Extract filter fields
    const filterFields = Object.keys(query).filter(key => key !== '$or' && key !== '$and');
    
    if (filterFields.length > 0) {
      // Single field indexes
      filterFields.forEach(field => {
        suggestions.push({
          keys: { [field]: 1 },
          name: `auto_idx_${field}`
        });
      });
      
      // Compound index for multiple fields
      if (filterFields.length > 1) {
        const compoundIndex = {};
        filterFields.forEach(field => {
          compoundIndex[field] = 1;
        });
        
        suggestions.push({
          keys: compoundIndex,
          name: `auto_idx_compound_${filterFields.join('_')}`
        });
      }
    }
    
    // Handle $or queries
    if (query.$or && Array.isArray(query.$or)) {
      query.$or.forEach((orCondition, index) => {
        const orFields = Object.keys(orCondition);
        if (orFields.length > 0) {
          const indexKeys = {};
          orFields.forEach(field => {
            indexKeys[field] = 1;
          });
          
          suggestions.push({
            keys: indexKeys,
            name: `auto_idx_or_${index}_${orFields.join('_')}`
          });
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Setup memory leak detection
   */
  setupMemoryLeakDetection() {
    // Monitor memory usage
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds

    // Setup garbage collection monitoring
    if (global.gc) {
      setInterval(() => {
        this.performMemoryCleanup();
      }, 60000); // Every minute
    }

    // Monitor for common memory leak patterns
    this.setupCommonLeakDetectors();
  }

  /**
   * Check memory usage and detect potential leaks
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();
    
    this.memoryUsageHistory.push({
      timestamp,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    });

    // Keep only last 100 measurements
    if (this.memoryUsageHistory.length > 100) {
      this.memoryUsageHistory.shift();
    }

    // Check for memory leaks
    this.detectMemoryLeaks();
  }

  /**
   * Detect memory leaks from usage patterns
   */
  detectMemoryLeaks() {
    if (this.memoryUsageHistory.length < 10) return;

    const recent = this.memoryUsageHistory.slice(-10);
    const heapGrowth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
    const timeWindow = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    // If heap grows more than 50MB in 5 minutes, flag as potential leak
    const growthRate = heapGrowth / (timeWindow / 60000); // MB per minute
    
    if (growthRate > 10) { // 10MB per minute growth
      logger.warn('Potential memory leak detected', {
        growthRate: `${growthRate.toFixed(2)} MB/min`,
        currentHeapUsed: `${(recent[recent.length - 1].heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapGrowth: `${(heapGrowth / 1024 / 1024).toFixed(2)} MB`
      });

      // Trigger memory cleanup
      this.performMemoryCleanup();
    }
  }

  /**
   * Setup common memory leak detectors
   */
  setupCommonLeakDetectors() {
    // Monitor MongoDB connection leaks
    this.memoryLeakDetectors.set('mongodb_connections', () => {
      const stats = mongoose.connection.db?.serverConfig?.s?.pool?.stats;
      if (stats && stats.poolSize > 50) {
        logger.warn('High MongoDB connection pool size detected', stats);
      }
    });

    // Monitor event listener leaks
    this.memoryLeakDetectors.set('event_listeners', () => {
      const maxListeners = process.getMaxListeners();
      const eventNames = process.eventNames();
      
      eventNames.forEach(eventName => {
        const listenerCount = process.listenerCount(eventName);
        if (listenerCount > maxListeners) {
          logger.warn(`High event listener count for ${eventName}: ${listenerCount}`);
        }
      });
    });

    // Monitor setTimeout/setInterval leaks
    this.memoryLeakDetectors.set('timers', () => {
      const activeHandles = process._getActiveHandles();
      const timerCount = activeHandles.filter(handle => 
        handle.constructor.name === 'Timeout' || handle.constructor.name === 'Immediate'
      ).length;
      
      if (timerCount > 100) {
        logger.warn(`High number of active timers: ${timerCount}`);
      }
    });
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    try {
      // Clear expired cache entries
      if (CachingService.isInitialized) {
        CachingService.cleanupMemoryCache();
      }

      // Clear old slow query records
      this.cleanupSlowQueries();

      // Clear old memory usage history
      if (this.memoryUsageHistory.length > 50) {
        this.memoryUsageHistory = this.memoryUsageHistory.slice(-50);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.debug('Forced garbage collection performed');
      }

      // Run leak detectors
      this.memoryLeakDetectors.forEach((detector, name) => {
        try {
          detector();
        } catch (error) {
          logger.error(`Memory leak detector ${name} failed:`, error);
        }
      });

    } catch (error) {
      logger.error('Memory cleanup failed:', error);
    }
  }

  /**
   * Clean up old slow query records
   */
  cleanupSlowQueries() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, queryInfo] of this.slowQueries.entries()) {
      if (queryInfo.lastOccurrence.getTime() < cutoffTime) {
        this.slowQueries.delete(key);
      }
    }
  }

  /**
   * Setup connection pool optimization
   */
  setupConnectionPoolOptimization() {
    // Monitor MongoDB connection pool
    if (mongoose.connection.readyState === 1) {
      this.optimizeConnectionPool();
    } else {
      mongoose.connection.once('open', () => {
        this.optimizeConnectionPool();
      });
    }
  }

  /**
   * Optimize MongoDB connection pool
   */
  optimizeConnectionPool() {
    const db = mongoose.connection.db;
    
    // Monitor connection pool stats
    setInterval(() => {
      if (db?.serverConfig?.s?.pool) {
        const pool = db.serverConfig.s.pool;
        this.connectionPoolStats = {
          active: pool.totalConnectionCount - pool.availableConnectionCount,
          idle: pool.availableConnectionCount,
          total: pool.totalConnectionCount,
          maxPoolSize: pool.options.maxPoolSize
        };

        // Log warning if pool utilization is high
        const utilization = (this.connectionPoolStats.active / this.connectionPoolStats.total) * 100;
        if (utilization > 80) {
          logger.warn('High connection pool utilization', {
            utilization: `${utilization.toFixed(2)}%`,
            stats: this.connectionPoolStats
          });
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Setup pagination helpers
   */
  setupPaginationHelpers() {
    // Add pagination plugin to mongoose
    mongoose.plugin(this.paginationPlugin);
  }

  /**
   * Mongoose pagination plugin
   */
  paginationPlugin(schema) {
    schema.statics.paginate = async function(filter = {}, options = {}) {
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        populate = null,
        select = null,
        lean = true
      } = options;

      const offset = (page - 1) * limit;

      // Validate limits to prevent memory issues
      const maxLimit = 1000;
      const actualLimit = Math.min(limit, maxLimit);

      try {
        // Count total documents
        const total = await this.countDocuments(filter);
        
        // Build query
        let query = this.find(filter)
          .sort(sort)
          .skip(offset)
          .limit(actualLimit);

        if (lean) query = query.lean();
        if (select) query = query.select(select);
        if (populate) query = query.populate(populate);

        // Execute query
        const docs = await query.exec();

        // Calculate pagination info
        const totalPages = Math.ceil(total / actualLimit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
          docs,
          total,
          limit: actualLimit,
          page,
          pages: totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
          offset
        };

      } catch (error) {
        logger.error('Pagination error:', error);
        throw error;
      }
    };

    // Cursor-based pagination for large datasets
    schema.statics.paginateCursor = async function(filter = {}, options = {}) {
      const {
        limit = 20,
        cursor = null,
        sort = { _id: 1 },
        populate = null,
        select = null,
        lean = true
      } = options;

      const actualLimit = Math.min(limit, 1000);
      
      try {
        // Add cursor filter
        const cursorFilter = { ...filter };
        if (cursor) {
          const sortField = Object.keys(sort)[0];
          const sortDirection = sort[sortField];
          
          cursorFilter[sortField] = sortDirection === 1 
            ? { $gt: cursor }
            : { $lt: cursor };
        }

        // Build query
        let query = this.find(cursorFilter)
          .sort(sort)
          .limit(actualLimit + 1); // Get one extra to check if there's a next page

        if (lean) query = query.lean();
        if (select) query = query.select(select);
        if (populate) query = query.populate(populate);

        // Execute query
        const docs = await query.exec();
        
        // Check if there's a next page
        const hasNextPage = docs.length > actualLimit;
        if (hasNextPage) docs.pop(); // Remove the extra document

        // Get next cursor
        const nextCursor = docs.length > 0 && hasNextPage 
          ? docs[docs.length - 1][Object.keys(sort)[0]]
          : null;

        return {
          docs,
          hasNextPage,
          nextCursor,
          limit: actualLimit
        };

      } catch (error) {
        logger.error('Cursor pagination error:', error);
        throw error;
      }
    };
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;

    // Monitor overall system performance
    setInterval(() => {
      this.monitorSystemPerformance();
    }, 60000); // Every minute

    logger.info('Performance monitoring started');
  }

  /**
   * Monitor system performance metrics
   */
  monitorSystemPerformance() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      // Log performance metrics
      logger.debug('System performance metrics', {
        memory: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: `${(uptime / 3600).toFixed(2)} hours`,
        connectionPool: this.connectionPoolStats
      });

    } catch (error) {
      logger.error('Performance monitoring error:', error);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const memUsage = process.memoryUsage();
    const recentMemory = this.memoryUsageHistory.slice(-10);
    
    return {
      memory: {
        current: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        },
        trend: recentMemory.length > 1 ? {
          heapGrowth: recentMemory[recentMemory.length - 1].heapUsed - recentMemory[0].heapUsed,
          timeWindow: recentMemory[recentMemory.length - 1].timestamp - recentMemory[0].timestamp
        } : null
      },
      queries: {
        slowQueryCount: this.slowQueries.size,
        slowQueries: Array.from(this.slowQueries.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) // Top 10 slow queries
      },
      connections: this.connectionPoolStats,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      loadAverage: os.loadavg(),
      timestamp: new Date()
    };
  }

  /**
   * Optimize specific query
   */
  async optimizeQuery(collection, query, options = {}) {
    try {
      const db = mongoose.connection.db;
      const coll = db.collection(collection);
      
      // Explain query to get execution stats
      const explanation = await coll.find(query).explain('executionStats');
      
      const suggestions = [];
      
      // Check if query is using indexes
      if (explanation.executionStats.executionSuccess) {
        const stage = explanation.executionStats.executionStages;
        
        if (stage.stage === 'COLLSCAN') {
          suggestions.push({
            type: 'index_needed',
            message: 'Query is performing collection scan. Consider adding index.',
            suggestedIndex: this.analyzeQueryForIndexes(query)
          });
        }
        
        if (stage.docsExamined > stage.docsReturned * 10) {
          suggestions.push({
            type: 'inefficient_query',
            message: 'Query examines too many documents relative to results.',
            docsExamined: stage.docsExamined,
            docsReturned: stage.docsReturned
          });
        }
      }
      
      return {
        executionStats: explanation.executionStats,
        suggestions
      };
      
    } catch (error) {
      logger.error('Query optimization failed:', error);
      return null;
    }
  }

  /**
   * Fix common performance issues
   */
  async fixPerformanceIssues() {
    const fixes = [];
    
    try {
      // Fix 1: Add missing indexes for slow queries
      for (const [key, queryInfo] of this.slowQueries.entries()) {
        if (queryInfo.count >= 3) {
          await this.autoOptimizeQuery(queryInfo);
          fixes.push(`Added indexes for slow query in ${queryInfo.collection}`);
        }
      }
      
      // Fix 2: Clean up memory
      this.performMemoryCleanup();
      fixes.push('Performed memory cleanup');
      
      // Fix 3: Optimize connection pool if needed
      if (this.connectionPoolStats.active / this.connectionPoolStats.total > 0.8) {
        // Could implement dynamic connection pool adjustment here
        fixes.push('Connection pool optimization recommended');
      }
      
      return fixes;
      
    } catch (error) {
      logger.error('Performance fixes failed:', error);
      return ['Performance fixes failed: ' + error.message];
    }
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    logger.info('Performance monitoring stopped');
  }
}

module.exports = new PerformanceOptimizationService();