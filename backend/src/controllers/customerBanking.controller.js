const mongoose = require('mongoose');
const CustomerBankAccount = require('../models/CustomerBankAccount');
const CustomerTransaction = require('../models/CustomerTransaction');
const TransferRequest = require('../models/TransferRequest');
// const User = require('../models/User'); // Unused
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');

// Get customer bank account
exports.getCustomerAccount = async (req, res) => {
  try {
    const account = await CustomerBankAccount.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id
    }).populate('customerId', 'name email phone');
    
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
    console.error('Error getting customer account:', error);
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
    const { page = 1, limit = 20, type, currency, status, dateFrom, dateTo } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id
    };
    
    if (type) query.type = type;
    if (currency) query.currency = currency;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.created_at = {};
      if (dateFrom) query.created_at.$gte = new Date(dateFrom);
      if (dateTo) query.created_at.$lte = new Date(dateTo);
    }
    
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

// Create transfer request
exports.createTransferRequest = async (req, res) => {
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
      transferType,
      fromAccount,
      destination,
      currency,
      amount,
      fees,
      description,
      priority
    } = req.body;
    
    // Check if customer has account
    const account = await CustomerBankAccount.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.accountNotFound')
      });
    }
    
    // Check balance
    const currentBalance = account.getBalance(currency);
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.insufficientBalance')
      });
    }
    
    // Check transfer limits
    if (!account.checkTransferLimit(amount, currency)) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.transferLimitExceeded')
      });
    }
    
    const transferRequest = new TransferRequest({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id,
      fromAccount,
      transferType,
      destination,
      currency,
      amount,
      fees,
      description,
      priority,
      createdBy: req.user.id
    });
    
    await transferRequest.save();
    
    // Add to history
    await transferRequest.addToHistory('created', req.user.id, 'Transfer request created');
    
    // Populate references
    await transferRequest.populate('customerId', 'name email phone');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'customerBanking.transferRequestCreated'),
      data: transferRequest
    });
  } catch (error) {
    console.error('Error creating transfer request:', error);
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
    const { page = 1, limit = 20, status, transferType } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id
    };
    
    if (status) query.status = status;
    if (transferType) query.transferType = transferType;
    
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
    console.error('Error getting transfer requests:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get transfer request by ID
exports.getTransferRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await TransferRequest.findOne({
      _id: requestId,
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id
    }).populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name')
      .populate('processing.processedBy', 'name');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferRequestNotFound')
      });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error getting transfer request:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Cancel transfer request
exports.cancelTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await TransferRequest.findOne({
      _id: requestId,
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.user.id,
      status: 'pending'
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferRequestNotFound')
      });
    }
    
    request.status = 'cancelled';
    await request.save();
    
    await request.addStatusHistory('cancelled', req.user.id, 'Request cancelled by customer');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'customerBanking.transferRequestCancelled')
    });
  } catch (error) {
    console.error('Error cancelling transfer request:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get account statistics
exports.getAccountStatistics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    const stats = await CustomerTransaction.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          customerId: mongoose.Types.ObjectId(req.user.id),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalVolume: { $sum: '$amount' },
          averageTransactionSize: { $avg: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const currencyStats = await CustomerTransaction.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          customerId: mongoose.Types.ObjectId(req.user.id),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          volume: { $sum: '$amount' }
        }
      },
      {
        $sort: { volume: -1 }
      }
    ]);
    
    const typeStats = await CustomerTransaction.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          customerId: mongoose.Types.ObjectId(req.user.id),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          volume: { $sum: '$amount' }
        }
      },
      {
        $sort: { volume: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        summary: stats[0] || {
          totalTransactions: 0,
          totalVolume: 0,
          averageTransactionSize: 0,
          completedTransactions: 0,
          pendingTransactions: 0
        },
        byCurrency: currencyStats,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Error getting account statistics:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Staff: Get all customer accounts
exports.getAllCustomerAccounts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, accountType } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (status) query.status = status;
    if (accountType) query.accountType = accountType;
    
    const accounts = await CustomerBankAccount.find(query)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await CustomerBankAccount.countDocuments(query);
    
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
    console.error('Error getting customer accounts:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Staff: Create customer account
exports.createCustomerAccount = async (req, res) => {
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
      balances,
      limits,
      settings
    } = req.body;
    
    // Check if account already exists
    const existingAccount = await CustomerBankAccount.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId
    });
    
    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.accountAlreadyExists')
      });
    }
    
    const account = new CustomerBankAccount({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId,
      accountType,
      balances,
      limits,
      settings,
      createdBy: req.user.id
    });
    
    await account.save();
    
    // Add to history
    await account.addToHistory('created', req.user.id, 'Account created');
    
    // Populate references
    await account.populate('customerId', 'name email phone');
    await account.populate('createdBy', 'name');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'customerBanking.accountCreated'),
      data: account
    });
  } catch (error) {
    console.error('Error creating customer account:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Staff: Process transfer request
exports.processTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, notes } = req.body;
    
    const request = await TransferRequest.findOne({
      _id: requestId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferRequestNotFound')
      });
    }
    
    if (action === 'approve') {
      await request.approve(req.user.id, notes);
    } else if (action === 'reject') {
      await request.reject(req.user.id, notes);
    } else if (action === 'complete') {
      await request.complete(req.user.id, notes);
      
      // Update account balance
      const account = await CustomerBankAccount.findOne({
        tenantId: req.tenant?.id || req.user.tenantId,
        customerId: request.customerId
      });
      
      if (account) {
        await account.updateBalance(request.currency, request.amount, 'subtract');
        
        // Create transaction record
        const transaction = new CustomerTransaction({
          tenantId: req.tenant?.id || req.user.tenantId,
          customerId: request.customerId,
          accountNumber: request.fromAccount,
          type: 'transfer_out',
          currency: request.currency,
          amount: request.amount,
          balanceBefore: account.getBalance(request.currency) + request.amount,
          balanceAfter: account.getBalance(request.currency),
          description: `Transfer to ${request.destination.recipientName || request.destination.toAccount}`,
          metadata: {
            referenceId: request.requestId,
            referenceType: 'transfer_request'
          },
          status: 'completed',
          processedBy: req.user.id,
          processedAt: new Date(),
          createdBy: req.user.id
        });
        
        await transaction.save();
      }
    }
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'customerBanking.transferRequestProcessed')
    });
  } catch (error) {
    console.error('Error processing transfer request:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

module.exports = {
  getCustomerAccount: exports.getCustomerAccount,
  getCustomerTransactions: exports.getCustomerTransactions,
  createTransferRequest: exports.createTransferRequest,
  getCustomerTransferRequests: exports.getCustomerTransferRequests,
  getTransferRequestById: exports.getTransferRequestById,
  cancelTransferRequest: exports.cancelTransferRequest,
  getAccountStatistics: exports.getAccountStatistics,
  getAllCustomerAccounts: exports.getAllCustomerAccounts,
  createCustomerAccount: exports.createCustomerAccount,
  processTransferRequest: exports.processTransferRequest
}; 
