const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const EnhancedAuditService = require('./enhancedAuditService');
const logger = require('../utils/logger');

/**
 * Enhanced Transaction Service
 * Handles transactions with deadlock prevention and proper locking
 */
class EnhancedTransactionService {
  constructor() {
    this.auditService = new EnhancedAuditService();
    this.lockTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  /**
   * Execute transaction with deadlock prevention
   */
  async executeTransaction(transactionData, userId, tenantId) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        return await this.executeTransactionWithLock(transactionData, userId, tenantId);
      } catch (error) {
        if (error.code === 112 && retries < this.maxRetries - 1) {
          // Deadlock detected, retry with exponential backoff
          retries++;
          const delay = Math.pow(2, retries) * 100; // Exponential backoff
          logger.warn(`Deadlock detected, retrying transaction (attempt ${retries})`, {
            userId,
            tenantId,
            delay
          });
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Transaction failed after maximum retries');
  }

  /**
   * Execute transaction with proper locking
   */
  async executeTransactionWithLock(transactionData, userId, tenantId) {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        const {
          fromAccountId,
          toAccountId,
          amount,
          currency,
          transactionType,
          description
        } = transactionData;

        // Lock accounts in consistent order to prevent deadlocks
        const accountIds = [fromAccountId, toAccountId].sort();
        const accounts = await Account.find({
          _id: { $in: accountIds },
          tenantId: tenantId
        }).session(session);

        if (accounts.length !== accountIds.length) {
          throw new Error('One or more accounts not found');
        }

        // Validate account access
        for (const account of accounts) {
          const hasAccess = await this.validateAccountAccess(userId, account._id, tenantId);
          if (!hasAccess) {
            throw new Error(`Access denied to account ${account._id}`);
          }
        }

        const fromAccount = accounts.find(a => a._id.toString() === fromAccountId.toString());
        const toAccount = accounts.find(a => a._id.toString() === toAccountId.toString());

        if (!fromAccount || !toAccount) {
          throw new Error('Invalid account configuration');
        }

        // Check sufficient balance
        if (fromAccount.balance < amount) {
          throw new Error('Insufficient balance for transaction');
        }

        // Update balances atomically
        fromAccount.balance -= amount;
        toAccount.balance += amount;

        // Save accounts with optimistic locking
        await fromAccount.save({ session });
        await toAccount.save({ session });

        // Create transaction record
        const transaction = new Transaction({
          userId,
          tenantId,
          fromAccountId,
          toAccountId,
          amount,
          currency,
          transactionType,
          description,
          status: 'COMPLETED',
          createdAt: new Date()
        });

        await transaction.save({ session });

        // Log transaction
        await this.auditService.logEvent({
          eventType: 'TRANSACTION_COMPLETED',
          userId,
          tenantId,
          action: 'EXECUTE_TRANSACTION',
          resource: 'TRANSACTION',
          resourceId: transaction._id,
          details: {
            fromAccountId,
            toAccountId,
            amount,
            currency,
            transactionType
          },
          severity: 'HIGH'
        });

        logger.info('Transaction completed successfully', {
          transactionId: transaction._id,
          userId,
          fromAccountId,
          toAccountId,
          amount
        });

        return transaction;
      }, {
        readConcern: 'snapshot',
        writeConcern: { w: 'majority' }
      });

