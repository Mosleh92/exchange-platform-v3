const EnhancedP2PService = require('../services/enhancedP2PService');
const EnhancedAuditService = require('../services/enhancedAuditService');
const TenantHierarchyService = require('../core/multi-tenancy/TenantHierarchyService');
const logger = require('../utils/logger');

/**
 * Enhanced P2P Controller
 * Comprehensive P2P management with security and audit
 */
class EnhancedP2PController {
  constructor() {
    this.p2pService = new EnhancedP2PService();
    this.auditService = new EnhancedAuditService();
  }

  /**
   * Create P2P transaction with enhanced security
   */
  async createTransaction(req, res) {
    try {
      const { announcementId, amount, paymentMethod } = req.body;
      const { userId, tenantId } = req.user;

      // Validate user permissions
      const hasPermission = await this.validateP2PPermission(userId, tenantId, 'CREATE');
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions for P2P transactions',
          code: 'P2P_PERMISSION_DENIED'
        });
      }

      // Create transaction
      const transaction = await this.p2pService.createP2PTransaction({
        sellerId: req.body.sellerId,
        buyerId: userId,
        announcementId,
        amount,
        currency: req.body.currency,
        paymentMethod,
        tenantId,
        branchId: req.user.branchId
      });

      // Log transaction creation
      await this.auditService.logEvent({
        eventType: 'P2P_TRANSACTION_CREATED',
        userId,
        tenantId,
        action: 'CREATE_P2P_TRANSACTION',
        resource: 'P2P_TRANSACTION',
        resourceId: transaction._id,
        details: {
          announcementId,
          amount,
          paymentMethod,
          currency: req.body.currency
        },
        severity: 'HIGH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        transaction,
        message: 'P2P transaction created successfully'
      });
    } catch (error) {
      logger.error('Create P2P transaction error:', error);
      res.status(500).json({
        error: 'Failed to create P2P transaction',
        details: error.message
      });
    }
  }

  /**
   * Upload payment proof with enhanced security
   */
  async uploadPaymentProof(req, res) {
    try {
      const { transactionId } = req.params;
      const { accountNumber, amount, paidAt } = req.body;
      const { userId, tenantId } = req.user;

      // Validate transaction ownership
      const transaction = await this.p2pService.getTransactionWithPayments(transactionId);
      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      // Check if user is the buyer of this transaction
      if (transaction.transaction.buyerId.toString() !== userId) {
        await this.auditService.logSecurityEvent('UNAUTHORIZED_PAYMENT_UPLOAD', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, {
          userId,
          transactionId,
          reason: 'User is not the buyer of this transaction'
        });

        return res.status(403).json({
          error: 'You can only upload payments for your own transactions',
          code: 'UNAUTHORIZED_PAYMENT_UPLOAD'
        });
      }

      // Validate transaction status
      if (transaction.transaction.status !== 'PENDING_PAYMENT') {
        return res.status(400).json({
          error: 'Transaction is not in payment pending status',
          code: 'INVALID_TRANSACTION_STATUS'
        });
      }

      // Validate files
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'Payment proof files are required',
          code: 'MISSING_PAYMENT_PROOF'
        });
      }

      // Validate file types and sizes
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed',
            code: 'INVALID_FILE_TYPE'
          });
        }

        if (file.size > maxSize) {
          return res.status(400).json({
            error: 'File size too large. Maximum size is 10MB',
            code: 'FILE_TOO_LARGE'
          });
        }
      }

      // Upload files and create payment
      const paymentData = {
        accountNumber,
        amount: parseFloat(amount),
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        proofFiles: req.files
      };

      const payment = await this.p2pService.addPayment(transactionId, paymentData);

      // Log payment upload
      await this.auditService.logEvent({
        eventType: 'P2P_PAYMENT_ADDED',
        userId,
        tenantId,
        action: 'UPLOAD_PAYMENT_PROOF',
        resource: 'P2P_PAYMENT',
        resourceId: payment._id,
        details: {
          transactionId,
          accountNumber,
          amount: paymentData.amount,
          fileCount: req.files.length
        },
        severity: 'HIGH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        payment,
        message: 'Payment proof uploaded successfully'
      });
    } catch (error) {
      logger.error('Upload payment proof error:', error);
      res.status(500).json({
        error: 'Failed to upload payment proof',
        details: error.message
      });
    }
  }

  /**
   * Confirm payment with enhanced security
   */
  async confirmPayment(req, res) {
    try {
      const { transactionId, paymentId } = req.params;
      const { userId, tenantId } = req.user;

      // Validate transaction ownership (seller only)
      const transaction = await this.p2pService.getTransactionWithPayments(transactionId);
      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      // Check if user is the seller of this transaction
      if (transaction.transaction.sellerId.toString() !== userId) {
        await this.auditService.logSecurityEvent('UNAUTHORIZED_PAYMENT_CONFIRMATION', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, {
          userId,
          transactionId,
          reason: 'User is not the seller of this transaction'
        });

        return res.status(403).json({
          error: 'Only the seller can confirm payments',
          code: 'UNAUTHORIZED_PAYMENT_CONFIRMATION'
        });
      }

      // Validate transaction status
      if (transaction.transaction.status !== 'PAYMENT_CONFIRMED') {
        return res.status(400).json({
          error: 'Transaction is not in payment confirmed status',
          code: 'INVALID_TRANSACTION_STATUS'
        });
      }

      // Find the specific payment
      const payment = transaction.payments.find(p => p._id.toString() === paymentId);
      if (!payment) {
        return res.status(404).json({
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        });
      }

      // Confirm payment
      const result = await this.p2pService.confirmPayment(transactionId, paymentId, userId);

      // Log payment confirmation
      await this.auditService.logEvent({
        eventType: 'P2P_PAYMENT_CONFIRMED',
        userId,
        tenantId,
        action: 'CONFIRM_PAYMENT',
        resource: 'P2P_PAYMENT',
        resourceId: paymentId,
        details: {
          transactionId,
          paymentId,
          amount: payment.amount,
          accountNumber: payment.accountNumber
        },
        severity: 'HIGH',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        transaction: result.transaction,
        payment: result.payment,
        message: 'Payment confirmed successfully'
      });
    } catch (error) {
      logger.error('Confirm payment error:', error);
      res.status(500).json({
        error: 'Failed to confirm payment',
        details: error.message
      });
    }
  }

  /**
   * Cancel transaction with enhanced security
   */
  async cancelTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const { userId, tenantId } = req.user;

      // Validate transaction ownership
      const transaction = await this.p2pService.getTransactionWithPayments(transactionId);
      if (!transaction) {
        return res.status(404).json({
          error: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND'
        });
      }

      // Check if user is the buyer or seller of this transaction
      const isBuyer = transaction.transaction.buyerId.toString() === userId;
      const isSeller = transaction.transaction.sellerId.toString() === userId;

      if (!isBuyer && !isSeller) {
        await this.auditService.logSecurityEvent('UNAUTHORIZED_TRANSACTION_CANCELLATION', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }, {
          userId,
          transactionId,
          reason: 'User is not the buyer or seller of this transaction'
        });

        return res.status(403).json({
          error: 'You can only cancel your own transactions',
          code: 'UNAUTHORIZED_TRANSACTION_CANCELLATION'
        });
      }

      // Cancel transaction
      const cancelledTransaction = await this.p2pService.cancelTransaction(transactionId, userId, reason);

      // Log transaction cancellation
      await this.auditService.logEvent({
        eventType: 'P2P_TRANSACTION_CANCELLED',
        userId,
        tenantId,
        action: 'CANCEL_TRANSACTION',
        resource: 'P2P_TRANSACTION',
        resourceId: transactionId,
        details: {
          reason,
          cancelledBy: isBuyer ? 'BUYER' : 'SELLER'
        },
        severity: 'MEDIUM',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        transaction: cancelledTransaction,
        message: 'Transaction cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel transaction error:', error);
      res.status(500).json({
        error: 'Failed to cancel transaction',
        details: error.message
      });
    }
  }

  /**
   * Get user transactions with enhanced security
   */
  async getUserTransactions(req, res) {
    try {
      const { userId, tenantId } = req.user;
      const { status, startDate, endDate, limit = 50 } = req.query;

      // Validate user permissions
      const hasPermission = await this.validateP2PPermission(userId, tenantId, 'READ');
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions to view P2P transactions',
          code: 'P2P_PERMISSION_DENIED'
        });
      }

      const filters = {
        status,
        startDate,
        endDate,
        limit: parseInt(limit)
      };

      const transactions = await this.p2pService.getUserTransactions(userId, tenantId, filters);

      // Log transaction listing
      await this.auditService.logEvent({
        eventType: 'P2P_TRANSACTIONS_LISTED',
        userId,
        tenantId,
        action: 'GET_USER_TRANSACTIONS',
        resource: 'P2P_TRANSACTION',
        resourceId: null,
        details: {
          transactionCount: transactions.length,
          filters
        },
        severity: 'LOW',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        transactions,
        count: transactions.length
      });
    } catch (error) {
      logger.error('Get user transactions error:', error);
      res.status(500).json({
        error: 'Failed to get user transactions',
        details: error.message
      });
    }
  }

  /**
   * Validate P2P permissions
   */
  async validateP2PPermission(userId, tenantId, action) {
    try {
      const user = await require('../models/User').findById(userId);
      if (!user) return false;

      // Super admin has all permissions
      if (user.role === 'super_admin') return true;

      // Check tenant access
      const tenantAccess = await TenantHierarchyService.validateUserTenantAccess(userId, tenantId);
      if (!tenantAccess.hasAccess) return false;

      // Check specific P2P permissions based on user role
      switch (user.role) {
        case 'exchange_admin':
          return ['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(action);
        case 'branch_manager':
          return ['CREATE', 'READ', 'UPDATE'].includes(action);
        case 'customer':
          return ['CREATE', 'READ'].includes(action);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Validate P2P permission error:', error);
      return false;
    }
  }
}

module.exports = new EnhancedP2PController(); 