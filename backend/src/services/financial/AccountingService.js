// src/services/financial/AccountingService.js
const { Transaction, AccountBalance, User, sequelize } = require('../../models/postgresql');

/**
 * Double-Entry Bookkeeping Service
 * Implements enterprise-grade financial accounting with ACID compliance
 */
class AccountingService {
  constructor() {
    // Chart of accounts for double-entry bookkeeping
    this.chartOfAccounts = {
      // Assets
      CASH: '1000',
      BANK_ACCOUNT: '1010',
      CUSTOMER_RECEIVABLES: '1200',
      PREPAID_EXPENSES: '1300',
      
      // Liabilities  
      CUSTOMER_PAYABLES: '2000',
      ACCRUED_EXPENSES: '2100',
      DEFERRED_REVENUE: '2200',
      
      // Equity
      RETAINED_EARNINGS: '3000',
      COMMISSION_INCOME: '3100',
      FEE_INCOME: '3200',
      
      // Revenue
      EXCHANGE_REVENUE: '4000',
      COMMISSION_REVENUE: '4100',
      INTEREST_REVENUE: '4200',
      
      // Expenses
      TRANSACTION_FEES: '5000',
      OPERATIONAL_EXPENSES: '5100',
      SYSTEM_EXPENSES: '5200'
    };
    
    this.transactionTypes = {
      DEPOSIT: { debit: 'CASH', credit: 'CUSTOMER_PAYABLES' },
      WITHDRAWAL: { debit: 'CUSTOMER_RECEIVABLES', credit: 'CASH' },
      TRANSFER: { debit: 'CUSTOMER_RECEIVABLES', credit: 'CUSTOMER_PAYABLES' },
      EXCHANGE: { debit: 'CUSTOMER_RECEIVABLES', credit: 'CUSTOMER_PAYABLES' },
      FEE: { debit: 'CUSTOMER_RECEIVABLES', credit: 'FEE_INCOME' },
      COMMISSION: { debit: 'CUSTOMER_RECEIVABLES', credit: 'COMMISSION_INCOME' },
      INTEREST: { debit: 'INTEREST_REVENUE', credit: 'CUSTOMER_PAYABLES' }
    };
  }
  
  /**
   * Create a double-entry transaction with full ACID compliance
   */
  async createDoubleEntryTransaction(transactionData) {
    const {
      tenantId,
      fromUserId,
      toUserId,
      amount,
      currency,
      type,
      description,
      metadata = {},
      fee = 0,
      commission = 0,
      exchangeRate = null,
      counterpartAmount = null,
      counterpartCurrency = null
    } = transactionData;
    
    return await sequelize.transaction(async (dbTransaction) => {
      try {
        const referenceNumber = this.generateReferenceNumber(type);
        const accounts = this.transactionTypes[type.toUpperCase()];
        
        if (!accounts) {
          throw new Error(`Unknown transaction type: ${type}`);
        }
        
        // Main transaction entries
        const transactions = [];
        
        // Debit entry (from account)
        const debitTransaction = await Transaction.create({
          tenantId,
          userId: fromUserId,
          type,
          amount: -Math.abs(amount),
          currency,
          counterpartAmount,
          counterpartCurrency,
          exchangeRate,
          status: 'completed',
          referenceNumber: `${referenceNumber}_DR`,
          description: `${description} - Debit`,
          debitAccount: this.chartOfAccounts[accounts.debit],
          creditAccount: this.chartOfAccounts[accounts.credit],
          metadata: { ...metadata, entryType: 'debit' },
          fee: type === 'FEE' ? 0 : fee,
          commission: type === 'COMMISSION' ? 0 : commission,
          counterpartyId: toUserId,
          completedAt: new Date()
        }, { transaction: dbTransaction });
        
        transactions.push(debitTransaction);
        
        // Credit entry (to account)
        const creditTransaction = await Transaction.create({
          tenantId,
          userId: toUserId,
          type,
          amount: Math.abs(amount),
          currency,
          counterpartAmount,
          counterpartCurrency,
          exchangeRate,
          status: 'completed',
          referenceNumber: `${referenceNumber}_CR`,
          description: `${description} - Credit`,
          debitAccount: this.chartOfAccounts[accounts.debit],
          creditAccount: this.chartOfAccounts[accounts.credit],
          metadata: { ...metadata, entryType: 'credit' },
          fee: 0,
          commission: 0,
          counterpartyId: fromUserId,
          relatedTransactionId: debitTransaction.id,
          completedAt: new Date()
        }, { transaction: dbTransaction });
        
        transactions.push(creditTransaction);
        
        // Link transactions
        await debitTransaction.update({
          relatedTransactionId: creditTransaction.id
        }, { transaction: dbTransaction });
        
        // Process fees if applicable
        if (fee > 0) {
          const feeTransactions = await this.processFee({
            tenantId,
            userId: fromUserId,
            amount: fee,
            currency,
            description: `Fee for ${description}`,
            parentTransactionId: debitTransaction.id,
            referenceNumber: `${referenceNumber}_FEE`
          }, dbTransaction);
          
          transactions.push(...feeTransactions);
        }
        
        // Process commission if applicable
        if (commission > 0) {
          const commissionTransactions = await this.processCommission({
            tenantId,
            userId: fromUserId,
            amount: commission,
            currency,
            description: `Commission for ${description}`,
            parentTransactionId: debitTransaction.id,
            referenceNumber: `${referenceNumber}_COMM`
          }, dbTransaction);
          
          transactions.push(...commissionTransactions);
        }
        
        // Update account balances
        await this.updateAccountBalances({
          fromUserId,
          toUserId,
          amount,
          currency,
          fee,
          commission
        }, dbTransaction);
        
        // Verify double-entry balance
        await this.verifyDoubleEntryBalance(transactions);
        
        return {
          success: true,
          referenceNumber,
          transactions,
          debitTransaction,
          creditTransaction
        };
        
      } catch (error) {
        throw new Error(`Double-entry transaction failed: ${error.message}`);
      }
    });
  }
  
