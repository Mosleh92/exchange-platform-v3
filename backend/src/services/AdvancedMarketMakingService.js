const logger = require('../utils/logger');
const Order = require('../models/AdvancedOrder');
const TradingEngine = require('./TradingEngine');
const { EventEmitter } = require('events');

/**
 * Advanced Market Making Service
 * Provides liquidity through automated bid/ask spread management
 */
class MarketMakingService extends EventEmitter {
  constructor() {
    super();
    this.marketMakers = new Map(); // Active market makers
    this.spreadConfigs = new Map(); // Spread configurations per pair
    this.inventoryLimits = new Map(); // Inventory management limits
    this.riskLimits = new Map(); // Risk management parameters
    this.isRunning = false;
    this.updateInterval = 1000; // 1 second
  }

  /**
   * Start market making service
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Market making service started');

    // Start market making loop
    this.startMarketMakingLoop();

    // Listen to market events
    this.setupEventListeners();
  }

  /**
   * Stop market making service
   */
  async stop() {
    this.isRunning = false;
    
    // Cancel all market maker orders
    await this.cancelAllMarketMakerOrders();
    
    logger.info('Market making service stopped');
  }

  /**
   * Add market maker for a trading pair
   */
  async addMarketMaker(config) {
    const {
      marketMakerId,
      userId,
      tenantId,
      currency,
      baseCurrency,
      spreadConfig,
      inventoryConfig,
      riskConfig
    } = config;

    try {
      // Validate configuration
      this.validateMarketMakerConfig(config);

      const marketMaker = {
        id: marketMakerId,
        userId,
        tenantId,
        currency,
        baseCurrency,
        isActive: true,
        createdAt: new Date(),
        lastUpdate: new Date(),
        stats: {
          totalTrades: 0,
          totalVolume: 0,
          totalProfit: 0,
          inventoryValue: 0,
          activeOrders: 0
        },
        orders: {
          bids: new Map(),
          asks: new Map()
        }
      };

      // Store configurations
      const pairKey = `${currency}-${baseCurrency}`;
      this.marketMakers.set(marketMakerId, marketMaker);
      this.spreadConfigs.set(pairKey, spreadConfig);
      this.inventoryLimits.set(pairKey, inventoryConfig);
      this.riskLimits.set(pairKey, riskConfig);

      // Initial quote generation
      await this.generateInitialQuotes(marketMaker);

      logger.info('Market maker added', {
        marketMakerId,
        pair: pairKey,
        userId
      });

      this.emit('marketMakerAdded', marketMaker);

      return marketMaker;

    } catch (error) {
      logger.error('Failed to add market maker:', error);
      throw error;
    }
  }

  /**
   * Remove market maker
   */
  async removeMarketMaker(marketMakerId) {
    try {
      const marketMaker = this.marketMakers.get(marketMakerId);
      if (!marketMaker) {
        throw new Error('Market maker not found');
      }

      // Cancel all orders for this market maker
      await this.cancelMarketMakerOrders(marketMaker);

      // Remove from active market makers
      this.marketMakers.delete(marketMakerId);

      logger.info('Market maker removed', { marketMakerId });

      this.emit('marketMakerRemoved', { marketMakerId });

    } catch (error) {
      logger.error('Failed to remove market maker:', error);
      throw error;
    }
  }

  /**
   * Generate initial quotes for market maker
   */
  async generateInitialQuotes(marketMaker) {
    try {
      const pairKey = `${marketMaker.currency}-${marketMaker.baseCurrency}`;
      const spreadConfig = this.spreadConfigs.get(pairKey);
      
      if (!spreadConfig) {
        throw new Error('Spread configuration not found');
      }

      // Get current market price
      const marketPrice = await this.getCurrentMarketPrice(marketMaker.currency, marketMaker.baseCurrency);
      
      if (!marketPrice) {
        logger.warn('No market price available, skipping quote generation', { pairKey });
        return;
      }

      // Calculate bid/ask prices
      const halfSpread = (spreadConfig.baseSpread / 2) / 100;
      const bidPrice = marketPrice * (1 - halfSpread);
      const askPrice = marketPrice * (1 + halfSpread);

      // Generate bid orders
      await this.generateBidOrders(marketMaker, bidPrice, spreadConfig);

      // Generate ask orders
      await this.generateAskOrders(marketMaker, askPrice, spreadConfig);

      marketMaker.lastUpdate = new Date();

    } catch (error) {
      logger.error('Failed to generate initial quotes:', error);
    }
  }

