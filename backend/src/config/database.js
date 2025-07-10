// src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Enhanced Database Configuration
 * Includes optimized indexes for multi-tenant performance
 */
class EnhancedDatabaseConfig {
  constructor() {
    this.connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      readPreference: 'secondaryPreferred',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000
      }
    };
  }

  /**
   * Connect to database with enhanced configuration
   */
  async connect() {
    try {
      const connection = await mongoose.connect(process.env.MONGODB_URI, this.connectionOptions);
      
      logger.info('Database connected successfully', {
        host: connection.connection.host,
        port: connection.connection.port,
        database: connection.connection.name
      });

      // Set up connection event handlers
      this.setupConnectionHandlers(connection);
      
      // Create optimized indexes
      await this.createOptimizedIndexes();
      
      return connection;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers(connection) {
    connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
    });

    connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await connection.close();
      logger.info('Mongoose connection closed through app termination');
      process.exit(0);
    });
  }

  /**
   * Create optimized indexes for multi-tenant performance
   */
  async createOptimizedIndexes() {
    try {
      const db = mongoose.connection.db;
      
      // Transaction indexes
      await this.createTransactionIndexes(db);
      
      // Account indexes
      await this.createAccountIndexes(db);
      
      // User indexes
      await this.createUserIndexes(db);
      
      // P2P indexes
      await this.createP2PIndexes(db);
      
      // Audit log indexes
      await this.createAuditIndexes(db);
      
      // Tenant indexes
      await this.createTenantIndexes(db);
      
      // Payment indexes
      await this.createPaymentIndexes(db);
      
      // Remittance indexes
      await this.createRemittanceIndexes(db);
      
      logger.info('All optimized indexes created successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Create transaction indexes
   */
  async createTransactionIndexes(db) {
    const collection = db.collection('transactions');
    
    // Compound index for tenant + status queries
    await collection.createIndex(
      { tenantId: 1, status: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_tenant_status_date' }
    );

    // Compound index for user + tenant queries
    await collection.createIndex(
      { userId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_user_tenant_date' }
    );

    // Compound index for account queries
    await collection.createIndex(
      { fromAccountId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_from_account' }
    );

    await collection.createIndex(
      { toAccountId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_to_account' }
    );

    // Index for transaction type queries
    await collection.createIndex(
      { transactionType: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_type_tenant_date' }
    );

    // Index for currency queries
    await collection.createIndex(
      { currency: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_transactions_currency_tenant_date' }
    );
  }

  /**
   * Create account indexes
   */
  async createAccountIndexes(db) {
    const collection = db.collection('accounts');
    
    // Compound index for tenant + user queries
    await collection.createIndex(
      { tenantId: 1, userId: 1 },
      { background: true, name: 'idx_accounts_tenant_user', unique: true }
    );

    // Index for account type queries
    await collection.createIndex(
      { accountType: 1, tenantId: 1 },
      { background: true, name: 'idx_accounts_type_tenant' }
    );

    // Index for currency queries
    await collection.createIndex(
      { currency: 1, tenantId: 1 },
      { background: true, name: 'idx_accounts_currency_tenant' }
    );

    // Index for balance queries (for low balance alerts)
    await collection.createIndex(
      { balance: 1, tenantId: 1 },
      { background: true, name: 'idx_accounts_balance_tenant' }
    );
  }

  /**
   * Create user indexes
   */
  async createUserIndexes(db) {
    const collection = db.collection('users');
    
    // Compound index for tenant + email queries
    await collection.createIndex(
      { email: 1, tenantId: 1 },
      { background: true, name: 'idx_users_email_tenant', unique: true }
    );

    // Index for role queries
    await collection.createIndex(
      { role: 1, tenantId: 1 },
      { background: true, name: 'idx_users_role_tenant' }
    );

    // Index for status queries
    await collection.createIndex(
      { status: 1, tenantId: 1 },
      { background: true, name: 'idx_users_status_tenant' }
    );

    // Index for phone queries
    await collection.createIndex(
      { phone: 1, tenantId: 1 },
      { background: true, name: 'idx_users_phone_tenant' }
    );
  }

  /**
   * Create P2P indexes
   */
  async createP2PIndexes(db) {
    const collection = db.collection('p2pannouncements');
    
    // Compound index for tenant + status queries
    await collection.createIndex(
      { tenantId: 1, status: 1, createdAt: -1 },
      { background: true, name: 'idx_p2p_tenant_status_date' }
    );

    // Compound index for user + tenant queries
    await collection.createIndex(
      { userId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_p2p_user_tenant_date' }
    );

    // Index for currency pair queries
    await collection.createIndex(
      { fromCurrency: 1, toCurrency: 1, tenantId: 1 },
      { background: true, name: 'idx_p2p_currency_pair_tenant' }
    );

    // Index for price range queries
    await collection.createIndex(
      { minAmount: 1, maxAmount: 1, tenantId: 1 },
      { background: true, name: 'idx_p2p_amount_range_tenant' }
    );

    // Index for location queries
    await collection.createIndex(
      { location: 1, tenantId: 1 },
      { background: true, name: 'idx_p2p_location_tenant' }
    );
  }

  /**
   * Create audit log indexes
   */
  async createAuditIndexes(db) {
    const collection = db.collection('auditlogs');
    
    // Compound index for tenant + event type queries
    await collection.createIndex(
      { tenantId: 1, eventType: 1, createdAt: -1 },
      { background: true, name: 'idx_audit_tenant_event_date' }
    );

    // Compound index for user + tenant queries
    await collection.createIndex(
      { userId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_audit_user_tenant_date' }
    );

    // Index for severity queries
    await collection.createIndex(
      { severity: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_audit_severity_tenant_date' }
    );

    // Index for resource queries
    await collection.createIndex(
      { resource: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_audit_resource_tenant_date' }
    );

    // Index for action queries
    await collection.createIndex(
      { action: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_audit_action_tenant_date' }
    );
  }

  /**
   * Create tenant indexes
   */
  async createTenantIndexes(db) {
    const collection = db.collection('tenants');
    
    // Index for tenant code queries
    await collection.createIndex(
      { tenantCode: 1 },
      { background: true, name: 'idx_tenants_code', unique: true }
    );

    // Index for parent tenant queries
    await collection.createIndex(
      { parentTenantId: 1 },
      { background: true, name: 'idx_tenants_parent' }
    );

    // Index for status queries
    await collection.createIndex(
      { status: 1 },
      { background: true, name: 'idx_tenants_status' }
    );

    // Index for domain queries
    await collection.createIndex(
      { domain: 1 },
      { background: true, name: 'idx_tenants_domain' }
    );
  }

  /**
   * Create payment indexes
   */
  async createPaymentIndexes(db) {
    const collection = db.collection('payments');
    
    // Compound index for tenant + status queries
    await collection.createIndex(
      { tenantId: 1, status: 1, createdAt: -1 },
      { background: true, name: 'idx_payments_tenant_status_date' }
    );

    // Compound index for user + tenant queries
    await collection.createIndex(
      { userId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_payments_user_tenant_date' }
    );

    // Index for payment method queries
    await collection.createIndex(
      { paymentMethod: 1, tenantId: 1 },
      { background: true, name: 'idx_payments_method_tenant' }
    );

    // Index for amount range queries
    await collection.createIndex(
      { amount: 1, tenantId: 1 },
      { background: true, name: 'idx_payments_amount_tenant' }
    );
  }

  /**
   * Create remittance indexes
   */
  async createRemittanceIndexes(db) {
    const collection = db.collection('remittances');
    
    // Compound index for tenant + status queries
    await collection.createIndex(
      { tenantId: 1, status: 1, createdAt: -1 },
      { background: true, name: 'idx_remittances_tenant_status_date' }
    );

    // Compound index for user + tenant queries
    await collection.createIndex(
      { userId: 1, tenantId: 1, createdAt: -1 },
      { background: true, name: 'idx_remittances_user_tenant_date' }
    );

    // Index for partner queries
    await collection.createIndex(
      { partnerId: 1, tenantId: 1 },
      { background: true, name: 'idx_remittances_partner_tenant' }
    );

    // Index for tracking number queries
    await collection.createIndex(
      { trackingNumber: 1, tenantId: 1 },
      { background: true, name: 'idx_remittances_tracking_tenant' }
    );
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        avgObjSize: stats.avgObjSize,
        objects: stats.objects
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      const stats = await collection.stats();
      
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexes: stats.nindexes
      };
    } catch (error) {
      logger.error(`Error getting collection stats for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance(query, collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      
      // Enable query profiling
      await db.command({ profile: 2 });
      
      // Execute query with explain
      const explainResult = await collection.find(query).explain('executionStats');
      
      // Disable query profiling
      await db.command({ profile: 0 });
      
      return {
        executionTime: explainResult.executionStats.executionTimeMillis,
        documentsExamined: explainResult.executionStats.totalDocsExamined,
        documentsReturned: explainResult.executionStats.nReturned,
        indexUsage: explainResult.executionStats.executionStages
      };
    } catch (error) {
      logger.error('Error analyzing query performance:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedDatabaseConfig();
