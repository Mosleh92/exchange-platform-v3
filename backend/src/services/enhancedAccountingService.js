const AccountingEntry = require('../models/accounting/AccountingEntry');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Enhanced Accounting Service
 * Implements proper double-entry accounting system
 */
class EnhancedAccountingService {
  constructor() {
    this.accountTypes = {
      ASSET: 'ASSET',
      LIABILITY: 'LIABILITY',
      EQUITY: 'EQUITY',
      REVENUE: 'REVENUE',
      EXPENSE: 'EXPENSE'
    };

    this.entryTypes = {
      DEBIT: 'DEBIT',
      CREDIT: 'CREDIT'
    };
  }

  /**
   * Create double-entry accounting entry
   */
  async createDoubleEntryEntry(entryData) {
    try {
      const {
        tenantId,
        transactionId,
        description,
        entries,
        userId,
        branchId
      } = entryData;

      // Validate entries (debits must equal credits)
      const totalDebits = entries
        .filter(entry => entry.type === this.entryTypes.DEBIT)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

      const totalCredits = entries
        .filter(entry => entry.type === this.entryTypes.CREDIT)
        .reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error('Debits and credits must be equal');
      }

      // Create accounting entries
      const accountingEntries = [];
      for (const entry of entries) {
        const accountingEntry = new AccountingEntry({
          tenantId,
          transactionId,
          accountCode: entry.accountCode,
          description: entry.description || description,
          debit: entry.type === this.entryTypes.DEBIT ? entry.amount : 0,
          credit: entry.type === this.entryTypes.CREDIT ? entry.amount : 0,
          currency: entry.currency || 'IRR',
          entryType: entry.type,
          userId,
          branchId,
          createdAt: new Date()
        });

        await accountingEntry.save();
        accountingEntries.push(accountingEntry);

        // Update account balance
        await this.updateAccountBalance(entry.accountCode, entry.amount, entry.type, tenantId);
      }

      logger.info('Double-entry accounting entry created', {
        transactionId,
        tenantId,
        entryCount: accountingEntries.length,
        totalAmount: totalDebits
      });

      return accountingEntries;
    } catch (error) {
      logger.error('Create double-entry entry error:', error);
      throw error;
    }
  }

  /**
   * Create P2P transaction accounting entries
   */
  async createP2PAccountingEntries(p2pTransaction) {
    try {
      const entries = [
        // Debit: Buyer's IRR account (decrease)
        {
          accountCode: `IRR_CASH_${p2pTransaction.buyerId}`,
          amount: p2pTransaction.irrAmount,
          type: this.entryTypes.DEBIT,
          description: `P2P purchase of ${p2pTransaction.amount} ${p2pTransaction.currency}`,
          currency: 'IRR'
        },
        // Credit: Seller's foreign currency account (increase)
        {
          accountCode: `${p2pTransaction.currency}_CASH_${p2pTransaction.sellerId}`,
          amount: p2pTransaction.amount,
          type: this.entryTypes.CREDIT,
          description: `P2P sale of ${p2pTransaction.amount} ${p2pTransaction.currency}`,
          currency: p2pTransaction.currency
        }
      ];

      return await this.createDoubleEntryEntry({
        tenantId: p2pTransaction.tenantId,
        transactionId: p2pTransaction._id,
        description: `P2P Transaction: ${p2pTransaction.amount} ${p2pTransaction.currency}`,
        entries,
        userId: p2pTransaction.buyerId,
        branchId: p2pTransaction.branchId
      });
    } catch (error) {
      logger.error('Create P2P accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Create transfer accounting entries
   */
  async createTransferAccountingEntries(transferData) {
    try {
      const {
        fromAccountId,
        toAccountId,
        amount,
        currency,
        tenantId,
        userId,
        branchId,
        transactionId
      } = transferData;

      const entries = [
        // Debit: Source account (decrease)
        {
          accountCode: `TRANSFER_FROM_${fromAccountId}`,
          amount,
          type: this.entryTypes.DEBIT,
          description: `Transfer from account ${fromAccountId}`,
          currency
        },
        // Credit: Destination account (increase)
        {
          accountCode: `TRANSFER_TO_${toAccountId}`,
          amount,
          type: this.entryTypes.CREDIT,
          description: `Transfer to account ${toAccountId}`,
          currency
        }
      ];

      return await this.createDoubleEntryEntry({
        tenantId,
        transactionId,
        description: `Transfer: ${amount} ${currency}`,
        entries,
        userId,
        branchId
      });
    } catch (error) {
      logger.error('Create transfer accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Create fee accounting entries
   */
  async createFeeAccountingEntries(feeData) {
    try {
      const {
        accountId,
        feeAmount,
        feeType,
        currency,
        tenantId,
        userId,
        branchId,
        transactionId
      } = feeData;

      const entries = [
        // Debit: Fee expense account
        {
          accountCode: `FEE_EXPENSE_${feeType}`,
          amount: feeAmount,
          type: this.entryTypes.DEBIT,
          description: `${feeType} fee`,
          currency
        },
        // Credit: User's account (decrease balance)
        {
          accountCode: `USER_ACCOUNT_${accountId}`,
          amount: feeAmount,
          type: this.entryTypes.CREDIT,
          description: `${feeType} fee deduction`,
          currency
        }
      ];

      return await this.createDoubleEntryEntry({
        tenantId,
        transactionId,
        description: `${feeType} Fee: ${feeAmount} ${currency}`,
        entries,
        userId,
        branchId
      });
    } catch (error) {
      logger.error('Create fee accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(accountCode, amount, entryType, tenantId) {
    try {
      let account = await Account.findOne({ accountCode, tenantId });

      if (!account) {
        // Create account if doesn't exist
        account = new Account({
          accountCode,
          tenantId,
          balance: 0,
          accountType: this.getAccountTypeFromCode(accountCode)
        });
      }

      // Update balance based on entry type
      if (entryType === this.entryTypes.DEBIT) {
        account.balance += parseFloat(amount);
      } else {
        account.balance -= parseFloat(amount);
      }

      // Prevent negative balance for asset accounts
      if (account.accountType === this.accountTypes.ASSET && account.balance < 0) {
        throw new Error(`Insufficient balance for account ${accountCode}`);
      }

      await account.save();

      logger.info('Account balance updated', {
        accountCode,
        newBalance: account.balance,
        entryType,
        amount
      });
    } catch (error) {
      logger.error('Update account balance error:', error);
      throw error;
    }
  }

  /**
   * Get account type from account code
   */
  getAccountTypeFromCode(accountCode) {
    if (accountCode.includes('CASH') || accountCode.includes('BANK')) {
      return this.accountTypes.ASSET;
    }
    if (accountCode.includes('EXPENSE') || accountCode.includes('FEE')) {
      return this.accountTypes.EXPENSE;
    }
    if (accountCode.includes('REVENUE') || accountCode.includes('INCOME')) {
      return this.accountTypes.REVENUE;
    }
    return this.accountTypes.ASSET; // Default
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(tenantId, asOfDate = new Date()) {
    try {
      const accounts = await Account.find({ tenantId });

      const trialBalance = accounts.map(account => {
        // Get account activity for the period
        return {
          accountCode: account.accountCode,
          accountType: account.accountType,
          balance: account.balance,
          currency: account.currency || 'IRR'
        };
      });

      // Calculate totals
      const totals = {
        assets: trialBalance
          .filter(account => account.accountType === this.accountTypes.ASSET)
          .reduce((sum, account) => sum + account.balance, 0),
        liabilities: trialBalance
          .filter(account => account.accountType === this.accountTypes.LIABILITY)
          .reduce((sum, account) => sum + account.balance, 0),
        equity: trialBalance
          .filter(account => account.accountType === this.accountTypes.EQUITY)
          .reduce((sum, account) => sum + account.balance, 0),
        revenue: trialBalance
          .filter(account => account.accountType === this.accountTypes.REVENUE)
          .reduce((sum, account) => sum + account.balance, 0),
        expenses: trialBalance
          .filter(account => account.accountType === this.accountTypes.EXPENSE)
          .reduce((sum, account) => sum + account.balance, 0)
      };

      return {
        trialBalance,
        totals,
        asOfDate
      };
    } catch (error) {
      logger.error('Generate trial balance error:', error);
      throw error;
    }
  }

  /**
   * Generate profit and loss statement
   */
  async generateProfitAndLoss(tenantId, startDate, endDate) {
    try {
      const revenueEntries = await AccountingEntry.find({
        tenantId,
        accountCode: { $regex: /REVENUE|INCOME/ },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const expenseEntries = await AccountingEntry.find({
        tenantId,
        accountCode: { $regex: /EXPENSE|FEE/ },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const revenue = revenueEntries.reduce((sum, entry) => sum + entry.credit, 0);
      const expenses = expenseEntries.reduce((sum, entry) => sum + entry.debit, 0);
      const netIncome = revenue - expenses;

      return {
        revenue,
        expenses,
        netIncome,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Generate profit and loss error:', error);
      throw error;
    }
  }

  /**
   * Reverse accounting entry
   */
  async reverseAccountingEntry(entryId, reason) {
    try {
      const originalEntry = await AccountingEntry.findById(entryId);
      if (!originalEntry) {
        throw new Error('Accounting entry not found');
      }

      // Create reversal entry
      const reversalEntry = new AccountingEntry({
        tenantId: originalEntry.tenantId,
        transactionId: originalEntry.transactionId,
        accountCode: originalEntry.accountCode,
        description: `REVERSAL: ${originalEntry.description}`,
        debit: originalEntry.credit, // Reverse debit/credit
        credit: originalEntry.debit,
        currency: originalEntry.currency,
        entryType: originalEntry.entryType === this.entryTypes.DEBIT ? 
          this.entryTypes.CREDIT : this.entryTypes.DEBIT,
        userId: originalEntry.userId,
        branchId: originalEntry.branchId,
        reversalOf: originalEntry._id,
        reversalReason: reason,
        createdAt: new Date()
      });

      await reversalEntry.save();

      // Update account balance
      await this.updateAccountBalance(
        originalEntry.accountCode,
        originalEntry.debit || originalEntry.credit,
        reversalEntry.entryType,
        originalEntry.tenantId
      );

      logger.info('Accounting entry reversed', {
        originalEntryId: entryId,
        reversalEntryId: reversalEntry._id,
        reason
      });

      return reversalEntry;
    } catch (error) {
      logger.error('Reverse accounting entry error:', error);
      throw error;
    }
  }

  /**
   * Get account activity
   */
  async getAccountActivity(accountCode, tenantId, startDate, endDate) {
    try {
      const entries = await AccountingEntry.find({
        accountCode,
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: -1 });

      return entries;
    } catch (error) {
      logger.error('Get account activity error:', error);
      throw error;
    }
  }

  /**
   * Validate accounting integrity
   */
  async validateAccountingIntegrity(tenantId) {
    try {
      const trialBalance = await this.generateTrialBalance(tenantId);
      const { totals } = trialBalance;

      // Check if debits equal credits
      const totalDebits = totals.assets + totals.expenses;
      const totalCredits = totals.liabilities + totals.equity + totals.revenue;

      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

      return {
        isBalanced,
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
        trialBalance
      };
    } catch (error) {
      logger.error('Validate accounting integrity error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedAccountingService(); 