  /**
   * Process transaction fees
   */
  async processFee(feeData, dbTransaction) {
    const {
      tenantId,
      userId,
      amount,
      currency,
      description,
      parentTransactionId,
      referenceNumber
    } = feeData;
    
    const transactions = [];
    
    // Debit customer account
    const feeDebitTransaction = await Transaction.create({
      tenantId,
      userId,
      type: 'fee',
      amount: -Math.abs(amount),
      currency,
      status: 'completed',
      referenceNumber: `${referenceNumber}_DR`,
      description: `${description} - Fee Debit`,
      debitAccount: this.chartOfAccounts.CUSTOMER_RECEIVABLES,
      creditAccount: this.chartOfAccounts.FEE_INCOME,
      parentTransactionId,
      completedAt: new Date()
    }, { transaction: dbTransaction });
    
    transactions.push(feeDebitTransaction);
    
    // Credit fee income account (system account)
    const feeCreditTransaction = await Transaction.create({
      tenantId,
      userId: null, // System transaction
      type: 'fee',
      amount: Math.abs(amount),
      currency,
      status: 'completed',
      referenceNumber: `${referenceNumber}_CR`,
      description: `${description} - Fee Income`,
      debitAccount: this.chartOfAccounts.CUSTOMER_RECEIVABLES,
      creditAccount: this.chartOfAccounts.FEE_INCOME,
      parentTransactionId,
      relatedTransactionId: feeDebitTransaction.id,
      completedAt: new Date()
    }, { transaction: dbTransaction });
    
    transactions.push(feeCreditTransaction);
    
    // Link transactions
    await feeDebitTransaction.update({
      relatedTransactionId: feeCreditTransaction.id
    }, { transaction: dbTransaction });
    
    return transactions;
  }
  
  /**
   * Process commission
   */
  async processCommission(commissionData, dbTransaction) {
    const {
      tenantId,
      userId,
      amount,
      currency,
      description,
      parentTransactionId,
      referenceNumber
    } = commissionData;
    
    const transactions = [];
    
    // Debit customer account
    const commissionDebitTransaction = await Transaction.create({
      tenantId,
      userId,
      type: 'commission',
      amount: -Math.abs(amount),
      currency,
      status: 'completed',
      referenceNumber: `${referenceNumber}_DR`,
      description: `${description} - Commission Debit`,
      debitAccount: this.chartOfAccounts.CUSTOMER_RECEIVABLES,
      creditAccount: this.chartOfAccounts.COMMISSION_INCOME,
      parentTransactionId,
      completedAt: new Date()
    }, { transaction: dbTransaction });
    
    transactions.push(commissionDebitTransaction);
    
    // Credit commission income account
    const commissionCreditTransaction = await Transaction.create({
      tenantId,
      userId: null, // System transaction
      type: 'commission',
      amount: Math.abs(amount),
      currency,
      status: 'completed',
      referenceNumber: `${referenceNumber}_CR`,
      description: `${description} - Commission Income`,
      debitAccount: this.chartOfAccounts.CUSTOMER_RECEIVABLES,
      creditAccount: this.chartOfAccounts.COMMISSION_INCOME,
      parentTransactionId,
      relatedTransactionId: commissionDebitTransaction.id,
      completedAt: new Date()
    }, { transaction: dbTransaction });
    
    transactions.push(commissionCreditTransaction);
    
    // Link transactions
    await commissionDebitTransaction.update({
      relatedTransactionId: commissionCreditTransaction.id
    }, { transaction: dbTransaction });
    
    return transactions;
  }
  
