// src/config/sequelize.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Sequelize configuration for PostgreSQL database
 */
class SequelizeManager {
  constructor() {
    this.sequelize = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Sequelize connection
   */
  async initialize() {
    try {
      // Database connection configuration
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        database: process.env.DB_NAME || 'exchange_platform',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        
        // Connection pool configuration
        pool: {
          max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
          min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
          acquire: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
          idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000
        },
        
        // Logging configuration
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        
        // SSL configuration for production
        dialectOptions: {
          ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
          } : false,
          statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
          query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
        },
        
        // Additional options
        define: {
          // Use snake_case for automatically added attributes (createdAt, updatedAt)
          underscored: true,
          // Don't use camelCase for automatically added attributes
          freezeTableName: true,
          // Add timestamps by default
          timestamps: true,
          // Use paranoid tables (soft delete)
          paranoid: true,
          // Define charset and collation for MySQL compatibility
          charset: 'utf8',
          dialectOptions: {
            collate: 'utf8_general_ci'
          }
        },
        
        // Timezone configuration
        timezone: '+00:00'
      };

      // Create Sequelize instance
      this.sequelize = new Sequelize(
        process.env.DATABASE_URL || config.database,
        process.env.DATABASE_URL ? {} : config
      );

      // Test connection
      await this.sequelize.authenticate();
      this.isInitialized = true;
      
      logger.info('Sequelize connection established successfully');
      
      // Sync database in development
      if (process.env.NODE_ENV === 'development') {
        await this.syncDatabase();
      }

    } catch (error) {
      logger.error('Sequelize initialization failed:', error);
      throw error;
    }
  }

  /**
   * Synchronize database models
   */
  async syncDatabase() {
    try {
      await this.sequelize.sync({ 
        force: process.env.DB_FORCE_SYNC === 'true',
        alter: process.env.DB_ALTER_SYNC === 'true'
      });
      logger.info('Database synchronized successfully');
    } catch (error) {
      logger.error('Database synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Get Sequelize instance
   */
  getInstance() {
    if (!this.isInitialized) {
      throw new Error('Sequelize not initialized');
    }
    return this.sequelize;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      logger.info('Sequelize connection closed');
    }
  }

  /**
   * Execute raw query with logging
   */
  async query(sql, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Sequelize not initialized');
    }

    const startTime = Date.now();
    try {
      const result = await this.sequelize.query(sql, {
        type: Sequelize.QueryTypes.SELECT,
        ...options
      });
      
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        logger.warn(`Slow query detected (${duration}ms): ${sql.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed (${duration}ms): ${error.message}`, {
        query: sql.substring(0, 200),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    if (!this.isInitialized) {
      throw new Error('Sequelize not initialized');
    }

    return await this.sequelize.transaction(callback);
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      await this.sequelize.authenticate();
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const sequelizeManager = new SequelizeManager();

module.exports = sequelizeManager;