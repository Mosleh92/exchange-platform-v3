const P2PTransaction = require('../models/p2p/P2PTransaction');
const P2PPayment = require('../models/p2p/P2PPayment');
const P2PAnnouncement = require('../models/p2p/P2PAnnouncement');
const Account = require('../models/Account');
const ExchangeRate = require('../models/ExchangeRate');
const logger = require('../utils/logger');

/**
 * Enhanced P2P Service
 * Comprehensive P2P transaction management with multi-payment support
 */
class EnhancedP2PService {
  constructor() {
    this.transactionStatuses = {
      PENDING: 'PENDING',
      PENDING_PAYMENT: 'PENDING_PAYMENT',
      PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      DISPUTED: 'DISPUTED',
      EXPIRED: 'EXPIRED'
    };

    this.paymentStatuses = {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED'
    };
  }

  /**
   * Create P2P transaction with enhanced validation
   */
  async createP2PTransaction(transactionData) {
    try {
      const {
        sellerId,
        buyerId,
        announcementId,
        amount,
        currency,
        paymentMethod,
        tenantId,
        branchId
      } = transactionData;

      // Validate announcement
      const announcement = await P2PAnnouncement.findById(announcementId);
      if (!announcement || announcement.status !== 'ACTIVE') {
        throw new Error('Invalid or inactive announcement');
      }

      // Validate seller
      if (announcement.userId.toString() !== sellerId) {
        throw new Error('Announcement seller mismatch');
      }

      // Get real-time exchange rate
      const exchangeRate = await this.getRealTimeExchangeRate(currency);
      if (!exchangeRate) {
        throw new Error('Exchange rate not available');
      }

      // Calculate IRR equivalent
      const irrAmount = amount * exchangeRate.rate;

      // Validate buyer balance
      const buyerAccount = await Account.findOne({
        userId: buyerId,
        currency: 'IRR',
        tenantId
      });

      if (!buyerAccount || buyerAccount.balance < irrAmount) {
        throw new Error('Insufficient balance for transaction');
      }

      // Create transaction
      const transaction = new P2PTransaction({
        sellerId,
        buyerId,
        announcementId,
        amount,
        currency,
        irrAmount,
        exchangeRate: exchangeRate.rate,
        paymentMethod,
        status: this.transactionStatuses.PENDING,
        tenantId,
        branchId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)) // 30 minutes
      });

      await transaction.save();

      // Reserve buyer's balance
      await this.reserveBalance(buyerAccount._id, irrAmount);

      logger.info('P2P transaction created', {
        transactionId: transaction._id,
        sellerId,
        buyerId,
        amount,
        currency,
        tenantId
      });

