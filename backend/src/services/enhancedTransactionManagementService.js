const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const AccountingEntry = require('../models/accounting/AccountingEntry');
const Account = require('../models/Account');
const EnhancedCurrencyConversionService = require('./enhancedCurrencyConversionService');
const logger = require('../utils/logger');

/**
 * Enhanced Transaction Management Service
 * Provides atomic transaction operations, rollback capabilities,
 * and integration with double-entry accounting
 */
class EnhancedTransactionManagementService {
  constructor() {
    this.transactionStates = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
      ROLLED_BACK: 'rolled_back'
    };

    this.lockTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  /**
   * Create a new financial transaction with atomic operations
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction result
   */
  async createTransaction(transactionData) {
    const session = await mongoose.startSession();
    const lockKey = `transaction_lock_${transactionData.tenantId}_${Date.now()}`;
    
    try {
      return await session.withTransaction(async () => {
        // Validate transaction data
        this.validateTransactionData(transactionData);

        // Create transaction record
        const transaction = await this.createTransactionRecord(transactionData, session);

        // Create accounting entries
        const accountingEntries = await this.createAccountingEntries(transaction, session);

        // Update account balances atomically
        await this.updateAccountBalances(accountingEntries, session);

        // Validate business rules
        await this.validateBusinessRules(transaction, session);

        // Process currency conversion if needed
        if (transactionData.fromCurrency !== transactionData.toCurrency) {
          await this.processCurrencyConversion(transaction, session);
        }

        // Final validation
        await this.validateTransactionIntegrity(transaction, accountingEntries, session);

        // Update transaction status to completed
        transaction.status = this.transactionStates.COMPLETED;
        transaction.workflow.current_step = 'completed';
        await transaction.save({ session });

        logger.info('Transaction created successfully', {
          transactionId: transaction._id,
          tenantId: transaction.tenantId,
          amount: transaction.amount,
          type: transaction.type
        });

        return {
          success: true,
          transaction,
          accountingEntries,
          message: 'Transaction completed successfully'
        };
      });

    } catch (error) {
      logger.error('Transaction creation failed', {
        error: error.message,
        transactionData,
        stack: error.stack
      });

      // Attempt rollback
      await this.rollbackTransaction(transactionData, error.message);

      throw new Error(`Transaction failed: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Rollback a transaction and all related entries
   * @param {Object} transactionData - Original transaction data
   * @param {string} reason - Rollback reason
   * @returns {Promise<boolean>} Rollback success
   */
  async rollbackTransaction(transactionData, reason) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Find the transaction
        const transaction = await Transaction.findOne({
          tenantId: transactionData.tenantId,
          transactionId: transactionData.transactionId || transactionData._id
        }).session(session);

        if (!transaction) {
          logger.warn('Transaction not found for rollback', { transactionData });
          return false;
        }

        // Prevent rollback of already completed transactions
        if (transaction.status === this.transactionStates.COMPLETED) {
          // Create reversal entries instead
          return await this.createReversalEntries(transaction, reason, session);
        }

        // Find and reverse accounting entries
        const accountingEntries = await AccountingEntry.find({
          transactionId: transaction._id,
          status: 'posted'
        }).session(session);

        for (const entry of accountingEntries) {
          await AccountingEntry.reverseEntry(entry._id, reason, transactionData.userId);
        }

        // Reverse balance changes
        await this.reverseBalanceChanges(accountingEntries, session);

        // Update transaction status
        transaction.status = this.transactionStates.ROLLED_BACK;
        transaction.audit.reason = reason;
        transaction.audit.cancelledAt = new Date();
        transaction.audit.cancelledBy = transactionData.userId;
        
        await transaction.save({ session });

        logger.info('Transaction rolled back successfully', {
          transactionId: transaction._id,
          reason
        });

        return true;
      });

    } catch (error) {
      logger.error('Transaction rollback failed', {
        error: error.message,
        transactionData,
        reason
      });
      return false;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process currency conversion with validation
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   * @returns {Promise<Object>} Conversion result
   */
  async processCurrencyConversion(transaction, session) {
    try {
      const conversionResult = await EnhancedCurrencyConversionService.convertCurrency(
        transaction.amount,
        transaction.fromCurrency,
        transaction.toCurrency,
        transaction.exchangeRate,
        transaction.tenantId
      );

      // Validate conversion result
      if (!conversionResult || conversionResult.convertedAmount <= 0) {
        throw new Error('Invalid currency conversion result');
      }

      // Update transaction with conversion details
      transaction.convertedAmount = conversionResult.convertedAmount;
      transaction.exchangeRate = conversionResult.exchangeRate;
      transaction.totalAmount = conversionResult.convertedAmount + (transaction.commission || 0);

      // Create conversion accounting entries
      await this.createConversionAccountingEntries(transaction, conversionResult, session);

      return conversionResult;

    } catch (error) {
      logger.error('Currency conversion failed', {
        transactionId: transaction._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create accounting entries for the transaction
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   * @returns {Promise<Array>} Created accounting entries
   */
  async createAccountingEntries(transaction, session) {
    try {
      const entries = this.generateAccountingEntries(transaction);
      
      const accountingEntries = await AccountingEntry.createDoubleEntry({
        tenantId: transaction.tenantId,
        transactionId: transaction._id,
        description: transaction.notes?.system || transaction.type,
        entries,
        userId: transaction.created_by,
        branchId: transaction.branchId,
        metadata: {
          transactionType: transaction.type,
          ipAddress: transaction.metadata?.ipAddress,
          sessionId: transaction.metadata?.session_id
        }
      });

      return accountingEntries;

    } catch (error) {
      logger.error('Accounting entries creation failed', {
        transactionId: transaction._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate appropriate accounting entries based on transaction type
   * @param {Object} transaction - Transaction object
   * @returns {Array} Array of accounting entries
   */
  generateAccountingEntries(transaction) {
    const entries = [];

    switch (transaction.type) {
      case 'currency_buy':
        // Customer gives IRR, receives foreign currency
        entries.push(
          {
            accountCode: `CASH_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CASH', transaction.fromCurrency),
            amount: transaction.amount,
            type: 'DEBIT',
            description: `Cash received in ${transaction.fromCurrency}`,
            currency: transaction.fromCurrency
          },
          {
            accountCode: `CUSTOMER_BALANCE_${transaction.toCurrency}`,
            accountId: this.getAccountId('CUSTOMER', transaction.customerId, transaction.toCurrency),
            amount: transaction.convertedAmount,
            type: 'CREDIT',
            description: `Customer balance credited in ${transaction.toCurrency}`,
            currency: transaction.toCurrency
          }
        );
        break;

      case 'currency_sell':
        // Customer gives foreign currency, receives IRR
        entries.push(
          {
            accountCode: `CUSTOMER_BALANCE_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CUSTOMER', transaction.customerId, transaction.fromCurrency),
            amount: transaction.amount,
            type: 'DEBIT',
            description: `Customer balance debited in ${transaction.fromCurrency}`,
            currency: transaction.fromCurrency
          },
          {
            accountCode: `CASH_${transaction.toCurrency}`,
            accountId: this.getAccountId('CASH', transaction.toCurrency),
            amount: transaction.convertedAmount,
            type: 'CREDIT',
            description: `Cash paid in ${transaction.toCurrency}`,
            currency: transaction.toCurrency
          }
        );
        break;

      case 'transfer':
        // Internal transfer between accounts
        entries.push(
          {
            accountCode: `ACCOUNT_${transaction.metadata?.fromAccountId}`,
            accountId: transaction.metadata?.fromAccountId,
            amount: transaction.amount,
            type: 'DEBIT',
            description: 'Transfer from account',
            currency: transaction.fromCurrency
          },
          {
            accountCode: `ACCOUNT_${transaction.metadata?.toAccountId}`,
            accountId: transaction.metadata?.toAccountId,
            amount: transaction.amount,
            type: 'CREDIT',
            description: 'Transfer to account',
            currency: transaction.fromCurrency
          }
        );
        break;

      case 'deposit':
        // Customer deposit
        entries.push(
          {
            accountCode: `CASH_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CASH', transaction.fromCurrency),
            amount: transaction.amount,
            type: 'DEBIT',
            description: 'Cash deposit received',
            currency: transaction.fromCurrency
          },
          {
            accountCode: `CUSTOMER_BALANCE_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CUSTOMER', transaction.customerId, transaction.fromCurrency),
            amount: transaction.amount,
            type: 'CREDIT',
            description: 'Customer balance credited',
            currency: transaction.fromCurrency
          }
        );
        break;

      case 'withdrawal':
        // Customer withdrawal
        entries.push(
          {
            accountCode: `CUSTOMER_BALANCE_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CUSTOMER', transaction.customerId, transaction.fromCurrency),
            amount: transaction.amount,
            type: 'DEBIT',
            description: 'Customer balance debited',
            currency: transaction.fromCurrency
          },
          {
            accountCode: `CASH_${transaction.fromCurrency}`,
            accountId: this.getAccountId('CASH', transaction.fromCurrency),
            amount: transaction.amount,
            type: 'CREDIT',
            description: 'Cash withdrawal paid',
            currency: transaction.fromCurrency
          }
        );
        break;

      default:
        throw new Error(`Unsupported transaction type: ${transaction.type}`);
    }

