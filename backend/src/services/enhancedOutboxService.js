const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EnhancedEventService = require('./enhancedEventService');

/**
 * Enhanced Outbox Service
 * Implements Outbox Pattern for reliable event publishing
 */
class EnhancedOutboxService {
  constructor() {
    this.eventService = new EnhancedEventService();
    this.batchSize = 100;
    this.processingInterval = 5000; // 5 seconds
    this.maxRetries = 3;
    
    // Start background processing
    this.startBackgroundProcessing();
  }

  /**
   * Store event in outbox
   */
  async storeEvent(eventData, session = null) {
    try {
      const outboxEvent = {
        id: require('crypto').randomUUID(),
        aggregateType: eventData.aggregateType || 'TRANSACTION',
        aggregateId: eventData.aggregateId,
        eventType: eventData.eventType,
        payload: eventData.payload,
        tenantId: eventData.tenantId,
        userId: eventData.userId,
        createdAt: new Date(),
        published: false,
        retryCount: 0,
        lastAttempt: null,
        nextAttempt: new Date()
      };

      const collection = mongoose.connection.db.collection('outbox_events');
      
      if (session) {
        await collection.insertOne(outboxEvent, { session });
      } else {
        await collection.insertOne(outboxEvent);
      }

      logger.info('Event stored in outbox', {
        eventId: outboxEvent.id,
        eventType: outboxEvent.eventType,
        aggregateId: outboxEvent.aggregateId
      });

      return outboxEvent.id;
    } catch (error) {
      logger.error('Error storing event in outbox:', error);
      throw error;
    }
  }

  /**
   * Process outbox events in background
   */
  async processOutboxEvents() {
    try {
      const collection = mongoose.connection.db.collection('outbox_events');
      
      // Find unpublished events that are ready for processing
      const events = await collection.find({
        published: false,
        nextAttempt: { $lte: new Date() },
        retryCount: { $lt: this.maxRetries }
      }).limit(this.batchSize).toArray();

      if (events.length === 0) {
        return;
      }

      logger.info(`Processing ${events.length} outbox events`);

      for (const event of events) {
        try {
          await this.processEvent(event);
          
          // Mark as published
          await collection.updateOne(
            { _id: event._id },
            {
              $set: {
                published: true,
                publishedAt: new Date(),
                lastAttempt: new Date()
              }
            }
          );

          logger.info('Event published successfully', {
            eventId: event.id,
            eventType: event.eventType
          });
        } catch (error) {
          logger.error('Error processing outbox event:', error);
          
          // Update retry count and next attempt
          const nextAttempt = this.calculateNextAttempt(event.retryCount);
          await collection.updateOne(
            { _id: event._id },
            {
              $inc: { retryCount: 1 },
              $set: {
                lastAttempt: new Date(),
                nextAttempt: nextAttempt,
                lastError: error.message
              }
            }
          );
        }
      }
    } catch (error) {
      logger.error('Error processing outbox events:', error);
    }
  }

  /**
   * Process individual event
   */
  async processEvent(event) {
    try {
      // Emit event through event service
      this.eventService.emit(event.eventType, {
        ...event.payload,
        outboxEventId: event.id,
        aggregateId: event.aggregateId,
        tenantId: event.tenantId,
        userId: event.userId
      });

      // Additional processing based on event type
      switch (event.eventType) {
        case 'TRANSACTION_COMPLETED':
          await this.processTransactionCompleted(event);
          break;
        case 'ACCOUNT_UPDATED':
          await this.processAccountUpdated(event);
          break;
        case 'P2P_TRADE_COMPLETED':
          await this.processP2PTradeCompleted(event);
          break;
        case 'PAYMENT_PROCESSED':
          await this.processPaymentProcessed(event);
          break;
        default:
          logger.warn('Unknown event type:', event.eventType);
      }
    } catch (error) {
      logger.error('Error processing event:', error);
      throw error;
    }
  }

  /**
   * Process transaction completed event
   */
  async processTransactionCompleted(event) {
    try {
      // Update account balances
      const { fromAccountId, toAccountId, amount } = event.payload;
      
      // This would typically update account balances
      // Implementation depends on your account service
      logger.info('Processing transaction completed event', {
        fromAccountId,
        toAccountId,
        amount
      });
    } catch (error) {
      logger.error('Error processing transaction completed event:', error);
      throw error;
    }
  }

