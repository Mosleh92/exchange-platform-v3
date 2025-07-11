// src/models/postgresql/index.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

/**
 * Enterprise PostgreSQL Database Models with Sequelize
 * Features: ACID compliance, UUID primary keys, multi-currency precision,
 * multi-tenant isolation, and performance optimizations
 */

// Database connection configuration
const sequelize = new Sequelize(
  process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'exchange_enterprise'}`,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Connection pool optimization
    pool: {
      max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
      min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
      acquire: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
      idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000
    },
    
    // Performance optimizations
    dialectOptions: {
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: true,
      statement_timeout: 30000,
      query_timeout: 30000
    },
    
    // Enable SSL in production
    ssl: process.env.NODE_ENV === 'production',
    
    // Timezone configuration
    timezone: '+00:00',
    
    define: {
      // Use UUID as primary key by default
      primaryKey: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      
      // Add timestamps by default
      timestamps: true,
      underscored: false, // Use camelCase
      paranoid: true, // Enable soft deletes
      
      // Add tenant isolation by default
      defaultScope: {
        where: {
          deletedAt: null
        }
      },
      
      // Optimize indexes
      indexes: []
    }
  }
);

// Database models object
const db = {
  sequelize,
  Sequelize,
  DataTypes
};

// Import all model files
const modelsPath = path.join(__dirname, '.');
const modelFiles = fs.readdirSync(modelsPath)
  .filter(file => file.endsWith('.js') && file !== 'index.js')
  .sort(); // Ensure consistent loading order

// Initialize all models
modelFiles.forEach(file => {
  const modelPath = path.join(modelsPath, file);
  const model = require(modelPath)(sequelize, DataTypes);
  db[model.name] = model;
});

// Set up associations after all models are loaded
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Enterprise-grade database utilities
db.utils = {
  /**
   * Execute transaction with automatic retry and rollback
   */
  async executeTransaction(callback, retries = 3) {
    let attempt = 0;
    
    while (attempt < retries) {
      const transaction = await sequelize.transaction();
      try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
      } catch (error) {
        await transaction.rollback();
        attempt++;
        
        if (attempt >= retries) {
          throw new Error(`Transaction failed after ${retries} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  },
  
  /**
   * Bulk operation with transaction safety
   */
  async bulkOperation(model, operation, data, options = {}) {
    return await this.executeTransaction(async (transaction) => {
      return await model[operation](data, { 
        transaction,
        ...options 
      });
    });
  },
  
  /**
   * Generate unique reference number
   */
  generateReferenceNumber(prefix = 'REF') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  },
  
  /**
   * Validate tenant isolation
   */
  async validateTenantAccess(userId, tenantId) {
    const user = await db.User.findByPk(userId);
    if (!user || user.tenantId !== tenantId) {
      throw new Error('Access denied: Invalid tenant access');
    }
    return user;
  }
};

// Health check function
db.healthCheck = async () => {
  try {
    await sequelize.authenticate();
    const result = await sequelize.query('SELECT NOW() as current_time');
    return {
      status: 'healthy',
      timestamp: result[0][0].current_time,
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    };
  }
};

// Database initialization
db.initialize = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync models in development (be careful in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
db.close = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
    throw error;
  }
};

module.exports = db;