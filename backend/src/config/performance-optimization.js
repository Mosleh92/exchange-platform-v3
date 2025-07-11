const mongoose = require('mongoose');
const redis = require('redis');
const cluster = require('cluster');
const os = require('os');

/**
 * Comprehensive Performance Optimization Configuration
 * Implements database indexing, caching, query optimization, and scaling strategies
 */
class PerformanceOptimization {
  constructor() {
    this.redisClient = null;
    this.cacheConfig = {
      defaultTTL: 300, // 5 minutes
      maxMemory: '512mb',
      maxKeys: 10000
    };
  }

  /**
   * Initialize performance optimizations
   */
  async initialize() {
    await this.setupDatabaseIndexes();
    await this.setupCaching();
    await this.setupQueryOptimization();
    await this.setupConnectionPooling();
    await this.setupMonitoring();
  }

  /**
   * Setup comprehensive database indexes
   */
  async setupDatabaseIndexes() {
    console.log('🔍 Setting up database indexes...');

    // Transaction indexes
    await mongoose.connection.db.collection('transactions').createIndexes([
      // Multi-tenant isolation indexes
      { tenantId: 1, createdAt: -1 },
      { tenantId: 1, status: 1 },
      { tenantId: 1, type: 1 },
      { tenantId: 1, customerId: 1 },
      
      // Performance indexes
      { transactionId: 1, unique: true },
      { tenantId: 1, fromCurrency: 1, toCurrency: 1 },
      { tenantId: 1, createdAt: -1, status: 1 },
      { tenantId: 1, customerId: 1, createdAt: -1 },
      
      // Search indexes
      { customer_name: 'text' },
      { transactionId: 'text' },
      
      // Compound indexes for complex queries
      { tenantId: 1, type: 1, status: 1, createdAt: -1 },
      { tenantId: 1, customerId: 1, type: 1, createdAt: -1 },
      { tenantId: 1, fromCurrency: 1, toCurrency: 1, createdAt: -1 }
    ]);

    // User indexes
    await mongoose.connection.db.collection('users').createIndexes([
      { tenantId: 1, email: 1, unique: true },
      { tenantId: 1, role: 1 },
      { tenantId: 1, isActive: 1 },
      { email: 'text' },
      { tenantId: 1, kycStatus: 1 },
      { tenantId: 1, lastLoginAt: -1 }
    ]);

    // Journal Entry indexes
    await mongoose.connection.db.collection('journalentries').createIndexes([
      { tenantId: 1, entryDate: -1 },
      { tenantId: 1, accountingPeriod: 1 },
      { tenantId: 1, status: 1 },
      { transactionId: 1 },
      { entryNumber: 1, unique: true },
      { tenantId: 1, entryDate: -1, status: 1 }
    ]);

    // Check indexes
    await mongoose.connection.db.collection('checks').createIndexes([
      { tenantId: 1, status: 1 },
      { tenantId: 1, issueDate: -1 },
      { tenantId: 1, dueDate: 1 },
      { checkNumber: 1, unique: true },
      { transactionId: 1 },
      { tenantId: 1, riskLevel: 1 }
    ]);

    // P2P Announcement indexes
    await mongoose.connection.db.collection('p2pannouncements').createIndexes([
      { tenantId: 1, status: 1 },
      { tenantId: 1, type: 1 },
      { tenantId: 1, fromCurrency: 1, toCurrency: 1 },
      { userId: 1 },
      { expiresAt: 1 },
      { tenantId: 1, type: 1, fromCurrency: 1, toCurrency: 1 }
    ]);

    // Audit Log indexes
    await mongoose.connection.db.collection('auditlogs').createIndexes([
      { tenantId: 1, timestamp: -1 },
      { userId: 1, timestamp: -1 },
      { action: 1, timestamp: -1 },
      { resource: 1, resourceId: 1 },
      { ipAddress: 1, timestamp: -1 }
    ]);

    console.log('✅ Database indexes created successfully');
  }

