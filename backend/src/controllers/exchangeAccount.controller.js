const ExchangeAccount = require('../models/ExchangeAccount');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');

// Get all accounts for tenant
exports.getAllAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 20, customerId, currency, status, accountType } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (customerId) query.customerId = customerId;
    if (currency) query.currency = currency.toUpperCase();
    if (status) query.status = status;
    if (accountType) query.accountType = accountType;
    
    const accounts = await ExchangeAccount.find(query)
      .populate('customerId', 'name email phone')
      .populate('branchId', 'name code')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await ExchangeAccount.countDocuments(query);
    
    res.json({
      success: true,
      data: accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create new account
exports.createAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.validationError'),
        errors: errors.array()
      });
    }
    
    const {
      customerId,
      accountType,
      currency,
      interestRate,
      monthlyFee,
      limits,
      settings
    } = req.body;
    
    // Verify customer exists and belongs to tenant
    const customer = await User.findOne({
      _id: customerId,
      tenantId: req.tenant?.id || req.user.tenantId,
      role: 'customer'
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.customerNotFound')
      });
    }
    
    // Check if account already exists for this customer and currency
    const existingAccount = await ExchangeAccount.findOne({
      customerId,
      currency: currency.toUpperCase(),
      status: { $ne: 'closed' }
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.accountAlreadyExists')
      });
    }
    
    const account = new ExchangeAccount({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId,
      branchId: req.user.branchId,
      accountNumber: await ExchangeAccount.generateAccountNumber(req.tenant?.id || req.user.tenantId, currency),
      accountType,
      currency: currency.toUpperCase(),
      interestRate: interestRate || 0,
      monthlyFee: monthlyFee || 0,
      limits: limits || {},
      settings: settings || {},
      metadata: {
        openedBy: req.user.id
      }
    });
    
    await account.save();
    
    // Populate references
    await account.populate('customerId', 'name email phone');
    await account.populate('branchId', 'name code');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'account.created'),
      data: account
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get account by ID
exports.getAccountById = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    }).populate('customerId', 'name email phone')
      .populate('branchId', 'name code');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get account by number
exports.getAccountByNumber = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    
    const account = await ExchangeAccount.getByAccountNumber(req.tenant?.id || req.user.tenantId, accountNumber);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error getting account by number:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Update account
exports.updateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      interestRate,
      monthlyFee,
      limits,
      settings,
      status
    } = req.body;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    if (interestRate !== undefined) account.interestRate = interestRate;
    if (monthlyFee !== undefined) account.monthlyFee = monthlyFee;
    if (limits) account.limits = { ...account.limits, ...limits };
    if (settings) account.settings = { ...account.settings, ...settings };
    if (status) account.status = status;
    
    await account.save();
    
    await account.populate('customerId', 'name email phone');
    await account.populate('branchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'account.updated'),
      data: account
    });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Deposit to account
exports.deposit = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, notes } = req.body;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    if (account.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotActive')
      });
    }
    
    await account.updateBalance(amount, 'deposit');
    
    // Create transaction record
    const transaction = new Transaction({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: account.customerId,
      branchId: req.user.branchId,
      type: 'deposit',
      currency: account.currency,
      amount: amount,
      status: 'completed',
      notes: notes || 'Account deposit',
      audit: {
        createdBy: req.user.id
      }
    });
    
    await transaction.save();
    
    await account.populate('customerId', 'name email phone');
    await account.populate('branchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'account.depositSuccessful'),
      data: {
        account,
        transaction
      }
    });
  } catch (error) {
    console.error('Error depositing to account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Withdraw from account
exports.withdraw = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, notes } = req.body;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    if (account.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotActive')
      });
    }
    
    if (!account.canWithdraw(amount)) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.withdrawalNotAllowed')
      });
    }
    
    await account.updateBalance(amount, 'withdrawal');
    
    // Create transaction record
    const transaction = new Transaction({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: account.customerId,
      branchId: req.user.branchId,
      type: 'withdrawal',
      currency: account.currency,
      amount: amount,
      status: 'completed',
      notes: notes || 'Account withdrawal',
      audit: {
        createdBy: req.user.id
      }
    });
    
    await transaction.save();
    
    await account.populate('customerId', 'name email phone');
    await account.populate('branchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'account.withdrawalSuccessful'),
      data: {
        account,
        transaction
      }
    });
  } catch (error) {
    console.error('Error withdrawing from account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Calculate interest
exports.calculateInterest = async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    const interest = await account.calculateInterest();
    
    await account.populate('customerId', 'name email phone');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'account.interestCalculated'),
      data: {
        account,
        interest
      }
    });
  } catch (error) {
    console.error('Error calculating interest:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Close account
exports.closeAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { reason } = req.body;
    
    const account = await ExchangeAccount.findOne({
      _id: accountId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    await account.closeAccount(req.user.id, reason);
    
    await account.populate('customerId', 'name email phone');
    await account.populate('branchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'account.closed'),
      data: account
    });
  } catch (error) {
    console.error('Error closing account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get customer accounts
exports.getCustomerAccounts = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const accounts = await ExchangeAccount.getCustomerAccounts(req.tenant?.id || req.user.tenantId, customerId);
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error getting customer accounts:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get account statistics
exports.getAccountStats = async (req, res) => {
  try {
    const stats = await ExchangeAccount.aggregate([
      {
        $match: { tenantId: req.tenant?.id || req.user.tenantId }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          avgBalance: { $avg: '$balance' }
        }
      }
    ]);
    
    const currencyStats = await ExchangeAccount.aggregate([
      {
        $match: { tenantId: req.tenant?.id || req.user.tenantId }
      },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        statusStats: stats,
        currencyStats
      }
    });
  } catch (error) {
    console.error('Error getting account stats:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get all accounts for the logged-in customer (customer portal)
exports.getMyAccounts = async (req, res) => {
  try {
    const customerId = req.user._id;
    const tenantId = req.tenant?.id || req.user.tenantId;
    const accounts = await ExchangeAccount.find({ customerId, tenantId, status: { $ne: 'closed' } })
      .populate('branchId', 'name code');
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Error getting my accounts:', error);
    res.status(500).json({
      success: false,
      message: 'خطا در دریافت حساب‌های شما',
      error: error.message
    });
  }
}; 