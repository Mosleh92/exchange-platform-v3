const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const Remittance = require('../models/Remittance');
const P2POrder = require('../models/P2POrder');
const cache = require('../utils/cache');

const ReportService = {
  /**
   * Get financial report for a tenant (summary of transactions, payments, remittances, P2P, etc.)
   */
  async getFinancialReport({ tenantId, fromDate, toDate }) {
    const cacheKey = `report:financial:${tenantId}:${fromDate || 'all'}:${toDate || 'all'}`;
    let cached = await cache.get(cacheKey);
    if (cached) return cached;
    const match = { tenantId };
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }
    // Aggregate transactions (projection added)
    const transactions = await Transaction.aggregate([
      { $match: match },
      { $project: { type: 1, totalAmount: 1 } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    // Aggregate payments
    const payments = await Payment.aggregate([
      { $match: match },
      { $project: { status: 1, amount: 1 } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    // Aggregate remittances
    const remittances = await Remittance.aggregate([
      { $match: match },
      { $project: { status: 1, totalAmount: 1 } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    // Aggregate P2P orders
    const p2pOrders = await P2POrder.aggregate([
      { $match: match },
      { $project: { status: 1, amount: 1 } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    const result = {
      transactions,
      payments,
      remittances,
      p2pOrders
    };
    await cache.set(cacheKey, result, 300); // کش ۵ دقیقه
    return result;
  },

  /**
   * Get transaction summary (by type, status, etc.)
   */
  async getTransactionSummary({ tenantId, fromDate, toDate }) {
    const match = { tenantId };
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }
    const summary = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    return summary;
  },

  /**
   * Get user activity report (number of transactions, payments, etc.)
   */
  async getUserActivityReport({ tenantId, userId, fromDate, toDate }) {
    const match = { tenantId, customerId: userId };
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) match.createdAt.$gte = new Date(fromDate);
      if (toDate) match.createdAt.$lte = new Date(toDate);
    }
    const transactions = await Transaction.countDocuments(match);
    const payments = await Payment.countDocuments({ tenantId, userId, ...match.createdAt ? { createdAt: match.createdAt } : {} });
    const remittances = await Remittance.countDocuments({ tenantId, senderId: userId, ...match.createdAt ? { createdAt: match.createdAt } : {} });
    const p2pOrders = await P2POrder.countDocuments({ tenantId, userId, ...match.createdAt ? { createdAt: match.createdAt } : {} });
    return {
      transactions,
      payments,
      remittances,
      p2pOrders
    };
  }
};

module.exports = ReportService; 