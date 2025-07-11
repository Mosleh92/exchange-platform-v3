const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const TenantHierarchyService = require('../core/multi-tenancy/TenantHierarchyService');
const EnhancedAuditService = require('./enhancedAuditService');
const logger = require('../utils/logger');

/**
 * Enhanced Account Service
 * Comprehensive account management with proper tenant isolation
 */
class EnhancedAccountService {
  constructor() {
    this.auditService = new EnhancedAuditService();
  }

  /**
   * Get account balance with tenant isolation
   */
  async getAccountBalance(accountId, userId, tenantId) {
    try {
      // Validate user access to account
      const account = await Account.findOne({
        _id: accountId,
        tenantId: tenantId
      });

      if (!account) {
        throw new Error('Account not found or access denied');
      }

      // Check if user has access to this account
      const hasAccess = await this.validateAccountAccess(userId, accountId, tenantId);
      if (!hasAccess) {
        throw new Error('Access denied to account');
      }

      // Log account access
      await this.auditService.logEvent({
        eventType: 'ACCOUNT_ACCESS',
        userId,
        tenantId,
        action: 'GET_BALANCE',
        resource: 'ACCOUNT',
        resourceId: accountId,
        details: {
          accountId,
          balance: account.balance,
          currency: account.currency
        },
        severity: 'LOW'
      });

      return {
        balance: account.balance,
        currency: account.currency,
        accountType: account.accountType,
        lastUpdated: account.updatedAt
      };
    } catch (error) {
      logger.error('Get account balance error:', error);
      throw error;
    }
  }