  /**
   * Generate bid orders with depth
   */
  async generateBidOrders(marketMaker, basePrice, spreadConfig) {
    const orderSize = spreadConfig.orderSize;
    const levels = spreadConfig.depthLevels || 5;
    const priceIncrement = spreadConfig.priceIncrement || 0.001;

    for (let i = 0; i < levels; i++) {
      const price = basePrice * (1 - i * priceIncrement);
      const amount = orderSize * (1 + i * 0.1); // Increase size with depth

      try {
        const order = await this.placeLimitOrder(marketMaker, 'buy', amount, price);
        if (order) {
          marketMaker.orders.bids.set(order._id.toString(), order);
          marketMaker.stats.activeOrders++;
        }
      } catch (error) {
        logger.error('Failed to place bid order:', error);
      }
    }
  }

  /**
   * Generate ask orders with depth
   */
  async generateAskOrders(marketMaker, basePrice, spreadConfig) {
    const orderSize = spreadConfig.orderSize;
    const levels = spreadConfig.depthLevels || 5;
    const priceIncrement = spreadConfig.priceIncrement || 0.001;

    for (let i = 0; i < levels; i++) {
      const price = basePrice * (1 + i * priceIncrement);
      const amount = orderSize * (1 + i * 0.1); // Increase size with depth

      try {
        const order = await this.placeLimitOrder(marketMaker, 'sell', amount, price);
        if (order) {
          marketMaker.orders.asks.set(order._id.toString(), order);
          marketMaker.stats.activeOrders++;
        }
      } catch (error) {
        logger.error('Failed to place ask order:', error);
      }
    }
  }

  /**
   * Place limit order for market maker
   */
  async placeLimitOrder(marketMaker, side, amount, price) {
    try {
      // Check risk limits
      if (!this.checkRiskLimits(marketMaker, side, amount, price)) {
        return null;
      }

      // Check inventory limits
      if (!this.checkInventoryLimits(marketMaker, side, amount)) {
        return null;
      }

      const orderData = {
        userId: marketMaker.userId,
        tenantId: marketMaker.tenantId,
        currency: marketMaker.currency,
        baseCurrency: marketMaker.baseCurrency,
        side: side,
        amount: amount,
        limitPrice: price,
        orderType: 'limit',
        timeInForce: 'GTC',
        isMarketMaker: true,
        marketMakerId: marketMaker.id,
        source: 'MARKET_MAKER'
      };

      const order = await TradingEngine.placeOrder(orderData);
      
      logger.debug('Market maker order placed', {
        marketMakerId: marketMaker.id,
        orderId: order._id,
        side,
        amount,
        price
      });

      return order;

    } catch (error) {
      logger.error('Failed to place market maker order:', error);
      return null;
    }
  }

  /**
   * Market making loop
   */
  startMarketMakingLoop() {
    const loop = async () => {
      if (!this.isRunning) return;

      try {
        await this.updateAllMarketMakers();
      } catch (error) {
        logger.error('Error in market making loop:', error);
      }

      setTimeout(loop, this.updateInterval);
    };

    loop();
  }

  /**
   * Update all active market makers
   */
  async updateAllMarketMakers() {
    const updatePromises = Array.from(this.marketMakers.values())
      .filter(mm => mm.isActive)
      .map(mm => this.updateMarketMaker(mm));

    await Promise.allSettled(updatePromises);
  }

  /**
   * Update individual market maker
   */
  async updateMarketMaker(marketMaker) {
    try {
      // Check if rebalancing is needed
      const needsRebalancing = await this.needsRebalancing(marketMaker);
      
      if (needsRebalancing) {
        await this.rebalanceMarketMaker(marketMaker);
      }

      // Update quotes based on market conditions
      await this.updateQuotes(marketMaker);

      // Update statistics
      await this.updateMarketMakerStats(marketMaker);

      marketMaker.lastUpdate = new Date();

    } catch (error) {
      logger.error('Failed to update market maker:', error);
    }
  }

