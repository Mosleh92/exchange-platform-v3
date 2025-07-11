const db = require('../config/database');
const logger = require('../utils/logger');
const Redis = require('ioredis');

/**
 * Database Optimization Service
 * Handles query optimization, transaction management, and performance improvements
 */
class DatabaseOptimizationService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.queryCache = new Map();
    this.connectionPool = null;
    this.initializeOptimizations();
  }

  /**
   * Initialize database optimizations
   */
  initializeOptimizations() {
    this.setupConnectionPool();
    this.createIndexes();
    this.setupQueryCache();
    this.initializeTransactionManager();
  }

  /**
   * Setup connection pool with optimization
   */
  setupConnectionPool() {
    const poolConfig = {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    };

    // Apply pool configuration
    db.pool = db.pool || {};
    Object.assign(db.pool, poolConfig);
  }

  /**
   * Create database indexes for performance
   */
  async createIndexes() {
    try {
      const indexes = [
        // User indexes
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
        
        // Transaction indexes
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)',
        
        // Order indexes
        'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol)',
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
        
        // Account indexes
        'CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency)',
        
        // Composite indexes for common queries
        'CREATE INDEX IF NOT EXISTS idx_transactions_user_tenant ON transactions(user_id, tenant_id)',
        'CREATE INDEX IF NOT EXISTS idx_transactions_tenant_status ON transactions(tenant_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_orders_user_symbol ON orders(user_id, symbol)',
        'CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status)'
      ];

      for (const indexQuery of indexes) {
        await db.query(indexQuery);
      }

      logger.info('Database indexes created successfully');

    } catch (error) {
      logger.error('Failed to create database indexes:', error);
    }
  }

  /**
   * Setup query cache
   */
  setupQueryCache() {
    this.cacheConfig = {
      defaultTTL: 300, // 5 minutes
      maxSize: 1000,
      compression: true
    };
  }

  /**
   * Initialize transaction manager
   */
  initializeTransactionManager() {
    this.activeTransactions = new Map();
    this.transactionTimeout = 30000; // 30 seconds
  }

  /**
   * Execute query with optimization
   */
  async executeQuery(query, params = [], options = {}) {
    const {
      useCache = false,
      cacheTTL = this.cacheConfig.defaultTTL,
      transaction = null,
      timeout = 10000
    } = options;

    try {
      // Check cache first
      if (useCache) {
        const cachedResult = await this.getCachedQuery(query, params);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // Execute query with timeout
      const queryPromise = transaction ? 
        transaction.query(query, params) : 
        db.query(query, params);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);

      // Cache result if requested
      if (useCache && result) {
        await this.cacheQuery(query, params, result, cacheTTL);
      }

      return result;

    } catch (error) {
      logger.error('Query execution failed:', {
        query: query.substring(0, 100) + '...',
        params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute transaction with proper management
   */
  async executeTransaction(callback, options = {}) {
    const {
      timeout = this.transactionTimeout,
      isolationLevel = 'READ_COMMITTED'
    } = options;

    const client = await db.connect();
    const transactionId = this.generateTransactionId();

    try {
      // Set transaction isolation level
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      
      // Begin transaction
      await client.query('BEGIN');

      // Store active transaction
      this.activeTransactions.set(transactionId, {
        client,
        startTime: Date.now(),
        queries: []
      });

      // Execute callback with transaction client
      const result = await callback(client);

      // Commit transaction
      await client.query('COMMIT');

      // Remove from active transactions
      this.activeTransactions.delete(transactionId);

      logger.info('Transaction completed successfully', { transactionId });

      return result;

    } catch (error) {
      // Rollback transaction
      await client.query('ROLLBACK');

      // Remove from active transactions
      this.activeTransactions.delete(transactionId);

      logger.error('Transaction failed:', {
        transactionId,
        error: error.message
      });

      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Optimize N+1 queries with batch loading
   */
  async batchLoadUsers(userIds, tenantId) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const query = `
      SELECT id, email, first_name, last_name, status, created_at
      FROM users 
      WHERE id = ANY($1) AND tenant_id = $2
    `;

    const result = await this.executeQuery(query, [userIds, tenantId], {
      useCache: true,
      cacheTTL: 600 // 10 minutes
    });

    return result.rows;
  }

  /**
   * Optimize N+1 queries with batch loading for transactions
   */
  async batchLoadTransactions(transactionIds, tenantId) {
    if (!transactionIds || transactionIds.length === 0) {
      return [];
    }

    const query = `
      SELECT 
        t.id, t.amount, t.currency, t.type, t.status, t.created_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ANY($1) AND t.tenant_id = $2
    `;

    const result = await this.executeQuery(query, [transactionIds, tenantId], {
      useCache: true,
      cacheTTL: 300 // 5 minutes
    });

    return result.rows;
  }

  /**
   * Optimize pagination queries
   */
  async paginatedQuery(baseQuery, params, page = 1, limit = 20, options = {}) {
    const offset = (page - 1) * limit;
    
    // Add pagination to query
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const paginatedParams = [...params, limit, offset];

    // Execute query with pagination
    const result = await this.executeQuery(paginatedQuery, paginatedParams, options);

    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as subquery`;
    const countResult = await this.executeQuery(countQuery, params, options);
    const total = parseInt(countResult.rows[0]?.total) || 0;

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Optimize complex joins with materialized views
   */
  async createMaterializedViews() {
    try {
      const views = [
        // User transaction summary view
        `CREATE MATERIALIZED VIEW IF NOT EXISTS user_transaction_summary AS
         SELECT 
           u.id as user_id,
           u.email,
           u.first_name,
           u.last_name,
           COUNT(t.id) as total_transactions,
           SUM(CASE WHEN t.type = 'BUY' THEN t.amount ELSE 0 END) as total_buy,
           SUM(CASE WHEN t.type = 'SELL' THEN t.amount ELSE 0 END) as total_sell,
           MAX(t.created_at) as last_transaction_date
         FROM users u
         LEFT JOIN transactions t ON u.id = t.user_id
         GROUP BY u.id, u.email, u.first_name, u.last_name`,

        // Tenant transaction summary view
        `CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_transaction_summary AS
         SELECT 
           tenant_id,
           COUNT(id) as total_transactions,
           SUM(amount) as total_volume,
           AVG(amount) as average_transaction,
           COUNT(DISTINCT user_id) as active_users,
           MAX(created_at) as last_activity
         FROM transactions
         GROUP BY tenant_id`
      ];

      for (const viewQuery of views) {
        await db.query(viewQuery);
      }

      logger.info('Materialized views created successfully');

    } catch (error) {
      logger.error('Failed to create materialized views:', error);
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshMaterializedViews() {
    try {
      const views = [
        'REFRESH MATERIALIZED VIEW user_transaction_summary',
        'REFRESH MATERIALIZED VIEW tenant_transaction_summary'
      ];

      for (const refreshQuery of views) {
        await db.query(refreshQuery);
      }

      logger.info('Materialized views refreshed successfully');

    } catch (error) {
      logger.error('Failed to refresh materialized views:', error);
    }
  }

  /**
   * Optimize query with query plan analysis
   */
  async analyzeQueryPlan(query, params = []) {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await db.query(explainQuery, params);
      
      const plan = result.rows[0]['QUERY PLAN'];
      
      // Analyze query plan for optimization opportunities
      const analysis = this.analyzeQueryPlanPerformance(plan);
      
      logger.info('Query plan analysis:', {
        query: query.substring(0, 100) + '...',
        analysis
      });

      return analysis;

    } catch (error) {
      logger.error('Query plan analysis failed:', error);
      return null;
    }
  }

  /**
   * Analyze query plan performance
   */
  analyzeQueryPlanPerformance(plan) {
    const analysis = {
      totalCost: 0,
      totalTime: 0,
      nodeCount: 0,
      recommendations: []
    };

    try {
      const planData = JSON.parse(plan);
      
      this.analyzePlanNode(planData[0], analysis);

      // Generate recommendations
      if (analysis.totalCost > 1000) {
        analysis.recommendations.push('Consider adding indexes');
      }

      if (analysis.totalTime > 100) {
        analysis.recommendations.push('Query is slow, consider optimization');
      }

      if (analysis.nodeCount > 10) {
        analysis.recommendations.push('Query is complex, consider simplification');
      }

    } catch (error) {
      logger.error('Failed to analyze query plan:', error);
    }

    return analysis;
  }

  /**
   * Analyze individual plan node
   */
  analyzePlanNode(node, analysis) {
    analysis.nodeCount++;
    analysis.totalCost += parseFloat(node['Total Cost'] || 0);
    analysis.totalTime += parseFloat(node['Actual Total Time'] || 0);

    if (node.Plans) {
      for (const childNode of node.Plans) {
        this.analyzePlanNode(childNode, analysis);
      }
    }
  }

  /**
   * Cache query result
   */
  async cacheQuery(query, params, result, ttl) {
    try {
      const cacheKey = this.generateCacheKey(query, params);
      const cacheData = {
        result,
        timestamp: Date.now(),
        ttl
      };

      await this.redis.setex(cacheKey, ttl, JSON.stringify(cacheData));
      
      // Store in local cache for faster access
      this.queryCache.set(cacheKey, cacheData);

    } catch (error) {
      logger.error('Failed to cache query:', error);
    }
  }

  /**
   * Get cached query result
   */
  async getCachedQuery(query, params) {
    try {
      const cacheKey = this.generateCacheKey(query, params);
      
      // Check local cache first
      const localCache = this.queryCache.get(cacheKey);
      if (localCache && (Date.now() - localCache.timestamp) < localCache.ttl * 1000) {
        return localCache.result;
      }

      // Check Redis cache
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.queryCache.set(cacheKey, parsed);
        return parsed.result;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get cached query:', error);
      return null;
    }
  }

  /**
   * Clear query cache
   */
  async clearQueryCache(pattern = '*') {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Clear local cache
      this.queryCache.clear();

      logger.info('Query cache cleared successfully');

    } catch (error) {
      logger.error('Failed to clear query cache:', error);
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(query, params) {
    const queryHash = require('crypto').createHash('md5').update(query).digest('hex');
    const paramsHash = require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `query:${queryHash}:${paramsHash}`;
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId() {
    return require('crypto').randomBytes(16).toString('hex');
  }

  /**
   * Monitor database performance
   */
  async monitorDatabasePerformance() {
    try {
      const metrics = {
        activeConnections: await this.getActiveConnections(),
        slowQueries: await this.getSlowQueries(),
        cacheHitRate: await this.getCacheHitRate(),
        indexUsage: await this.getIndexUsage()
      };

      // Emit metrics for monitoring
      if (global.monitoringService) {
        global.monitoringService.emit('databaseMetrics', metrics);
      }

      return metrics;

    } catch (error) {
      logger.error('Failed to monitor database performance:', error);
      return null;
    }
  }

  /**
   * Get active connections
   */
  async getActiveConnections() {
    try {
      const result = await db.query(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      return parseInt(result.rows[0]?.active_connections) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries() {
    try {
      const result = await db.query(`
        SELECT query, mean_time, calls
        FROM pg_stat_statements 
        WHERE mean_time > 1000
        ORDER BY mean_time DESC 
        LIMIT 10
      `);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate() {
    try {
      const result = await db.query(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
        FROM pg_statio_user_tables
      `);
      return parseFloat(result.rows[0]?.cache_hit_ratio) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage() {
    try {
      const result = await db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC 
        LIMIT 20
      `);
      return result.rows;
    } catch (error) {
      return [];
    }
  }
}

module.exports = new DatabaseOptimizationService(); 