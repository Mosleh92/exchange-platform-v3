// backend/src/controllers/AccountController.js
const { DatabaseManager } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateAccountNumber } = require('../utils/helpers');

class AccountController {
  // Create new account
  async createAccount(req, res) {
    try {
      const { tenantId } = req.user;
      const {
        customerId,
        branchId,
        type,
        currency,
        initialBalance = 0
      } = req.body;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const Account = connection.model('Account', accountSchema);

      // Generate unique account number
      const accountNumber = await generateAccountNumber(tenantId, type);

      const account = new Account({
        accountNumber,
        customerId,
        branchId,
        type,
        currency,
        balance: initialBalance,
        availableBalance: initialBalance,
        status: 'active',
        limits: {
          dailyWithdrawal: 100000,
          monthlyWithdrawal: 3000000,
          dailyTransfer: 500000,
          monthlyTransfer: 15000000
        }
      });

      await account.save();

      // Log account creation
      await this.logActivity(tenantId, req.user.id, 'CREATE_ACCOUNT', account._id);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        account
      });

    } catch (error) {
      logger.error('Error creating account:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating account'
      });
    }
  }

  // Get customer accounts
  async getCustomerAccounts(req, res) {
    try {
      const { tenantId } = req.user;
      const { customerId } = req.params;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const Account = connection.model('Account', accountSchema);

      const accounts = await Account.find({ customerId })
        .populate('branchId', 'name')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        accounts
      });

    } catch (error) {
      logger.error('Error fetching accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching accounts'
      });
    }
  }

  // Update account balance
  async updateBalance(req, res) {
    try {
      const { tenantId } = req.user;
      const { accountId } = req.params;
      const { amount, type, description } = req.body;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const Account = connection.model('Account', accountSchema);

      const account = await Account.findById(accountId);
      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      // Calculate new balance
      const newBalance = type === 'credit' 
        ? account.balance + amount 
        : account.balance - amount;

      if (newBalance < 0 && type === 'debit') {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Update balance
      account.balance = newBalance;
      account.availableBalance = newBalance;
      await account.save();

      // Create transaction record
      await this.createTransaction(tenantId, {
        type: type === 'credit' ? 'deposit' : 'withdrawal',
        fromAccount: type === 'debit' ? accountId : null,
        toAccount: type === 'credit' ? accountId : null,
        amount,
        currency: account.currency,
        status: 'completed',
        description,
        processedBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Balance updated successfully',
        account
      });

    } catch (error) {
      logger.error('Error updating balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating balance'
      });
    }
  }

  // Transfer between accounts
  async transferFunds(req, res) {
    try {
      const { tenantId } = req.user;
      const {
        fromAccountId,
        toAccountId,
        amount,
        currency,
        description,
        exchangeRate = 1
      } = req.body;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const Account = connection.model('Account', accountSchema);

      // Get both accounts
      const fromAccount = await Account.findById(fromAccountId);
      const toAccount = await Account.findById(toAccountId);

      if (!fromAccount || !toAccount) {
        return res.status(404).json({
          success: false,
          message: 'One or both accounts not found'
        });
      }

      // Check balance
      if (fromAccount.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Calculate converted amount
      const convertedAmount = amount * exchangeRate;

      // Update balances
      fromAccount.balance -= amount;
      fromAccount.availableBalance -= amount;
      toAccount.balance += convertedAmount;
      toAccount.availableBalance += convertedAmount;

      await fromAccount.save();
      await toAccount.save();

      // Create transaction record
      await this.createTransaction(tenantId, {
        type: 'transfer',
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        amount,
        currency,
        exchangeRate,
        status: 'completed',
        description,
        processedBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        fromAccount,
        toAccount
      });

    } catch (error) {
      logger.error('Error transferring funds:', error);
      res.status(500).json({
        success: false,
        message: 'Error transferring funds'
      });
    }
  }

  // Helper methods
  async createTransaction(tenantId, transactionData) {
    const connection = DatabaseManager.getTenantConnection(tenantId);
    const Transaction = connection.model('Transaction', transactionSchema);

    const transaction = new Transaction({
      ...transactionData,
      transactionId: await generateTransactionId(tenantId),
      createdAt: new Date()
    });

    await transaction.save();
    return transaction;
  }

  async logActivity(tenantId, userId, action, resourceId) {
    const connection = DatabaseManager.getTenantConnection(tenantId);
    const AuditLog = connection.model('AuditLog', auditLogSchema);

    const log = new AuditLog({
      userId,
      action,
      resource: 'account',
      resourceId,
      timestamp: new Date()
    });

    await log.save();
  }
}

module.exports = new AccountController();