  /**
   * Process account updated event
   */
  async processAccountUpdated(event) {
    try {
      const { accountId, changes } = event.payload;
      
      // Update account statistics
      logger.info('Processing account updated event', {
        accountId,
        changes
      });
    } catch (error) {
      logger.error('Error processing account updated event:', error);
      throw error;
    }
  }

  /**
   * Process P2P trade completed event
   */
  async processP2PTradeCompleted(event) {
    try {
      const { tradeId, buyerId, sellerId, amount } = event.payload;
      
      // Update P2P statistics
      logger.info('Processing P2P trade completed event', {
        tradeId,
        buyerId,
        sellerId,
        amount
      });
    } catch (error) {
      logger.error('Error processing P2P trade completed event:', error);
      throw error;
    }
  }

  /**
   * Process payment processed event
   */
  async processPaymentProcessed(event) {
    try {
      const { paymentId, amount, status } = event.payload;
      
      // Update payment statistics
      logger.info('Processing payment processed event', {
        paymentId,
        amount,
        status
      });
    } catch (error) {
      logger.error('Error processing payment processed event:', error);
      throw error;
    }
  }

  /**
   * Calculate next attempt time with exponential backoff
   */
  calculateNextAttempt(retryCount) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    return new Date(Date.now() + delay);
  }

  /**
   * Start background processing
   */
  startBackgroundProcessing() {
    setInterval(() => {
      this.processOutboxEvents().catch(error => {
        logger.error('Background processing error:', error);
      });
    }, this.processingInterval);

    logger.info('Outbox background processing started');
  }

  /**
   * Get outbox statistics
   */
  async getOutboxStatistics() {
    try {
      const collection = mongoose.connection.db.collection('outbox_events');
      
      const stats = await collection.aggregate([
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            publishedEvents: {
              $sum: {
                $cond: ['$published', 1, 0]
              }
            },
            failedEvents: {
              $sum: {
                $cond: [
                  { $and: [{ $not: '$published' }, { $gte: ['$retryCount', this.maxRetries] }] },
                  1,
                  0
                ]
              }
            },
            pendingEvents: {
              $sum: {
                $cond: [
                  { $and: [{ $not: '$published' }, { $lt: ['$retryCount', this.maxRetries] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalEvents: 0,
        publishedEvents: 0,
        failedEvents: 0,
        pendingEvents: 0
      };
    } catch (error) {
      logger.error('Error getting outbox statistics:', error);
      return {
        totalEvents: 0,
        publishedEvents: 0,
        failedEvents: 0,
        pendingEvents: 0
      };
    }
  }

  /**
   * Clean up old published events
   */
  async cleanupOldEvents(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const collection = mongoose.connection.db.collection('outbox_events');
      
      const result = await collection.deleteMany({
        published: true,
        publishedAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} old outbox events`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old outbox events:', error);
      return 0;
    }
  }

  /**
   * Retry failed events manually
   */
  async retryFailedEvents() {
    try {
      const collection = mongoose.connection.db.collection('outbox_events');
      
      const failedEvents = await collection.find({
        published: false,
        retryCount: { $gte: this.maxRetries }
      }).toArray();

      logger.info(`Found ${failedEvents.length} failed events to retry`);

      for (const event of failedEvents) {
        try {
          // Reset retry count and set next attempt to now
          await collection.updateOne(
            { _id: event._id },
            {
              $set: {
                retryCount: 0,
                nextAttempt: new Date(),
                lastError: null
              }
            }
          );

          logger.info('Reset failed event for retry', {
            eventId: event.id,
            eventType: event.eventType
          });
        } catch (error) {
          logger.error('Error resetting failed event:', error);
        }
      }

      return failedEvents.length;
    } catch (error) {
      logger.error('Error retrying failed events:', error);
      return 0;
    }
  }

  /**
   * Get event processing metrics
   */
  async getEventProcessingMetrics() {
    try {
      const collection = mongoose.connection.db.collection('outbox_events');
      
      const metrics = await collection.aggregate([
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            publishedCount: {
              $sum: {
                $cond: ['$published', 1, 0]
              }
            },
            avgRetryCount: { $avg: '$retryCount' },
            maxRetryCount: { $max: '$retryCount' }
          }
        }
      ]).toArray();

      return metrics;
    } catch (error) {
      logger.error('Error getting event processing metrics:', error);
      return [];
    }
  }
}

module.exports = new EnhancedOutboxService(); 