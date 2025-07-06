const Payment = require('../models/Payment');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const NotificationService = require('./notificationService');
const { recordTransaction } = require('./accountingService');

const PaymentService = {
  /**
   * Handles creation of a new payment (business logic only)
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} - Created payment object
   */
  async handlePayment(req) {
    const { amount, currency, method, reference, notes } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    // Validate account and balance if needed (for withdrawal)
    // ...
    // Create payment
    const payment = new Payment({
      tenantId,
      userId,
      amount,
      currency,
      method,
      reference,
      notes: { user: notes },
      status: 'pending',
      audit: { createdBy: userId }
    });
    await payment.save();
    // ثبت سند حسابداری
    await recordTransaction({
      description: `ثبت پرداخت کاربر ${userId}`,
      debitAccount: 'Cash',
      creditAccount: 'Receivable',
      amount,
      reference: payment._id.toString()
    });
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return payment;
  },

  /**
   * Approve a payment (staff only)
   */
  async approvePayment({ paymentId, userId, tenantId, notes }) {
    const payment = await Payment.findOne({ _id: paymentId, tenantId });
    if (!payment) throw new Error('پرداخت یافت نشد');
    if (payment.status === 'approved') throw new Error('پرداخت قبلاً تأیید شده است');
    payment.status = 'approved';
    payment.audit = payment.audit || {};
    payment.audit.approvedBy = userId;
    payment.audit.approvedAt = new Date();
    payment.audit.approvalNotes = notes;
    await payment.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return payment;
  },

  /**
   * Reject a payment (staff only)
   */
  async rejectPayment({ paymentId, userId, tenantId, notes }) {
    const payment = await Payment.findOne({ _id: paymentId, tenantId });
    if (!payment) throw new Error('پرداخت یافت نشد');
    if (payment.status === 'rejected') throw new Error('پرداخت قبلاً رد شده است');
    payment.status = 'rejected';
    payment.audit = payment.audit || {};
    payment.audit.rejectedBy = userId;
    payment.audit.rejectedAt = new Date();
    payment.audit.rejectionNotes = notes;
    await payment.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return payment;
  },

  /**
   * Get a payment by ID
   */
  async getPaymentById({ paymentId, tenantId }) {
    const payment = await Payment.findOne({ _id: paymentId, tenantId });
    if (!payment) throw new Error('پرداخت یافت نشد');
    return payment;
  },

  /**
   * Get customer payments (with pagination and filters)
   */
  async getCustomerPayments({ userId, tenantId, page = 1, limit = 10, status, fromDate, toDate }) {
    const query = { tenantId, userId };
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Payment.countDocuments(query);
    return {
      payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }
};

module.exports = PaymentService; 