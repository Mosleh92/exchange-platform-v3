// services/tokenCleanup.js - Background Token Cleanup Service
const cron = require('node-cron');
const tokenManager = require('./tokenManager');
const logger = require('../utils/logger');

class TokenCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = '0 */6 * * *'; // Every 6 hours
  }

  /**
   * Start the token cleanup service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Token cleanup service is already running');
      return;
    }

    // Schedule cleanup task
    this.task = cron.schedule(this.cleanupInterval, async () => {
      await this.performCleanup();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.task.start();
    this.isRunning = true;

    logger.info('Token cleanup service started', {
      interval: this.cleanupInterval
    });

    // Run initial cleanup
    setTimeout(() => {
      this.performCleanup();
    }, 10000); // Run after 10 seconds of startup
  }

  /**
   * Stop the token cleanup service
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      logger.info('Token cleanup service stopped');
    }
  }

  /**
   * Perform token cleanup
   */
  async performCleanup() {
    try {
      logger.info('Starting token cleanup...');
      
      const startTime = Date.now();

      // Clean up expired refresh tokens
      await tokenManager.cleanupExpiredTokens();

      const duration = Date.now() - startTime;
      
      logger.info('Token cleanup completed', {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Token cleanup failed:', error);
    }
  }

  /**
   * Manual cleanup trigger (for testing or admin operations)
   */
  async triggerCleanup() {
    logger.info('Manual token cleanup triggered');
    await this.performCleanup();
  }

  /**
   * Get cleanup service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.cleanupInterval,
      nextRun: this.task ? this.task.nextDate() : null
    };
  }
}

// Singleton instance
const tokenCleanupService = new TokenCleanupService();

module.exports = tokenCleanupService;