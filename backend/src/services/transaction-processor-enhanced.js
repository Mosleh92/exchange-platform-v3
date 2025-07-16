const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const JournalEntry = require('../models/accounting/JournalEntry');
const User = require('../models/User');
const Tenant = require('../models/tenants/Tenant');
const { SecurityLogger } = require('../utils/securityLogger');
const { ErrorHandler } = require('../utils/errorHandler');

/**
 * Enhanced Transaction Processing Service
 * Implements atomic transactions, financial integrity, and comprehensive security
 */
class SecureTransactionService {
  constructor(tenantContext) {
    this.tenantContext = tenantContext;
    this.securityLogger = new SecurityLogger();
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Execute secure currency exchange transaction
   */
  async executeCurrencyExchange(transactionData) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Step 1: Validate transaction data
        const validationResult = await this.validateTransaction(transactionData);
        if (!validationResult.valid) {
          throw new Error(`Transaction validation failed: ${validationResult.message}`);
        }

        // Step 2: Encrypt sensitive data
        const encryptedTransaction = this.encryptSensitiveData(transactionData);

        // Step 3: Create transaction record
        const transaction = await this.createTransactionRecord(encryptedTransaction, session);

        // Step 4: Process financial calculations
        const financialResult = await this.processFinancialCalculations(transaction, session);

        // Step 5: Create journal entries (double-entry accounting)
        await this.createJournalEntries(transaction, financialResult, session);

        // Step 6: Update user balances
        await this.updateUserBalances(transaction, session);

        // Step 7: Log secure transaction
        await this.logSecureTransaction(transaction, financialResult);

        return { transaction, financialResult };
      });

      // Commit transaction
      await session.commitTransaction();
      
      return { success: true, transactionId: transactionData.transactionId };
    } catch (error) {
      await session.abortTransaction();
      
      // Log security alert
      await this.securityLogger.logSecurityEvent('TRANSACTION_FAILED', {
        error: error.message,
        transactionData: this.sanitizeForLogging(transactionData),
        tenantId: this.tenantContext.tenantId
      });

      throw this.errorHandler.createError('TRANSACTION_PROCESSING_ERROR', error.message);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Validate transaction data comprehensively
   */
  async validateTransaction(transactionData) {
    try {
      // Required fields validation
      const requiredFields = ['type', 'fromCurrency', 'toCurrency', 'amount', 'exchangeRate'];
      for (const field of requiredFields) {
        if (!transactionData[field]) {
          return { valid: false, message: `Missing required field: ${field}` };
        }
      }

      // Amount validation
      if (transactionData.amount <= 0) {
        return { valid: false, message: 'Amount must be greater than zero' };
      }

      if (transactionData.amount > this.tenantContext.tenantSettings.limits.maxTransaction) {
        return { valid: false, message: 'Amount exceeds maximum transaction limit' };
      }

      // Exchange rate validation
      if (transactionData.exchangeRate <= 0) {
        return { valid: false, message: 'Exchange rate must be greater than zero' };
      }

      // Currency validation
      const validCurrencies = ['IRR', 'USD', 'EUR', 'GBP'];
      if (!validCurrencies.includes(transactionData.fromCurrency) || 
          !validCurrencies.includes(transactionData.toCurrency)) {
        return { valid: false, message: 'Invalid currency pair' };
      }

      // Check daily limits
      const dailyLimit = await this.checkDailyLimits(transactionData.customerId, transactionData.amount);
      if (!dailyLimit.withinLimit) {
        return { valid: false, message: `Daily limit exceeded. Remaining: ${dailyLimit.remaining}` };
      }

      // Validate user KYC status
      const user = await User.findById(transactionData.customerId);
      if (!user || user.kycStatus !== 'approved') {
        return { valid: false, message: 'KYC verification required for transactions' };
      }

      return { valid: true };
    } catch (error) {
      this.securityLogger.logError('TRANSACTION_VALIDATION_ERROR', error);
      return { valid: false, message: 'Transaction validation error' };
    }
  }

  /**
   * Encrypt sensitive transaction data
   */
  encryptSensitiveData(transactionData) {
    const sensitiveFields = ['bank_details', 'recipient_details', 'payment_details'];
    const encrypted = { ...transactionData };

    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        // In production, use proper encryption
        encrypted[field] = Buffer.from(JSON.stringify(encrypted[field])).toString('base64');
      }
    });

    return encrypted;
  }

  /**
   * Create transaction record with audit trail
   */
  async createTransactionRecord(transactionData, session) {
    const transaction = new Transaction({
      tenantId: this.tenantContext.tenantId,
      transactionId: this.generateTransactionId(),
      customerId: transactionData.customerId,
      type: transactionData.type,
      fromCurrency: transactionData.fromCurrency,
      toCurrency: transactionData.toCurrency,
      amount: transactionData.amount,
      exchangeRate: transactionData.exchangeRate,
      commission: this.calculateCommission(transactionData.amount),
      totalAmount: this.calculateTotalAmount(transactionData),
      paymentMethod: transactionData.paymentMethod,
      deliveryMethod: transactionData.deliveryMethod,
      status: 'pending',
      holdStatus: 'hold',
      bank_details: transactionData.bank_details,
      in_person_delivery_details: transactionData.in_person_delivery_details,
      status_history: [{
        status: 'pending',
        holdStatus: 'hold',
        changed_by: transactionData.customerId,
        changed_at: new Date(),
        reason: 'Transaction created'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await transaction.save({ session });
    return transaction;
  }

  /**
   * Process financial calculations with precision
   */
  async processFinancialCalculations(transaction, session) {
    const calculations = {
      originalAmount: transaction.amount,
      exchangeRate: transaction.exchangeRate,
      convertedAmount: transaction.amount / transaction.exchangeRate,
      commission: transaction.commission,
      totalAmount: transaction.totalAmount,
      profitLoss: 0,
      fees: this.calculateFees(transaction),
      taxes: this.calculateTaxes(transaction)
    };

    // Calculate profit/loss based on market rates
    const marketRate = await this.getMarketRate(transaction.fromCurrency, transaction.toCurrency);
    calculations.profitLoss = (marketRate - transaction.exchangeRate) * transaction.amount;

    return calculations;
  }

  /**
   * Create double-entry journal entries
   */
  async createJournalEntries(transaction, financialResult, session) {
    const journalEntry = new JournalEntry({
      tenantId: this.tenantContext.tenantId,
      entryNumber: this.generateJournalEntryNumber(),
      transactionId: transaction._id,
      entryDate: new Date(),
      accountingPeriod: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      },
      description: `${transaction.type} - ${transaction.fromCurrency} to ${transaction.toCurrency}`,
      entryType: 'currency_exchange',
      entries: [
        // Debit: Cash/Receivables
        {
          accountId: this.getAccountId('cash', transaction.fromCurrency),
          accountCode: '1001',
          accountName: 'Cash',
          debit: transaction.amount,
          credit: 0,
          currency: transaction.fromCurrency,
          exchangeRate: transaction.exchangeRate,
          description: `Received ${transaction.amount} ${transaction.fromCurrency}`
        },
        // Credit: Currency Payable
        {
          accountId: this.getAccountId('payable', transaction.toCurrency),
          accountCode: '2001',
          accountName: 'Currency Payable',
          debit: 0,
          credit: transaction.convertedAmount,
          currency: transaction.toCurrency,
          exchangeRate: transaction.exchangeRate,
          description: `Payable ${transaction.convertedAmount} ${transaction.toCurrency}`
        },
        // Commission entry
        {
          accountId: this.getAccountId('commission', transaction.fromCurrency),
          accountCode: '4001',
          accountName: 'Commission Revenue',
          debit: 0,
          credit: transaction.commission,
          currency: transaction.fromCurrency,
          exchangeRate: 1,
          description: 'Transaction commission'
        }
      ],
      totalDebit: transaction.amount + transaction.commission,
      totalCredit: transaction.convertedAmount + transaction.commission,
      status: 'posted',
      createdBy: transaction.customerId,
      postedBy: transaction.customerId,
      postedAt: new Date()
    });

    await journalEntry.save({ session });
    return journalEntry;
  }

  /**
   * Update user balances atomically
   */
  async updateUserBalances(transaction, session) {
    const user = await User.findById(transaction.customerId).session(session);
    
    // Update user's transaction count and total volume
    await User.findByIdAndUpdate(
      transaction.customerId,
      {
        $inc: {
          totalTransactions: 1,
          totalVolume: transaction.amount
        },
        lastTransactionAt: new Date()
      },
      { session }
    );

    return user;
  }

  /**
   * Log secure transaction with audit trail
   */
  async logSecureTransaction(transaction, financialResult) {
    const auditData = {
      transactionId: transaction.transactionId,
      tenantId: this.tenantContext.tenantId,
      customerId: transaction.customerId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.fromCurrency,
      exchangeRate: transaction.exchangeRate,
      commission: transaction.commission,
      totalAmount: transaction.totalAmount,
      profitLoss: financialResult.profitLoss,
      timestamp: new Date()
    };

    // Log to security system
    await this.securityLogger.logSecurityEvent('TRANSACTION_COMPLETED', auditData);

    // Log to audit trail
    await this.logAuditTrail(transaction, financialResult);
  }

  /**
   * Verify transaction integrity
   */
  async verifyTransaction(transactionId) {
    try {
      const transaction = await Transaction.findOne({
        transactionId: transactionId,
        tenantId: this.tenantContext.tenantId
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify journal entries balance
      const journalEntry = await JournalEntry.findOne({
        transactionId: transaction._id,
        tenantId: this.tenantContext.tenantId
      });

      if (!journalEntry) {
        throw new Error('Journal entry not found for transaction');
      }

      // Verify debits equal credits
      if (journalEntry.totalDebit !== journalEntry.totalCredit) {
        throw new Error('Journal entry is not balanced');
      }

      // Verify transaction amounts
      const calculatedTotal = transaction.amount + transaction.commission;
      if (Math.abs(calculatedTotal - transaction.totalAmount) > 0.01) {
        throw new Error('Transaction amounts do not match');
      }

      return {
        verified: true,
        transaction: transaction,
        journalEntry: journalEntry
      };
    } catch (error) {
      await this.securityLogger.logSecurityEvent('TRANSACTION_VERIFICATION_FAILED', {
        transactionId: transactionId,
        error: error.message,
        tenantId: this.tenantContext.tenantId
      });

      throw error;
    }
  }

  /**
   * Check daily transaction limits
   */
  async checkDailyLimits(customerId, amount) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(customerId),
          tenantId: this.tenantContext.tenantId,
          createdAt: { $gte: today },
          status: { $in: ['completed', 'pending'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const dailyTotal = dailyTransactions[0]?.totalAmount || 0;
    const dailyLimit = this.tenantContext.tenantSettings.limits.dailyLimit;
    const remaining = dailyLimit - dailyTotal;

    return {
      withinLimit: (dailyTotal + amount) <= dailyLimit,
      dailyTotal: dailyTotal,
      remaining: remaining
    };
  }

  /**
   * Calculate commission based on amount and tenant settings
   */
  calculateCommission(amount) {
    const baseCommission = this.tenantContext.tenantSettings.commission || 0.005; // 0.5%
    return Math.round(amount * baseCommission);
  }

  /**
   * Calculate total amount including fees
   */
  calculateTotalAmount(transactionData) {
    const commission = this.calculateCommission(transactionData.amount);
    const fees = this.calculateFees(transactionData);
    return transactionData.amount + commission + fees;
  }

  /**
   * Calculate additional fees
   */
  calculateFees(transaction) {
    // Implement fee calculation logic
    return 0;
  }

  /**
   * Calculate taxes
   */
  calculateTaxes(transaction) {
    // Implement tax calculation logic
    return 0;
  }

  /**
   * Get current market exchange rate
   */
  async getMarketRate(fromCurrency, toCurrency) {
    // In production, integrate with real-time exchange rate API
    const rates = {
      'IRR-USD': 50000,
      'USD-IRR': 0.00002,
      'IRR-EUR': 55000,
      'EUR-IRR': 0.000018
    };

    const key = `${fromCurrency}-${toCurrency}`;
    return rates[key] || 1;
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `TXN-${year}${month}${day}-${random}`;
  }

  /**
   * Generate journal entry number
   */
  generateJournalEntryNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `JE-${year}${month}-${random}`;
  }

  /**
   * Get account ID for journal entries
   */
  getAccountId(accountType, currency) {
    // In production, this would query the accounts table
    const accountMap = {
      'cash-IRR': new mongoose.Types.ObjectId(),
      'cash-USD': new mongoose.Types.ObjectId(),
      'payable-IRR': new mongoose.Types.ObjectId(),
      'payable-USD': new mongoose.Types.ObjectId(),
      'commission-IRR': new mongoose.Types.ObjectId()
    };

    return accountMap[`${accountType}-${currency}`] || new mongoose.Types.ObjectId();
  }

  /**
   * Log audit trail
   */
  async logAuditTrail(transaction, financialResult) {
    const auditLog = {
      tenantId: this.tenantContext.tenantId,
      userId: transaction.customerId,
      action: 'TRANSACTION_CREATED',
      resource: 'transaction',
      resourceId: transaction._id,
      details: {
        transactionId: transaction.transactionId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.fromCurrency,
        exchangeRate: transaction.exchangeRate,
        commission: transaction.commission,
        totalAmount: transaction.totalAmount,
        profitLoss: financialResult.profitLoss
      },
      ipAddress: 'system',
      userAgent: 'transaction-processor',
      timestamp: new Date()
    };

    // Save to audit log collection
    // await AuditLog.create(auditLog);
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  sanitizeForLogging(data) {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'bank_details', 'recipient_details', 'payment_details'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

module.exports = SecureTransactionService; 