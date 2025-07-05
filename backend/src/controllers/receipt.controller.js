const mongoose = require('mongoose');
const Receipt = require('../models/Receipt');
const ReceiptService = require('../services/ReceiptService');
const CustomerTransaction = require('../models/CustomerTransaction');
const TenantSettings = require('../models/TenantSettings');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const fs = require('fs').promises;
const path = require('path');
const { logAction } = require('../services/auditLogService');
const { isDocumentFake } = require('../services/aiDocumentService');
const { emit } = require('../services/eventDispatcher');

// تولید و ارسال رسید
exports.generateAndSendReceipt = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.validationError'),
        errors: errors.array()
      });
    }
    
    const { transactionId, channels = ['email'] } = req.body;
    
    // بررسی وجود تراکنش
    const transaction = await CustomerTransaction.findOne({
      _id: transactionId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transactionNotFound')
      });
    }
    
    // تولید و ارسال رسید
    const receipt = await ReceiptService.generateReceipt(transactionId, req.tenant?.id || req.user.tenantId, channels);
    
    // بررسی جعلی بودن رسید با هوش مصنوعی (در صورت وجود فایل تصویر یا PDF)
    let isFake = false;
    if (receipt && receipt.pdfFile && receipt.pdfFile.path) {
      isFake = await isDocumentFake(receipt.pdfFile.path);
      if (isFake) {
        receipt.status = 'rejected';
        await receipt.save();
        await logAction({
          user: req.user,
          action: 'receipt_rejected',
          resource: 'Receipt',
          resourceId: receipt._id,
          details: { reason: 'AI detected fake or tampered receipt' },
          req
        });
        return res.status(400).json({ success: false, message: 'رسید جعلی یا دستکاری شده است.' });
      }
    }
    
    await logAction({
      user: req.user,
      action: 'generate_receipt',
      resource: 'Receipt',
      resourceId: receipt._id,
      details: { transactionId, channels },
      req
    });
    
    // پس از آپلود یا ثبت رسید جدید:
    emit('ReceiptUploaded', { transactionId: receipt.transactionId, receiptId: receipt._id });
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'receipt.generatedAndSent'),
      data: receipt
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// دریافت لیست رسیدها
exports.getReceipts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, customerId } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (customerId) query.customerId = customerId;
    
    const receipts = await Receipt.find(query)
      .populate('customerId', 'name email phone')
      .populate('transactionId', 'transactionId type amount currency')
      .populate('createdBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Receipt.countDocuments(query);
    
    res.json({
      success: true,
      data: receipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting receipts:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// دریافت رسید خاص
exports.getReceiptById = async (req, res) => {
  try {
    const { receiptId } = req.params;
    
    const receipt = await Receipt.findOne({
      _id: receiptId,
      tenantId: req.tenant?.id || req.user.tenantId
    }).populate('customerId', 'name email phone')
      .populate('transactionId', 'transactionId type amount currency description')
      .populate('createdBy', 'name');
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.receiptNotFound')
      });
    }
    
    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error getting receipt:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// دانلود PDF رسید
exports.downloadReceiptPDF = async (req, res) => {
  try {
    const { receiptId } = req.params;
    
    const receipt = await Receipt.findOne({
      _id: receiptId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.receiptNotFound')
      });
    }
    
    if (!receipt.pdfFile.path || !await fs.access(receipt.pdfFile.path).then(() => true).catch(() => false)) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.pdfNotFound')
      });
    }
    
    res.download(receipt.pdfFile.path, receipt.pdfFile.fileName);
  } catch (error) {
    console.error('Error downloading receipt PDF:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// ارسال مجدد رسید
exports.resendReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { channels = ['email'] } = req.body;
    
    const receipt = await Receipt.findOne({
      _id: receiptId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.receiptNotFound')
      });
    }
    
    // دریافت تنظیمات صرافی
    const tenantSettings = await TenantSettings.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!tenantSettings) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.tenantSettingsNotFound')
      });
    }
    
    // ارسال مجدد
    await ReceiptService.sendReceipt(receipt, tenantSettings);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'receipt.resent')
    });
  } catch (error) {
    console.error('Error resending receipt:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// دریافت آمار رسیدها
exports.getReceiptStatistics = async (req, res) => {
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
    
    const stats = await Receipt.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          sentReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          failedReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const channelStats = await Receipt.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          emailSent: {
            $sum: { $cond: ['$channels.email.sent', 1, 0] }
          },
          smsSent: {
            $sum: { $cond: ['$channels.sms.sent', 1, 0] }
          },
          whatsappSent: {
            $sum: { $cond: ['$channels.whatsapp.sent', 1, 0] }
          }
        }
      }
    ]);
    
    const typeStats = await Receipt.aggregate([
      {
        $match: {
          tenantId: mongoose.Types.ObjectId(req.tenant?.id || req.user.tenantId),
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        summary: stats[0] || {
          totalReceipts: 0,
          sentReceipts: 0,
          failedReceipts: 0,
          pendingReceipts: 0
        },
        channels: channelStats[0] || {
          emailSent: 0,
          smsSent: 0,
          whatsappSent: 0
        },
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Error getting receipt statistics:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// حذف رسید
exports.deleteReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    
    const receipt = await Receipt.findOne({
      _id: receiptId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.receiptNotFound')
      });
    }
    
    // حذف فایل PDF
    if (receipt.pdfFile.path) {
      try {
        await fs.unlink(receipt.pdfFile.path);
      } catch (error) {
        console.error('Error deleting PDF file:', error);
      }
    }
    
    await receipt.remove();
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'receipt.deleted')
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// تولید رسید برای تراکنش‌های موجود
exports.generateReceiptsForExistingTransactions = async (req, res) => {
  try {
    const { startDate, endDate, channels = ['email'] } = req.body;
    
    const query = {
      tenantId: req.tenant?.id || req.user.tenantId,
      status: 'completed'
    };
    
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }
    
    const transactions = await CustomerTransaction.find(query);
    
    const results = [];
    const errors = [];
    
    for (const transaction of transactions) {
      try {
        // بررسی وجود رسید
        const existingReceipt = await Receipt.findOne({
          tenantId: req.tenant?.id || req.user.tenantId,
          transactionId: transaction._id
        });
        
        if (!existingReceipt) {
          const receipt = await ReceiptService.generateReceipt(
            transaction._id,
            req.tenant?.id || req.user.tenantId,
            channels
          );
          results.push(receipt);
        }
      } catch (error) {
        errors.push({
          transactionId: transaction.transactionId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'receipt.bulkGenerated'),
      data: {
        generated: results.length,
        errorCount: errors.length, // Changed key name
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Error generating bulk receipts:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

module.exports = {
  generateAndSendReceipt: exports.generateAndSendReceipt,
  getReceipts: exports.getReceipts,
  getReceiptById: exports.getReceiptById,
  downloadReceiptPDF: exports.downloadReceiptPDF,
  resendReceipt: exports.resendReceipt,
  getReceiptStatistics: exports.getReceiptStatistics,
  deleteReceipt: exports.deleteReceipt,
  generateReceiptsForExistingTransactions: exports.generateReceiptsForExistingTransactions
}; 