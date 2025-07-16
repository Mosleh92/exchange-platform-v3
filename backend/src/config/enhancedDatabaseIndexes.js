const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Enhanced Database Indexing Configuration
 * Optimizes database performance for multi-tenant exchange platform
 */
class EnhancedDatabaseIndexes {
  constructor() {
    this.indexes = new Map();
  }

  /**
   * Initialize all database indexes
   */
  async initializeIndexes() {
    try {
      logger.info('Initializing database indexes...');

      await this.createUserIndexes();
      await this.createTransactionIndexes();
      await this.createAccountIndexes();
      await this.createP2PIndexes();
      await this.createTenantIndexes();
      await this.createAuditIndexes();
      await this.createExchangeRateIndexes();

      logger.info('Database indexes initialized successfully');
    } catch (error) {
      logger.error('Initialize indexes error:', error);
      throw error;
    }
  }

  /**
   * Create user-related indexes
   */
  async createUserIndexes() {
    try {
      const User = mongoose.model('User');

      // Compound index for tenant and role queries
      await User.collection.createIndex(
        { tenantId: 1, role: 1, isActive: 1 },
        { name: 'idx_users_tenant_role_active' }
      );

      // Index for email lookups
      await User.collection.createIndex(
        { email: 1 },
        { unique: true, name: 'idx_users_email_unique' }
      );

      // Index for phone number lookups
      await User.collection.createIndex(
        { phoneNumber: 1 },
        { name: 'idx_users_phone' }
      );

      // Compound index for branch and tenant
      await User.collection.createIndex(
        { branchId: 1, tenantId: 1, isActive: 1 },
        { name: 'idx_users_branch_tenant' }
      );

      // Index for last login tracking
      await User.collection.createIndex(
        { lastLoginAt: -1 },
        { name: 'idx_users_last_login' }
      );

      logger.info('User indexes created');
    } catch (error) {
      logger.error('Create user indexes error:', error);
      throw error;
    }
  }

  /**
   * Create transaction-related indexes
   */
  async createTransactionIndexes() {
    try {
      const Transaction = mongoose.model('Transaction');

      // Compound index for tenant and date range queries
      await Transaction.collection.createIndex(
        { tenantId: 1, transactionDate: -1, status: 1 },
        { name: 'idx_transactions_tenant_date_status' }
      );

      // Index for user transactions
      await Transaction.collection.createIndex(
        { userId: 1, tenantId: 1, transactionDate: -1 },
        { name: 'idx_transactions_user_tenant_date' }
      );

      // Index for transaction type queries
      await Transaction.collection.createIndex(
        { transactionType: 1, tenantId: 1, status: 1 },
        { name: 'idx_transactions_type_tenant_status' }
      );

      // Index for amount range queries
      await Transaction.collection.createIndex(
        { amount: 1, tenantId: 1 },
        { name: 'idx_transactions_amount_tenant' }
      );

      // Index for currency queries
      await Transaction.collection.createIndex(
        { currency: 1, tenantId: 1, transactionDate: -1 },
        { name: 'idx_transactions_currency_tenant_date' }
      );

      // Index for reference number lookups
      await Transaction.collection.createIndex(
        { referenceNumber: 1 },
        { unique: true, name: 'idx_transactions_reference_unique' }
      );

      logger.info('Transaction indexes created');
    } catch (error) {
      logger.error('Create transaction indexes error:', error);
      throw error;
    }
  }

  /**
   * Create account-related indexes
   */
  async createAccountIndexes() {
    try {
      const Account = mongoose.model('Account');

      // Compound index for tenant and currency
      await Account.collection.createIndex(
        { tenantId: 1, currency: 1, userId: 1 },
        { name: 'idx_accounts_tenant_currency_user' }
      );

      // Index for balance queries
      await Account.collection.createIndex(
        { balance: 1, tenantId: 1 },
        { name: 'idx_accounts_balance_tenant' }
      );

      // Index for account type queries
      await Account.collection.createIndex(
        { accountType: 1, tenantId: 1 },
        { name: 'idx_accounts_type_tenant' }
      );

      // Index for branch accounts
      await Account.collection.createIndex(
        { branchId: 1, tenantId: 1, currency: 1 },
        { name: 'idx_accounts_branch_tenant_currency' }
      );

      logger.info('Account indexes created');
    } catch (error) {
      logger.error('Create account indexes error:', error);
      throw error;
    }
  }

