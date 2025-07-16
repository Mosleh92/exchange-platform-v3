const Order = require('../models/AdvancedOrder');
const P2PAnnouncement = require('../models/p2p/P2PAnnouncement');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Enhanced Trading Engine
 * Handles order matching, P2P trading, and market operations
 */
class TradingEngine {
  constructor() {
    this.orderBook = new Map();
    this.p2pOrders = new Map();
    this.isRunning = false;
  }

  /**
   * Start the trading engine
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Trading engine is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Trading engine started');

    // Load existing orders
    await this.loadExistingOrders();
    
    // Start order matching loop
    this.startOrderMatching();
  }

  /**
   * Stop the trading engine
   */
  stop() {
    this.isRunning = false;
    logger.info('Trading engine stopped');
  }

  /**
   * Load existing orders from database
   */
  async loadExistingOrders() {
    try {
      const activeOrders = await Order.find({ 
        status: { $in: ['pending', 'partial_filled'] } 
      }).lean();

      for (const order of activeOrders) {
        this.addToOrderBook(order);
      }

      logger.info(`Loaded ${activeOrders.length} active orders`);
    } catch (error) {
      logger.error('Error loading existing orders:', error);
    }
  }

  /**
   * Add order to order book
   */
  addToOrderBook(order) {
    const key = `${order.fromCurrency}-${order.toCurrency}`;
    
    if (!this.orderBook.has(key)) {
      this.orderBook.set(key, {
        buyOrders: [],
        sellOrders: []
      });
    }

    const book = this.orderBook.get(key);
    
    if (order.type === 'buy') {
      book.buyOrders.push(order);
      book.buyOrders.sort((a, b) => b.price - a.price); // Best price first
    } else {
      book.sellOrders.push(order);
      book.sellOrders.sort((a, b) => a.price - b.price); // Best price first
    }
  }

  /**
   * Remove order from order book
   */
  removeFromOrderBook(order) {
    const key = `${order.fromCurrency}-${order.toCurrency}`;
    const book = this.orderBook.get(key);
    
    if (!book) return;

    if (order.type === 'buy') {
      book.buyOrders = book.buyOrders.filter(o => o._id.toString() !== order._id.toString());
    } else {
      book.sellOrders = book.sellOrders.filter(o => o._id.toString() !== order._id.toString());
    }
  }

  /**
   * Place new order
   */
  async placeOrder(orderData) {
    try {
      // Validate order data
      this.validateOrder(orderData);

      // Create order
      const order = new Order({
        ...orderData,
        status: 'pending',
        remainingAmount: orderData.amount,
        createdAt: new Date()
      });

      await order.save();

      // Add to order book
      this.addToOrderBook(order);

      // Try to match immediately
      await this.tryMatchOrder(order);

      logger.info(`Order placed: ${order._id} - ${order.type} ${order.amount} ${order.fromCurrency}`);

      return order;
    } catch (error) {
      logger.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Validate order data
   */
  validateOrder(orderData) {
    if (!orderData.fromCurrency || !orderData.toCurrency) {
      throw new Error('Currency pair is required');
    }

    if (orderData.fromCurrency === orderData.toCurrency) {
      throw new Error('From and to currencies cannot be the same');
    }

    if (!orderData.amount || orderData.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    if (!orderData.price || orderData.price <= 0) {
      throw new Error('Price must be greater than zero');
    }

    if (!['buy', 'sell'].includes(orderData.type)) {
      throw new Error('Order type must be buy or sell');
    }
  }

  /**
   * Try to match an order
   */
  async tryMatchOrder(order) {
    const key = `${order.fromCurrency}-${order.toCurrency}`;
    const book = this.orderBook.get(key);
    
    if (!book) return;

    const oppositeOrders = order.type === 'buy' ? book.sellOrders : book.buyOrders;
    
    for (const oppositeOrder of oppositeOrders) {
      if (this.canMatch(order, oppositeOrder)) {
        await this.executeMatch(order, oppositeOrder);
        
        // Check if order is fully filled
        if (order.remainingAmount <= 0) {
          break;
        }
      }
    }
  }

  /**
   * Check if two orders can be matched
   */
  canMatch(order1, order2) {
    // Check if orders are from different users
    if (order1.userId.toString() === order2.userId.toString()) {
      return false;
    }

    // Check if orders are from different tenants
    if (order1.tenantId.toString() !== order2.tenantId.toString()) {
      return false;
    }

    // Check price compatibility
    if (order1.type === 'buy') {
      return order1.price >= order2.price;
    } else {
      return order1.price <= order2.price;
    }
  }

  /**
   * Execute a match between two orders
   */
  async executeMatch(order1, order2) {
    try {
      const matchAmount = Math.min(order1.remainingAmount, order2.remainingAmount);
      const matchPrice = order2.price; // Price of the order being matched against

      // Create transaction
      const transaction = new Transaction({
        tenantId: order1.tenantId,
        customerId: order1.userId,
        type: 'currency_exchange',
        fromCurrency: order1.fromCurrency,
        toCurrency: order1.toCurrency,
        amount: matchAmount,
        exchangeRate: matchPrice,
        totalAmount: matchAmount * matchPrice,
        status: 'completed',
        transactionId: this.generateTransactionId(),
        paymentMethod: 'order_matching',
        deliveryMethod: 'account_credit'
      });

      await transaction.save();

      // Update orders
      order1.remainingAmount -= matchAmount;
      order2.remainingAmount -= matchAmount;

      if (order1.remainingAmount <= 0) {
        order1.status = 'filled';
        this.removeFromOrderBook(order1);
      } else {
        order1.status = 'partial_filled';
      }

      if (order2.remainingAmount <= 0) {
        order2.status = 'filled';
        this.removeFromOrderBook(order2);
      } else {
        order2.status = 'partial_filled';
      }

      await order1.save();
      await order2.save();

      logger.info(`Match executed: ${matchAmount} ${order1.fromCurrency} at ${matchPrice}`);

      return transaction;
    } catch (error) {
      logger.error('Error executing match:', error);
      throw error;
    }
  }

  /**
   * Start order matching loop
   */
  startOrderMatching() {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.processOrderBook();
      } catch (error) {
        logger.error('Error in order matching loop:', error);
      }
    }, 1000); // Check every second
  }

