const P2PAnnouncement = require('../models/P2PAnnouncement');
const P2PTransaction = require('../models/P2PTransaction');
const { AuditLog } = require('../models/User');
const { validationResult } = require('express-validator');

// backend/src/controllers/P2PController.js
const { DatabaseManager } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateOrderId } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
 main

class P2PController {
  // Create P2P order
  async createOrder(req, res) {
    try {
      const { tenantId } = req.user;
      const {
        currencyFrom,
        currencyTo,
        amount,
        rate,
        paymentMethods,
        timeLimit = 30
      } = req.body;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const P2POrder = connection.model('P2POrder', p2pOrderSchema);

      // Check if user has sufficient balance
      const userBalance = await this.checkUserBalance(tenantId, req.user.id, currencyFrom, amount);
      if (!userBalance) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      const order = new P2POrder({
        orderId: await generateOrderId(tenantId),
        sellerId: req.user.id,
        currencyFrom,
        currencyTo,
        amount,
        rate,
        totalAmount: amount * rate,
        status: 'active',
        paymentMethods,
        timeLimit,
        escrow: {
          status: 'not_started'
        }
      });

      await order.save();

      // Lock seller's funds in escrow
      await this.lockFundsInEscrow(tenantId, req.user.id, currencyFrom, amount, order._id);

      // Notify all users about new order
      await NotificationService.broadcastToTenant(tenantId, 'new_p2p_order', {
        orderId: order.orderId,
        currencyFrom,
        currencyTo,
        amount,
        rate
      });

      res.status(201).json({
        success: true,
        message: 'P2P order created successfully',
        order
      });

    } catch (error) {
      logger.error('Error creating P2P order:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating P2P order'
      });
    }
  }

  // Get all active P2P orders
  async getActiveOrders(req, res) {
    try {
      const { tenantId } = req.user;
      const { currencyFrom, currencyTo, page = 1, limit = 20 } = req.query;

      const connection = DatabaseManager.getTenantConnection(tenantId);
      const P2POrder = connection.model('P2POrder', p2pOrderSchema);

      const filter = { status: 'active' };
      if (currencyFrom) filter.currencyFrom = currencyFrom;
      if (currencyTo) filter.currency