  /**
   * Validate account access with tenant isolation
   */
  async validateAccountAccess(userId, accountId, tenantId) {
    try {
      // Check if account belongs to user's tenant
      const account = await Account.findOne({
        _id: accountId,
        tenantId: tenantId
      });

      if (!account) {
        return false;
      }

      // Check if user owns the account or has admin access
      if (account.userId.toString() === userId.toString()) {
        return true;
      }

      // Check if user has admin role for this tenant
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
   * Update account balance with transaction lock
   */
  async updateAccountBalance(accountId, amount, operation, userId, tenantId) {
    const session = await require('mongoose').startSession();
    
    try {
      await session.withTransaction(async () => {
        // Lock account for update
        const account = await Account.findOne({
          _id: accountId,
          tenantId: tenantId
        }).session(session);

        if (!account) {
          throw new Error('Account not found');
        }

        // Validate access
        const hasAccess = await this.validateAccountAccess(userId, accountId, tenantId);
        if (!hasAccess) {
          throw new Error('Access denied to account');
        }

        // Check sufficient balance for debit operations
        if (operation === 'DEBIT' && account.balance < amount) {
          throw new Error('Insufficient balance');
        }

        // Update balance
        const oldBalance = account.balance;
        if (operation === 'DEBIT') {
          account.balance -= amount;
        } else if (operation === 'CREDIT') {
          account.balance += amount;
        }

        await account.save({ session });

        // Log balance change
        await this.auditService.logEvent({
          eventType: 'BALANCE_CHANGED',
          userId,
          tenantId,
          action: 'UPDATE_BALANCE',
          resource: 'ACCOUNT',
          resourceId: accountId,
          details: {
            accountId,
            oldBalance,
            newBalance: account.balance,
            amount,
            operation,
            currency: account.currency
          },
          severity: 'HIGH'
        });

        logger.info('Account balance updated', {
          accountId,
          oldBalance,
          newBalance: account.balance,
          operation,
          userId
        });
      });

      return { success: true };
    } catch (error) {
      logger.error('Update account balance error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create account with tenant isolation
   */
  async createAccount(accountData, userId, tenantId) {
    try {
      const { currency, accountType, initialBalance = 0 } = accountData;

      const account = new Account({
        userId,
        tenantId,
        currency,
        accountType,
        balance: initialBalance,
        isActive: true,
        createdAt: new Date()
      });

      await account.save();

      // Log account creation
      await this.auditService.logEvent({
        eventType: 'ACCOUNT_CREATED',
        userId,
        tenantId,
        action: 'CREATE_ACCOUNT',
        resource: 'ACCOUNT',
        resourceId: account._id,
        details: {
          currency,
          accountType,
          initialBalance
        },
        severity: 'MEDIUM'
      });

      logger.info('Account created', {
        accountId: account._id,
        userId,
        tenantId,
        currency
      });

      return account;
    } catch (error) {
      logger.error('Create account error:', error);
      throw error;
    }
  }

  /**
   * Get user accounts with tenant isolation
   */
  async getUserAccounts(userId, tenantId, filters = {}) {
    try {
      const query = {
        userId,
        tenantId,
        isActive: true
      };

      // Apply additional filters
      if (filters.currency) {
        query.currency = filters.currency;
      }

      if (filters.accountType) {
        query.accountType = filters.accountType;
      }

      const accounts = await Account.find(query).sort({ createdAt: -1 });

      // Log account listing
      await this.auditService.logEvent({
        eventType: 'ACCOUNT_LISTED',
        userId,
        tenantId,
        action: 'GET_ACCOUNTS',
        resource: 'ACCOUNT',
        resourceId: null,
        details: {
          accountCount: accounts.length,
          filters
        },
        severity: 'LOW'
      });

      return accounts;
    } catch (error) {
      logger.error('Get user accounts error:', error);
      throw error;
    }
  }

  /**
   * Transfer funds between accounts with proper isolation
   */
  async transferFunds(transferData, userId, tenantId) {
    const session = await require('mongoose').startSession();
    
    try {
      const { fromAccountId, toAccountId, amount, currency, description } = transferData;

      await session.withTransaction(async () => {
        // Validate source account access
        const fromAccount = await Account.findOne({
          _id: fromAccountId,
          tenantId: tenantId
        }).session(session);

        if (!fromAccount) {
          throw new Error('Source account not found');
        }

        // Validate destination account access
        const toAccount = await Account.findOne({
          _id: toAccountId,
          tenantId: tenantId
        }).session(session);

        if (!toAccount) {
          throw new Error('Destination account not found');
        }

        // Check sufficient balance
        if (fromAccount.balance < amount) {
          throw new Error('Insufficient balance for transfer');
        }

        // Update balances
        fromAccount.balance -= amount;
        toAccount.balance += amount;

        await fromAccount.save({ session });
        await toAccount.save({ session });

        // Create transfer transaction
        const transaction = new Transaction({
          userId,
          tenantId,
          fromAccountId,
          toAccountId,
          amount,
          currency,
          transactionType: 'TRANSFER',
          description,
          status: 'COMPLETED',
          createdAt: new Date()
        });

        await transaction.save({ session });

        // Log transfer
        await this.auditService.logEvent({
          eventType: 'TRANSFER_COMPLETED',
          userId,
          tenantId,
          action: 'TRANSFER_FUNDS',
          resource: 'TRANSACTION',
          resourceId: transaction._id,
          details: {
            fromAccountId,
            toAccountId,
            amount,
            currency,
            description
          },
          severity: 'HIGH'
        });

        logger.info('Funds transferred successfully', {
          transactionId: transaction._id,
          fromAccountId,
          toAccountId,
          amount,
          userId
        });
      });

      return { success: true };
    } catch (error) {
      logger.error('Transfer funds error:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get account transaction history with tenant isolation
   */
  async getAccountTransactions(accountId, userId, tenantId, filters = {}) {
    try {
      // Validate account access
      const hasAccess = await this.validateAccountAccess(userId, accountId, tenantId);
      if (!hasAccess) {
        throw new Error('Access denied to account');
      }

      const query = {
        $or: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ],
        tenantId
      };

      // Apply date filters
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }

      // Apply transaction type filter
      if (filters.transactionType) {
        query.transactionType = filters.transactionType;
      }

      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50);

      // Log transaction history access
      await this.auditService.logEvent({
        eventType: 'TRANSACTION_HISTORY_ACCESSED',
        userId,
        tenantId,
        action: 'GET_TRANSACTIONS',
        resource: 'ACCOUNT',
        resourceId: accountId,
        details: {
          accountId,
          transactionCount: transactions.length,
          filters
        },
        severity: 'LOW'
      });

      return transactions;
    } catch (error) {
      logger.error('Get account transactions error:', error);
      throw error;
    }
  }

  /**
   * Validate account ownership
   */
  async validateAccountOwnership(accountId, userId, tenantId) {
    try {
      const account = await Account.findOne({
        _id: accountId,
        userId: userId,
        tenantId: tenantId
      });

      return !!account;
    } catch (error) {
      logger.error('Validate account ownership error:', error);
      return false;
    }
  }
}

module.exports = new EnhancedAccountService(); 