  /**
   * Check if market maker needs rebalancing
   */
  async needsRebalancing(marketMaker) {
    const pairKey = `${marketMaker.currency}-${marketMaker.baseCurrency}`;
    const inventoryConfig = this.inventoryLimits.get(pairKey);
    
    if (!inventoryConfig) return false;

    // Get current inventory
    const inventory = await this.getCurrentInventory(marketMaker);
    
    // Check if inventory is outside acceptable range
    const totalValue = inventory.baseAmount + inventory.quoteAmount;
    const basePercentage = inventory.baseAmount / totalValue;
    
    return basePercentage < inventoryConfig.minBaseRatio || 
           basePercentage > inventoryConfig.maxBaseRatio;
  }

  /**
   * Rebalance market maker inventory
   */
  async rebalanceMarketMaker(marketMaker) {
    try {
      // Cancel existing orders
      await this.cancelMarketMakerOrders(marketMaker);

      // Calculate rebalancing trades
      const rebalancingTrades = await this.calculateRebalancingTrades(marketMaker);

      // Execute rebalancing trades
      for (const trade of rebalancingTrades) {
        await this.executeRebalancingTrade(marketMaker, trade);
      }

      // Generate new quotes
      await this.generateInitialQuotes(marketMaker);

      logger.info('Market maker rebalanced', {
        marketMakerId: marketMaker.id,
        tradesExecuted: rebalancingTrades.length
      });

    } catch (error) {
      logger.error('Failed to rebalance market maker:', error);
    }
  }

  /**
   * Update quotes based on market conditions
   */
  async updateQuotes(marketMaker) {
    try {
      const pairKey = `${marketMaker.currency}-${marketMaker.baseCurrency}`;
      const spreadConfig = this.spreadConfigs.get(pairKey);
      
      if (!spreadConfig) return;

      // Get current market conditions
      const marketConditions = await this.getMarketConditions(marketMaker.currency, marketMaker.baseCurrency);
      
      // Adjust spread based on volatility
      const adjustedSpread = this.calculateDynamicSpread(spreadConfig, marketConditions);
      
      // Check if significant price movement occurred
      const currentPrice = await this.getCurrentMarketPrice(marketMaker.currency, marketMaker.baseCurrency);
      const lastPrice = marketMaker.lastQuotePrice || currentPrice;
      
      const priceChange = Math.abs(currentPrice - lastPrice) / lastPrice;
      
      if (priceChange > spreadConfig.repriceThreshold || 0.005) {
        // Cancel existing orders and requote
        await this.cancelMarketMakerOrders(marketMaker);
        await this.generateInitialQuotes(marketMaker);
        
        marketMaker.lastQuotePrice = currentPrice;
      }

    } catch (error) {
      logger.error('Failed to update quotes:', error);
    }
  }

  /**
   * Calculate dynamic spread based on market conditions
   */
  calculateDynamicSpread(spreadConfig, marketConditions) {
    let adjustedSpread = spreadConfig.baseSpread;
    
    // Increase spread in high volatility
    if (marketConditions.volatility === 'HIGH') {
      adjustedSpread *= 1.5;
    } else if (marketConditions.volatility === 'MEDIUM') {
      adjustedSpread *= 1.2;
    }
    
    // Adjust for volume
    if (marketConditions.volume < spreadConfig.minVolume) {
      adjustedSpread *= 1.3;
    }
    
    return Math.min(adjustedSpread, spreadConfig.maxSpread);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen to trade executions
    TradingEngine.on('tradeExecuted', (tradeData) => {
      this.handleTradeExecution(tradeData);
    });

    // Listen to order updates
    TradingEngine.on('orderStatusChanged', (orderData) => {
      this.handleOrderStatusChange(orderData);
    });
  }

  /**
   * Handle trade execution for market makers
   */
  async handleTradeExecution(tradeData) {
    // Find market makers involved in the trade
    for (const [marketMakerId, marketMaker] of this.marketMakers) {
      const buyOrder = marketMaker.orders.bids.get(tradeData.buyOrderId);
      const sellOrder = marketMaker.orders.asks.get(tradeData.sellOrderId);
      
      if (buyOrder || sellOrder) {
        await this.updateMarketMakerAfterTrade(marketMaker, tradeData, buyOrder || sellOrder);
      }
    }
  }