  /**
   * Update account balances atomically
   */
  async updateAccountBalances(balanceData, dbTransaction) {
    const { fromUserId, toUserId, amount, currency, fee, commission } = balanceData;
    
    // Update from user balance (subtract amount + fees + commission)
    if (fromUserId) {
      const fromBalance = await AccountBalance.findOrCreate({
        where: { userId: fromUserId, currency },
        defaults: {
          userId: fromUserId,
          currency,
          availableBalance: 0
        },
        transaction: dbTransaction
      });
      
      const totalDeduction = parseFloat(amount) + parseFloat(fee) + parseFloat(commission);
      const newFromBalance = parseFloat(fromBalance[0].availableBalance) - totalDeduction;
      
      if (newFromBalance < 0) {
        throw new Error('Insufficient balance for transaction');
      }
      
      await fromBalance[0].update({
        availableBalance: newFromBalance.toFixed(8)
      }, { transaction: dbTransaction });
    }
    
    // Update to user balance (add amount)
    if (toUserId) {
      const toBalance = await AccountBalance.findOrCreate({
        where: { userId: toUserId, currency },
        defaults: {
          userId: toUserId,
          currency,
          availableBalance: 0
        },
        transaction: dbTransaction
      });
      
      const newToBalance = parseFloat(toBalance[0].availableBalance) + parseFloat(amount);
      
      await toBalance[0].update({
        availableBalance: newToBalance.toFixed(8)
      }, { transaction: dbTransaction });
    }
  }
  
  /**
   * Verify double-entry balance (debits = credits)
   */
  async verifyDoubleEntryBalance(transactions) {
    let totalDebits = 0;
    let totalCredits = 0;
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (amount < 0) {
        totalDebits += Math.abs(amount);
      } else {
        totalCredits += amount;
      }
    });
    
    const difference = Math.abs(totalDebits - totalCredits);
    if (difference > 0.00000001) { // Allow for minimal floating point errors
      throw new Error(`Double-entry balance verification failed. Debits: ${totalDebits}, Credits: ${totalCredits}, Difference: ${difference}`);
    }
    
    return true;
  }
  
  /**
   * Generate unique reference number
   */
  generateReferenceNumber(type) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const typePrefix = type.substring(0, 3).toUpperCase();
    return `${typePrefix}-${timestamp}-${random}`.toUpperCase();
  }
  
  /**
   * Get account balance summary
   */
  async getAccountBalanceSummary(tenantId, userId = null, currency = null) {
    const whereClause = { tenantId };
    if (userId) whereClause.userId = userId;
    if (currency) whereClause.currency = currency;
    
    const balances = await AccountBalance.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
    
    return balances.map(balance => ({
      userId: balance.userId,
      user: balance.user,
      currency: balance.currency,
      available: parseFloat(balance.availableBalance).toFixed(8),
      pending: parseFloat(balance.pendingBalance).toFixed(8),
      frozen: parseFloat(balance.frozenBalance).toFixed(8),
      total: parseFloat(balance.totalBalance).toFixed(8)
    }));
  }
  
  /**
   * Generate trial balance report
   */
  async generateTrialBalance(tenantId, asOfDate = new Date()) {
    const transactions = await Transaction.findAll({
      where: {
        tenantId,
        status: 'completed',
        completedAt: {
          [sequelize.Sequelize.Op.lte]: asOfDate
        }
      },
      order: [['completedAt', 'ASC']]
    });
    
    const accountBalances = {};
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      const debitAccount = transaction.debitAccount;
      const creditAccount = transaction.creditAccount;
      
      if (!accountBalances[debitAccount]) {
        accountBalances[debitAccount] = { debits: 0, credits: 0 };
      }
      if (!accountBalances[creditAccount]) {
        accountBalances[creditAccount] = { debits: 0, credits: 0 };
      }
      
      if (amount < 0) {
        accountBalances[debitAccount].debits += Math.abs(amount);
      } else {
        accountBalances[creditAccount].credits += amount;
      }
    });
    
    return {
      asOfDate,
      accounts: accountBalances,
      totalDebits: Object.values(accountBalances).reduce((sum, acc) => sum + acc.debits, 0),
      totalCredits: Object.values(accountBalances).reduce((sum, acc) => sum + acc.credits, 0)
    };
  }
  
  /**
   * Reconcile account balances
   */
  async reconcileAccountBalances(tenantId, currency, asOfDate = new Date()) {
    const transactions = await Transaction.findAll({
      where: {
        tenantId,
        currency,
        status: 'completed',
        completedAt: {
          [sequelize.Sequelize.Op.lte]: asOfDate
        }
      }
    });
    
    const balances = await AccountBalance.findAll({
      where: { tenantId, currency }
    });
    
    const calculatedBalances = {};
    
    // Calculate balances from transactions
    transactions.forEach(transaction => {
      const userId = transaction.userId;
      const amount = parseFloat(transaction.amount);
      
      if (!calculatedBalances[userId]) {
        calculatedBalances[userId] = 0;
      }
      
      calculatedBalances[userId] += amount;
    });
    
    // Compare with stored balances
    const discrepancies = [];
    
    balances.forEach(balance => {
      const userId = balance.userId;
      const storedBalance = parseFloat(balance.availableBalance);
      const calculatedBalance = calculatedBalances[userId] || 0;
      const difference = Math.abs(storedBalance - calculatedBalance);
      
      if (difference > 0.00000001) {
        discrepancies.push({
          userId,
          currency,
          storedBalance: storedBalance.toFixed(8),
          calculatedBalance: calculatedBalance.toFixed(8),
          difference: difference.toFixed(8)
        });
      }
    });
    
    return {
      tenantId,
      currency,
      asOfDate,
      discrepancies,
      isReconciled: discrepancies.length === 0
    };
  }
}

module.exports = new AccountingService();