  /**
   * Create P2P-related indexes
   */
  async createP2PIndexes() {
    try {
      const P2PTransaction = mongoose.model('P2PTransaction');
      const P2PAnnouncement = mongoose.model('P2PAnnouncement');
      const P2PPayment = mongoose.model('P2PPayment');

      // P2P Transaction indexes
      await P2PTransaction.collection.createIndex(
        { tenantId: 1, status: 1, createdAt: -1 },
        { name: 'idx_p2p_transactions_tenant_status_date' }
      );

      await P2PTransaction.collection.createIndex(
        { sellerId: 1, buyerId: 1, tenantId: 1 },
        { name: 'idx_p2p_transactions_users_tenant' }
      );

      await P2PTransaction.collection.createIndex(
        { currency: 1, tenantId: 1, status: 1 },
        { name: 'idx_p2p_transactions_currency_tenant_status' }
      );

      // P2P Announcement indexes
      await P2PAnnouncement.collection.createIndex(
        { userId: 1, status: 1, createdAt: -1 },
        { name: 'idx_p2p_announcements_user_status_date' }
      );

      await P2PAnnouncement.collection.createIndex(
        { currency: 1, exchangeType: 1, status: 1 },
        { name: 'idx_p2p_announcements_currency_type_status' }
      );

      await P2PAnnouncement.collection.createIndex(
        { price: 1, currency: 1, status: 1 },
        { name: 'idx_p2p_announcements_price_currency_status' }
      );

      // P2P Payment indexes
      await P2PPayment.collection.createIndex(
        { p2pTransactionId: 1, status: 1 },
        { name: 'idx_p2p_payments_transaction_status' }
      );

      await P2PPayment.collection.createIndex(
        { verifiedByUserId: 1, createdAt: -1 },
        { name: 'idx_p2p_payments_verifier_date' }
      );

      logger.info('P2P indexes created');
    } catch (error) {
      logger.error('Create P2P indexes error:', error);
      throw error;
    }
  }

  /**
   * Create tenant-related indexes
   */
  async createTenantIndexes() {
    try {
      const Tenant = mongoose.model('Tenant');

      // Index for tenant hierarchy
      await Tenant.collection.createIndex(
        { parent: 1, level: 1, isActive: 1 },
        { name: 'idx_tenants_parent_level_active' }
      );

      // Index for tenant subdomain
      await Tenant.collection.createIndex(
        { subdomain: 1 },
        { unique: true, name: 'idx_tenants_subdomain_unique' }
      );

      // Index for tenant status
      await Tenant.collection.createIndex(
        { isActive: 1, level: 1 },
        { name: 'idx_tenants_active_level' }
      );

      // Index for tenant owner
      await Tenant.collection.createIndex(
        { owner: 1, isActive: 1 },
        { name: 'idx_tenants_owner_active' }
      );

      logger.info('Tenant indexes created');
    } catch (error) {
      logger.error('Create tenant indexes error:', error);
      throw error;
    }
  }

  /**
   * Create audit-related indexes
   */
  async createAuditIndexes() {
    try {
      const AuditLog = mongoose.model('AuditLog');

      // Index for audit logs by user
      await AuditLog.collection.createIndex(
        { userId: 1, tenantId: 1, createdAt: -1 },
        { name: 'idx_audit_logs_user_tenant_date' }
      );

      // Index for audit logs by action
      await AuditLog.collection.createIndex(
        { action: 1, tenantId: 1, createdAt: -1 },
        { name: 'idx_audit_logs_action_tenant_date' }
      );

      // Index for audit logs by IP
      await AuditLog.collection.createIndex(
        { ipAddress: 1, createdAt: -1 },
        { name: 'idx_audit_logs_ip_date' }
      );

      // Index for security events
      await AuditLog.collection.createIndex(
        { eventType: 1, severity: 1, createdAt: -1 },
        { name: 'idx_audit_logs_event_severity_date' }
      );

      logger.info('Audit indexes created');
    } catch (error) {
      logger.error('Create audit indexes error:', error);
      throw error;
    }
  }