  /**
   * Process order book for matches
   */
  async processOrderBook() {
    for (const [key, book] of this.orderBook) {
      if (book.buyOrders.length > 0 && book.sellOrders.length > 0) {
        const bestBuy = book.buyOrders[0];
        const bestSell = book.sellOrders[0];

        if (this.canMatch(bestBuy, bestSell)) {
          await this.executeMatch(bestBuy, bestSell);
        }
      }
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to cancel this order');
      }

      if (!['pending', 'partial_filled'].includes(order.status)) {
        throw new Error('Order cannot be cancelled');
      }

      order.status = 'cancelled';
      await order.save();

      this.removeFromOrderBook(order);

      logger.info(`Order cancelled: ${orderId}`);

      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Get order book for a currency pair
   */
  getOrderBook(fromCurrency, toCurrency) {
    const key = `${fromCurrency}-${toCurrency}`;
    const book = this.orderBook.get(key);
    
    if (!book) {
      return { buyOrders: [], sellOrders: [] };
    }

    return {
      buyOrders: book.buyOrders.slice(0, 10), // Top 10 buy orders
      sellOrders: book.sellOrders.slice(0, 10) // Top 10 sell orders
    };
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `TXN-${timestamp}-${random}`;
  }

  /**
   * P2P Trading Methods
   */
  async createP2PAnnouncement(announcementData) {
    try {
      const announcement = new P2PAnnouncement({
        ...announcementData,
        status: 'active',
        createdAt: new Date()
      });

      await announcement.save();
      this.p2pOrders.set(announcement._id.toString(), announcement);

      logger.info(`P2P announcement created: ${announcement._id}`);

      return announcement;
    } catch (error) {
      logger.error('Error creating P2P announcement:', error);
      throw error;
    }
  }

  /**
   * Match P2P orders
   */
  async matchP2POrders(announcementId, buyerId) {
    try {
      const announcement = await P2PAnnouncement.findById(announcementId);
      
      if (!announcement || announcement.status !== 'active') {
        throw new Error('Announcement not available');
      }

      if (announcement.userId.toString() === buyerId.toString()) {
        throw new Error('Cannot match with your own announcement');
      }

      // Create P2P transaction
      const transaction = new Transaction({
        tenantId: announcement.tenantId,
        customerId: buyerId,
        type: 'p2p_exchange',
        fromCurrency: announcement.fromCurrency,
        toCurrency: announcement.toCurrency,
        amount: announcement.amount,
        exchangeRate: announcement.price,
        totalAmount: announcement.amount * announcement.price,
        status: 'pending',
        transactionId: this.generateTransactionId(),
        paymentMethod: 'p2p',
        deliveryMethod: announcement.deliveryMethod
      });

      await transaction.save();

      // Update announcement status
      announcement.status = 'matched';
      announcement.matchedWith = buyerId;
      announcement.matchedAt = new Date();
      await announcement.save();

      this.p2pOrders.delete(announcementId);

      logger.info(`P2P match created: ${transaction._id}`);

      return transaction;
    } catch (error) {
      logger.error('Error matching P2P orders:', error);
      throw error;
    }
  }

  /**
   * Get available P2P announcements
   */
  async getP2PAnnouncements(filters = {}) {
    try {
      const query = { status: 'active', ...filters };
      return await P2PAnnouncement.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      logger.error('Error getting P2P announcements:', error);
      throw error;
    }
  }
}

module.exports = new TradingEngine(); 