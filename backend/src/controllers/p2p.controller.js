const P2POrder = require('../models/P2POrder');
const P2PChat = require('../models/P2PChat');
const P2PSubscription = require('../models/P2PSubscription');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const { matchOrder } = require('../services/P2PMatchingService');
const { logAction } = require('../services/auditLogService');

// Get all P2P orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, currencyFrom, currencyTo, country, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { status: 'active' };
    
    if (type) query.type = type;
    if (currencyFrom) query.currencyFrom = currencyFrom;
    if (currencyTo) query.currencyTo = currencyTo;
    if (country) query['location.country'] = country;
    if (status) query.status = status;
    
    // Exclude orders from current tenant
    query.tenantId = { $ne: req.tenant?.id || req.user.tenantId };
    
    const orders = await P2POrder.find(query)
      .populate('tenantId', 'name code')
      .populate('createdBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await P2POrder.countDocuments(query);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting P2P orders:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get my P2P orders
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { tenantId: req.tenant?.id || req.user.tenantId };
    if (status) query.status = status;
    
    const orders = await P2POrder.find(query)
      .populate('createdBy', 'name')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await P2POrder.countDocuments(query);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting my P2P orders:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create new P2P order
exports.createOrder = async (req, res) => {
  try {
    const order = await P2POrder.create({
      user: req.user._id,
      ...req.body
    });
    await logAction({
      user: req.user,
      action: 'create',
      resource: 'P2POrder',
      resourceId: order._id,
      details: req.body,
      req
    });
    const match = await matchOrder(order);
    res.json({ order, match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await P2POrder.findById(orderId)
      .populate('tenantId', 'name code')
      .populate('createdBy', 'name');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.orderNotFound')
      });
    }
    
    // Increment views if not the owner
    if (order.tenantId.toString() !== req.tenant?.id || req.user.tenantId) {
      await order.incrementViews();
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error getting P2P order:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await P2POrder.findOne({
      _id: orderId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.orderNotFound')
      });
    }
    
    const oldData = { ...order.toObject() };
    
    Object.keys(req.body).forEach(key => {
      if (key !== 'tenantId' && key !== 'orderId') {
        order[key] = req.body[key];
      }
    });
    
    await order.save();
    
    await logAction({
      user: req.user,
      action: 'update',
      resource: 'P2POrder',
      resourceId: order._id,
      details: { before: oldData, after: req.body },
      req
    });
    
    await order.addToHistory('update', 'Order updated', req.user.id);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.orderUpdated'),
      data: order
    });
  } catch (error) {
    console.error('Error updating P2P order:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await P2POrder.findOne({
      _id: orderId,
      tenantId: req.tenant?.id || req.user.tenantId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.orderNotFound')
      });
    }
    
    order.status = 'cancelled';
    await order.save();
    
    await logAction({
      user: req.user,
      action: 'delete',
      resource: 'P2POrder',
      resourceId: order._id,
      details: {},
      req
    });
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.orderCancelled')
    });
  } catch (error) {
    console.error('Error deleting P2P order:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Create chat for order
exports.createChat = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check subscription
    const subscription = await P2PSubscription.findOne({ tenantId: req.tenant?.id || req.user.tenantId });
    if (!subscription || !subscription.isActive()) {
      return res.status(403).json({
        success: false,
        message: i18n.t(req.language, 'error.noActiveSubscription')
      });
    }
    
    if (!subscription.checkChatLimit()) {
      return res.status(403).json({
        success: false,
        message: i18n.t(req.language, 'error.chatLimitExceeded')
      });
    }
    
    const order = await P2POrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.orderNotFound')
      });
    }
    
    // Check if chat already exists
    let chat = await P2PChat.findOne({
      orderId,
      'participants.tenantId': { $in: [req.tenant?.id || req.user.tenantId, order.tenantId] }
    });
    
    if (!chat) {
      chat = new P2PChat({
        orderId,
        participants: [
          {
            tenantId: order.tenantId,
            userId: order.createdBy,
            role: order.type === 'buy' ? 'seller' : 'buyer'
          },
          {
            tenantId: req.tenant?.id || req.user.tenantId,
            userId: req.user.id,
            role: order.type === 'buy' ? 'buyer' : 'seller'
          }
        ]
      });
      
      await chat.save();
      
      // Increment usage
      await subscription.incrementChats();
      
      // Increment contacts for order
      await order.incrementContacts();
    }
    
    await chat.populate('participants.userId', 'name');
    await chat.populate('orderId', 'orderId type currencyFrom currencyTo amountFrom amountTo');
    
    res.status(201).json({
      success: true,
      message: i18n.t(req.language, 'p2p.chatCreated'),
      data: chat
    });
  } catch (error) {
    console.error('Error creating P2P chat:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const chat = await P2PChat.findOne({
      chatId,
      'participants.tenantId': req.tenant?.id || req.user.tenantId
    }).populate('participants.userId', 'name');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.chatNotFound')
      });
    }
    
    const messages = chat.messages
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + parseInt(limit))
      .reverse();
    
    res.json({
      success: true,
      data: {
        chat,
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: chat.messages.length,
          pages: Math.ceil(chat.messages.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', attachments = [] } = req.body;
    
    const chat = await P2PChat.findOne({
      chatId,
      'participants.tenantId': req.tenant?.id || req.user.tenantId
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.chatNotFound')
      });
    }
    
    await chat.addMessage(req.tenant?.id || req.user.tenantId, req.user.id, content, type, attachments);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.messageSent')
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Make offer
exports.makeOffer = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { amount, rate, paymentMethod, terms, expiresInHours = 24 } = req.body;
    
    const chat = await P2PChat.findOne({
      chatId,
      'participants.tenantId': req.tenant?.id || req.user.tenantId
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.chatNotFound')
      });
    }
    
    await chat.addOffer(req.tenant?.id || req.user.tenantId, req.user.id, amount, rate, paymentMethod, terms, expiresInHours);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.offerMade')
    });
  } catch (error) {
    console.error('Error making offer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Respond to offer
exports.respondToOffer = async (req, res) => {
  try {
    const { chatId, offerId } = req.params;
    const { response } = req.body;
    
    const chat = await P2PChat.findOne({
      chatId,
      'participants.tenantId': req.tenant?.id || req.user.tenantId
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: i18n.t(req.language, 'error.chatNotFound')
      });
    }
    
    await chat.respondToOffer(offerId, response, req.tenant?.id || req.user.tenantId, req.user.id);
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.offerResponded')
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Get my chats
exports.getMyChats = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { 'participants.tenantId': req.tenant?.id || req.user.tenantId };
    if (status) query.status = status;
    
    const chats = await P2PChat.find(query)
      .populate('participants.userId', 'name')
      .populate('orderId', 'orderId type currencyFrom currencyTo amountFrom amountTo')
      .sort({ updated_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await P2PChat.countDocuments(query);
    
    res.json({
      success: true,
      data: chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting my chats:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// Update online status
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    
    // Update status in all chats where user is participant
    await P2PChat.updateMany(
      { 'participants.tenantId': req.tenant?.id || req.user.tenantId, 'participants.userId': req.user.id },
      {
        $set: {
          'participants.$.isOnline': isOnline,
          'participants.$.lastSeen': new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: i18n.t(req.language, 'p2p.statusUpdated')
    });
  } catch (error) {
    console.error('Error updating online status:', error);
    res.status(500).json({
      success: false,
      message: i18n.t(req.language, 'error.serverError'),
      error: error.message
    });
  }
};

// ارسال پیشنهاد جدید در چت P2P
exports.sendOfferInChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { amount, rate, paymentMethod, terms, expiresInHours } = req.body;
    const chat = await P2PChat.findOne({ chatId });
    if (!chat) return res.status(404).json({ success: false, message: 'چت یافت نشد' });
    await chat.addOffer(req.user.tenantId, req.user.userId, amount, rate, paymentMethod, terms, expiresInHours || 24);
    res.json({ success: true, message: 'پیشنهاد با موفقیت ارسال شد', chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ارسال پیشنهاد', error: err.message });
  }
};

// پاسخ به پیشنهاد (تایید یا رد) در چت P2P
exports.respondToOfferInChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { offerId, response } = req.body; // response: 'accept' یا 'reject'
    const chat = await P2PChat.findOne({ chatId });
    if (!chat) return res.status(404).json({ success: false, message: 'چت یافت نشد' });
    await chat.respondToOffer(offerId, response, req.user.tenantId, req.user.userId);
    res.json({ success: true, message: 'پاسخ به پیشنهاد ثبت شد', chat });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در پاسخ به پیشنهاد', error: err.message });
  }
};

module.exports = {
  getAllOrders: exports.getAllOrders,
  getMyOrders: exports.getMyOrders,
  createOrder: exports.createOrder,
  getOrderById: exports.getOrderById,
  updateOrder: exports.updateOrder,
  deleteOrder: exports.deleteOrder,
  createChat: exports.createChat,
  getChatMessages: exports.getChatMessages,
  sendMessage: exports.sendMessage,
  makeOffer: exports.makeOffer,
  respondToOffer: exports.respondToOffer,
  getMyChats: exports.getMyChats,
  updateOnlineStatus: exports.updateOnlineStatus,
  sendOfferInChat: exports.sendOfferInChat,
  respondToOfferInChat: exports.respondToOfferInChat
}; 