      return transaction;
    } catch (error) {
      logger.error('Create P2P transaction error:', error);
      throw error;
    }
  }

  /**
   * Add payment to P2P transaction
   */
  async addPayment(transactionId, paymentData) {
    try {
      const {
        accountNumber,
        amount,
        proofImageUrl,
        paidAt,
        userId
      } = paymentData;

      const transaction = await P2PTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== this.transactionStatuses.PENDING_PAYMENT) {
        throw new Error('Transaction not in payment pending status');
      }

      // Create payment record
      const payment = new P2PPayment({
        p2pTransactionId: transactionId,
        accountNumber,
        amount,
        proofImageUrl,
        paidAt: paidAt || new Date(),
        verifiedByUserId: userId,
        status: this.paymentStatuses.PENDING,
        createdAt: new Date()
      });

      await payment.save();

      // Update transaction status
      transaction.status = this.transactionStatuses.PAYMENT_CONFIRMED;
      await transaction.save();

      logger.info('Payment added to P2P transaction', {
        transactionId,
        paymentId: payment._id,
        amount,
        accountNumber
      });

      return payment;
    } catch (error) {
      logger.error('Add payment error:', error);
      throw error;
    }
  }

  /**
   * Confirm payment by seller
   */
  async confirmPayment(transactionId, paymentId, sellerId) {
    try {
      const transaction = await P2PTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.sellerId.toString() !== sellerId) {
        throw new Error('Only seller can confirm payment');
      }

      const payment = await P2PPayment.findById(paymentId);
      if (!payment || payment.p2pTransactionId.toString() !== transactionId) {
        throw new Error('Payment not found');
      }

      // Update payment status
      payment.status = this.paymentStatuses.CONFIRMED;
      payment.confirmedAt = new Date();
      await payment.save();

      // Complete transaction
      await this.completeTransaction(transactionId);

      logger.info('Payment confirmed', {
        transactionId,
        paymentId,
        sellerId
      });

      return { transaction, payment };
    } catch (error) {
      logger.error('Confirm payment error:', error);
      throw error;
    }
  }

  /**
   * Complete P2P transaction
   */
  async completeTransaction(transactionId) {
    try {
      const transaction = await P2PTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction status
      transaction.status = this.transactionStatuses.COMPLETED;
      transaction.completedAt = new Date();
      await transaction.save();

      // Transfer funds
      await this.transferFunds(transaction);

      // Release reserved balance
      await this.releaseReservedBalance(transaction.buyerId, transaction.irrAmount, transaction.tenantId);

      logger.info('P2P transaction completed', {
        transactionId,
        sellerId: transaction.sellerId,
        buyerId: transaction.buyerId,
        amount: transaction.amount
      });

      return transaction;
    } catch (error) {
      logger.error('Complete transaction error:', error);
      throw error;
    }
  }

  /**
   * Cancel P2P transaction
   */
  async cancelTransaction(transactionId, userId, reason) {
    try {
      const transaction = await P2PTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check if user can cancel
      if (transaction.sellerId.toString() !== userId && 
          transaction.buyerId.toString() !== userId) {
        throw new Error('Unauthorized to cancel transaction');
      }

      // Update transaction status
      transaction.status = this.transactionStatuses.CANCELLED;
      transaction.cancelledAt = new Date();
      transaction.cancellationReason = reason;
      await transaction.save();

      // Release reserved balance
      await this.releaseReservedBalance(transaction.buyerId, transaction.irrAmount, transaction.tenantId);

      logger.info('P2P transaction cancelled', {
        transactionId,
        userId,
        reason
      });

      return transaction;
    } catch (error) {
      logger.error('Cancel transaction error:', error);
      throw error;
    }
  }

  /**
   * Get real-time exchange rate
   */
  async getRealTimeExchangeRate(currency) {
    try {
      const rate = await ExchangeRate.findOne({
        fromCurrency: currency,
        toCurrency: 'IRR',
        isActive: true
      }).sort({ updatedAt: -1 });

      if (!rate) {
        throw new Error(`Exchange rate not available for ${currency}`);
      }

      // Check if rate is recent (within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
      if (rate.updatedAt < fiveMinutesAgo) {
        logger.warn('Exchange rate may be stale', {
          currency,
          rate: rate.rate,
          updatedAt: rate.updatedAt
        });
      }

      return rate;
    } catch (error) {
      logger.error('Get exchange rate error:', error);
      throw error;
    }
  }

  /**
   * Reserve balance for transaction
   */
  async reserveBalance(accountId, amount) {
    try {
      const account = await Account.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.balance < amount) {
        throw new Error('Insufficient balance');
      }

      account.balance -= amount;
      account.reservedBalance = (account.reservedBalance || 0) + amount;
      await account.save();

      logger.info('Balance reserved', {
        accountId,
        amount,
        newBalance: account.balance,
        reservedBalance: account.reservedBalance
      });
    } catch (error) {
      logger.error('Reserve balance error:', error);
      throw error;
    }
  }

  /**
   * Release reserved balance
   */
  async releaseReservedBalance(userId, amount, tenantId) {
    try {
      const account = await Account.findOne({
        userId,
        currency: 'IRR',
        tenantId
      });

      if (!account) {
        logger.warn('Account not found for balance release', { userId, tenantId });
        return;
      }

      account.reservedBalance = Math.max(0, (account.reservedBalance || 0) - amount);
      await account.save();

      logger.info('Reserved balance released', {
        userId,
        amount,
        reservedBalance: account.reservedBalance
      });
    } catch (error) {
      logger.error('Release reserved balance error:', error);
      throw error;
    }
  }

  /**
   * Transfer funds between accounts
   */
  async transferFunds(transaction) {
    try {
      // Get seller's account for the currency
      const sellerAccount = await Account.findOne({
        userId: transaction.sellerId,
        currency: transaction.currency,
        tenantId: transaction.tenantId
      });

      if (!sellerAccount) {
        // Create seller account if doesn't exist
        const newSellerAccount = new Account({
          userId: transaction.sellerId,
          currency: transaction.currency,
          balance: transaction.amount,
          tenantId: transaction.tenantId,
          branchId: transaction.branchId
        });
        await newSellerAccount.save();
      } else {
        // Add to existing seller account
        sellerAccount.balance += transaction.amount;
        await sellerAccount.save();
      }

      logger.info('Funds transferred', {
        transactionId: transaction._id,
        sellerId: transaction.sellerId,
        amount: transaction.amount,
        currency: transaction.currency
      });
    } catch (error) {
      logger.error('Transfer funds error:', error);
      throw error;
    }
  }

  /**
   * Get transaction with payments
   */
  async getTransactionWithPayments(transactionId) {
    try {
      const transaction = await P2PTransaction.findById(transactionId)
        .populate('sellerId', 'name email')
        .populate('buyerId', 'name email')
        .populate('announcementId', 'title description');

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const payments = await P2PPayment.find({
        p2pTransactionId: transactionId
      }).sort({ createdAt: -1 });

      return {
        transaction,
        payments
      };
    } catch (error) {
      logger.error('Get transaction with payments error:', error);
      throw error;
    }
  }

  /**
   * Get user's P2P transactions
   */
  async getUserTransactions(userId, tenantId, filters = {}) {
    try {
      const query = {
        $or: [
          { sellerId: userId },
          { buyerId: userId }
        ],
        tenantId
      };

      // Apply status filter
      if (filters.status) {
        query.status = filters.status;
      }

      // Apply date range filter
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      const transactions = await P2PTransaction.find(query)
        .populate('sellerId', 'name email')
        .populate('buyerId', 'name email')
        .populate('announcementId', 'title')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      return transactions;
    } catch (error) {
      logger.error('Get user transactions error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired transactions
   */
  async cleanupExpiredTransactions() {
    try {
      const expiredTransactions = await P2PTransaction.find({
        status: { $in: [this.transactionStatuses.PENDING, this.transactionStatuses.PENDING_PAYMENT] },
        expiresAt: { $lt: new Date() }
      });

      for (const transaction of expiredTransactions) {
        transaction.status = this.transactionStatuses.EXPIRED;
        await transaction.save();

        // Release reserved balance
        await this.releaseReservedBalance(
          transaction.buyerId,
          transaction.irrAmount,
          transaction.tenantId
        );
      }

      logger.info('Expired transactions cleaned up', {
        count: expiredTransactions.length
      });

      return expiredTransactions.length;
    } catch (error) {
      logger.error('Cleanup expired transactions error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedP2PService(); 