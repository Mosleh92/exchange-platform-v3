const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const activityLogger = require('./activityLogger');

/**
 * Multi-Stage Payment Receipt System
 * Handles multiple payment receipts with automatic validation and completion tracking
 */
class PaymentReceiptService {
  constructor() {
    this.PaymentReceipt = require('../models/PaymentReceipt');
    this.Deal = require('../models/Deal');
    this.uploadPath = process.env.UPLOAD_PATH || './uploads/receipts';
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    this.setupMulter();
    this.ensureUploadDirectory();
  }

  /**
   * Setup multer for file uploads
   */
  setupMulter() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const dealId = req.body.dealId || req.params.dealId;
        const uploadDir = path.join(this.uploadPath, dealId);
        
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `receipt_${timestamp}${ext}`;
        cb(null, filename);
      }
    });

    this.upload = multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 10 // Maximum 10 files per upload
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'));
        }
      }
    });
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory', {
        path: this.uploadPath,
        error: error.message
      });
    }
  }

  /**
   * Process payment receipt submission
   * @param {string} dealId - Deal ID
   * @param {Object} paymentData - Payment information
   * @param {Array} files - Uploaded receipt files
   * @param {Object} userContext - User context
   */
  async processPaymentReceipt(dealId, paymentData, files, userContext) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate deal exists and is active
      const deal = await this.Deal.findById(dealId).session(session);
      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.status !== 'active') {
        throw new Error('Deal is not active');
      }

      // Process each payment account
      const processedPayments = [];
      
      for (let i = 0; i < paymentData.accounts.length; i++) {
        const account = paymentData.accounts[i];
        const accountFiles = files.filter(file => 
          file.fieldname === `receipt_${i}` || 
          file.originalname.includes(`account_${i}`)
        );

        const payment = await this.createPaymentReceipt({
          dealId,
          accountIndex: i,
          receiverName: account.receiverName,
          amount: parseFloat(account.amount),
          currency: account.currency || deal.toCurrency,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          files: accountFiles,
          notes: account.notes,
          userContext
        }, session);

        processedPayments.push(payment);
      }

      // Check if all payments are complete
      const completionStatus = await this.checkPaymentCompletion(dealId, session);
      
      // Update deal status if all payments are complete
      if (completionStatus.isComplete) {
        await this.Deal.findByIdAndUpdate(
          dealId,
          {
            status: 'payment_complete',
            completedAt: new Date(),
            completionDetails: completionStatus
          },
          { session }
        );

        // Send completion notifications
        await this.sendCompletionNotifications(deal, completionStatus);
      }

      await session.commitTransaction();

      // Log activity
      await activityLogger.logActivity(
        userContext.userId,
        'payment_processed',
        {
          dealId,
          paymentCount: processedPayments.length,
          totalAmount: processedPayments.reduce((sum, p) => sum + p.amount, 0),
          isComplete: completionStatus.isComplete
        },
        userContext
      );

      logger.info('Payment receipts processed successfully', {
        dealId,
        paymentCount: processedPayments.length,
        userId: userContext.userId
      });

      return {
        success: true,
        payments: processedPayments,
        completion: completionStatus,
        message: completionStatus.isComplete ? 
          'All payments completed successfully' : 
          `${completionStatus.completedCount}/${completionStatus.totalRequired} payments completed`
      };

    } catch (error) {
      await session.abortTransaction();
      
      // Clean up uploaded files on error
      if (files && files.length > 0) {
        await this.cleanupFiles(files);
      }

      logger.error('Payment receipt processing failed', {
        dealId,
        userId: userContext.userId,
        error: error.message
      });

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a payment receipt record
   */
  async createPaymentReceipt(paymentData, session) {
    const receiptFiles = [];

    // Process uploaded files
    for (const file of paymentData.files) {
      const fileRecord = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      };

      // Generate thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        try {
          fileRecord.thumbnail = await this.generateThumbnail(file.path);
        } catch (error) {
          logger.warn('Failed to generate thumbnail', {
            file: file.filename,
            error: error.message
          });
        }
      }

      receiptFiles.push(fileRecord);
    }

    // Create payment receipt
    const receipt = new this.PaymentReceipt({
      dealId: paymentData.dealId,
      accountIndex: paymentData.accountIndex,
      receiverName: paymentData.receiverName,
      amount: paymentData.amount,
      currency: paymentData.currency,
      accountDetails: {
        accountNumber: paymentData.accountNumber,
        bankName: paymentData.bankName,
        iban: paymentData.iban,
        swiftCode: paymentData.swiftCode
      },
      files: receiptFiles,
      notes: paymentData.notes,
      status: 'pending_verification',
      submittedBy: paymentData.userContext.userId,
      submittedAt: new Date(),
      metadata: {
        ip: paymentData.userContext.ip,
        userAgent: paymentData.userContext.userAgent,
        sessionId: paymentData.userContext.sessionId
      }
    });

    return await receipt.save({ session });
  }

  /**
   * Check payment completion status
   */
  async checkPaymentCompletion(dealId, session) {
    const deal = await this.Deal.findById(dealId).session(session);
    if (!deal) {
      throw new Error('Deal not found');
    }

    // Get all payment receipts for this deal
    const receipts = await this.PaymentReceipt
      .find({ dealId })
      .session(session);

    // Calculate required payments based on deal structure
    const requiredPayments = deal.paymentAccounts?.length || 1;
    const totalAmount = deal.amount;

    // Group receipts by account index
    const receiptsByAccount = receipts.reduce((acc, receipt) => {
      const key = receipt.accountIndex || 0;
      if (!acc[key]) acc[key] = [];
      acc[key].push(receipt);
      return acc;
    }, {});

    // Check completion for each account
    let completedAccounts = 0;
    let totalPaidAmount = 0;
    const accountStatuses = [];

    for (let i = 0; i < requiredPayments; i++) {
      const accountReceipts = receiptsByAccount[i] || [];
      const verifiedReceipts = accountReceipts.filter(r => r.status === 'verified');
      const accountPaidAmount = verifiedReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expectedAmount = deal.paymentAccounts?.[i]?.amount || (totalAmount / requiredPayments);

      const isComplete = accountPaidAmount >= expectedAmount;
      if (isComplete) completedAccounts++;

      totalPaidAmount += accountPaidAmount;

      accountStatuses.push({
        accountIndex: i,
        expectedAmount,
        paidAmount: accountPaidAmount,
        isComplete,
        receiptCount: accountReceipts.length,
        verifiedReceiptCount: verifiedReceipts.length
      });
    }

    const isComplete = completedAccounts === requiredPayments;
    const completionPercentage = (completedAccounts / requiredPayments) * 100;

    return {
      isComplete,
      completedCount: completedAccounts,
      totalRequired: requiredPayments,
      completionPercentage,
      totalPaidAmount,
      expectedTotalAmount: totalAmount,
      accountStatuses,
      lastUpdated: new Date()
    };
  }

  /**
   * Verify payment receipt
   */
  async verifyPaymentReceipt(receiptId, verificationData, userContext) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const receipt = await this.PaymentReceipt
        .findById(receiptId)
        .session(session);

      if (!receipt) {
        throw new Error('Payment receipt not found');
      }

      if (receipt.status !== 'pending_verification') {
        throw new Error('Receipt is not in pending verification status');
      }

      // Update receipt status
      receipt.status = verificationData.approved ? 'verified' : 'rejected';
      receipt.verificationDetails = {
        verifiedBy: userContext.userId,
        verifiedAt: new Date(),
        approved: verificationData.approved,
        comments: verificationData.comments,
        verificationLevel: verificationData.level || 'manual'
      };

      await receipt.save({ session });

      // Check deal completion after verification
      const completionStatus = await this.checkPaymentCompletion(receipt.dealId, session);

      // Update deal if necessary
      if (completionStatus.isComplete) {
        await this.Deal.findByIdAndUpdate(
          receipt.dealId,
          {
            status: 'payment_complete',
            completedAt: new Date(),
            completionDetails: completionStatus
          },
          { session }
        );
      }

      await session.commitTransaction();

      // Log verification activity
      await activityLogger.logActivity(
        userContext.userId,
        verificationData.approved ? 'payment_verified' : 'payment_rejected',
        {
          receiptId: receipt._id,
          dealId: receipt.dealId,
          amount: receipt.amount,
          verificationComments: verificationData.comments
        },
        userContext
      );

      return {
        success: true,
        receipt,
        completion: completionStatus,
        message: verificationData.approved ? 
          'Payment receipt verified successfully' : 
          'Payment receipt rejected'
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get payment receipts with filtering
   */
  async getPaymentReceipts(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = pagination;

    const query = this.buildReceiptQuery(filters);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const receipts = await this.PaymentReceipt
      .find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('submittedBy', 'firstName lastName email')
      .populate('dealId', 'dealNumber fromCurrency toCurrency amount')
      .lean();

    const total = await this.PaymentReceipt.countDocuments(query);

    return {
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Generate thumbnail for image files
   */
  async generateThumbnail(filePath) {
    // This is a placeholder - in production, use Sharp or similar library
    // const sharp = require('sharp');
    // const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
    // await sharp(filePath)
    //   .resize(200, 200)
    //   .jpeg({ quality: 80 })
    //   .toFile(thumbnailPath);
    // return thumbnailPath;
    
    return null; // Placeholder
  }

  /**
   * Clean up uploaded files
   */
  async cleanupFiles(files) {
    for (const file of files) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        logger.warn('Failed to cleanup file', {
          file: file.path,
          error: error.message
        });
      }
    }
  }

  /**
   * Send completion notifications
   */
  async sendCompletionNotifications(deal, completionStatus) {
    // Implement notification logic here
    // Could send emails, SMS, push notifications, etc.
    logger.info('Payment completion notifications sent', {
      dealId: deal._id,
      completionStatus
    });
  }

  /**
   * Build query for receipt filtering
   */
  buildReceiptQuery(filters) {
    const query = {};

    if (filters.dealId) query.dealId = filters.dealId;
    if (filters.status) query.status = filters.status;
    if (filters.submittedBy) query.submittedBy = filters.submittedBy;
    if (filters.currency) query.currency = filters.currency;

    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = parseFloat(filters.minAmount);
      if (filters.maxAmount) query.amount.$lte = parseFloat(filters.maxAmount);
    }

    if (filters.startDate || filters.endDate) {
      query.submittedAt = {};
      if (filters.startDate) query.submittedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.submittedAt.$lte = new Date(filters.endDate);
    }

    return query;
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return this.upload.array('receipts', 10);
  }
}

module.exports = new PaymentReceiptService();