    // Add commission entry if applicable
    if (transaction.commission && transaction.commission > 0) {
      entries.push({
        accountCode: 'COMMISSION_REVENUE',
        accountId: this.getAccountId('REVENUE', 'COMMISSION'),
        amount: transaction.commission,
        type: 'CREDIT',
        description: 'Commission revenue',
        currency: transaction.fromCurrency
      });
    }

    return entries;
  }

  /**
   * Update account balances atomically
   * @param {Array} accountingEntries - Accounting entries
   * @param {Object} session - MongoDB session
   */
  async updateAccountBalances(accountingEntries, session) {
    try {
      for (const entry of accountingEntries) {
        const balanceChange = entry.debit - entry.credit;
        
        await Account.findByIdAndUpdate(
          entry.accountId,
          {
            $inc: { 
              balance: balanceChange,
              totalDebits: entry.debit,
              totalCredits: entry.credit
            },
            $set: { lastUpdated: new Date() }
          },
          { session, new: true }
        );
      }
    } catch (error) {
      logger.error('Balance update failed', {
        error: error.message,
        accountingEntries
      });
      throw error;
    }
  }

  /**
   * Validate business rules for the transaction
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   */
  async validateBusinessRules(transaction, session) {
    try {
      // Check daily transaction limits
      await this.validateDailyLimits(transaction, session);

      // Check account balance sufficiency
      await this.validateAccountBalance(transaction, session);

      // Check KYC/AML compliance
      await this.validateCompliance(transaction, session);

      // Validate exchange rate reasonableness
      await this.validateExchangeRate(transaction);

    } catch (error) {
      logger.error('Business rule validation failed', {
        transactionId: transaction._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create reversal entries for completed transactions
   * @param {Object} transaction - Transaction object
   * @param {string} reason - Reversal reason
   * @param {Object} session - MongoDB session
   * @returns {Promise<boolean>} Reversal success
   */
  async createReversalEntries(transaction, reason, session) {
    try {
      // Find original accounting entries
      const originalEntries = await AccountingEntry.find({
        transactionId: transaction._id,
        status: 'posted'
      }).session(session);

      // Create reversal entries
      for (const entry of originalEntries) {
        await AccountingEntry.reverseEntry(entry._id, reason, transaction.created_by);
      }

      // Update transaction status
      transaction.status = 'refunded';
      transaction.audit.reason = reason;
      transaction.audit.cancelledAt = new Date();
      
      await transaction.save({ session });

      return true;

    } catch (error) {
      logger.error('Reversal entries creation failed', {
        transactionId: transaction._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate transaction data before processing
   * @param {Object} transactionData - Transaction data
   */
  validateTransactionData(transactionData) {
    const required = ['tenantId', 'customerId', 'type', 'amount', 'fromCurrency', 'toCurrency'];
    
    for (const field of required) {
      if (!transactionData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (transactionData.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    if (!this.isValidTransactionType(transactionData.type)) {
      throw new Error(`Invalid transaction type: ${transactionData.type}`);
    }
  }

  /**
   * Create transaction record
   * @param {Object} transactionData - Transaction data
   * @param {Object} session - MongoDB session
   * @returns {Promise<Object>} Created transaction
   */
  async createTransactionRecord(transactionData, session) {
    const transaction = new Transaction({
      ...transactionData,
      transactionId: Transaction.generateTransactionId(),
      status: this.transactionStates.PROCESSING,
      workflow: {
        current_step: 'processing',
        steps: [
          { step: 'payment_pending', status: 'completed' },
          { step: 'processing', status: 'pending' }
        ]
      }
    });

    await transaction.save({ session });
    return transaction;
  }

  /**
   * Helper method to get account ID based on type and currency
   * @param {string} accountType - Account type
   * @param {string} identifier - Account identifier
   * @param {string} currency - Currency code
   * @returns {string} Account ID
   */
  getAccountId(accountType, identifier, currency = null) {
    // This would typically query a chart of accounts
    // For now, return a constructed ID
    const accountKey = currency ? 
      `${accountType}_${identifier}_${currency}` : 
      `${accountType}_${identifier}`;
    
    return `account_${accountKey}`;
  }

  /**
   * Check if transaction type is valid
   * @param {string} type - Transaction type
   * @returns {boolean} True if valid
   */
  isValidTransactionType(type) {
    const validTypes = [
      'currency_buy', 'currency_sell', 'transfer', 'deposit', 
      'withdrawal', 'remittance', 'fee', 'refund', 'adjustment'
    ];
    return validTypes.includes(type);
  }

  /**
   * Validate daily transaction limits
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   */
  async validateDailyLimits(transaction, session) {
    // Implementation would check against daily limits
    // For now, just log the validation
    logger.info('Daily limits validation', {
      transactionId: transaction._id,
      amount: transaction.amount
    });
  }

  /**
   * Validate account balance sufficiency
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   */
  async validateAccountBalance(transaction, session) {
    // Implementation would check account balances
    logger.info('Account balance validation', {
      transactionId: transaction._id
    });
  }

  /**
   * Validate KYC/AML compliance
   * @param {Object} transaction - Transaction object
   * @param {Object} session - MongoDB session
   */
  async validateCompliance(transaction, session) {
    // Implementation would check compliance rules
    logger.info('Compliance validation', {
      transactionId: transaction._id
    });
  }

  /**
   * Validate exchange rate reasonableness
   * @param {Object} transaction - Transaction object
   */
  async validateExchangeRate(transaction) {
    if (transaction.fromCurrency === transaction.toCurrency) {
      return; // No exchange rate needed
    }

    if (!transaction.exchangeRate || transaction.exchangeRate <= 0) {
      throw new Error('Invalid exchange rate');
    }

    // Additional rate validation logic would go here
    logger.info('Exchange rate validation', {
      transactionId: transaction._id,
      rate: transaction.exchangeRate
    });
  }

  /**
   * Validate transaction integrity
   * @param {Object} transaction - Transaction object
   * @param {Array} accountingEntries - Accounting entries
   * @param {Object} session - MongoDB session
   */
  async validateTransactionIntegrity(transaction, accountingEntries, session) {
    // Check double-entry balance
    const totalDebits = accountingEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredits = accountingEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Accounting entries are not balanced');
    }

    logger.info('Transaction integrity validated', {
      transactionId: transaction._id,
      totalDebits,
      totalCredits
    });
  }

  /**
   * Reverse balance changes
   * @param {Array} accountingEntries - Original accounting entries
   * @param {Object} session - MongoDB session
   */
  async reverseBalanceChanges(accountingEntries, session) {
    for (const entry of accountingEntries) {
      const balanceChange = -(entry.debit - entry.credit); // Reverse the change
      
      await Account.findByIdAndUpdate(
        entry.accountId,
        {
          $inc: { balance: balanceChange },
          $set: { lastUpdated: new Date() }
        },
        { session }
      );
    }
  }

  /**
   * Create conversion accounting entries
   * @param {Object} transaction - Transaction object
   * @param {Object} conversionResult - Conversion result
   * @param {Object} session - MongoDB session
   */
  async createConversionAccountingEntries(transaction, conversionResult, session) {
    // Create entries for currency conversion spread/fees if applicable
    if (conversionResult.fees && conversionResult.fees.total > 0) {
      const feeEntries = [
        {
          accountCode: 'CONVERSION_FEE_REVENUE',
          accountId: this.getAccountId('REVENUE', 'CONVERSION_FEE'),
          amount: conversionResult.fees.total,
          type: 'CREDIT',
          description: 'Currency conversion fee',
          currency: transaction.fromCurrency
        }
      ];

      await AccountingEntry.createDoubleEntry({
        tenantId: transaction.tenantId,
        transactionId: transaction._id,
        description: 'Currency conversion fees',
        entries: feeEntries,
        userId: transaction.created_by,
        branchId: transaction.branchId
      });
    }
  }
}

module.exports = new EnhancedTransactionManagementService();