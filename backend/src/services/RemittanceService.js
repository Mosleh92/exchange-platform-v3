const Remittance = require('../models/Remittance');
const Account = require('../models/Account');
const ExchangeRate = require('../models/ExchangeRate');
// const { generateSecretCode, generateQRCode, verifyQRCode } = require('../utils/remittanceUtils'); // Unused
// const NotificationService = require('./notificationService'); // Unused
const { recordTransaction } = require('./accountingService');

const RemittanceService = {
  /**
   * Handles creation of a new remittance transaction (business logic only)
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} - Created remittance object
   */
  async handleRemittance(req) {
    const {
      type,
      fromCurrency,
      toCurrency,
      amount,
      receiverInfo,
      deliveryInfo,
      security,
      notes
    } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    // Validate exchange rate
    const exchangeRate = await ExchangeRate.getCurrentRate(tenantId, fromCurrency, toCurrency);
    if (!exchangeRate) {
      throw new Error('نرخ ارز برای این جفت ارز یافت نشد');
    }

    // Calculate conversion
    const conversion = exchangeRate.calculateConversion(amount, 'buy');
    // Validate amount limits
    if (!exchangeRate.isAmountValid(amount)) {
      throw new Error(`مقدار باید بین ${exchangeRate.minAmount} و ${exchangeRate.maxAmount} باشد`);
    }

    // Check sender account balance
    const senderAccount = await Account.findOne({
      customerId: userId,
      tenantId,
      currency: fromCurrency,
      status: 'active'
    });
    if (!senderAccount || senderAccount.availableBalance < amount) {
      throw new Error('موجودی کافی نیست');
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
      audit: { createdBy: userId }
    });

    // Add initial approval requirement
    const requiredApprovals = type === 'international' ? 2 : 1;
    for (let i = 1; i <= requiredApprovals; i++) {
      remittance.approvals.push({
        level: i,
        status: 'pending'
      });
    }

    await remittance.save();
    // ثبت سند حسابداری
    await recordTransaction({
      description: `ثبت حواله کاربر ${userId}`,
      debitAccount: 'RemittanceOut',
      creditAccount: 'Cash',
      amount,
      reference: remittance.remittanceId
    });
    // Freeze amount in sender account
    await senderAccount.freezeAmount(amount);
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return remittance;
  },

  /**
   * Approve a remittance (staff only)
   */
  async approveRemittance({ remittanceId, level, notes, userId, tenantId }) {
    const remittance = await Remittance.findOne({ remittanceId, tenantId });
    if (!remittance) throw new Error('حواله یافت نشد');
    // Find approval level
    const approval = remittance.approvals.find(a => a.level === level);
    if (!approval) throw new Error('سطح تأیید نامعتبر است');
    if (approval.status === 'approved') throw new Error('این سطح قبلاً تأیید شده است');
    approval.status = 'approved';
    approval.approvedBy = userId;
    approval.approvedAt = new Date();
    approval.notes = notes;
    // If all approvals done, set status to approved
    if (remittance.approvals.every(a => a.status === 'approved')) {
      remittance.status = 'approved';
    }
    await remittance.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return remittance;
  },

  /**
   * Reject a remittance (staff only)
   */
  async rejectRemittance({ remittanceId, level, notes, userId, tenantId }) {
    const remittance = await Remittance.findOne({ remittanceId, tenantId });
    if (!remittance) throw new Error('حواله یافت نشد');
    const approval = remittance.approvals.find(a => a.level === level);
    if (!approval) throw new Error('سطح تأیید نامعتبر است');
    if (approval.status === 'rejected') throw new Error('این سطح قبلاً رد شده است');
    approval.status = 'rejected';
    approval.rejectedBy = userId;
    approval.rejectedAt = new Date();
    approval.notes = notes;
    remittance.status = 'rejected';
    await remittance.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return remittance;
  },

  /**
   * Get a remittance by ID
   */
  async getRemittanceById({ remittanceId, tenantId }) {
    const remittance = await Remittance.findOne({ remittanceId, tenantId })
      .populate('senderId', 'name email phone')
      .populate('receiverId', 'name email phone')
      .populate('senderBranchId', 'name address')
      .populate('receiverBranchId', 'name address');
    if (!remittance) throw new Error('حواله یافت نشد');
    return remittance;
  },

  /**
   * Get customer remittances (with pagination and filters)
   */
  async getCustomerRemittances({ userId, tenantId, page = 1, limit = 10, type, status, fromDate, toDate }) {
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
      .populate('senderBranchId', 'name')
      .populate('receiverBranchId', 'name');
    const total = await Remittance.countDocuments(query);
    return {
      remittances,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }
};

module.exports = RemittanceService; 