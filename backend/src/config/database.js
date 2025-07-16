const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
 copilot/fix-62378d25-cbd6-4e65-a205-dbd7675c9ecb
      // Connection pooling options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      // Buffer commands when disconnected
      bufferCommands: false,
      bufferMaxEntries: 0,
      // Connection management
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      // Retry writes
      retryWrites: true,
      retryReads: true,
      // Read/write concerns
      readPreference: 'primary',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 1000
      }
=======
      // Connection pooling for better performance
      maxPoolSize: 50, // Maintain up to 50 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0 // Disable mongoose buffering
 main
    });

    logger.info('MongoDB Connected', {
      host: conn.connection.host,
      database: conn.connection.name,
      maxPoolSize: 10
    });
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('close', () => {
      logger.info('MongoDB connection closed');
    });

    // Monitor connection pool
    mongoose.connection.on('fullsetup', () => {
      logger.info('MongoDB replica set connection established');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection', { error: error.message });
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through SIGTERM');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection on SIGTERM', { error: error.message });
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
};

module.exports = connectDB; 
=======
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
 main