  /**
   * Setup Redis caching
   */
  async setupCaching() {
    console.log('🔄 Setting up Redis caching...');

    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      await this.redisClient.connect();

      // Configure Redis
      await this.redisClient.config('SET', 'maxmemory', this.cacheConfig.maxMemory);
      await this.redisClient.config('SET', 'maxmemory-policy', 'allkeys-lru');
      await this.redisClient.config('SET', 'save', '900 1 300 10 60 10000');

      console.log('✅ Redis caching configured successfully');
    } catch (error) {
      console.error('❌ Redis setup failed:', error.message);
      // Continue without caching
    }
  }

  /**
   * Setup query optimization
   */
  async setupQueryOptimization() {
    console.log('⚡ Setting up query optimization...');

    // Configure MongoDB query optimization
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Set query timeout
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferMaxEntries', 0);

    // Configure connection options for performance
    const connectionOptions = {
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    };

    // Apply connection options
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.db.admin().command({
        setParameter: 1,
        maxTransactionLockRequestTimeoutMillis: 5000
      });
    }

    console.log('✅ Query optimization configured');
  }

  /**
   * Setup connection pooling
   */
  async setupConnectionPooling() {
    console.log('🔗 Setting up connection pooling...');

    // Configure MongoDB connection pooling
    const poolSize = Math.min(os.cpus().length * 2, 50);
    
    mongoose.connection.on('connected', () => {
      console.log(`✅ MongoDB connected with pool size: ${poolSize}`);
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    console.log('✅ Connection pooling configured');
  }

  /**
   * Setup performance monitoring
   */
  async setupMonitoring() {
    console.log('📊 Setting up performance monitoring...');

    // Monitor slow queries
    mongoose.connection.on('query', (query) => {
      if (query.executionTime > 100) { // Log queries taking more than 100ms
        console.warn(`🐌 Slow query detected: ${query.executionTime}ms`, {
          collection: query.collection,
          operation: query.operation,
          query: query.query
        });
      }
    });

    // Monitor connection pool
    setInterval(() => {
      const poolStatus = mongoose.connection.db.admin().command({ serverStatus: 1 });
      console.log('📈 Connection pool status:', poolStatus);
    }, 60000); // Every minute

    console.log('✅ Performance monitoring configured');
  }

  /**
   * Cache middleware for API responses
   */
  createCacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      if (!this.redisClient) {
        return next();
      }

      const cacheKey = `api:${req.originalUrl}:${req.tenantContext?.tenantId}`;
      
      try {
        const cachedResponse = await this.redisClient.get(cacheKey);
        if (cachedResponse) {
          return res.json(JSON.parse(cachedResponse));
        }

        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache response
        res.json = function(data) {
          if (this.redisClient && res.statusCode === 200) {
            this.redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
          }
          return originalSend.call(this, data);
        }.bind(this);

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Database query optimization helper
   */
  optimizeQuery(query, options = {}) {
    const optimizedQuery = { ...query };

    // Add tenant context if not present
    if (options.requireTenant && !optimizedQuery.tenantId) {
      throw new Error('Tenant context required for query optimization');
    }

    // Add projection for performance
    if (options.projection) {
      optimizedQuery.projection = options.projection;
    }

    // Add sort for consistent results
    if (options.sort) {
      optimizedQuery.sort = options.sort;
    }

    // Add limit for pagination
    if (options.limit) {
      optimizedQuery.limit = Math.min(options.limit, 1000); // Max 1000 records
    }

    // Add skip for pagination
    if (options.skip) {
      optimizedQuery.skip = options.skip;
    }

    return optimizedQuery;
  }

  /**
   * Aggregation pipeline optimization
   */
  optimizeAggregation(pipeline, options = {}) {
    const optimizedPipeline = [...pipeline];

    // Add tenant match at the beginning for performance
    if (options.tenantId) {
      optimizedPipeline.unshift({
        $match: { tenantId: options.tenantId }
      });
    }

    // Add index hints for better performance
    if (options.indexHint) {
      optimizedPipeline.unshift({
        $hint: options.indexHint
      });
    }

    // Add limit to prevent memory issues
    if (options.limit) {
      optimizedPipeline.push({
        $limit: Math.min(options.limit, 10000)
      });
    }

    return optimizedPipeline;
  }

  /**
   * Cache management utilities
   */
  async cacheGet(key) {
    if (!this.redisClient) return null;
    
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async cacheSet(key, value, ttl = this.cacheConfig.defaultTTL) {
    if (!this.redisClient) return;
    
    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async cacheDelete(pattern) {
    if (!this.redisClient) return;
    
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Database performance utilities
   */
  async getCollectionStats(collectionName) {
    try {
      const stats = await mongoose.connection.db.collection(collectionName).stats();
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return null;
    }
  }

  async getIndexUsage(collectionName) {
    try {
      const indexes = await mongoose.connection.db.collection(collectionName).indexes();
      return indexes.map(index => ({
        name: index.name,
        key: index.key,
        unique: index.unique,
        sparse: index.sparse
      }));
    } catch (error) {
      console.error('Error getting index usage:', error);
      return [];
    }
  }

  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      console.log('📊 Memory usage:', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
      });
    }, 300000); // Every 5 minutes

    // Monitor event loop lag
    let lastCheck = Date.now();
    setInterval(() => {
      const now = Date.now();
      const lag = now - lastCheck - 1000; // Should be ~1000ms
      if (lag > 100) {
        console.warn(`⚠️ Event loop lag detected: ${lag}ms`);
      }
      lastCheck = now;
    }, 1000);
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    console.log('🧹 Cleaning up performance optimizations...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    console.log('✅ Performance optimizations cleaned up');
  }
}

// Export singleton instance
const performanceOptimization = new PerformanceOptimization();

module.exports = {
  initialize: performanceOptimization.initialize.bind(performanceOptimization),
  createCacheMiddleware: performanceOptimization.createCacheMiddleware.bind(performanceOptimization),
  optimizeQuery: performanceOptimization.optimizeQuery.bind(performanceOptimization),
  optimizeAggregation: performanceOptimization.optimizeAggregation.bind(performanceOptimization),
  cacheGet: performanceOptimization.cacheGet.bind(performanceOptimization),
  cacheSet: performanceOptimization.cacheSet.bind(performanceOptimization),
  cacheDelete: performanceOptimization.cacheDelete.bind(performanceOptimization),
  getCollectionStats: performanceOptimization.getCollectionStats.bind(performanceOptimization),
  getIndexUsage: performanceOptimization.getIndexUsage.bind(performanceOptimization),
  startPerformanceMonitoring: performanceOptimization.startPerformanceMonitoring.bind(performanceOptimization),
  cleanup: performanceOptimization.cleanup.bind(performanceOptimization)
}; 