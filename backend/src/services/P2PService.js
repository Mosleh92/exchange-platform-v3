const P2POrder = require('../models/P2POrder');
const NotificationService = require('./notificationService');

const P2PService = {
  /**
   * Handles creation of a new P2P order (business logic only)
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} - Created P2P order object
   */
  async handleP2POrder(req) {
    const { amount, currency, type, price, notes } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;
    // Create P2P order
    const order = new P2POrder({
      tenantId,
      userId,
      amount,
      currency,
      type,
      price,
      notes: { user: notes },
      status: 'pending',
      audit: { createdBy: userId }
    });
    await order.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return order;
  },

  /**
   * Approve a P2P order (staff or counterparty)
   */
  async approveP2POrder({ orderId, userId, tenantId, notes }) {
    const order = await P2POrder.findOne({ _id: orderId, tenantId });
    if (!order) throw new Error('سفارش یافت نشد');
    if (order.status === 'approved') throw new Error('سفارش قبلاً تأیید شده است');
    order.status = 'approved';
    order.audit = order.audit || {};
    order.audit.approvedBy = userId;
    order.audit.approvedAt = new Date();
    order.audit.approvalNotes = notes;
    await order.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return order;
  },

  /**
   * Reject a P2P order (staff or counterparty)
   */
  async rejectP2POrder({ orderId, userId, tenantId, notes }) {
    const order = await P2POrder.findOne({ _id: orderId, tenantId });
    if (!order) throw new Error('سفارش یافت نشد');
    if (order.status === 'rejected') throw new Error('سفارش قبلاً رد شده است');
    order.status = 'rejected';
    order.audit = order.audit || {};
    order.audit.rejectedBy = userId;
    order.audit.rejectedAt = new Date();
    order.audit.rejectionNotes = notes;
    await order.save();
    // (Optional) Send notification
    // await NotificationService.sendNotification(...);
    return order;
  },

  /**
   * Get a P2P order by ID
   */
  async getP2POrderById({ orderId, tenantId }) {
    const order = await P2POrder.findOne({ _id: orderId, tenantId });
    if (!order) throw new Error('سفارش یافت نشد');
    return order;
  },

  /**
   * Get user P2P orders (with pagination and filters)
   */
  async getUserP2POrders({ userId, tenantId, page = 1, limit = 10, status, fromDate, toDate }) {
    const query = { tenantId, userId };
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }
    const orders = await P2POrder.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await P2POrder.countDocuments(query);
    return {
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  }
};

module.exports = P2PService; 