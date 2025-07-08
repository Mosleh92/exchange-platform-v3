const Remittance = require("../models/Remittance");
const Account = require("../models/Account");
const ExchangeRate = require("../models/ExchangeRate");
const User = require("../models/User");
const {
  generateSecretCode,
  generateQRCode,
  verifyQRCode,
} = require("../utils/remittanceUtils");
const NotificationService = require("../services/notificationService");
const logger = require("../utils/logger");

// Create new remittance
exports.createRemittance = async (req, res) => {
  try {
    const {
      type,
      fromCurrency,
      toCurrency,
      amount,
      receiverInfo,
      deliveryInfo,
      security,
      notes,
    } = req.body;

    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // Validate exchange rate
    const exchangeRate = await ExchangeRate.getCurrentRate(
      tenantId,
      fromCurrency,
      toCurrency,
    );
    if (!exchangeRate) {
      return res.status(400).json({
        success: false,
        message: "نرخ ارز برای این جفت ارز یافت نشد",
      });
    }

    // Calculate conversion
    const conversion = exchangeRate.calculateConversion(amount, "buy");

    // Validate amount limits
    if (!exchangeRate.isAmountValid(amount)) {
      return res.status(400).json({
        success: false,
        message: `مقدار باید بین ${exchangeRate.minAmount} و ${exchangeRate.maxAmount} باشد`,
      });
    }

    // Check sender account balance
    const senderAccount = await Account.findOne({
      customerId: userId,
      tenantId,
      currency: fromCurrency,
      status: "active",
    });

    if (!senderAccount || senderAccount.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "موجودی کافی نیست",
      });
    }

    // Create remittance
    const remittance = new Remittance({
      remittanceId: Remittance.generateRemittanceId(),
      tenantId,
      senderId: userId,
      type,
      fromCurrency,
      toCurrency,
      amount,
      exchangeRate: conversion.rate,
      convertedAmount: conversion.convertedAmount,
      commission: conversion.commission,
      totalAmount: conversion.totalCost,
      receiverInfo,
      deliveryInfo,
      security,
      notes: { sender: notes },
      audit: { createdBy: userId },
    });

    // Add initial approval requirement
    const requiredApprovals = type === "international" ? 2 : 1;
    for (let i = 1; i <= requiredApprovals; i++) {
      remittance.approvals.push({
        level: i,
        status: "pending",
      });
    }

    await remittance.save();

    // Freeze amount in sender account
    await senderAccount.freezeAmount(amount);

    res.status(201).json({
      success: true,
      message: "حواله با موفقیت ایجاد شد",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Create remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در ایجاد حواله",
    });
  }
};

// Get remittance by ID
exports.getRemittance = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    })
      .populate("senderId", "name email phone")
      .populate("receiverId", "name email phone")
      .populate("senderBranchId", "name address")
      .populate("receiverBranchId", "name address");

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    res.json({
      success: true,
      data: { remittance },
    });
  } catch (error) {
    logger.error("Get remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در دریافت حواله",
    });
  }
};

// Get customer remittances
exports.getCustomerRemittances = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, fromDate, toDate } = req.query;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const query = { tenantId, senderId: userId };

    if (type) query.type = type;
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const remittances = await Remittance.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("senderBranchId", "name")
      .populate("receiverBranchId", "name");

    const total = await Remittance.countDocuments(query);

    res.json({
      success: true,
      data: {
        remittances,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    logger.error("Get customer remittances error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در دریافت حواله‌ها",
    });
  }
};

// Approve remittance (staff only)
exports.approveRemittance = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const { level, notes } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    await remittance.addApproval(level, userId, notes);

    res.json({
      success: true,
      message: "حواله با موفقیت تأیید شد",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Approve remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در تأیید حواله",
    });
  }
};

// Process remittance (staff only)
exports.processRemittance = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    await remittance.process(userId);

    res.json({
      success: true,
      message: "حواله در حال پردازش است",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Process remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در پردازش حواله",
    });
  }
};

