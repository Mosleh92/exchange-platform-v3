const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const ExchangeRate = require('../models/ExchangeRate');
const EnhancedAuditService = require('./enhancedAuditService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Enhanced Currency Exchange Service
 * Handles currency exchanges with proper transaction locking
 */
class EnhancedCurrencyExchangeService {
  constructor() {
    this.auditService = new EnhancedAuditService();
  }

  /**
   * Exchange currency with pessimistic locking
   */
  async exchangeCurrency(exchangeData, userId, tenantId) {
    const session = await mongoose.startSession();
    
    try {
      const {
        fromAccountId,
        toAccountId,
        amount,
        fromCurrency,
        toCurrency,
        exchangeRate
      } = exchangeData;

      await session.withTransaction(async () => {
        // Lock and get source account
        const fromAccount = await Account.findOne({
          _id: fromAccountId,
          tenantId: tenantId
        }).session(session);

        if (!fromAccount) {
          throw new Error('Source account not found');
        }

        // Lock and get destination account
        const toAccount = await Account.findOne({
          _id: toAccountId,
          tenantId: tenantId
        }).session(session);

        if (!toAccount) {
          throw new Error('Destination account not found');
        }

        // Validate currencies
        if (fromAccount.currency !== fromCurrency) {
          throw new Error('Source account currency mismatch');
        }

        if (toAccount.currency !== toCurrency) {
          throw new Error('Destination account currency mismatch');
        }

        // Check sufficient balance with locked account
        if (fromAccount.balance < amount) {
          throw new Error('Insufficient balance for exchange');
        }

        // Calculate exchange amount
        const exchangeAmount = amount * exchangeRate;

        // Update source account balance
        fromAccount.balance -= amount;
        await fromAccount.save({ session });

        // Update destination account balance
        toAccount.balance += exchangeAmount;
        await toAccount.save({ session });

        // Create exchange transaction
        const transaction = new Transaction({
          userId,
          tenantId,
          fromAccountId,
          toAccountId,
          amount,
          exchangeAmount,
          fromCurrency,
          toCurrency,
          exchangeRate,
          transactionType: 'CURRENCY_EXCHANGE',
          status: 'COMPLETED',
          createdAt: new Date()
        });

        await transaction.save({ session });

        // Log exchange transaction
        await this.auditService.logEvent({
          eventType: 'CURRENCY_EXCHANGE_COMPLETED',
          userId,
          tenantId,
          action: 'EXCHANGE_CURRENCY',
          resource: 'TRANSACTION',
          resourceId: transaction._id,
          details: {
            fromAccountId,
            toAccountId,
            amount,
            exchangeAmount,
            fromCurrency,
            toCurrency,
            exchangeRate
          },
          severity: 'HIGH',
          ipAddress: exchangeData.ipAddress,
          userAgent: exchangeData.userAgent
        });

        logger.info('Currency exchange completed', {
          transactionId: transaction._id,
          userId,
          fromAccountId,
          toAccountId,
          amount,
          exchangeAmount
        });
      });

      return { success: true };
    } catch (error) {
      logger.error('Currency exchange error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get real-time exchange rates with caching
   */
  async getExchangeRates(currency, tenantId) {
    try {
      // Check cache first
      const cacheKey = `exchange_rate_${currency}_${tenantId}`;
      const cachedRate = await this.getFromCache(cacheKey);
      
      if (cachedRate) {
        return cachedRate;
      }

      // Get from database
      const rate = await ExchangeRate.findOne({
        fromCurrency: currency,
        toCurrency: 'IRR',
        isActive: true
      }).sort({ updatedAt: -1 });

      if (!rate) {
        throw new Error(`Exchange rate not available for ${currency}`);
      }

      // Cache the result
      await this.setCache(cacheKey, rate, 300); // 5 minutes

      return rate;
    } catch (error) {
      logger.error('Get exchange rates error:', error);
      throw error;
    }
  }

  /**
   * Update exchange rates with validation
   */
  async updateExchangeRate(rateData, userId, tenantId) {
    try {
      const { fromCurrency, toCurrency, rate, provider } = rateData;

      // Validate rate
      if (rate <= 0) {
        throw new Error('Exchange rate must be positive');
      }

      // Create new rate entry
      const newRate = new ExchangeRate({
        fromCurrency,
        toCurrency,
        rate,
        provider,
        isActive: true,
        updatedBy: userId,
        tenantId
      });

      await newRate.save();

      // Invalidate cache
      const cacheKey = `exchange_rate_${fromCurrency}_${tenantId}`;
      await this.invalidateCache(cacheKey);

      // Log rate update
      await this.auditService.logEvent({
        eventType: 'EXCHANGE_RATE_UPDATED',
        userId,
        tenantId,
        action: 'UPDATE_EXCHANGE_RATE',
        resource: 'EXCHANGE_RATE',
        resourceId: newRate._id,
        details: {
          fromCurrency,
          toCurrency,
          rate,
          provider
        },
        severity: 'MEDIUM'
      });

      logger.info('Exchange rate updated', {
        fromCurrency,
        toCurrency,
        rate,
        provider,
        userId
      });

      return newRate;
    } catch (error) {
      logger.error('Update exchange rate error:', error);
      throw error;
    }
  }

  /**
   * Validate exchange request
   */
  async validateExchangeRequest(exchangeData, userId, tenantId) {
    try {
      const {
        fromAccountId,
        toAccountId,
        amount,
        fromCurrency,
        toCurrency
      } = exchangeData;

      // Check account ownership
      const fromAccount = await Account.findOne({
        _id: fromAccountId,
        userId: userId,
        tenantId: tenantId
      });

      if (!fromAccount) {
        throw new Error('Source account not found or access denied');
      }

      const toAccount = await Account.findOne({
        _id: toAccountId,
        userId: userId,
        tenantId: tenantId
      });

      if (!toAccount) {
        throw new Error('Destination account not found or access denied');
      }

      // Check sufficient balance
      if (fromAccount.balance < amount) {
        throw new Error('Insufficient balance for exchange');
      }

      // Check currency compatibility
      if (fromAccount.currency !== fromCurrency) {
        throw new Error('Source account currency mismatch');
      }

      if (toAccount.currency !== toCurrency) {
        throw new Error('Destination account currency mismatch');
      }

      // Check exchange limits
      const dailyExchangeLimit = await this.getDailyExchangeLimit(userId, tenantId);
      const todayExchanges = await this.getTodayExchangeAmount(userId, tenantId);
      
      if (todayExchanges + amount > dailyExchangeLimit) {
        throw new Error('Daily exchange limit exceeded');
      }

      return { valid: true };
    } catch (error) {
      logger.error('Validate exchange request error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get daily exchange limit
   */
  async getDailyExchangeLimit(userId, tenantId) {
    // This would typically come from user settings or tenant configuration
    // For now, return a default limit
    return 1000000; // 1 million IRR
  }

  /**
   * Get today's exchange amount
   */
  async getTodayExchangeAmount(userId, tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      userId,
      tenantId,
      transactionType: 'CURRENCY_EXCHANGE',
      createdAt: { $gte: today }
    });

    return transactions.reduce((total, transaction) => {
      return total + (transaction.amount || 0);
    }, 0);
  }

  /**
   * Cache management methods
   */
  async getFromCache(key) {
    // This would use Redis or similar caching system
    // For now, return null
    return null;
  }

  async setCache(key, value, ttl) {
    // This would use Redis or similar caching system
    // For now, do nothing
  }

  async invalidateCache(key) {
    // This would use Redis or similar caching system
    // For now, do nothing
  }

  /**
   * Get exchange history
   */
  async getExchangeHistory(userId, tenantId, filters = {}) {
    try {
      const query = {
        userId,
        tenantId,
        transactionType: 'CURRENCY_EXCHANGE'
      };

      // Apply date filters
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      // Apply currency filters
      if (filters.fromCurrency) {
        query.fromCurrency = filters.fromCurrency;
      }

      if (filters.toCurrency) {
        query.toCurrency = filters.toCurrency;
      }

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return transactions;
    } catch (error) {
      logger.error('Get exchange history error:', error);
      throw error;
    }
  }

  /**
   * Calculate exchange fees
   */
  async calculateExchangeFees(amount, fromCurrency, toCurrency, tenantId) {
    try {
      // Get tenant's fee configuration
      const tenant = await require('../models/tenants/Tenant').findById(tenantId);
      
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Calculate fees based on currency pair
      let feePercentage = 0.5; // Default 0.5%

      if (fromCurrency === 'USD' && toCurrency === 'IRR') {
        feePercentage = tenant.commissionRates?.exchange || 0.5;
      } else if (fromCurrency === 'EUR' && toCurrency === 'IRR') {
        feePercentage = tenant.commissionRates?.exchange || 0.5;
      }

      const feeAmount = (amount * feePercentage) / 100;

      return {
        feeAmount,
        feePercentage,
        totalAmount: amount + feeAmount
      };
    } catch (error) {
      logger.error('Calculate exchange fees error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedCurrencyExchangeService(); 