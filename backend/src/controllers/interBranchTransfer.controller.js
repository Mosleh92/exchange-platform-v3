const InterBranchTransfer = require('../models/InterBranchTransfer');
const Branch = require('../models/Branch');
// const User = require('../models/User'); // Unused
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');

// Get all transfers for tenant
exports.getAllTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, sourceBranchId, destinationBranchId } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (status) query.status = status;
    if (sourceBranchId) query.sourceBranchId = sourceBranchId;
    if (destinationBranchId) query.destinationBranchId = destinationBranchId;
    
    const transfers = await InterBranchTransfer.find(query)
      .populate('sourceBranchId', 'name code')
      .populate('destinationBranchId', 'name code')
      .populate('approval.requestedBy', 'name email')
      .populate('approval.approvedBy', 'name email')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await InterBranchTransfer.countDocuments(query);
    
    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting transfers:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create new transfer
exports.createTransfer = async (req, res) => {
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
      sourceBranchId,
      destinationBranchId,
      amount,
      currency,
      transferType,
      transferDetails,
      recipient,
      notes
    } = req.body;
    
    // Verify branches exist and belong to tenant
    const sourceBranch = await Branch.findOne({
      _id: sourceBranchId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    const destinationBranch = await Branch.findOne({
      _id: destinationBranchId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!sourceBranch || !destinationBranch) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.branchNotFound')
      });
    }
    
    if (sourceBranchId === destinationBranchId) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.sameBranchTransfer')
      });
    }
    
    const transfer = new InterBranchTransfer({
      tenantId: req.tenant?.id || req.user.tenantId,
      sourceBranchId,
      destinationBranchId,
      amount,
      currency: currency.toUpperCase(),
      transferType,
      transferDetails,
      recipient,
      notes: {
        requestNotes: notes
      },
      approval: {
        requestedBy: req.user.id
      },
      security: {
        verificationCode: InterBranchTransfer.generateVerificationCode(),
        verificationMethod: 'sms' // Default method
      },
      audit: {
        createdBy: req.user.id
      }
    });
    
    await transfer.save();
    
    // Populate references
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    await transfer.populate('approval.requestedBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'transfer.created'),
      data: transfer
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get transfer by ID
exports.getTransferById = async (req, res) => {
  try {
    const { transferId } = req.params;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    }).populate('sourceBranchId', 'name code')
      .populate('destinationBranchId', 'name code')
      .populate('approval.requestedBy', 'name email')
      .populate('approval.approvedBy', 'name email')
      .populate('security.verifiedBy', 'name email');
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('Error getting transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Approve transfer
exports.approveTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { notes } = req.body;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    await transfer.approveTransfer(req.user.id, notes);
    
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    await transfer.populate('approval.requestedBy', 'name email');
    await transfer.populate('approval.approvedBy', 'name email');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transfer.approved'),
      data: transfer
    });
  } catch (error) {
    console.error('Error approving transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Reject transfer
exports.rejectTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    await transfer.rejectTransfer(req.user.id, reason);
    
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    await transfer.populate('approval.requestedBy', 'name email');
    await transfer.populate('approval.rejectedBy', 'name email');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transfer.rejected'),
      data: transfer
    });
  } catch (error) {
    console.error('Error rejecting transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Verify transfer
exports.verifyTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { verificationCode } = req.body;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    await transfer.verifyTransfer(verificationCode, req.user.id);
    
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    await transfer.populate('security.verifiedBy', 'name email');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transfer.verified'),
      data: transfer
    });
  } catch (error) {
    console.error('Error verifying transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Complete transfer
exports.completeTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { recipientInfo } = req.body;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    await transfer.completeTransfer(recipientInfo);
    
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transfer.completed'),
      data: transfer
    });
  } catch (error) {
    console.error('Error completing transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Cancel transfer
exports.cancelTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    
    const transfer = await InterBranchTransfer.findOne({
      _id: transferId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.transferNotFound')
      });
    }
    
    await transfer.cancelTransfer(req.user.id, reason);
    
    await transfer.populate('sourceBranchId', 'name code');
    await transfer.populate('destinationBranchId', 'name code');
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'transfer.cancelled'),
      data: transfer
    });
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get pending transfers
exports.getPendingTransfers = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const transfers = await InterBranchTransfer.getPendingTransfers(req.tenant?.id || req.user.tenantId, branchId);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Error getting pending transfers:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get transfers by status
exports.getTransfersByStatus = async (req, res) => {
  try {
    const { status, branchId } = req.query;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, 'error.statusRequired')
      });
    }
    
    const transfers = await InterBranchTransfer.getTransfersByStatus(req.tenant?.id || req.user.tenantId, status, branchId);
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Error getting transfers by status:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get transfer statistics
exports.getTransferStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const stats = await InterBranchTransfer.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);
    
    const currencyStats = await InterBranchTransfer.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
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
    console.error('Error getting transfer stats:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
}; 