// Complete remittance (staff only)
exports.completeRemittance = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    await remittance.complete(userId);

    // Update sender account
    const senderAccount = await Account.findOne({
      customerId: remittance.senderId,
      tenantId,
      currency: remittance.fromCurrency,
      status: "active",
    });

    if (senderAccount) {
      await senderAccount.unfreezeAmount(remittance.amount);
      await senderAccount.addTransaction(remittance.amount, "debit");
    }

    remittance.statusHistory.push({
      status: "completed",
      changedBy: userId,
      changedAt: new Date(),
      note: "تکمیل حواله",
    });

    await remittance.save();

    res.json({
      success: true,
      message: "حواله با موفقیت تکمیل شد",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Complete remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در تکمیل حواله",
    });
  }
};

// Cancel remittance
exports.cancelRemittance = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    await remittance.cancel(reason, userId);

    // Unfreeze amount in sender account
    const senderAccount = await Account.findOne({
      customerId: remittance.senderId,
      tenantId,
      currency: remittance.fromCurrency,
      status: "active",
    });

    if (senderAccount) {
      await senderAccount.unfreezeAmount(remittance.amount);
    }

    remittance.statusHistory.push({
      status: "cancelled",
      changedBy: userId,
      changedAt: new Date(),
      note: reason,
    });

    await remittance.save();

    res.json({
      success: true,
      message: "حواله با موفقیت لغو شد",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Cancel remittance error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در لغو حواله",
    });
  }
};

// Add payment to remittance
exports.addPayment = async (req, res) => {
  try {
    const { remittanceId } = req.params;
    const { amount, method, reference, receipt } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }

    const paymentData = {
      amount,
      method,
      reference,
      receipt,
      paidAt: new Date(),
    };

    await remittance.addPayment(paymentData);

    res.json({
      success: true,
      message: "پرداخت با موفقیت اضافه شد",
      data: { remittance },
    });
  } catch (error) {
    logger.error("Add payment error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در اضافه کردن پرداخت",
    });
  }
};

// Get remittance statistics
exports.getRemittanceStats = async (req, res) => {
  try {
    const { fromDate, toDate, type, status } = req.query;
    const tenantId = req.user.tenantId;

    const filters = {};
    if (fromDate || toDate) {
      filters.createdAt = {};
      if (fromDate) filters.createdAt.$gte = new Date(fromDate);
      if (toDate) filters.createdAt.$lte = new Date(toDate);
    }
    if (type) filters.type = type;
    if (status) filters.status = status;

    const stats = await Remittance.getStats(tenantId, filters);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error("Get remittance stats error:", {
      error: error.message,
      stack: error.stack,
      user: req.user?.id || req.user?.userId,
      endpoint: req.originalUrl,
      method: req.method,
    });
    res.status(500).json({
      success: false,
      message: "خطا در دریافت آمار حواله‌ها",
    });
  }
};

// ایجاد حواله رمزدار بین شعب
exports.createInterBranchRemittance = async (req, res) => {
  try {
    const {
      senderBranchId,
      receiverBranchId,
      amount,
      currency,
      receiverInfo,
      note,
    } = req.body;
    const secretCode = generateSecretCode();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 روز اعتبار
    const remittance = new Remittance({
      remittanceId: Remittance.generateRemittanceId(),
      type: "inter_branch",
      senderBranchId,
      receiverBranchId,
      amount,
      fromCurrency: currency,
      toCurrency: currency,
      convertedAmount: amount,
      totalAmount: amount,
      receiverInfo,
      notes: { sender: note },
      secretCode,
      expiresAt,
      status: "pending",
      audit: { createdBy: req.user.userId },
    });
    await remittance.save();
    remittance.qrCode = await generateQRCode({
      id: remittance._id,
      secretCode,
    });
    await remittance.save();
    res.status(201).json({ success: true, remittance });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "خطا در ایجاد حواله رمزدار", error });
  }
};

