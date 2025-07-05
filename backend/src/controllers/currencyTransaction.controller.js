const CurrencyTransaction = require('../models/CurrencyTransaction');
const VIPCustomer = require('../models/VIPCustomer');
const ExchangeRate = require('../models/ExchangeRate');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/transaction-receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Get all currency transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, customerId, currencyFrom, currencyTo } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (customerId) query.customerId = customerId;
    if (currencyFrom) query.currencyFrom = currencyFrom;
    if (currencyTo) query.currencyTo = currencyTo;
    
    const transactions = await CurrencyTransaction.find(query)
      .populate('customerId', 'name email phone')
      .populate('counterparty.tenantId', 'name code')
      .populate('createdBy', 'name')
      .populate('branchId', 'name code')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await CurrencyTransaction.countDocuments(query);
    
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
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create new currency transaction
exports.createTransaction = async (req, res) => {
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
      type,
      currencyFrom,
      amountFrom,
      currencyTo,
      amountTo,
      exchangeRate,
      rateType,
      counterparty,
      fees,
      discount,
      paymentSplit,
      delivery
    } = req.body;
    
    // Check customer VIP status and limits
    const vipCustomer = await VIPCustomer.findOne({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.body.customerId
    });
    
    if (vipCustomer && !vipCustomer.checkTransactionLimit(amountFrom)) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.transactionLimitExceeded')
      });
    }
    
    // Get current exchange rate
    const currentRate = await ExchangeRate.getCurrentRate(
      req.tenant?.id || req.user.tenantId,
      currencyFrom,
      currencyTo
    );
    
    if (!currentRate) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.exchangeRateNotFound')
      });
    }
    
    // Apply VIP rates if applicable
    let finalRate = exchangeRate;
    if (vipCustomer && vipCustomer.vipLevel === 'vip') {
      const vipRate = currentRate.getVIPRate(req.tenant?.id || req.user.tenantId, currencyFrom, currencyTo, 'vip');
      if (vipRate) {
        finalRate = rateType === 'buy' ? vipRate.rates.buy : vipRate.rates.sell;
      }
    }
    
    const transaction = new CurrencyTransaction({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId: req.body.customerId,
      type,
      currencyFrom,
      amountFrom,
      currencyTo,
      amountTo,
      exchangeRate: finalRate,
      rateType,
      counterparty,
      fees,
      discount,
      paymentSplit,
      delivery,
      createdBy: req.user.id,
      branchId: req.user.branchId
    });
    
    await transaction.save();
    
    // Add initial status to history
    await transaction.addStatusHistory('pending_payment', req.user.id, 'Transaction created');
    
    // Populate references
    await transaction.populate('customerId', 'name email phone');
    await transaction.populate('counterparty.tenantId', 'name code');
    await transaction.populate('createdBy', 'name');
    await transaction.populate('branchId', 'name code');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'transaction.created'),
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

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await CurrencyTransaction.findOne({
      _id: transactionId,
      tenantId: req.tenant?.id || req.user.tenantId
    }).populate('customerId', 'name email phone')
      .populate('counterparty.tenantId', 'name code')
      .populate('createdBy', 'name')
      .populate('branchId', 'name code');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transactionNotFound')
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Upload receipt for payment account
exports.uploadReceipt = [
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { transactionId, accountIndex } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, 'error.noFileUploaded')
        });
      }
      
      const transaction = await CurrencyTransaction.findOne({
        _id: transactionId,
        tenantId: req.tenant?.id || req.user.tenantId
      });
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: i18n.t(req.language, 'error.transactionNotFound')
        });
      }
      
      const accountIndexNum = parseInt(accountIndex);
      if (accountIndexNum >= transaction.paymentSplit.accounts.length) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, 'error.invalidAccountIndex')
        });
      }
      
      // Update account receipt
      transaction.paymentSplit.accounts[accountIndexNum].receipt = {
        filePath: req.file.path,
        fileName: req.file.originalname,
        uploadedAt: new Date()
      };
      
      await transaction.save();
      await transaction.updatePaymentProgress();
      
      res.json({
        success: true,
        message: i18n.t(req.language, 'transaction.receiptUploaded'),
        data: {
          accountIndex: accountIndexNum,
          receipt: transaction.paymentSplit.accounts[accountIndexNum].receipt
        }
      });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      res.status(500).json({
        success: false,
        message: i18n.t(req.language, 'error.serverError'),
        error: error.message
      });
    }
  }
];

// Verify payment receipt
exports.verifyReceipt = async (req, res) => {
  try {
    const { transactionId, accountIndex } = req.params;
    const { verified } = req.body;
    
    const transaction = await CurrencyTransaction.findOne({
      _id: transactionId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transactionNotFound')
      });
    }
    
    const accountIndexNum = parseInt(accountIndex);
    if (accountIndexNum >= transaction.paymentSplit.accounts.length) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.invalidAccountIndex')
      });
    }
    
    const account = transaction.paymentSplit.accounts[accountIndexNum];
    
    if (verified) {
      account.status = 'verified';
      account.receipt.verified = true;
      account.receipt.verifiedBy = req.user.id;
      account.receipt.verifiedAt = new Date();
      account.paidAt = new Date();
    } else {
      account.status = 'pending';
      account.receipt.verified = false;
      account.receipt.verifiedBy = null;
      account.receipt.verifiedAt = null;
      account.paidAt = null;
    }
    
    await transaction.save();
    await transaction.updatePaymentProgress();
    
    // Add status history
    const statusMessage = verified ? 'Payment receipt verified' : 'Payment receipt verification removed';
    await transaction.addStatusHistory(transaction.status, req.user.id, statusMessage);
    
    res.json({
      success: true,
      message: i18n.t(req.language, verified ? 'transaction.receiptVerified' : 'transaction.receiptUnverified'),
      data: {
        accountIndex: accountIndexNum,
        account: account,
        progress: transaction.paymentSplit.progress
      }
    });
  } catch (error) {
    console.error('Error verifying receipt:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Update transaction status
exports.updateStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, reason } = req.body;
    
    const transaction = await CurrencyTransaction.findOne({
      _id: transactionId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transactionNotFound')
      });
    }
    
    const oldStatus = transaction.status;
    transaction.status = status;
    
    await transaction.save();
    await transaction.addStatusHistory(status, req.user.id, reason);
    
    // If transaction is completed, update VIP customer statistics
    if (status === 'completed') {
      const vipCustomer = await VIPCustomer.findOne({
        tenantId: req.tenant?.id || req.user.tenantId,
        customerId: transaction.customerId
      });
      
      if (vipCustomer) {
        await vipCustomer.updateStatistics(transaction.amountFrom);
      }
    }
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transaction.statusUpdated'),
      data: {
        oldStatus,
        newStatus: status,
        transaction
      }
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get transaction statistics
exports.getStatistics = async (req, res) => {
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
    
    const stats = await CurrencyTransaction.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalVolume: { $sum: '$amountFrom' },
          averageTransactionSize: { $avg: '$amountFrom' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending_payment'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const currencyStats = await CurrencyTransaction.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$currencyFrom',
          count: { $sum: 1 },
          volume: { $sum: '$amountFrom' }
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
        byCurrency: currencyStats
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

module.exports = {
  getAllTransactions: exports.getAllTransactions,
  createTransaction: exports.createTransaction,
  getTransactionById: exports.getTransactionById,
  uploadReceipt: exports.uploadReceipt,
  verifyReceipt: exports.verifyReceipt,
  updateStatus: exports.updateStatus,
  getStatistics: exports.getStatistics
}; 