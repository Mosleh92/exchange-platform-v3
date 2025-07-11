#!/usr/bin/env node

/**
 * Exchange Platform V3 Server with Financial System Integration
 * Main server entry point with ACID-compliant financial operations
 */

require('dotenv').config();

const logger = require('./src/utils/logger');
const { app, initializeFinancialSystem } = require('./src/app');

const PORT = process.env.PORT || 5000;

/**
 * Start the server with proper initialization sequence
 */
async function startServer() {
  try {
    logger.info('Starting Exchange Platform V3...');

    // Initialize financial system first (critical for data integrity)
    logger.info('Initializing financial system...');
    await initializeFinancialSystem();
    logger.info('Financial system initialized successfully');

    // Connect to MongoDB (for non-financial operations)
    const mongoose = require('mongoose');
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('MongoDB connected successfully');
    }

    // Start the HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Exchange Platform V3 running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
      logger.info(`🌐 Access: http://localhost:${PORT}`);
      logger.info(`💰 Financial system: ACID-compliant PostgreSQL`);
      logger.info(`📊 Non-financial data: MongoDB`);
    });

    // Enhanced health check endpoint that includes financial system status
    app.get('/health/detailed', async (req, res) => {
      try {
        const financialDB = require('./src/config/financial-database');
        const financialHealth = await financialDB.healthCheck();
        
        const mongoHealth = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'production',
          databases: {
            financial: financialHealth,
            mongodb: { status: mongoHealth }
          },
          features: {
            doubleEntryBookkeeping: 'enabled',
            auditTrail: 'enabled',
            raceConditionPrevention: 'enabled',
            transactionIntegrity: 'ACID-compliant'
          }
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        // Stop accepting new requests
        server.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Close financial database connections
            const financialDB = require('./src/config/financial-database');
            await financialDB.close();
            logger.info('Financial database connections closed');

            // Close MongoDB connections
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');

            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during database cleanup:', error);
            process.exit(1);
          }
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Forcing shutdown after timeout');
          process.exit(1);
        }, 30000);

      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { startServer };