// برداشت حواله رمزدار در شعبه مقصد
exports.redeemInterBranchRemittance = async (req, res) => {
  try {
    const { codeOrQR, receiverBranchId, receiverName } = req.body;
    let remittance;
    if (codeOrQR.length === 8) {
      remittance = await Remittance.findOne({
        secretCode: codeOrQR,
        receiverBranchId,
      });
    } else {
      // decode QR (JWT)
      const payload = verifyQRCode(codeOrQR);
      if (!payload) {
        console.log(
          `[REMITTANCE-REDEEM-FAIL] QR نامعتبر branch=${receiverBranchId} name=${receiverName} ip=${req.ip}`,
        );
        return res.status(400).json({ error: "QR نامعتبر یا منقضی شده" });
      }
      remittance = await Remittance.findOne({
        _id: payload.id,
        secretCode: payload.secretCode,
        receiverBranchId,
      });
    }
    if (!remittance) {
      console.log(
        `[REMITTANCE-REDEEM-FAIL] حواله یافت نشد codeOrQR=${codeOrQR} branch=${receiverBranchId} name=${receiverName} ip=${req.ip}`,
      );
      return res.status(404).json({ error: "حواله یافت نشد" });
    }
    if (remittance.status !== "pending") {
      console.log(
        `[REMITTANCE-REDEEM-FAIL] حواله قبلاً برداشت شده یا منقضی است codeOrQR=${codeOrQR} branch=${receiverBranchId} name=${receiverName} ip=${req.ip}`,
      );
      return res
        .status(400)
        .json({ error: "حواله قبلاً برداشت شده یا منقضی است" });
    }
    if (remittance.expiresAt < new Date()) {
      console.log(
        `[REMITTANCE-REDEEM-FAIL] حواله منقضی شده codeOrQR=${codeOrQR} branch=${receiverBranchId} name=${receiverName} ip=${req.ip}`,
      );
      return res.status(400).json({ error: "حواله منقضی شده" });
    }
    if (remittance.receiverInfo.name !== receiverName) {
      console.log(
        `[REMITTANCE-REDEEM-FAIL] نام گیرنده مطابقت ندارد codeOrQR=${codeOrQR} branch=${receiverBranchId} name=${receiverName} ip=${req.ip}`,
      );
      return res.status(400).json({ error: "نام گیرنده مطابقت ندارد" });
    }
    remittance.status = "completed";
    remittance.redeemedAt = new Date();
    remittance.statusHistory.push({
      status: "completed",
      changedBy: req.user.userId,
      changedAt: new Date(),
      note: "برداشت حواله در شعبه مقصد",
    });
    await remittance.save();
    // اعلان برداشت حواله به گیرنده
    await NotificationService.send({
      to: remittance.receiverInfo?.phone || remittance.receiverInfo?.email,
      type: "remittance_redeemed",
      message: `حواله با کد ${remittance.secretCode} با موفقیت برداشت شد.`,
    });
    res.json({ success: true, remittance });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "خطا در برداشت حواله", error });
  }
};

// تایید دریافت حواله در شعبه مقصد (قبل از برداشت نهایی)
exports.confirmInterBranchRemittanceReceipt = async (req, res) => {
  try {
    const { remittanceId } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const remittance = await Remittance.findOne({
      remittanceId,
      tenantId,
    });

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "حواله یافت نشد",
      });
    }
    if (remittance.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "حواله در وضعیت مناسب برای تایید دریافت نیست",
      });
    }
    remittance.status = "received";
    remittance.statusHistory.push({
      status: "received",
      changedBy: userId,
      changedAt: new Date(),
      note: "تایید دریافت حواله در شعبه مقصد",
    });
    await remittance.save();
    res.json({ success: true, remittance });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "خطا در تایید دریافت حواله", error });
  }
};

module.exports = exports;
