/**
 * Server Entry Point for Fly.io Deployment
 * 
 * This file imports the Express app from src/app.js and starts the server
 * with proper configuration for Fly.io deployment including:
 * - Binding to 0.0.0.0 (required for containers)
 * - Graceful shutdown handling
 * - Proper logging for deployment debugging
 */

const express = require('express');
const logger = require('./src/utils/logger');

// Create a minimal app for testing
const app = express();

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Exchange Platform Backend Server', status: 'running' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Required for Fly.io containers

// Start the server
const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 Exchange Platform Backend Server is running on ${HOST}:${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🏥 Health check available at: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown handling for Fly.io
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(() => {
        logger.info('Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    process.exit(1);
  }
});

module.exports = server;