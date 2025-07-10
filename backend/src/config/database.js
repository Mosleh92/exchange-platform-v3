// src/config/database.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

/**
 * Advanced database configuration with performance optimizations
 */
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection with advanced configuration
   */
  async initialize() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'exchange_platform',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        
        // Connection pool optimization
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
        
        // SSL configuration for production
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : false,
        
        // Statement timeout
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
        
        // Query timeout
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isInitialized = true;
      logger.info('Database connection established successfully');

      // Initialize performance optimizations
      await this.initializePerformanceOptimizations();

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database performance optimizations
   */
  async initializePerformanceOptimizations() {
    try {
      const client = await this.pool.connect();
      
      // Create partial indexes for frequently queried data
      await this.createPartialIndexes(client);
      
      // Create composite indexes for multi-column queries
      await this.createCompositeIndexes(client);
      
      // Create tenant-specific indexes
      await this.createTenantIndexes(client);
      
      // Optimize table statistics
      await this.optimizeTableStatistics(client);
      
      client.release();
      logger.info('Database performance optimizations completed');

    } catch (error) {
      logger.error('Failed to initialize performance optimizations:', error);
    }
  }

  /**
   * Create partial indexes for better query performance
   */
  async createPartialIndexes(client) {
    const partialIndexes = [
      // Pending transactions index (reduces index size by ~40%)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending 
       ON transactions (tenant_id, created_at) 
       WHERE status = 'PENDING'`,
      
      // Active users index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
       ON users (tenant_id, last_login_at) 
       WHERE status = 'ACTIVE'`,
      
      // Recent transactions index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_recent 
       ON transactions (tenant_id, created_at) 
       WHERE created_at > NOW() - INTERVAL '30 days'`,
      
      // Failed transactions index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_failed 
       ON transactions (tenant_id, error_code) 
       WHERE status = 'FAILED'`,
      
      // High-value transactions index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_high_value 
       ON transactions (tenant_id, amount) 
       WHERE amount > 10000`,
      
      // P2P pending orders index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_p2p_orders_pending 
       ON p2p_orders (tenant_id, created_at) 
       WHERE status = 'PENDING'`,
      
      // Remittance pending index
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remittances_pending 
       ON remittances (tenant_id, created_at) 
       WHERE status = 'PENDING'`
    ];

    for (const indexQuery of partialIndexes) {
      try {
        await client.query(indexQuery);
        logger.info(`Created partial index: ${indexQuery.split(' ')[2]}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.error(`Failed to create partial index: ${error.message}`);
        }
      }
    }
  }

  /**
   * Create composite indexes for multi-column queries
   */
  async createCompositeIndexes(client) {
    const compositeIndexes = [
      // Transaction search optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_search 
       ON transactions (tenant_id, status, created_at DESC)`,
      
      // User search optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search 
       ON users (tenant_id, email, status)`,
      
      // P2P order search optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_p2p_orders_search 
       ON p2p_orders (tenant_id, currency_pair, status, created_at DESC)`,
      
      // Audit log search optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_search 
       ON audit_logs (tenant_id, action, created_at DESC)`,
      
      // Financial report optimization
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_reports_search 
       ON financial_reports (tenant_id, report_type, period_start, period_end)`
    ];

    for (const indexQuery of compositeIndexes) {
      try {
        await client.query(indexQuery);
        logger.info(`Created composite index: ${indexQuery.split(' ')[2]}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.error(`Failed to create composite index: ${error.message}`);
        }
      }
    }
  }

  /**
   * Create tenant-specific indexes for multi-tenancy
   */
  async createTenantIndexes(client) {
    const tenantIndexes = [
      // Tenant isolation indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_transactions 
       ON transactions (tenant_id) WHERE tenant_id IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users 
       ON users (tenant_id) WHERE tenant_id IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_accounts 
       ON accounts (tenant_id) WHERE tenant_id IS NOT NULL`,
      
      // Tenant hierarchy indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_hierarchy 
       ON tenants (parent_id, id) WHERE parent_id IS NOT NULL`,
      
      // Tenant settings indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings 
       ON tenant_settings (tenant_id, setting_key)`
    ];

    for (const indexQuery of tenantIndexes) {
      try {
        await client.query(indexQuery);
        logger.info(`Created tenant index: ${indexQuery.split(' ')[2]}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.error(`Failed to create tenant index: ${error.message}`);
        }
      }
    }
  }

  /**
   * Optimize table statistics for better query planning
   */
  async optimizeTableStatistics(client) {
    const tables = [
      'transactions', 'users', 'accounts', 'p2p_orders', 
      'remittances', 'audit_logs', 'financial_reports', 'tenants'
    ];

    for (const table of tables) {
      try {
        await client.query(`ANALYZE ${table}`);
        logger.info(`Analyzed table statistics for: ${table}`);
      } catch (error) {
        logger.error(`Failed to analyze table ${table}: ${error.message}`);
      }
    }
  }

  /**
   * Get database connection pool
   */
  getPool() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.pool;
  }

  /**
   * Execute query with performance monitoring
   */
  async query(text, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn(`Slow query detected (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed (${duration}ms): ${error.message}`, {
        query: text.substring(0, 200),
        params: params.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const client = await this.pool.connect();
      
      const metrics = await client.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `);
      
      client.release();
      return metrics.rows;
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connections closed');
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;
