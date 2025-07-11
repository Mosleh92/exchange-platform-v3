const Order = require('../models/AdvancedOrder');
const P2PAnnouncement = require('../models/p2p/P2PAnnouncement');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const RiskManagementService = require('./RiskManagementService');
const ImmutableAudit = require('../models/ImmutableAudit');

/**
 * Enhanced Trading Engine with Advanced Order Matching
 * Implements Price-Time Priority, Pro-Rata, Iceberg, Fill-or-Kill algorithms
 */
class TradingEngine {
  constructor() {
    this.orderBook = new Map();
    this.p2pOrders = new Map();
    this.isRunning = false;
    this.matchingAlgorithm = 'PRICE_TIME_PRIORITY'; // or 'PRO_RATA'
    this.marketDepth = new Map();
    this.executionAnalytics = new Map();
    this.circuitBreakers = new Map();
    this.slippageProtection = true;
    this.maxSlippagePercent = 2.0; // 2% max slippage
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
   * Enhanced order placement with advanced order types
   */
  async placeOrder(orderData) {
    try {
      // Risk validation first
      const riskValidation = await RiskManagementService.validateOrderRisk(orderData.userId, orderData);
      if (!riskValidation.isValid) {
        throw new Error(`Order rejected: Risk limits exceeded - ${JSON.stringify(riskValidation.checks)}`);
      }

      // Enhanced order validation
      await this.validateEnhancedOrder(orderData);

      // Create enhanced order with additional fields
      const order = new Order({
        ...orderData,
        status: 'pending',
        filledAmount: 0,
        remainingAmount: orderData.amount,
        averagePrice: 0,
        totalFee: 0,
        executionHistory: [{
          timestamp: new Date(),
          action: 'created',
          price: orderData.limitPrice || orderData.price,
          amount: orderData.amount,
          notes: 'Order created'
        }],
        createdAt: new Date()
      });

      await order.save();

      // Create audit trail
      await this.createAuditEntry({
        entityInfo: {
          userId: order.userId,
          tenantId: order.tenantId,
          entityType: 'ORDER',
          entityId: order._id.toString()
        },
        eventInfo: {
          eventType: 'ORDER_PLACED',
          action: 'PLACE_ORDER',
          resource: 'TRADING_ORDER',
          resourceId: order._id.toString(),
          outcome: 'SUCCESS'
        },
        changeInfo: {
          afterState: {
            orderType: order.orderType,
            side: order.side,
            amount: order.amount,
            price: order.limitPrice || order.price
          }
        }
      });

      // Handle different order types
      await this.handleOrderType(order);

      // Add to appropriate order book based on order type
      if (['limit', 'stop_limit'].includes(order.orderType)) {
        this.addToOrderBook(order);
      }

      // Try immediate matching for market orders or triggered orders
      if (['market', 'ioc', 'fok'].includes(order.orderType) || order.orderType === 'limit') {
        await this.tryMatchOrder(order);
      }

      // Update market depth
      this.updateMarketDepth(order.currency, order.baseCurrency);

      logger.info(`Enhanced order placed: ${order._id} - ${order.orderType} ${order.side} ${order.amount} ${order.currency}`, {
        orderId: order._id,
        type: order.orderType,
        side: order.side,
        amount: order.amount,
        price: order.limitPrice || order.price
      });

      return order;
    } catch (error) {
      logger.error('Error placing enhanced order:', error);
      throw error;
    }
  }

  /**
   * Handle different order types with specific logic
   */
  async handleOrderType(order) {
    switch (order.orderType) {
      case 'market':
        await this.handleMarketOrder(order);
        break;
      case 'stop':
        await this.handleStopOrder(order);
        break;
      case 'stop_limit':
        await this.handleStopLimitOrder(order);
        break;
      case 'oco':
        await this.handleOCOOrder(order);
        break;
      case 'trailing_stop':
        await this.handleTrailingStopOrder(order);
        break;
      case 'iceberg':
        await this.handleIcebergOrder(order);
        break;
      default:
        // Standard limit order - no special handling needed
        break;
    }
  }

  /**
   * Handle market orders with slippage protection
   */
  async handleMarketOrder(order) {
    const marketPrice = await this.getMarketPrice(order.currency, order.baseCurrency);
    
    if (this.slippageProtection) {
      const slippageLimit = marketPrice * (1 + this.maxSlippagePercent / 100);
      if (order.side === 'buy' && marketPrice > slippageLimit) {
        order.status = 'rejected';
        order.executionHistory.push({
          timestamp: new Date(),
          action: 'rejected',
          notes: `Slippage protection triggered. Market price ${marketPrice} exceeds limit ${slippageLimit}`
        });
        await order.save();
        return;
      }
    }

    order.limitPrice = marketPrice;
    order.status = 'active';
    await order.save();
  }

  /**
   * Handle Iceberg orders (large orders split into smaller visible portions)
   */
  async handleIcebergOrder(order) {
    if (!order.icebergSettings || !order.icebergSettings.visibleSize) {
      throw new Error('Iceberg order requires visible size setting');
    }

    const visibleSize = order.icebergSettings.visibleSize;
    const totalSize = order.amount;
    
    // Create the first visible portion
    const visibleOrder = new Order({
      ...order.toObject(),
      _id: undefined,
      amount: Math.min(visibleSize, totalSize),
      parentOrderId: order._id,
      orderType: 'limit',
      isIcebergChild: true
    });

    await visibleOrder.save();
    
    // Update parent order
    order.icebergSettings.currentVisible = visibleOrder._id;
    order.icebergSettings.remainingHidden = totalSize - visibleSize;
    order.status = 'active';
    
    await order.save();

    // Add visible portion to order book
    this.addToOrderBook(visibleOrder);
  }

  /**
   * Handle Fill-or-Kill orders
   */
  async handleFillOrKillOrder(order) {
    // FOK orders must be filled entirely or cancelled immediately
    const availableLiquidity = await this.getAvailableLiquidity(
      order.currency, 
      order.baseCurrency, 
      order.side,
      order.limitPrice || order.price
    );

    if (availableLiquidity < order.amount) {
      order.status = 'cancelled';
      order.executionHistory.push({
        timestamp: new Date(),
        action: 'cancelled',
        notes: `FOK order cancelled - insufficient liquidity. Required: ${order.amount}, Available: ${availableLiquidity}`
      });
      await order.save();
      return;
    }

    // Proceed with immediate execution
    await this.executeImmediateOrder(order);
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
   * Enhanced order matching with Price-Time Priority and Pro-Rata algorithms
   */
  async tryMatchOrder(order) {
    const key = `${order.currency}-${order.baseCurrency}`;
    const book = this.orderBook.get(key);
    
    if (!book) return;

    const oppositeOrders = order.side === 'buy' ? book.sellOrders : book.buyOrders;
    
    if (oppositeOrders.length === 0) return;

    // Check circuit breaker
    if (this.isCircuitBreakerTriggered(order.currency, order.baseCurrency)) {
      logger.warn('Circuit breaker active - order matching suspended', { 
        pair: `${order.currency}-${order.baseCurrency}` 
      });
      return;
    }

    switch (this.matchingAlgorithm) {
      case 'PRICE_TIME_PRIORITY':
        await this.priceTimePriorityMatching(order, oppositeOrders);
        break;
      case 'PRO_RATA':
        await this.proRataMatching(order, oppositeOrders);
        break;
      default:
        await this.priceTimePriorityMatching(order, oppositeOrders);
    }

    // Handle special order types after matching
    await this.handlePostMatchingLogic(order);
  }

  /**
   * Price-Time Priority matching algorithm
   */
  async priceTimePriorityMatching(order, oppositeOrders) {
    for (const oppositeOrder of oppositeOrders) {
      if (!this.canMatch(order, oppositeOrder)) continue;

      const matchResult = await this.executeMatch(order, oppositeOrder);
      
      if (matchResult.success) {
        // Update execution analytics
        this.updateExecutionAnalytics(order.currency, order.baseCurrency, matchResult);
      }
      
      // Check if order is fully filled
      if (order.filledAmount >= order.amount) {
        order.status = 'filled';
        break;
      }

      // Handle FOK orders
      if (order.timeInForce === 'FOK' && order.filledAmount < order.amount) {
        await this.cancelOrder(order._id, order.userId);
        break;
      }

      // Handle IOC orders
      if (order.timeInForce === 'IOC' && oppositeOrders.indexOf(oppositeOrder) === oppositeOrders.length - 1) {
        if (order.filledAmount < order.amount) {
          order.status = 'cancelled';
          break;
        }
      }
    }
  }

  /**
   * Pro-Rata matching algorithm for high liquidity scenarios
   */
  async proRataMatching(order, oppositeOrders) {
    // Group orders by price level
    const priceGroups = new Map();
    
    for (const oppositeOrder of oppositeOrders) {
      if (!this.canMatch(order, oppositeOrder)) continue;
      
      const price = oppositeOrder.limitPrice || oppositeOrder.price;
      if (!priceGroups.has(price)) {
        priceGroups.set(price, []);
      }
      priceGroups.get(price).push(oppositeOrder);
    }

    // Sort price levels (best prices first)
    const sortedPrices = Array.from(priceGroups.keys()).sort((a, b) => 
      order.side === 'buy' ? a - b : b - a
    );

    let remainingQuantity = order.amount - order.filledAmount;

    for (const price of sortedPrices) {
      if (remainingQuantity <= 0) break;

      const ordersAtPrice = priceGroups.get(price);
      const totalQuantityAtPrice = ordersAtPrice.reduce((sum, o) => 
        sum + (o.amount - o.filledAmount), 0
      );

      if (totalQuantityAtPrice <= remainingQuantity) {
        // Fill all orders at this price level
        for (const oppositeOrder of ordersAtPrice) {
          await this.executeMatch(order, oppositeOrder);
          remainingQuantity -= (oppositeOrder.amount - oppositeOrder.filledAmount);
        }
      } else {
        // Pro-rata allocation
        const totalSize = ordersAtPrice.reduce((sum, o) => sum + o.amount, 0);
        
        for (const oppositeOrder of ordersAtPrice) {
          const allocation = (oppositeOrder.amount / totalSize) * remainingQuantity;
          const matchAmount = Math.min(allocation, oppositeOrder.amount - oppositeOrder.filledAmount);
          
          if (matchAmount > 0) {
            await this.executePartialMatch(order, oppositeOrder, matchAmount);
          }
        }
        remainingQuantity = 0;
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
   * Enhanced order execution with advanced features
   */
  async executeMatch(order1, order2) {
    try {
      const matchAmount = Math.min(
        order1.amount - order1.filledAmount, 
        order2.amount - order2.filledAmount
      );
      
      // Use price of the resting order (maker gets price priority)
      const matchPrice = order2.limitPrice || order2.price;

      // Calculate fees (maker-taker model)
      const makerFee = this.calculateMakerFee(matchAmount, matchPrice, order2);
      const takerFee = this.calculateTakerFee(matchAmount, matchPrice, order1);

      // Create enhanced transaction record
      const transaction = new Transaction({
        tenantId: order1.tenantId,
        buyOrderId: order1.side === 'buy' ? order1._id : order2._id,
        sellOrderId: order1.side === 'sell' ? order1._id : order2._id,
        buyerId: order1.side === 'buy' ? order1.userId : order2.userId,
        sellerId: order1.side === 'sell' ? order1.userId : order2.userId,
        type: 'spot_trade',
        currency: order1.currency,
        baseCurrency: order1.baseCurrency,
        amount: matchAmount,
        price: matchPrice,
        totalValue: matchAmount * matchPrice,
        makerFee: makerFee,
        takerFee: takerFee,
        status: 'completed',
        transactionId: this.generateTransactionId(),
        executionTime: new Date(),
        marketConditions: await this.getMarketConditions(order1.currency, order1.baseCurrency)
      });

      await transaction.save();

      // Update orders with execution details
      await this.updateOrderExecution(order1, matchAmount, matchPrice, takerFee, transaction._id);
      await this.updateOrderExecution(order2, matchAmount, matchPrice, makerFee, transaction._id);

      // Handle order book updates
      this.updateOrderBookAfterMatch(order1, order2);

      // Create immutable audit entries
      await this.createTradeAuditEntry(transaction, order1, order2);

      // Check for iceberg order refill
      await this.handleIcebergRefill(order1);
      await this.handleIcebergRefill(order2);

      // Update market depth
      this.updateMarketDepth(order1.currency, order1.baseCurrency);

      logger.info(`Enhanced match executed: ${matchAmount} ${order1.currency} at ${matchPrice}`, {
        transactionId: transaction._id,
        buyOrder: order1.side === 'buy' ? order1._id : order2._id,
        sellOrder: order1.side === 'sell' ? order1._id : order2._id,
        amount: matchAmount,
        price: matchPrice,
        makerFee,
        takerFee
      });

      return {
        success: true,
        transaction,
        matchAmount,
        matchPrice,
        makerFee,
        takerFee
      };

    } catch (error) {
      logger.error('Error executing enhanced match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute partial match for pro-rata allocation
   */
  async executePartialMatch(order1, order2, matchAmount) {
    const matchPrice = order2.limitPrice || order2.price;
    
    // Similar to executeMatch but with specific match amount
    const transaction = new Transaction({
      tenantId: order1.tenantId,
      buyOrderId: order1.side === 'buy' ? order1._id : order2._id,
      sellOrderId: order1.side === 'sell' ? order1._id : order2._id,
      buyerId: order1.side === 'buy' ? order1.userId : order2.userId,
      sellerId: order1.side === 'sell' ? order1.userId : order2.userId,
      type: 'spot_trade',
      currency: order1.currency,
      baseCurrency: order1.baseCurrency,
      amount: matchAmount,
      price: matchPrice,
      totalValue: matchAmount * matchPrice,
      status: 'completed',
      transactionId: this.generateTransactionId(),
      executionTime: new Date(),
      allocationMethod: 'PRO_RATA'
    });

    await transaction.save();

    // Update orders
    await this.updateOrderExecution(order1, matchAmount, matchPrice, 0, transaction._id);
    await this.updateOrderExecution(order2, matchAmount, matchPrice, 0, transaction._id);

    return transaction;
  }

  /**
   * Update order after execution
   */
  async updateOrderExecution(order, matchAmount, matchPrice, fee, transactionId) {
    order.filledAmount += matchAmount;
    order.totalFee += fee;
    
    // Calculate average price
    const totalFilledValue = order.averagePrice * (order.filledAmount - matchAmount) + matchPrice * matchAmount;
    order.averagePrice = totalFilledValue / order.filledAmount;

    // Update status
    if (order.filledAmount >= order.amount) {
      order.status = 'filled';
      order.filledAt = new Date();
    } else {
      order.status = 'partially_filled';
    }

    // Add to execution history
    order.executionHistory.push({
      timestamp: new Date(),
      action: order.filledAmount >= order.amount ? 'filled' : 'partially_filled',
      price: matchPrice,
      amount: matchAmount,
      fee: fee,
      transactionId: transactionId,
      notes: `Executed ${matchAmount} at ${matchPrice}`
    });

    await order.save();
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
   * Circuit breaker implementation for market volatility
   */
  isCircuitBreakerTriggered(currency, baseCurrency) {
    const pair = `${currency}-${baseCurrency}`;
    const breaker = this.circuitBreakers.get(pair);
    
    if (!breaker) return false;
    
    return breaker.isTriggered && (Date.now() - breaker.triggeredAt) < breaker.cooldownPeriod;
  }

  /**
   * Trigger circuit breaker
   */
  async triggerCircuitBreaker(currency, baseCurrency, reason) {
    const pair = `${currency}-${baseCurrency}`;
    
    this.circuitBreakers.set(pair, {
      isTriggered: true,
      triggeredAt: Date.now(),
      reason: reason,
      cooldownPeriod: 300000 // 5 minutes
    });

    // Cancel all pending orders for this pair
    await this.cancelAllPendingOrders(currency, baseCurrency);

    // Create audit entry
    await this.createAuditEntry({
      entityInfo: {
        tenantId: null,
        entityType: 'SYSTEM',
        entityId: 'TRADING_ENGINE'
      },
      eventInfo: {
        eventType: 'CIRCUIT_BREAKER_TRIGGERED',
        action: 'TRIGGER_CIRCUIT_BREAKER',
        resource: 'TRADING_PAIR',
        resourceId: pair,
        outcome: 'SUCCESS'
      },
      metadata: { reason, cooldownPeriod: 300000 }
    });

    logger.warn('Circuit breaker triggered', { pair, reason });
  }

  /**
   * Market depth management
   */
  updateMarketDepth(currency, baseCurrency) {
    const pair = `${currency}-${baseCurrency}`;
    const book = this.orderBook.get(pair);
    
    if (!book) return;

    const depth = {
      bids: this.aggregateOrdersByPrice(book.buyOrders),
      asks: this.aggregateOrdersByPrice(book.sellOrders),
      spread: this.calculateSpread(book.buyOrders, book.sellOrders),
      lastUpdate: new Date()
    };

    this.marketDepth.set(pair, depth);
  }

  /**
   * Aggregate orders by price level
   */
  aggregateOrdersByPrice(orders) {
    const priceMap = new Map();
    
    for (const order of orders) {
      const price = order.limitPrice || order.price;
      const existingQuantity = priceMap.get(price) || 0;
      priceMap.set(price, existingQuantity + (order.amount - order.filledAmount));
    }

    return Array.from(priceMap.entries())
      .map(([price, quantity]) => ({ price, quantity }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 20); // Top 20 levels
  }

  /**
   * Calculate bid-ask spread
   */
  calculateSpread(buyOrders, sellOrders) {
    if (buyOrders.length === 0 || sellOrders.length === 0) return null;
    
    const bestBid = Math.max(...buyOrders.map(o => o.limitPrice || o.price));
    const bestAsk = Math.min(...sellOrders.map(o => o.limitPrice || o.price));
    
    return {
      absolute: bestAsk - bestBid,
      percentage: ((bestAsk - bestBid) / bestBid) * 100
    };
  }

  /**
   * Handle iceberg order refill
   */
  async handleIcebergRefill(order) {
    if (!order.isIcebergChild || order.status !== 'filled') return;

    // Find parent iceberg order
    const parentOrder = await Order.findById(order.parentOrderId);
    if (!parentOrder || !parentOrder.icebergSettings) return;

    const remainingHidden = parentOrder.icebergSettings.remainingHidden;
    if (remainingHidden <= 0) return;

    // Create new visible portion
    const newVisibleSize = Math.min(
      parentOrder.icebergSettings.visibleSize,
      remainingHidden
    );

    const newVisibleOrder = new Order({
      ...parentOrder.toObject(),
      _id: undefined,
      amount: newVisibleSize,
      filledAmount: 0,
      parentOrderId: parentOrder._id,
      orderType: 'limit',
      isIcebergChild: true,
      status: 'pending'
    });

    await newVisibleOrder.save();

    // Update parent order
    parentOrder.icebergSettings.currentVisible = newVisibleOrder._id;
    parentOrder.icebergSettings.remainingHidden -= newVisibleSize;
    await parentOrder.save();

    // Add to order book
    this.addToOrderBook(newVisibleOrder);

    logger.info('Iceberg order refilled', {
      parentId: parentOrder._id,
      newVisibleId: newVisibleOrder._id,
      size: newVisibleSize,
      remaining: parentOrder.icebergSettings.remainingHidden
    });
  }

  /**
   * Advanced order validation
   */
  async validateEnhancedOrder(orderData) {
    // Basic validation
    this.validateOrder(orderData);

    // Order type specific validation
    switch (orderData.orderType) {
      case 'stop':
      case 'stop_limit':
        if (!orderData.stopPrice) {
          throw new Error('Stop orders require stop price');
        }
        break;
      case 'oco':
        if (!orderData.ocoOrders || orderData.ocoOrders.length !== 2) {
          throw new Error('OCO orders must have exactly 2 sub-orders');
        }
        break;
      case 'iceberg':
        if (!orderData.icebergSettings || !orderData.icebergSettings.visibleSize) {
          throw new Error('Iceberg orders require visible size setting');
        }
        if (orderData.icebergSettings.visibleSize >= orderData.amount) {
          throw new Error('Iceberg visible size must be less than total order size');
        }
        break;
      case 'trailing_stop':
        if (!orderData.trailingStop || (!orderData.trailingStop.callbackRate && !orderData.trailingStop.trailingAmount)) {
          throw new Error('Trailing stop orders require callback rate or trailing amount');
        }
        break;
    }

    // Market condition validations
    const marketPrice = await this.getMarketPrice(orderData.currency, orderData.baseCurrency);
    
    if (orderData.orderType === 'market' && this.slippageProtection) {
      const maxPrice = marketPrice * (1 + this.maxSlippagePercent / 100);
      const minPrice = marketPrice * (1 - this.maxSlippagePercent / 100);
      
      if (orderData.side === 'buy' && orderData.limitPrice && orderData.limitPrice > maxPrice) {
        throw new Error(`Order price exceeds slippage protection limit`);
      }
      if (orderData.side === 'sell' && orderData.limitPrice && orderData.limitPrice < minPrice) {
        throw new Error(`Order price below slippage protection limit`);
      }
    }
  }

  /**
   * Calculate maker and taker fees
   */
  calculateMakerFee(amount, price, order) {
    const feeRate = order.makerFeeRate || 0.001; // 0.1% default
    return amount * price * feeRate;
  }

  calculateTakerFee(amount, price, order) {
    const feeRate = order.takerFeeRate || 0.002; // 0.2% default
    return amount * price * feeRate;
  }

  /**
   * Get market price for a trading pair
   */
  async getMarketPrice(currency, baseCurrency) {
    // In production, this would fetch from price feed
    // For now, return a mock price based on order book
    const pair = `${currency}-${baseCurrency}`;
    const book = this.orderBook.get(pair);
    
    if (!book || book.buyOrders.length === 0 || book.sellOrders.length === 0) {
      return 1.0; // Default price
    }

    const bestBid = Math.max(...book.buyOrders.map(o => o.limitPrice || o.price));
    const bestAsk = Math.min(...book.sellOrders.map(o => o.limitPrice || o.price));
    
    return (bestBid + bestAsk) / 2; // Mid price
  }

  /**
   * Get available liquidity at a price level
   */
  async getAvailableLiquidity(currency, baseCurrency, side, price) {
    const pair = `${currency}-${baseCurrency}`;
    const book = this.orderBook.get(pair);
    
    if (!book) return 0;

    const orders = side === 'buy' ? book.sellOrders : book.buyOrders;
    
    return orders
      .filter(order => {
        const orderPrice = order.limitPrice || order.price;
        return side === 'buy' ? orderPrice <= price : orderPrice >= price;
      })
      .reduce((total, order) => total + (order.amount - order.filledAmount), 0);
  }

  /**
   * Create audit entry
   */
  async createAuditEntry(auditData) {
    try {
      await ImmutableAudit.createAuditEntry(auditData);
    } catch (error) {
      logger.error('Failed to create audit entry:', error);
    }
  }

  /**
   * Create trade audit entry
   */
  async createTradeAuditEntry(transaction, order1, order2) {
    await this.createAuditEntry({
      entityInfo: {
        userId: null,
        tenantId: transaction.tenantId,
        entityType: 'TRANSACTION',
        entityId: transaction._id.toString()
      },
      eventInfo: {
        eventType: 'TRADE_EXECUTED',
        action: 'EXECUTE_TRADE',
        resource: 'SPOT_TRADE',
        resourceId: transaction._id.toString(),
        outcome: 'SUCCESS'
      },
      changeInfo: {
        afterState: {
          amount: transaction.amount,
          price: transaction.price,
          totalValue: transaction.totalValue,
          buyOrder: order1.side === 'buy' ? order1._id : order2._id,
          sellOrder: order1.side === 'sell' ? order1._id : order2._id
        }
      }
    });
  }

  /**
   * Update execution analytics
   */
  updateExecutionAnalytics(currency, baseCurrency, matchResult) {
    const pair = `${currency}-${baseCurrency}`;
    const analytics = this.executionAnalytics.get(pair) || {
      totalTrades: 0,
      totalVolume: 0,
      avgPrice: 0,
      avgExecutionTime: 0,
      priceHistory: []
    };

    analytics.totalTrades += 1;
    analytics.totalVolume += matchResult.matchAmount;
    analytics.avgPrice = (analytics.avgPrice * (analytics.totalTrades - 1) + matchResult.matchPrice) / analytics.totalTrades;
    analytics.priceHistory.push({
      price: matchResult.matchPrice,
      timestamp: new Date(),
      volume: matchResult.matchAmount
    });

    // Keep only last 100 trades
    if (analytics.priceHistory.length > 100) {
      analytics.priceHistory = analytics.priceHistory.slice(-100);
    }

    this.executionAnalytics.set(pair, analytics);
  }

  /**
   * Get market conditions
   */
  async getMarketConditions(currency, baseCurrency) {
    const pair = `${currency}-${baseCurrency}`;
    const analytics = this.executionAnalytics.get(pair);
    
    if (!analytics || analytics.priceHistory.length < 2) {
      return {
        volatility: 'LOW',
        trend: 'STABLE',
        volume: 0
      };
    }

    const recentPrices = analytics.priceHistory.slice(-10).map(p => p.price);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    
    return {
      volatility: Math.abs(priceChange) > 0.05 ? 'HIGH' : Math.abs(priceChange) > 0.02 ? 'MEDIUM' : 'LOW',
      trend: priceChange > 0.01 ? 'UPWARD' : priceChange < -0.01 ? 'DOWNWARD' : 'STABLE',
      volume: analytics.totalVolume,
      priceChange: priceChange * 100
    };
  }

  /**
   * Cancel all pending orders for a trading pair
   */
  async cancelAllPendingOrders(currency, baseCurrency) {
    try {
      const result = await Order.updateMany(
        {
          currency,
          baseCurrency,
          status: { $in: ['pending', 'active', 'partially_filled'] }
        },
        {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      );

      logger.info('Cancelled pending orders due to circuit breaker', {
        pair: `${currency}-${baseCurrency}`,
        cancelledCount: result.modifiedCount
      });

      // Clear from order book
      const pair = `${currency}-${baseCurrency}`;
      this.orderBook.delete(pair);

    } catch (error) {
      logger.error('Failed to cancel pending orders:', error);
    }
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