  /**
   * Update market maker statistics after trade
   */
  async updateMarketMakerAfterTrade(marketMaker, tradeData, order) {
    try {
      // Update statistics
      marketMaker.stats.totalTrades++;
      marketMaker.stats.totalVolume += tradeData.amount;
      
      // Calculate profit/loss
      const profit = this.calculateTradeProfit(tradeData, order);
      marketMaker.stats.totalProfit += profit;
      
      // Remove filled order from tracking
      if (order.status === 'filled') {
        if (order.side === 'buy') {
          marketMaker.orders.bids.delete(order._id.toString());
        } else {
          marketMaker.orders.asks.delete(order._id.toString());
        }
        marketMaker.stats.activeOrders--;
      }
      
      // Generate replacement order if needed
      if (order.status === 'filled') {
        await this.generateReplacementOrder(marketMaker, order);
      }
      
      logger.debug('Market maker updated after trade', {
        marketMakerId: marketMaker.id,
        profit,
        totalProfit: marketMaker.stats.totalProfit
      });

    } catch (error) {
      logger.error('Failed to update market maker after trade:', error);
    }
  }

  /**
   * Validate market maker configuration
   */
  validateMarketMakerConfig(config) {
    const required = ['marketMakerId', 'userId', 'tenantId', 'currency', 'baseCurrency'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!config.spreadConfig || !config.spreadConfig.baseSpread) {
      throw new Error('Spread configuration is required');
    }
    
    if (config.spreadConfig.baseSpread <= 0) {
      throw new Error('Base spread must be positive');
    }
  }

  /**
   * Check risk limits
   */
  checkRiskLimits(marketMaker, side, amount, price) {
    const pairKey = `${marketMaker.currency}-${marketMaker.baseCurrency}`;
    const riskLimits = this.riskLimits.get(pairKey);
    
    if (!riskLimits) return true;
    
    const orderValue = amount * price;
    const maxOrderValue = riskLimits.maxOrderValue || Infinity;
    
    return orderValue <= maxOrderValue;
  }

  /**
   * Check inventory limits
   */
  checkInventoryLimits(marketMaker, side, amount) {
    const pairKey = `${marketMaker.currency}-${marketMaker.baseCurrency}`;
    const inventoryLimits = this.inventoryLimits.get(pairKey);
    
    if (!inventoryLimits) return true;
    
    // In production, this would check actual inventory levels
    return true;
  }

  /**
   * Get current market price
   */
  async getCurrentMarketPrice(currency, baseCurrency) {
    // Get from trading engine or external price feed
    return await TradingEngine.getMarketPrice?.(currency, baseCurrency) || 1.0;
  }

  /**
   * Cancel all market maker orders
   */
  async cancelAllMarketMakerOrders() {
    for (const marketMaker of this.marketMakers.values()) {
      await this.cancelMarketMakerOrders(marketMaker);
    }
  }

  /**
   * Cancel orders for specific market maker
   */
  async cancelMarketMakerOrders(marketMaker) {
    try {
      const orderIds = [
        ...marketMaker.orders.bids.keys(),
        ...marketMaker.orders.asks.keys()
      ];

      for (const orderId of orderIds) {
        try {
          await TradingEngine.cancelOrder(orderId, marketMaker.userId);
        } catch (error) {
          logger.error('Failed to cancel market maker order:', error);
        }
      }

      marketMaker.orders.bids.clear();
      marketMaker.orders.asks.clear();
      marketMaker.stats.activeOrders = 0;

    } catch (error) {
      logger.error('Failed to cancel market maker orders:', error);
    }
  }

  // Additional helper methods would be implemented here...
  async getCurrentInventory(marketMaker) {
    // Implementation to get current inventory
    return { baseAmount: 1000, quoteAmount: 50000 };
  }

  async calculateRebalancingTrades(marketMaker) {
    // Implementation to calculate needed rebalancing trades
    return [];
  }

  async executeRebalancingTrade(marketMaker, trade) {
    // Implementation to execute rebalancing trade
  }

  async getMarketConditions(currency, baseCurrency) {
    // Implementation to get market conditions
    return { volatility: 'LOW', volume: 1000 };
  }

  calculateTradeProfit(tradeData, order) {
    // Implementation to calculate trade profit
    return 0;
  }

  async generateReplacementOrder(marketMaker, filledOrder) {
    // Implementation to generate replacement order
  }

  async updateMarketMakerStats(marketMaker) {
    // Implementation to update statistics
  }

  handleOrderStatusChange(orderData) {
    // Implementation to handle order status changes
  }
}

module.exports = new MarketMakingService();