  /**
   * Create exchange rate indexes
   */
  async createExchangeRateIndexes() {
    try {
      const ExchangeRate = mongoose.model('ExchangeRate');

      // Index for currency pairs
      await ExchangeRate.collection.createIndex(
        { fromCurrency: 1, toCurrency: 1, isActive: 1 },
        { name: 'idx_exchange_rates_currency_pair_active' }
      );

      // Index for rate updates
      await ExchangeRate.collection.createIndex(
        { updatedAt: -1, isActive: 1 },
        { name: 'idx_exchange_rates_update_time_active' }
      );

      // Index for provider rates
      await ExchangeRate.collection.createIndex(
        { provider: 1, fromCurrency: 1, toCurrency: 1 },
        { name: 'idx_exchange_rates_provider_currency_pair' }
      );

      logger.info('Exchange rate indexes created');
    } catch (error) {
      logger.error('Create exchange rate indexes error:', error);
      throw error;
    }
  }

  /**
   * Create accounting-related indexes
   */
  async createAccountingIndexes() {
    try {
      const AccountingEntry = mongoose.model('AccountingEntry');

      // Index for accounting entries by tenant and date
      await AccountingEntry.collection.createIndex(
        { tenantId: 1, createdAt: -1 },
        { name: 'idx_accounting_entries_tenant_date' }
      );

      // Index for accounting entries by account
      await AccountingEntry.collection.createIndex(
        { accountCode: 1, tenantId: 1, createdAt: -1 },
        { name: 'idx_accounting_entries_account_tenant_date' }
      );

      // Index for transaction entries
      await AccountingEntry.collection.createIndex(
        { transactionId: 1, tenantId: 1 },
        { name: 'idx_accounting_entries_transaction_tenant' }
      );

      // Index for entry types
      await AccountingEntry.collection.createIndex(
        { entryType: 1, tenantId: 1, createdAt: -1 },
        { name: 'idx_accounting_entries_type_tenant_date' }
      );

      logger.info('Accounting indexes created');
    } catch (error) {
      logger.error('Create accounting indexes error:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStatistics() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const stats = {};

      for (const collection of collections) {
        const collectionName = collection.name;
        const indexes = await mongoose.connection.db
          .collection(collectionName)
          .indexes();

        stats[collectionName] = {
          indexCount: indexes.length,
          indexes: indexes.map(index => ({
            name: index.name,
            keys: index.key,
            unique: index.unique || false,
            sparse: index.sparse || false
          }))
        };
      }

      return stats;
    } catch (error) {
      logger.error('Get index statistics error:', error);
      throw error;
    }
  }

  /**
   * Drop unused indexes
   */
  async dropUnusedIndexes() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      let droppedCount = 0;

      for (const collection of collections) {
        const collectionName = collection.name;
        const indexes = await mongoose.connection.db
          .collection(collectionName)
          .indexes();

        for (const index of indexes) {
          // Skip _id index and unique indexes
          if (index.name === '_id_' || index.unique) {
            continue;
          }

          // Check if index is used (this is a simplified check)
          const usageStats = await mongoose.connection.db
            .collection(collectionName)
            .aggregate([
              { $indexStats: {} }
            ]).toArray();

          const indexUsage = usageStats.find(stat => stat.name === index.name);
          if (indexUsage && indexUsage.accesses.ops === 0) {
            await mongoose.connection.db
              .collection(collectionName)
              .dropIndex(index.name);
            
            droppedCount++;
            logger.info(`Dropped unused index: ${collectionName}.${index.name}`);
          }
        }
      }

      logger.info(`Dropped ${droppedCount} unused indexes`);
      return droppedCount;
    } catch (error) {
      logger.error('Drop unused indexes error:', error);
      throw error;
    }
  }

  /**
   * Optimize indexes for specific queries
   */
  async optimizeIndexesForQueries() {
    try {
      // Add specific indexes for common query patterns
      const Transaction = mongoose.model('Transaction');

      // Index for dashboard queries
      await Transaction.collection.createIndex(
        { tenantId: 1, status: 1, transactionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        { name: 'idx_transactions_dashboard_recent' }
      );

      // Index for reporting queries
      await Transaction.collection.createIndex(
        { tenantId: 1, transactionType: 1, transactionDate: 1, amount: 1 },
        { name: 'idx_transactions_reporting' }
      );

      logger.info('Query-specific indexes created');
    } catch (error) {
      logger.error('Optimize indexes for queries error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedDatabaseIndexes(); 