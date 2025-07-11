const Redis = require('redis');
const axios = require('axios');
const AdvancedOrder = require('../models/AdvancedOrder');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');

class MarketMakingService {
  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redis.connect();
    
    this.activeMMs = new Map();
    this.volatilityCache = new Map();
    this.spreadCache = new Map();
  }

  /**
   * Start market making for a trading pair
   */
  async startMarketMaking(userId, tenantId, config) {
    const {
      currency,
      baseCurrency,
      spread,
      depth,
      minOrderSize,
      maxOrderSize,
      refreshInterval,
      riskManagement
    } = config;

    const mmId = `${userId}_${currency}_${baseCurrency}`;
    
    if (this.activeMMs.has(mmId)) {
      throw new Error('Market making already active for this pair');
    }

    const marketMaker = {
      id: mmId,
      userId,
      tenantId,
      currency,
      baseCurrency,
      config,
      status: 'active',
      orders: [],
      lastUpdate: new Date(),
      statistics: {
        totalOrders: 0,
        filledOrders: 0,
        totalVolume: 0,
        totalFees: 0,
        pnl: 0
      }
    };

    this.activeMMs.set(mmId, marketMaker);
    
    // Start the market making loop
    this.runMarketMaking(marketMaker);
    
    return marketMaker;
  }

  /**
   * Stop market making for a trading pair
   */
  async stopMarketMaking(userId, currency, baseCurrency) {
    const mmId = `${userId}_${currency}_${baseCurrency}`;
    const marketMaker = this.activeMMs.get(mmId);
    
    if (!marketMaker) {
      throw new Error('Market making not active for this pair');
    }

    // Cancel all active orders
    await this.cancelAllOrders(marketMaker);
    
    // Update status
    marketMaker.status = 'stopped';
    this.activeMMs.delete(mmId);
    
    return { success: true, message: 'Market making stopped' };
  }

  /**
   * Main market making loop
   */
  async runMarketMaking(marketMaker) {
    if (marketMaker.status !== 'active') return;

    try {
      // Get current market data
      const marketData = await this.getMarketData(marketMaker.currency, marketMaker.baseCurrency);
      
      // Calculate optimal spreads and depths
      const orderBook = await this.calculateOrderBook(marketMaker, marketData);
      
      // Place or update orders
      await this.manageOrders(marketMaker, orderBook);
      
      // Update statistics
      await this.updateStatistics(marketMaker);
      
      // Risk management check
      await this.riskManagement(marketMaker);
      
    } catch (error) {
      console.error('Market making error:', error);
      marketMaker.status = 'error';
    }

    // Schedule next update
    setTimeout(() => {
      this.runMarketMaking(marketMaker);
    }, marketMaker.config.refreshInterval || 5000);
  }

  /**
   * Calculate optimal order book based on market conditions
   */
  async calculateOrderBook(marketMaker, marketData) {
    const { spread, depth, minOrderSize, maxOrderSize } = marketMaker.config;
    const { bid, ask, volume, volatility } = marketData;
    
    // Calculate dynamic spread based on volatility
    const dynamicSpread = this.calculateDynamicSpread(spread, volatility);
    
    // Calculate order sizes based on volume
    const orderSizes = this.calculateOrderSizes(volume, minOrderSize, maxOrderSize, depth);
    
    const orderBook = {
      bids: [],
      asks: [],
      timestamp: new Date()
    };

    // Generate bid orders
    for (let i = 0; i < depth; i++) {
      const price = bid * (1 - (dynamicSpread / 2) - (i * 0.001));
      const size = orderSizes[i] || minOrderSize;
      
      orderBook.bids.push({
        price: parseFloat(price.toFixed(8)),
        size: parseFloat(size.toFixed(8)),
        side: 'buy'
      });
    }

    // Generate ask orders
    for (let i = 0; i < depth; i++) {
      const price = ask * (1 + (dynamicSpread / 2) + (i * 0.001));
      const size = orderSizes[i] || minOrderSize;
      
      orderBook.asks.push({
        price: parseFloat(price.toFixed(8)),
        size: parseFloat(size.toFixed(8)),
        side: 'sell'
      });
    }

    return orderBook;
  }

  /**
   * Calculate dynamic spread based on volatility
   */
  calculateDynamicSpread(baseSpread, volatility) {
    const volatilityMultiplier = Math.min(2, Math.max(0.5, 1 + volatility));
    return baseSpread * volatilityMultiplier;
  }

  /**
   * Calculate order sizes based on volume and depth
   */
  calculateOrderSizes(volume, minSize, maxSize, depth) {
    const sizes = [];
    const volumePerOrder = volume / depth;
    
    for (let i = 0; i < depth; i++) {
      // Decrease size as we go deeper in the order book
      const sizeMultiplier = 1 - (i * 0.1);
      let size = volumePerOrder * sizeMultiplier;
      
      // Apply min/max constraints
      size = Math.max(minSize, Math.min(maxSize, size));
      sizes.push(size);
    }
    
    return sizes;
  }

  /**
   * Manage orders - place new ones and update existing ones
   */
  async manageOrders(marketMaker, orderBook) {
    const { orders } = marketMaker;
    
    // Cancel orders that are no longer optimal
    for (const order of orders) {
      const isOptimal = this.isOrderOptimal(order, orderBook);
      if (!isOptimal) {
        await this.cancelOrder(order);
      }
    }

    // Place new orders
    for (const level of orderBook.bids) {
      const existingOrder = this.findExistingOrder(orders, 'buy', level.price);
      if (!existingOrder) {
        await this.placeOrder(marketMaker, level);
      }
    }

    for (const level of orderBook.asks) {
      const existingOrder = this.findExistingOrder(orders, 'sell', level.price);
      if (!existingOrder) {
        await this.placeOrder(marketMaker, level);
      }
    }
  }

  /**
   * Check if an order is still optimal
   */
  isOrderOptimal(order, orderBook) {
    const tolerance = 0.001; // 0.1% tolerance
    
    if (order.side === 'buy') {
      const optimalBid = orderBook.bids.find(bid => 
        Math.abs(bid.price - order.price) < tolerance
      );
      return optimalBid && Math.abs(optimalBid.size - order.size) < tolerance;
    } else {
      const optimalAsk = orderBook.asks.find(ask => 
        Math.abs(ask.price - order.price) < tolerance
      );
      return optimalAsk && Math.abs(optimalAsk.size - order.size) < tolerance;
    }
  }

  /**
   * Find existing order at similar price
   */
  findExistingOrder(orders, side, price) {
    const tolerance = 0.001;
    return orders.find(order => 
      order.side === side && 
      Math.abs(order.price - price) < tolerance
    );
  }

  /**
   * Place a new order
   */
  async placeOrder(marketMaker, level) {
    try {
      const order = new AdvancedOrder({
        userId: marketMaker.userId,
        tenantId: marketMaker.tenantId,
        orderType: 'limit',
        side: level.side,
        currency: marketMaker.currency,
        baseCurrency: marketMaker.baseCurrency,
        amount: level.size,
        limitPrice: level.price,
        isMarketMaker: true,
        tags: ['market_making'],
        notes: `MM Order - ${level.side} ${level.size} @ ${level.price}`
      });

      await order.save();
      
      marketMaker.orders.push({
        orderId: order._id,
        side: level.side,
        price: level.price,
        size: level.size,
        status: 'pending'
      });

      marketMaker.statistics.totalOrders++;
      
    } catch (error) {
      console.error('Error placing MM order:', error);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(order) {
    try {
      await AdvancedOrder.findByIdAndUpdate(order.orderId, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
      
      // Remove from market maker's order list
      const marketMaker = this.findMarketMakerByOrder(order.orderId);
      if (marketMaker) {
        marketMaker.orders = marketMaker.orders.filter(o => o.orderId !== order.orderId);
      }
      
    } catch (error) {
      console.error('Error cancelling MM order:', error);
    }
  }

  /**
   * Cancel all orders for a market maker
   */
  async cancelAllOrders(marketMaker) {
    for (const order of marketMaker.orders) {
      await this.cancelOrder(order);
    }
  }

  /**
   * Find market maker by order ID
   */
  findMarketMakerByOrder(orderId) {
    for (const [id, mm] of this.activeMMs) {
      if (mm.orders.some(o => o.orderId.toString() === orderId.toString())) {
        return mm;
      }
    }
    return null;
  }

  /**
   * Get market data for a trading pair
   */
  async getMarketData(currency, baseCurrency) {
    const cacheKey = `market_data:${currency}:${baseCurrency}`;
    
    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch from external API
      const response = await axios.get(`${process.env.MARKET_DATA_API}/ticker`, {
        params: { symbol: `${currency}${baseCurrency}` }
      });

      const marketData = {
        bid: parseFloat(response.data.bid),
        ask: parseFloat(response.data.ask),
        volume: parseFloat(response.data.volume),
        volatility: this.calculateVolatility(response.data.priceHistory || []),
        timestamp: new Date()
      };

      // Cache for 1 second
      await this.redis.setex(cacheKey, 1, JSON.stringify(marketData));
      
      return marketData;
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  /**
   * Calculate volatility from price history
   */
  calculateVolatility(priceHistory) {
    if (priceHistory.length < 2) return 0.01; // Default 1% volatility
    
    const returns = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const return_ = (priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
      returns.push(return_);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Update market maker statistics
   */
  async updateStatistics(marketMaker) {
    const filledOrders = marketMaker.orders.filter(o => o.status === 'filled');
    
    marketMaker.statistics.filledOrders = filledOrders.length;
    marketMaker.statistics.totalVolume = filledOrders.reduce((sum, o) => sum + o.size, 0);
    marketMaker.statistics.totalFees = filledOrders.reduce((sum, o) => sum + (o.fee || 0), 0);
    
    // Calculate PnL
    let pnl = 0;
    for (const order of filledOrders) {
      if (order.side === 'buy') {
        pnl -= order.price * order.size;
      } else {
        pnl += order.price * order.size;
      }
    }
    marketMaker.statistics.pnl = pnl;
  }

  /**
   * Risk management for market makers
   */
  async riskManagement(marketMaker) {
    const { riskManagement } = marketMaker.config;
    
    // Check position limits
    const totalPosition = this.calculateTotalPosition(marketMaker);
    if (Math.abs(totalPosition) > riskManagement.maxPosition) {
      await this.adjustPosition(marketMaker, totalPosition);
    }
    
    // Check daily loss limit
    const dailyPnL = this.calculateDailyPnL(marketMaker);
    if (dailyPnL < -riskManagement.maxDailyLoss) {
      await this.stopMarketMaking(marketMaker.userId, marketMaker.currency, marketMaker.baseCurrency);
    }
    
    // Check volatility threshold
    const marketData = await this.getMarketData(marketMaker.currency, marketMaker.baseCurrency);
    if (marketData.volatility > riskManagement.volatilityThreshold) {
      await this.reduceExposure(marketMaker);
    }
  }

  /**
   * Calculate total position for a market maker
   */
  calculateTotalPosition(marketMaker) {
    let position = 0;
    
    for (const order of marketMaker.orders) {
      if (order.status === 'filled') {
        if (order.side === 'buy') {
          position += order.size;
        } else {
          position -= order.size;
        }
      }
    }
    
    return position;
  }

  /**
   * Calculate daily PnL
   */
  calculateDailyPnL(marketMaker) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = marketMaker.orders.filter(o => 
      o.filledAt && new Date(o.filledAt) >= today
    );
    
    let pnl = 0;
    for (const order of todayOrders) {
      if (order.side === 'buy') {
        pnl -= order.price * order.size;
      } else {
        pnl += order.price * order.size;
      }
    }
    
    return pnl;
  }

  /**
   * Adjust position to stay within limits
   */
  async adjustPosition(marketMaker, totalPosition) {
    const maxPosition = marketMaker.config.riskManagement.maxPosition;
    const adjustment = totalPosition > 0 ? -maxPosition : maxPosition;
    
    // Place offsetting orders
    const offsetOrder = {
      side: totalPosition > 0 ? 'sell' : 'buy',
      size: Math.abs(adjustment),
      price: totalPosition > 0 ? marketMaker.config.ask * 1.001 : marketMaker.config.bid * 0.999
    };
    
    await this.placeOrder(marketMaker, offsetOrder);
  }

  /**
   * Reduce exposure during high volatility
   */
  async reduceExposure(marketMaker) {
    // Cancel some orders to reduce exposure
    const ordersToCancel = marketMaker.orders.slice(0, Math.floor(marketMaker.orders.length / 2));
    
    for (const order of ordersToCancel) {
      await this.cancelOrder(order);
    }
  }

  /**
   * Get all active market makers
   */
  getActiveMarketMakers() {
    return Array.from(this.activeMMs.values());
  }

  /**
   * Get market maker statistics
   */
  getMarketMakerStats(userId) {
    const userMMs = Array.from(this.activeMMs.values()).filter(mm => mm.userId === userId);
    
    return {
      activeCount: userMMs.length,
      totalOrders: userMMs.reduce((sum, mm) => sum + mm.statistics.totalOrders, 0),
      totalVolume: userMMs.reduce((sum, mm) => sum + mm.statistics.totalVolume, 0),
      totalPnL: userMMs.reduce((sum, mm) => sum + mm.statistics.pnl, 0)
    };
  }
}

module.exports = new MarketMakingService();
