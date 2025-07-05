const User = require('../models/User');
const CustomerBankAccount = require('../models/CustomerBankAccount');
const CustomerTransaction = require('../models/CustomerTransaction');
const TransferRequest = require('../models/TransferRequest');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const { generateVerificationCode } = require('../utils/helpers');
const { logAction } = require('../services/auditLogService');

// Get all customers for tenant
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      role: 'customer'
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const customers = await User.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create customer account
exports.createCustomer = async (req, res) => {
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
      name,
      email,
      phone,
      password,
      accountType = 'savings',
      initialBalance = 0,
      currency = 'IRR'
    } = req.body;
    
    // Check if customer already exists
    const existingCustomer = await User.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      $or: [{ email }, { phone }]
    });
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.customerAlreadyExists')
      });
    }
    
    // Create customer user
    const customer = new User({
      tenantId: req.tenant?.id || req.user.tenantId,
      name,
      email,
      phone,
      password,
      role: 'customer',
      status: 'active',
      createdBy: req.user.id
    });
    
    // Generate verification code for SMS
    const verificationCode = generateVerificationCode();
    customer.verificationCode = verificationCode;
    customer.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    customer.phoneVerified = false;
    
    await customer.save();
    
    // Mock SMS send (log to console)
    console.log(`[SMS] Verification code for ${customer.phone}: ${verificationCode}`);
    
    // Log customer creation in audit log
    await logAction({
      action: 'create',
      resource: 'Customer',
      resourceId: customer._id,
      user: req.user,
      ip: req.ip,
      details: { after: customer }
    });
    
    // Create bank account
    const account = new CustomerBankAccount({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: customer._id,
      accountType,
      balances: [{
        currency,
        amount: initialBalance,
        lastUpdated: new Date()
      }],
      createdBy: req.user.id
    });
    
    await account.save();
    
    // Add to history
    await account.addToHistory('created', req.user.id, 'Account created with initial balance');
    
    // Populate references
    await customer.populate('createdBy', 'name');
    await account.populate('customerId', 'name email phone');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'staff.customerCreated'),
      data: {
        customer,
        account
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get customer details
exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customer = await User.findOne({
      _id: customerId,
      tenantId: req.tenant?.id || req.user.tenantId,
      role: 'customer'
    }).select('-password');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.customerNotFound')
      });
    }
    
    // Get customer account
    const account = await CustomerBankAccount.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    });
    
    // Get recent transactions
    const transactions = await CustomerTransaction.find({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    })
    .sort({ created_at: -1 })
    .limit(10);
    
    // Get pending transfer requests
    const transferRequests = await TransferRequest.find({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId,
      status: 'pending'
    })
    .sort({ created_at: -1 })
    .limit(5);
    
    res.json({
      success: true,
      data: {
        customer,
        account,
        recentTransactions: transactions,
        pendingTransfers: transferRequests
      }
    });
  } catch (error) {
    console.error('Error getting customer details:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { name, email, phone, status } = req.body;
    
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
    
    // Update fields
    if (name) customer.name = name;
    if (email) customer.email = email;
    if (phone) customer.phone = phone;
    if (status) customer.status = status;
    
    customer.updatedBy = req.user.id;
    await customer.save();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'staff.customerUpdated'),
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create transaction for customer
exports.createCustomerTransaction = async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      type,
      currency,
      amount,
      description,
      metadata = {}
    } = req.body;
    
    // Check if customer exists
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
    
    // Get customer account
    const account = await CustomerBankAccount.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    const balanceBefore = account.getBalance(currency);
    let balanceAfter = balanceBefore;
    
    // Calculate new balance
    if (type === 'deposit' || type === 'transfer_in' || type === 'refund') {
      balanceAfter = balanceBefore + amount;
    } else if (type === 'withdrawal' || type === 'transfer_out' || type === 'fee') {
      if (balanceBefore < amount) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, 'error.insufficientBalance')
        });
      }
      balanceAfter = balanceBefore - amount;
    }
    
    // Create transaction
    const transaction = new CustomerTransaction({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId,
      accountNumber: account.accountNumber,
      type,
      currency,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      metadata,
      status: 'completed',
      processedBy: req.user.id,
      processedAt: new Date(),
      createdBy: req.user.id
    });
    
    await transaction.save();
    
    // Update account balance
    await account.updateBalance(currency, amount, 
      type === 'deposit' || type === 'transfer_in' || type === 'refund' ? 'add' : 'subtract'
    );
    
    // Update account statistics
    await account.updateStatistics(amount);
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'staff.transactionCreated'),
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get customer transactions
exports.getCustomerTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 20, type, currency, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    };
    
    if (type) query.type = type;
    if (currency) query.currency = currency;
    if (status) query.status = status;
    
    const transactions = await CustomerTransaction.find(query)
      .populate('createdBy', 'name')
      .populate('processedBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await CustomerTransaction.countDocuments(query);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting customer transactions:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get customer transfer requests
exports.getCustomerTransferRequests = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    };
    
    if (status) query.status = status;
    
    const requests = await TransferRequest.find(query)
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name')
      .populate('processing.processedBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await TransferRequest.countDocuments(query);
    
    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting customer transfer requests:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// تایید شماره موبایل مشتری با کد پیامکی
exports.verifyCustomerPhone = async (req, res) => {
  try {
    const { customerId, code } = req.body;
    const customer = await User.findOne({ _id: customerId, role: 'customer' });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'مشتری یافت نشد' });
    }
    if (!customer.verificationCode || !customer.verificationCodeExpires) {
      return res.status(400).json({ success: false, message: 'کد تأیید برای این مشتری ثبت نشده است' });
    }
    if (customer.verificationCodeExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'کد تأیید منقضی شده است' });
    }
    if (customer.verificationCode !== code) {
      return res.status(400).json({ success: false, message: 'کد تأیید اشتباه است' });
    }
    customer.phoneVerified = true;
    customer.verificationCode = undefined;
    customer.verificationCodeExpires = undefined;
    await customer.save();
    res.json({ success: true, message: 'شماره موبایل با موفقیت تایید شد' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در تایید شماره موبایل', error: err.message });
  }
};

module.exports = {
  getCustomers: exports.getCustomers,
  createCustomer: exports.createCustomer,
  getCustomerById: exports.getCustomerById,
  updateCustomer: exports.updateCustomer,
  createCustomerTransaction: exports.createCustomerTransaction,
  getCustomerTransactions: exports.getCustomerTransactions,
  getCustomerTransferRequests: exports.getCustomerTransferRequests,
  verifyCustomerPhone: exports.verifyCustomerPhone
}; 