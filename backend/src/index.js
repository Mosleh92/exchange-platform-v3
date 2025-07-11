// backend/src/index.js - Main application entry point with Sequelize initialization
require('dotenv').config();

const logger = require('./utils/logger');
const app = require('./app');
const sequelizeManager = require('./config/sequelize');
const { defineAssociations } = require('./models/sequelize');

// Initialize database and start server
async function startServer() {
  try {
    logger.info('🚀 Starting Enterprise Exchange Platform v4.0.0...');

    // Initialize Sequelize connection
    await sequelizeManager.initialize();
    logger.info('✅ PostgreSQL database connection established');

    // Define model associations
    defineAssociations();
    logger.info('✅ Model associations defined');

    // Start the Express server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🌐 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`📚 API docs: http://localhost:${PORT}/api-docs`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // Close server
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connection
          await sequelizeManager.close();
          logger.info('Database connection closed');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();