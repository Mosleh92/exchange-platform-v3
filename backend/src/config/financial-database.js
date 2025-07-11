// backend/src/config/financial-database.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Financial Database Configuration using PostgreSQL
 * Separate from main MongoDB for ACID compliance and double-entry bookkeeping
 */
class FinancialDatabaseManager {
    constructor() {
        this.sequelize = null;
        this.isInitialized = false;
        this.models = {};
    }

    /**
     * Initialize PostgreSQL connection for financial operations
     */
    async initialize() {
        try {
            // PostgreSQL configuration for financial operations
            this.sequelize = new Sequelize({
                dialect: 'postgres',
                host: process.env.FINANCIAL_DB_HOST || process.env.DB_HOST || 'localhost',
                port: process.env.FINANCIAL_DB_PORT || process.env.DB_PORT || 5432,
                database: process.env.FINANCIAL_DB_NAME || 'exchange_financial',
                username: process.env.FINANCIAL_DB_USER || process.env.DB_USER || 'postgres',
                password: process.env.FINANCIAL_DB_PASSWORD || process.env.DB_PASSWORD,
                
                // Connection pool configuration
                pool: {
                    max: parseInt(process.env.FINANCIAL_DB_MAX_CONNECTIONS) || 20,
                    min: parseInt(process.env.FINANCIAL_DB_MIN_CONNECTIONS) || 5,
                    acquire: parseInt(process.env.FINANCIAL_DB_ACQUIRE_TIMEOUT) || 30000,
                    idle: parseInt(process.env.FINANCIAL_DB_IDLE_TIMEOUT) || 10000
                },

                // SSL configuration for production
                dialectOptions: {
                    ssl: process.env.NODE_ENV === 'production' ? {
                        require: true,
                        rejectUnauthorized: false
                    } : false,
                    // Set transaction isolation level for financial operations
                    isolationLevel: 'REPEATABLE READ'
                },

                // Query configuration
                query: {
                    timeout: parseInt(process.env.FINANCIAL_DB_QUERY_TIMEOUT) || 30000
                },

                // Logging configuration
                logging: process.env.NODE_ENV === 'development' ? 
                    (msg) => logger.debug(`Financial DB: ${msg}`) : false,

                // Retry configuration
                retry: {
                    max: 3,
                    timeout: 3000,
                    match: [
                        'ECONNRESET',
                        'ENOTFOUND',
                        'ECONNREFUSED',
                        'ETIMEDOUT'
                    ]
                },

                // Define sync options
                define: {
                    timestamps: true,
                    underscored: true,
                    freezeTableName: true
                }
            });

            // Test connection
            await this.sequelize.authenticate();
            logger.info('Financial database connection established successfully');

            // Initialize models
            await this.initializeModels();

            // Sync database schema (in development)
            if (process.env.NODE_ENV === 'development') {
                await this.syncSchema();
            }

            this.isInitialized = true;
            logger.info('Financial database initialization completed');

        } catch (error) {
            logger.error('Financial database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize all financial models
     */
    async initializeModels() {
        try {
            // Import and initialize models
            const Account = require('../models/financial/Account');
            const FinancialTransaction = require('../models/financial/FinancialTransaction');
            const LedgerEntry = require('../models/financial/LedgerEntry');
            const FinancialAudit = require('../models/financial/FinancialAudit');

            // Initialize models with sequelize instance
            this.models.Account = Account.init(this.sequelize);
            this.models.FinancialTransaction = FinancialTransaction.init(this.sequelize);
            this.models.LedgerEntry = LedgerEntry.init(this.sequelize);
            this.models.FinancialAudit = FinancialAudit.init(this.sequelize);

            // Set up associations
            Object.values(this.models).forEach(model => {
                if (model.associate) {
                    model.associate(this.models);
                }
            });

            logger.info('Financial models initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize financial models:', error);
            throw error;
        }
    }

    /**
     * Sync database schema (development only)
     */
    async syncSchema() {
        try {
            // Force sync in development (careful with this in production)
            const shouldForce = process.env.FINANCIAL_DB_FORCE_SYNC === 'true';
            
            await this.sequelize.sync({ 
                force: shouldForce,
                alter: !shouldForce // Use alter instead of force in most cases
            });

            logger.info(`Financial database schema synced ${shouldForce ? '(forced)' : '(altered)'}`);

            // Create default system accounts after sync
            await this.createDefaultAccounts();

        } catch (error) {
            logger.error('Failed to sync financial database schema:', error);
            throw error;
        }
    }

    /**
     * Create default system accounts for double-entry bookkeeping
     */
    async createDefaultAccounts() {
        try {
            const { Account } = this.models;
            
            // System tenant ID (for system-wide accounts)
            const systemTenantId = '00000000-0000-0000-0000-000000000000';
            const systemUserId = '00000000-0000-0000-0000-000000000000';

            // Default chart of accounts
            const defaultAccounts = [
                // Assets
                { type: 'ASSET', name: 'Cash', code: '1000' },
                { type: 'ASSET', name: 'Customer USD Accounts', code: '1100' },
                { type: 'ASSET', name: 'Customer EUR Accounts', code: '1110' },
                { type: 'ASSET', name: 'Customer GBP Accounts', code: '1120' },
                { type: 'ASSET', name: 'Exchange USD Pool', code: '1200' },
                { type: 'ASSET', name: 'Exchange EUR Pool', code: '1210' },
                { type: 'ASSET', name: 'Exchange GBP Pool', code: '1220' },

                // Liabilities
                { type: 'LIABILITY', name: 'Customer Deposits USD', code: '2100' },
                { type: 'LIABILITY', name: 'Customer Deposits EUR', code: '2110' },
                { type: 'LIABILITY', name: 'Customer Deposits GBP', code: '2120' },
                { type: 'LIABILITY', name: 'Pending Settlements', code: '2200' },

                // Equity
                { type: 'EQUITY', name: 'Exchange Capital', code: '3000' },
                { type: 'EQUITY', name: 'Retained Earnings', code: '3100' },

                // Revenue
                { type: 'REVENUE', name: 'Exchange Fees USD', code: '4000' },
                { type: 'REVENUE', name: 'Exchange Fees EUR', code: '4010' },
                { type: 'REVENUE', name: 'Exchange Fees GBP', code: '4020' },
                { type: 'REVENUE', name: 'Interest Income', code: '4100' },

                // Expenses
                { type: 'EXPENSE', name: 'Operational Expenses', code: '5000' },
                { type: 'EXPENSE', name: 'Banking Fees', code: '5100' },
                { type: 'EXPENSE', name: 'Technology Expenses', code: '5200' }
            ];

            for (const accountData of defaultAccounts) {
                const existingAccount = await Account.findOne({
                    where: {
                        tenantId: systemTenantId,
                        accountNumber: accountData.code
                    }
                });

                if (!existingAccount) {
                    await Account.create({
                        accountNumber: accountData.code,
                        accountType: accountData.type,
                        accountName: accountData.name,
                        currency: 'USD', // Default currency
                        tenantId: systemTenantId,
                        customerId: null, // System account
                        createdBy: systemUserId
                    });
                }
            }

            logger.info('Default system accounts created/verified');
        } catch (error) {
            logger.error('Failed to create default accounts:', error);
            // Don't throw error here as this is not critical for startup
        }
    }

    /**
     * Get sequelize instance
     */
    getSequelize() {
        if (!this.isInitialized) {
            throw new Error('Financial database not initialized');
        }
        return this.sequelize;
    }

    /**
     * Get model by name
     */
    getModel(modelName) {
        if (!this.isInitialized) {
            throw new Error('Financial database not initialized');
        }
        
        if (!this.models[modelName]) {
            throw new Error(`Model ${modelName} not found`);
        }
        
        return this.models[modelName];
    }

    /**
     * Execute transaction with automatic rollback
     */
    async transaction(callback, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Financial database not initialized');
        }

        const transactionOptions = {
            isolationLevel: 'REPEATABLE READ', // Ensure consistency
            ...options
        };

        return await this.sequelize.transaction(transactionOptions, callback);
    }

    /**
     * Execute raw query
     */
    async query(sql, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Financial database not initialized');
        }

        const startTime = Date.now();
        try {
            const result = await this.sequelize.query(sql, options);
            const duration = Date.now() - startTime;
            
            // Log slow queries
            if (duration > 1000) {
                logger.warn(`Slow financial query detected (${duration}ms): ${sql.substring(0, 100)}...`);
            }
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Financial query failed (${duration}ms): ${error.message}`, {
                query: sql.substring(0, 200),
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Health check for financial database
     */
    async healthCheck() {
        try {
            await this.sequelize.authenticate();
            
            // Check if we can query a basic table
            const { Account } = this.models;
            await Account.count({ limit: 1 });
            
            return {
                status: 'healthy',
                timestamp: new Date(),
                connection: 'active'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                connection: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Get database performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const [results] = await this.sequelize.query(`
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation,
                    most_common_vals,
                    most_common_freqs
                FROM pg_stats 
                WHERE schemaname = 'public'
                AND tablename IN ('accounts', 'financial_transactions', 'ledger_entries', 'financial_audits')
                ORDER BY tablename, attname
            `);

            const [connectionInfo] = await this.sequelize.query(`
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `);

            return {
                tableStats: results,
                connections: connectionInfo[0] || {},
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Failed to get financial database performance metrics:', error);
            return {
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * Close database connections
     */
    async close() {
        if (this.sequelize) {
            await this.sequelize.close();
            logger.info('Financial database connections closed');
        }
    }
}

// Singleton instance
const financialDatabaseManager = new FinancialDatabaseManager();

module.exports = financialDatabaseManager;