// backend/src/core/database/DatabaseManager.js
const mongoose = require('mongoose');
const { createPool } = require('mongodb');
const logger = require('../../utils/logger');

/**
 * Enhanced Database Manager with Tenant Isolation and Performance Optimization
 * Supports both MongoDB and connection pooling with tenant-specific databases
 */
class DatabaseManager {
  constructor() {
    this.connections = new Map(); // tenantId -> connection
    this.mainConnection = null;
    this.connectionPool = null;
    this.isInitialized = false;
    this.config = {
      main: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange_platform',
        options: {
          maxPoolSize: parseInt(process.env.DB_MAX_CONNECTIONS) || 100,
          minPoolSize: parseInt(process.env.DB_MIN_CONNECTIONS) || 10,
          maxIdleTimeMS: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
          serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
          socketTimeoutMS: 45000,
          bufferMaxEntries: 0,
          bufferCommands: false,
          retryWrites: true,
          writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 10000
          }
        }
      }
    };
  }

  /**
   * Initialize database connections with tenant isolation
   */
  async initialize() {
    try {
      // Initialize main database connection
      await this.initializeMainConnection();
      
      // Initialize connection pool for performance
      await this.initializeConnectionPool();
      
      // Setup database indexes and optimizations
      await this.setupDatabaseOptimizations();
      
      this.isInitialized = true;
      logger.info('Database Manager initialized successfully');
      
    } catch (error) {
      logger.error('Database Manager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize main database connection
   */
  async initializeMainConnection() {
    try {
      this.mainConnection = await mongoose.connect(this.config.main.uri, this.config.main.options);
      
      // Test connection
      await mongoose.connection.db.admin().ping();
      logger.info('Main database connection established');
      
      // Setup connection event handlers
      this.setupConnectionHandlers(mongoose.connection, 'main');
      
    } catch (error) {
      logger.error('Failed to initialize main database connection:', error);
      throw error;
    }
  }

  /**
   * Initialize connection pool for high performance
   */
  async initializeConnectionPool() {
    try {
      this.connectionPool = createPool(this.config.main.uri, {
        maxPoolSize: this.config.main.options.maxPoolSize,
        minPoolSize: this.config.main.options.minPoolSize,
        maxIdleTimeMS: this.config.main.options.maxIdleTimeMS,
        serverSelectionTimeoutMS: this.config.main.options.serverSelectionTimeoutMS
      });
      
      logger.info('Connection pool initialized');
    } catch (error) {
      logger.error('Failed to initialize connection pool:', error);
      throw error;
    }
  }

  /**
   * Setup database optimizations and indexes
   */
  async setupDatabaseOptimizations() {
    try {
      const db = mongoose.connection.db;
      
      // Create tenant-specific indexes
      await this.createTenantIndexes(db);
      
      // Create performance indexes
      await this.createPerformanceIndexes(db);
      
      // Create security indexes
      await this.createSecurityIndexes(db);
      
      logger.info('Database optimizations completed');
    } catch (error) {
      logger.error('Failed to setup database optimizations:', error);
    }
  }

  /**
   * Create tenant-specific indexes for isolation and performance
   */
  async createTenantIndexes(db) {
    const collections = [
      'users', 'customers', 'transactions', 'accounts', 'branches',
      'p2porders', 'payments', 'remittances', 'auditlogs'
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        
        // Tenant isolation index
        await collection.createIndex({ tenantId: 1 }, { 
          background: true,
          name: `idx_${collectionName}_tenant`
        });
        
        // Tenant + timestamp index for queries
        await collection.createIndex({ tenantId: 1, createdAt: -1 }, { 
          background: true,
          name: `idx_${collectionName}_tenant_created`
        });
        
        // Tenant + status index
        await collection.createIndex({ tenantId: 1, status: 1 }, { 
          background: true,
          name: `idx_${collectionName}_tenant_status`
        });
        
        logger.info(`Created tenant indexes for ${collectionName}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.error(`Failed to create tenant indexes for ${collectionName}:`, error);
        }
      }
    }
  }

  /**
   * Create performance indexes
   */
  async createPerformanceIndexes(db) {
    const performanceIndexes = [
      // Users performance indexes
      {
        collection: 'users',
        indexes: [
          { email: 1, tenantId: 1 },
          { phone: 1, tenantId: 1 },
          { tenantId: 1, role: 1, status: 1 }
        ]
      },
      
      // Transactions performance indexes
      {
        collection: 'transactions',
        indexes: [
          { tenantId: 1, fromAccount: 1, createdAt: -1 },
          { tenantId: 1, toAccount: 1, createdAt: -1 },
          { tenantId: 1, amount: -1, createdAt: -1 },
          { tenantId: 1, type: 1, status: 1, createdAt: -1 }
        ]
      },
      
      // Customers performance indexes
      {
        collection: 'customers',
        indexes: [
          { tenantId: 1, branchId: 1, createdAt: -1 },
          { tenantId: 1, kyc_status: 1 },
          { tenantId: 1, phone: 1 },
          { tenantId: 1, national_id: 1 }
        ]
      },
      
      // P2P Orders performance indexes
      {
        collection: 'p2porders',
        indexes: [
          { tenantId: 1, currency_pair: 1, status: 1, createdAt: -1 },
          { tenantId: 1, seller: 1, createdAt: -1 },
          { tenantId: 1, buyer: 1, createdAt: -1 },
          { tenantId: 1, price: -1, amount: -1 }
        ]
      }
    ];

    for (const { collection, indexes } of performanceIndexes) {
      for (const index of indexes) {
        try {
          await db.collection(collection).createIndex(index, { 
            background: true,
            name: `idx_${collection}_${Object.keys(index).join('_')}`
          });
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.error(`Failed to create performance index for ${collection}:`, error);
          }
        }
      }
    }
  }

  /**
   * Create security indexes
   */
  async createSecurityIndexes(db) {
    const securityIndexes = [
      // Audit logs security indexes
      {
        collection: 'auditlogs',
        indexes: [
          { tenantId: 1, action: 1, createdAt: -1 },
          { tenantId: 1, userId: 1, createdAt: -1 },
          { tenantId: 1, ipAddress: 1, createdAt: -1 }
        ]
      },
      
      // Failed attempts tracking
      {
        collection: 'failedattempts',
        indexes: [
          { ipAddress: 1, createdAt: 1 },
          { email: 1, createdAt: 1 },
          { tenantId: 1, createdAt: 1 }
        ]
      }
    ];

    for (const { collection, indexes } of securityIndexes) {
      for (const index of indexes) {
        try {
          await db.collection(collection).createIndex(index, { 
            background: true,
            name: `idx_security_${collection}_${Object.keys(index).join('_')}`
          });
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.error(`Failed to create security index for ${collection}:`, error);
          }
        }
      }
    }
  }

  /**
   * Get tenant-specific database connection
   */
  async getTenantConnection(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Return cached connection if exists
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId);
    }

    try {
      // Create tenant-specific database name
      const tenantDbName = `tenant_${tenantId}`;
      const tenantUri = this.config.main.uri.replace(/\/[^\/]*$/, `/${tenantDbName}`);
      
      // Create new connection for tenant
      const tenantConnection = await mongoose.createConnection(tenantUri, {
        ...this.config.main.options,
        maxPoolSize: 20, // Smaller pool for tenant connections
        minPoolSize: 2
      });
      
      // Setup event handlers for tenant connection
      this.setupConnectionHandlers(tenantConnection, tenantId);
      
      // Cache connection
      this.connections.set(tenantId, tenantConnection);
      
      logger.info(`Created tenant connection for: ${tenantId}`);
      return tenantConnection;
      
    } catch (error) {
      logger.error(`Failed to create tenant connection for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers(connection, identifier) {
    connection.on('connected', () => {
      logger.info(`Database connected: ${identifier}`);
    });

    connection.on('error', (error) => {
      logger.error(`Database error (${identifier}):`, error);
    });

    connection.on('disconnected', () => {
      logger.warn(`Database disconnected: ${identifier}`);
    });

    connection.on('reconnected', () => {
      logger.info(`Database reconnected: ${identifier}`);
    });
  }

  /**
   * Execute query with tenant isolation
   */
  async executeQuery(tenantId, collectionName, operation, filter = {}, options = {}) {
    try {
      // Ensure tenant filter is applied
      const tenantFilter = { ...filter, tenantId };
      
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      
      let result;
      switch (operation) {
        case 'find':
          result = await collection.find(tenantFilter, options).toArray();
          break;
        case 'findOne':
          result = await collection.findOne(tenantFilter, options);
          break;
        case 'insertOne':
          result = await collection.insertOne({ ...options.document, tenantId });
          break;
        case 'updateOne':
          result = await collection.updateOne(tenantFilter, options.update);
          break;
        case 'deleteOne':
          result = await collection.deleteOne(tenantFilter);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      // Log query for audit
      logger.debug(`Query executed: ${operation} on ${collectionName} for tenant ${tenantId}`);
      
      return result;
    } catch (error) {
      logger.error(`Query execution failed: ${operation} on ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get database health metrics
   */
  async getHealthMetrics() {
    try {
      const adminDb = mongoose.connection.db.admin();
      
      // Get server status
      const serverStatus = await adminDb.serverStatus();
      
      // Get database stats
      const dbStats = await mongoose.connection.db.stats();
      
      // Get connection pool stats
      const connectionStats = {
        current: mongoose.connection.readyState,
        total: this.connections.size + 1, // +1 for main connection
        active: Array.from(this.connections.values()).filter(conn => conn.readyState === 1).length
      };
      
      return {
        server: {
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          memory: serverStatus.mem,
          opcounters: serverStatus.opcounters
        },
        database: {
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize,
          collections: dbStats.collections,
          objects: dbStats.objects
        },
        connections: connectionStats,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to get database health metrics:', error);
      return null;
    }
  }

  /**
   * Close all database connections
   */
  async close() {
    try {
      // Close tenant connections
      for (const [tenantId, connection] of this.connections) {
        await connection.close();
        logger.info(`Closed tenant connection: ${tenantId}`);
      }
      this.connections.clear();
      
      // Close main connection
      if (this.mainConnection) {
        await mongoose.connection.close();
        logger.info('Closed main database connection');
      }
      
      // Close connection pool
      if (this.connectionPool) {
        await this.connectionPool.close();
        logger.info('Closed connection pool');
      }
      
      this.isInitialized = false;
      logger.info('Database Manager closed successfully');
      
    } catch (error) {
      logger.error('Error closing Database Manager:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();