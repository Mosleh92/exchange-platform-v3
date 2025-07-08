const Debt = require("../models/Debt");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { validationResult } = require("express-validator");
const i18n = require("../utils/i18n");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/debt-receipts";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `debt-receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// Get all debts for tenant
exports.getAllDebts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId, riskLevel } = req.query;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.tenant?.id || req.user.tenantId };

    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (riskLevel) query["metadata.riskLevel"] = riskLevel;

    const debts = await Debt.find(query)
      .populate("customerId", "name email phone")
      .populate("transactionId", "amount currency")
      .populate("branchId", "name code")
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Debt.countDocuments(query);

    res.json({
      success: true,
      data: debts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error getting debts:", {
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

// Create new debt
exports.createDebt = async (req, res) => {
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
      customerId,
      transactionId,
      originalAmount,
      currency,
      dueDate,
      interestRate,
      penaltyRate,
      gracePeriod,
      paymentSchedule,
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

    // Check if debt already exists for this transaction
    const existingDebt = await Debt.findOne({
      transactionId,
      status: { $ne: "settled" },
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (existingDebt) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.debtAlreadyExists"),
      });
    }

    const debt = new Debt({
      tenantId: req.tenant?.id || req.user.tenantId,
      customerId,
      transactionId,
      branchId: req.user.branchId,
      originalAmount,
      remainingAmount: originalAmount,
      currency,
      dueDate: new Date(dueDate),
      interestRate: interestRate || 0,
      penaltyRate: penaltyRate || 0,
      gracePeriod: gracePeriod || 0,
      paymentSchedule: paymentSchedule || [],
      audit: {
        createdBy: req.user.id,
      },
    });

    await debt.save();

    // Populate references
    await debt.populate("customerId", "name email phone");
    await debt.populate("transactionId", "amount currency");
    await debt.populate("branchId", "name code");

    res.status(201).json({
      success: true,
      message: i18n.t(req.language, "debt.created"),
      data: debt,
    });
  } catch (error) {
    logger.error("Error creating debt:", {
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

// Get debt by ID
exports.getDebtById = async (req, res) => {
  try {
    const { debtId } = req.params;

    const debt = await Debt.findOne({
      _id: debtId,
      tenantId: req.tenant?.id || req.user.tenantId,
    })
      .populate("customerId", "name email phone")
      .populate("transactionId", "amount currency")
      .populate("branchId", "name code");

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFound"),
      });
    }

    res.json({
      success: true,
      data: debt,
    });
  } catch (error) {
    logger.error("Error getting debt:", {
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

// Update debt
exports.updateDebt = async (req, res) => {
  try {
    const { debtId } = req.params;
    const {
      interestRate,
      penaltyRate,
      gracePeriod,
      metadata,
      paymentSchedule,
    } = req.body;

    const debt = await Debt.findOne({
      _id: debtId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFound"),
      });
    }

    if (interestRate !== undefined) debt.interestRate = interestRate;
    if (penaltyRate !== undefined) debt.penaltyRate = penaltyRate;
    if (gracePeriod !== undefined) debt.gracePeriod = gracePeriod;
    if (metadata) debt.metadata = { ...debt.metadata, ...metadata };
    if (paymentSchedule) debt.paymentSchedule = paymentSchedule;

    debt.audit.updatedBy = req.user.id;

    await debt.save();

    await debt.populate("customerId", "name email phone");
    await debt.populate("transactionId", "amount currency");

    res.json({
      success: true,
      message: i18n.t(req.language, "debt.updated"),
      data: debt,
    });
  } catch (error) {
    logger.error("Error updating debt:", {
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

// Add payment to debt with receipts
exports.addPayment = [
  upload.array("receipts", 10),
  async (req, res) => {
    try {
      const { debtId } = req.params;
      const {
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber,
        sender,
        bankAccount,
      } = req.body;

      const debt = await Debt.findOne({
        _id: debtId,
        tenantId: req.tenant?.id || req.user.tenantId,
      });

      if (!debt) {
        return res.status(404).json({
          success: false,
          message: i18n.t(req.language, "error.debtNotFound"),
        });
      }

      // Validate payment amount
      if (amount > debt.remainingAmount) {
        return res.status(400).json({
          success: false,
          message: i18n.t(req.language, "error.paymentAmountExceeds"),
        });
      }

      // Create payment record
      const payment = new Payment({
        tenantId: req.tenant?.id || req.user.tenantId,
        transactionId: debt.transactionId,
        customerId: debt.customerId,
        branchId: req.user.branchId,
        amount: parseFloat(amount),
        currency: debt.currency,
        paymentMethod,
        sender: sender ? JSON.parse(sender) : {},
        bankAccount: bankAccount ? JSON.parse(bankAccount) : {},
        verification: {
          referenceNumber,
          paymentDate: paymentDate || new Date(),
        },
        audit: {
          createdBy: req.user.id,
        },
      });

      // Add receipts if uploaded
      if (req.files && req.files.length > 0) {
        const receiptData = req.files.map((file) => ({
          filePath: file.path,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        }));
        payment.receipts = receiptData;
      }

      await payment.save();

      // Update debt
      debt.remainingAmount -= parseFloat(amount);
      debt.payments.push({
        paymentId: payment._id,
        amount: parseFloat(amount),
        currency: debt.currency,
        method: paymentMethod,
        status: "pending",
        date: new Date(),
      });

      // Update debt status
      if (debt.remainingAmount <= 0) {
        debt.status = "settled";
        debt.settledAt = new Date();
      } else if (debt.remainingAmount < debt.originalAmount) {
        debt.status = "partial_paid";
      }

      await debt.save();

      // Populate references
      await payment.populate("customerId", "name email phone");
      await payment.populate("transactionId", "amount currency");
      await payment.populate("branchId", "name code");

      res.json({
        success: true,
        message: i18n.t(req.language, "debt.paymentAdded"),
        data: {
          payment,
          debt: {
            remainingAmount: debt.remainingAmount,
            status: debt.status,
          },
        },
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      res.status(500).json({
        success: false,
        message: i18n.t(req.language, "error.serverError"),
        error: error.message,
      });
    }
  },
];

// Send notification
exports.sendNotification = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { type, method, content } = req.body;

    const debt = await Debt.findOne({
      _id: debtId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFound"),
      });
    }

    await debt.sendNotification(type, method, content, req.user.id);

    res.json({
      success: true,
      message: i18n.t(req.language, "debt.notificationSent"),
      data: {
        notification: debt.notifications[debt.notifications.length - 1],
      },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Settle debt
exports.settleDebt = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { reason } = req.body;

    const debt = await Debt.findOne({
      _id: debtId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFound"),
      });
    }

    if (debt.remainingAmount > 0) {
      return res.status(400).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFullyPaid"),
      });
    }

    debt.status = "settled";
    debt.audit.settledBy = req.user.id;
    debt.audit.settledAt = new Date();
    debt.audit.reason = reason;

    await debt.save();

    await debt.populate("customerId", "name email phone");
    await debt.populate("transactionId", "amount currency");

    res.json({
      success: true,
      message: i18n.t(req.language, "debt.settled"),
      data: debt,
    });
  } catch (error) {
    console.error("Error settling debt:", error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Write off debt
exports.writeOffDebt = async (req, res) => {
  try {
    const { debtId } = req.params;
    const { reason } = req.body;

    const debt = await Debt.findOne({
      _id: debtId,
      tenantId: req.tenant?.id || req.user.tenantId,
    });

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, "error.debtNotFound"),
      });
    }

    debt.status = "written_off";
    debt.audit.writtenOffBy = req.user.id;
    debt.audit.writtenOffAt = new Date();
    debt.audit.reason = reason;

    await debt.save();

    await debt.populate("customerId", "name email phone");
    await debt.populate("transactionId", "amount currency");

    res.json({
      success: true,
      message: i18n.t(req.language, "debt.writtenOff"),
      data: debt,
    });
  } catch (error) {
    console.error("Error writing off debt:", error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Get overdue debts
exports.getOverdueDebts = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const debts = await Debt.getOverdueDebts(
      req.tenant?.id || req.user.tenantId,
      parseInt(days),
    );

    res.json({
      success: true,
      data: debts,
    });
  } catch (error) {
    console.error("Error getting overdue debts:", error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};

// Get debt statistics
exports.getDebtStats = async (req, res) => {
  try {
    const stats = await Debt.getDebtStats(req.tenant?.id || req.user.tenantId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting debt stats:", error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, "error.serverError"),
      error: error.message,
    });
  }
};
