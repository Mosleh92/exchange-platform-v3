const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
// const User = require('../models/User'); // Unused
const { validationResult } = require("express-validator");
const i18n = require("../utils/i18n");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/receipts";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"));
    }
  },
});

// Multiple file upload for receipts
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"));
    }
  },
});

// Get all payments for tenant
exports.getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      transactionId,
    } = req.query;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.tenant?.id || req.user.tenantId };

    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (transactionId) query.transactionId = transactionId;

    const payments = await Payment.find(query)
      .populate("customerId", "name email phone")
      .populate("transactionId", "amount currency")
      .populate("branchId", "name code")
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error getting payments:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Create new payment with multiple receipts
exports.createPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.validationError"),
        errors: errors.array(),
      });
    }

    const {
      transactionId,
      customerId,
      amount,
      currency,
      paymentMethod,
      bankAccount,
      sender,
      referenceNumber,
      paymentDate,
    } = req.body;

    // Verify transaction exists and belongs to tenant
    const transaction = await Transaction.findOne({
      _id: transactionId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.transactionNotFound"),
      });
    }

    // Check if payment amount exceeds transaction amount
    const existingPayments = await Payment.find({
      transactionId,
      status: { $in: ["pending", "verified"] },
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = transaction.amount - totalPaid;

    if (amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.paymentAmountExceeds"),
      });
    }

    const payment = new Payment({
      tenantId: req.tenant?.id || req.user.tenantId,
      transactionId,
      customerId,
      branchId: req.user.branchId,
      amount,
      currency,
      paymentMethod,
      sender,
      bankAccount,
      verification: {
        referenceNumber,
        paymentDate: paymentDate || new Date(),
      },
      audit: {
        createdBy: req.user.id,
      },
    });

    await payment.save();

    // Populate references
    await payment.populate("customerId", "name email phone");
    await payment.populate("transactionId", "amount currency");
    await payment.populate("branchId", "name code");

    res.status(201).json({
      success: true,
      message: i18n.t(req.language, "payment.created"),
      data: payment,
    });
  } catch (error) {
    logger.error("Error creating payment:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Upload multiple receipts
exports.uploadMultipleReceipts = [
  uploadMultiple.array("receipts", 10),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { descriptions } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, "error.noFileUploaded"),
        });
      }

      const payment = await Payment.findOne({
        _id: paymentId,
        tenantId: req.tenant?.id || req.user.tenantId,
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: i18n.t(req.language, "error.paymentNotFound"),
        });
      }

      const receiptData = req.files.map((file, index) => ({
        filePath: file.path,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        description:
          descriptions && descriptions[index] ? descriptions[index] : "",
        uploadedAt: new Date(),
      }));

      payment.receipts.push(...receiptData);
      await payment.save();

      res.json({
        success: true,
        message: i18n.t(req.language, "payment.receiptsUploaded"),
        data: {
          paymentId: payment._id,
          receiptsCount: receiptData.length,
        },
      });
    } catch (error) {
      logger.error("Error uploading receipts:", {
        error: error.message,
        stack: error.stack,
        user: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method,
      });
      res.status(500).json({
        success: false,
        message: i18n.t(req.language, "error.serverError"),
        error: error.message,
      });
    }
  },
];

// Upload single receipt
exports.uploadReceipt = [
  upload.single("receiptFile"),
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const {
        description,
        accountHolderName,
        paymentDate,
        referenceNumber,
        amount,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, "error.noFileUploaded"),
        });
      }

      const payment = await Payment.findOne({
        _id: paymentId,
        tenantId: req.tenant?.id || req.user.tenantId,
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: i18n.t(req.language, "error.paymentNotFound"),
        });
      }

      const receiptData = {
        filePath: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        description: description || "",
        uploadedAt: new Date(),
        accountHolderName: accountHolderName || "",
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        referenceNumber: referenceNumber || "",
        amount: amount ? Number(amount) : null,
      };

      payment.receipts.push(receiptData);
      await payment.save();

      res.json({
        success: true,
        message: i18n.t(req.language, "payment.receiptUploaded"),
        data: receiptData,
      });
    } catch (error) {
      logger.error("Error uploading receipt:", {
        error: error.message,
        stack: error.stack,
        user: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method,
      });
      res.status(500).json({
        success: false,
        message: i18n.t(req.language, "error.serverError"),
        error: error.message,
      });
    }
  },
];

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verificationData } = req.body;

    const payment = await Payment.findOne({
      _id: paymentId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.paymentNotFound"),
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.paymentAlreadyProcessed"),
      });
    }

    await payment.verifyPayment(req.user.id, verificationData);

    // Update transaction status if all payments are complete
    const transaction = await Transaction.findById(payment.transactionId);
    const allPayments = await Payment.find({
      transactionId: payment.transactionId,
      status: { $in: ["pending", "verified"] },
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= transaction.amount) {
      transaction.status = "completed";
      await transaction.save();
    }

    await payment.populate("customerId", "name email phone");
    await payment.populate("transactionId", "amount currency");

    res.json({
      success: true,
      message: i18n.t(req.language, "payment.verified"),
      data: payment,
    });
  } catch (error) {
    logger.error("Error verifying payment:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Reject payment
exports.rejectPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findOne({
      _id: paymentId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.paymentNotFound"),
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.paymentAlreadyProcessed"),
      });
    }

    await payment.rejectPayment(req.user.id, reason);

    await payment.populate("customerId", "name email phone");
    await payment.populate("transactionId", "amount currency");

    res.json({
      success: true,
      message: i18n.t(req.language, "payment.rejected"),
      data: payment,
    });
  } catch (error) {
    logger.error("Error rejecting payment:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      _id: paymentId,
      tenantId: req.tenant?.id || req.user.tenantId,
    })
      .populate("customerId", "name email phone")
      .populate("transactionId", "amount currency")
      .populate("branchId", "name code");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.paymentNotFound"),
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error("Error getting payment:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { tenantId: req.tenant?.id || req.user.tenantId };

    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
        },
      },
    ]);

    const totalPayments = await Payment.countDocuments(query);
    const totalAmount = await Payment.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      data: {
        stats,
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0,
      },
    });
  } catch (error) {
    logger.error("Error getting payment stats:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Get pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const payments = await Payment.getPendingPayments(
      req.tenant?.id || req.user.tenantId,
      parseInt(days),
    );

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error("Error getting pending payments:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};