      return result;
    } catch (error) {
      logger.error('Transaction execution error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Execute batch transactions with proper ordering
   */
  async executeBatchTransactions(transactions, userId, tenantId) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const results = [];
        
        // Sort transactions by account IDs to prevent deadlocks
        const sortedTransactions = this.sortTransactionsByAccountIds(transactions);
        
        for (const transactionData of sortedTransactions) {
          const result = await this.executeSingleTransaction(transactionData, userId, tenantId, session);
          results.push(result);
        }
        
        return results;
      });
    } catch (error) {
      logger.error('Batch transaction execution error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Execute single transaction within session
   */
  async executeSingleTransaction(transactionData, userId, tenantId, session) {
    const { fromAccountId, toAccountId, amount, currency, transactionType, description } = transactionData;

    // Lock and validate accounts
    const accounts = await Account.find({
      _id: { $in: [fromAccountId, toAccountId] },
      tenantId: tenantId
    }).session(session);

    if (accounts.length !== 2) {
      throw new Error('Invalid account configuration');
    }

    const fromAccount = accounts.find(a => a._id.toString() === fromAccountId.toString());
    const toAccount = accounts.find(a => a._id.toString() === toAccountId.toString());

    // Validate access and balance
    const fromAccess = await this.validateAccountAccess(userId, fromAccountId, tenantId);
    const toAccess = await this.validateAccountAccess(userId, toAccountId, tenantId);

    if (!fromAccess || !toAccess) {
      throw new Error('Access denied to one or more accounts');
    }

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient balance for transaction');
    }

    // Update balances
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    await fromAccount.save({ session });
    await toAccount.save({ session });

    // Create transaction record
    const transaction = new Transaction({
      userId,
      tenantId,
      fromAccountId,
      toAccountId,
      amount,
      currency,
      transactionType,
      description,
      status: 'COMPLETED',
      createdAt: new Date()
    });

    await transaction.save({ session });

    return transaction;
  }

  /**
   * Sort transactions by account IDs to prevent deadlocks
   */
  sortTransactionsByAccountIds(transactions) {
    return transactions.sort((a, b) => {
      const aMin = Math.min(a.fromAccountId, a.toAccountId);
      const bMin = Math.min(b.fromAccountId, b.toAccountId);
      return aMin - bMin;
    });
  }

  /**
   * Validate account access
   */
  async validateAccountAccess(userId, accountId, tenantId) {
    try {
      const account = await Account.findOne({
        _id: accountId,
        tenantId: tenantId
      });

      if (!account) return false;

      // Check if user owns the account
      if (account.userId.toString() === userId.toString()) {
        return true;
      }

      // Check if user has admin role
      const user = await require('../models/User').findById(userId);
      if (user && ['admin', 'super_admin'].includes(user.role)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Validate account access error:', error);
      return false;
    }
  }

  /**
   * Get transaction with optimistic locking
   */
  async getTransactionWithVersion(transactionId, expectedVersion) {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      version: expectedVersion
    });

    if (!transaction) {
      throw new Error('Transaction not found or version mismatch');
    }

    return transaction;
  }

  /**
   * Update transaction with optimistic locking
   */
  async updateTransactionWithVersion(transactionId, updates, expectedVersion) {
    const result = await Transaction.findOneAndUpdate(
      {
        _id: transactionId,
        version: expectedVersion
      },
      {
        ...updates,
        version: expectedVersion + 1,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!result) {
      throw new Error('Transaction not found or version mismatch');
    }

    return result;
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transactionId, userId, tenantId) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const transaction = await Transaction.findById(transactionId).session(session);
        
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        // Reverse the transaction
        const fromAccount = await Account.findById(transaction.fromAccountId).session(session);
        const toAccount = await Account.findById(transaction.toAccountId).session(session);

        if (fromAccount && toAccount) {
          fromAccount.balance += transaction.amount;
          toAccount.balance -= transaction.amount;

          await fromAccount.save({ session });
          await toAccount.save({ session });
        }

        // Mark transaction as rolled back
        transaction.status = 'ROLLED_BACK';
        transaction.rolledBackAt = new Date();
        transaction.rolledBackBy = userId;

        await transaction.save({ session });

        // Log rollback
        await this.auditService.logEvent({
          eventType: 'TRANSACTION_ROLLED_BACK',
          userId,
          tenantId,
          action: 'ROLLBACK_TRANSACTION',
          resource: 'TRANSACTION',
          resourceId: transactionId,
          details: {
            originalAmount: transaction.amount,
            originalCurrency: transaction.currency
          },
          severity: 'HIGH'
        });

        return transaction;
      });
    } catch (error) {
      logger.error('Rollback transaction error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStatistics(userId, tenantId, startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            tenantId: new mongoose.Types.ObjectId(tenantId),
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: {
              transactionType: '$transactionType',
              status: '$status'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ];

      const statistics = await Transaction.aggregate(pipeline);

      return statistics;
    } catch (error) {
      logger.error('Get transaction statistics error:', error);
      throw error;
    }
  }

  /**
   * Sleep utility for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EnhancedTransactionService(); 