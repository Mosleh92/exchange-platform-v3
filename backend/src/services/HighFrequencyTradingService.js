const Redis = require('redis');
const WebSocket = require('ws');
const crypto = require('crypto');

class HighFrequencyTradingService {
  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redis.connect();
    
    this.connections = new Map();
    this.orderQueues = new Map();
    this.latencyStats = new Map();
    this.riskLimits = new Map();
    
    // HFT Configuration
    this.config = {
      maxLatency: 10, // milliseconds
      maxOrdersPerSecond: 1000,
      maxPositionSize: 1000000,
      maxDrawdown: 5, // percentage
      cooldownPeriod: 60, // seconds
      heartbeatInterval: 1000, // milliseconds
      reconnectAttempts: 5
    };
  }

  /**
   * Initialize HFT connection
   */
  async initializeHFT(userId, tenantId, config) {
    const connectionId = `${userId}_${tenantId}`;
    
    if (this.connections.has(connectionId)) {
      throw new Error('HFT connection already exists');
    }

    const connection = {
      id: connectionId,
      userId,
      tenantId,
      config: { ...this.config, ...config },
      status: 'connecting',
      ws: null,
      lastHeartbeat: Date.now(),
      orderCount: 0,
      lastOrderTime: Date.now(),
      latency: {
        min: Infinity,
        max: 0,
        average: 0,
        samples: []
      },
      risk: {
        currentPosition: 0,
        dailyPnL: 0,
        maxDrawdown: 0,
        lastReset: Date.now()
      }
    };

    this.connections.set(connectionId, connection);
    this.orderQueues.set(connectionId, []);
    this.latencyStats.set(connectionId, []);
    this.riskLimits.set(connectionId, {
      ordersThisSecond: 0,
      lastReset: Date.now()
    });

    await this.connectToExchange(connection);
    return connection;
  }

  /**
   * Connect to exchange via WebSocket
   */
  async connectToExchange(connection) {
    try {
      const ws = new WebSocket(process.env.EXCHANGE_WS_URL, {
        headers: {
          'Authorization': `Bearer ${process.env.EXCHANGE_API_KEY}`,
          'User-Agent': 'ExchangePlatform-HFT/1.0'
        }
      });

      ws.on('open', () => {
        console.log(`HFT connection established: ${connection.id}`);
        connection.status = 'connected';
        connection.ws = ws;
        
        // Subscribe to market data
        this.subscribeToMarketData(connection);
        
        // Start heartbeat
        this.startHeartbeat(connection);
        
        // Start order processing
        this.startOrderProcessing(connection);
      });

      ws.on('message', (data) => {
        this.handleMarketData(connection, JSON.parse(data));
      });

      ws.on('close', () => {
        console.log(`HFT connection closed: ${connection.id}`);
        connection.status = 'disconnected';
        this.reconnect(connection);
      });

      ws.on('error', (error) => {
        console.error(`HFT connection error: ${connection.id}`, error);
        connection.status = 'error';
      });

    } catch (error) {
      console.error('Error connecting to exchange:', error);
      connection.status = 'error';
      throw error;
    }
  }

  /**
   * Subscribe to market data feeds
   */
  subscribeToMarketData(connection) {
    const subscriptions = [
      { channel: 'ticker', symbol: 'BTCUSDT' },
      { channel: 'ticker', symbol: 'ETHUSDT' },
      { channel: 'orderbook', symbol: 'BTCUSDT', depth: 20 },
      { channel: 'orderbook', symbol: 'ETHUSDT', depth: 20 },
      { channel: 'trades', symbol: 'BTCUSDT' },
      { channel: 'trades', symbol: 'ETHUSDT' }
    ];

    for (const sub of subscriptions) {
      connection.ws.send(JSON.stringify({
        method: 'subscribe',
        params: sub
      }));
    }
  }

  /**
   * Handle incoming market data
   */
  handleMarketData(connection, data) {
    const startTime = Date.now();
    
    try {
      switch (data.channel) {
        case 'ticker':
          this.processTickerData(connection, data);
          break;
        case 'orderbook':
          this.processOrderBookData(connection, data);
          break;
        case 'trades':
          this.processTradeData(connection, data);
          break;
        default:
          console.log('Unknown market data channel:', data.channel);
      }
      
      // Update latency statistics
      const latency = Date.now() - startTime;
      this.updateLatencyStats(connection, latency);
      
    } catch (error) {
      console.error('Error processing market data:', error);
    }
  }

  /**
   * Process ticker data
   */
  processTickerData(connection, data) {
    const ticker = {
      symbol: data.symbol,
      price: parseFloat(data.price),
      volume: parseFloat(data.volume),
      change: parseFloat(data.change),
      timestamp: Date.now()
    };

    // Cache ticker data
    this.redis.setex(`ticker:${data.symbol}`, 1, JSON.stringify(ticker));
    
    // Check for trading opportunities
    this.checkTradingOpportunities(connection, ticker);
  }

  /**
   * Process order book data
   */
  processOrderBookData(connection, data) {
    const orderBook = {
      symbol: data.symbol,
      bids: data.bids.map(bid => ({
        price: parseFloat(bid[0]),
        size: parseFloat(bid[1])
      })),
      asks: data.asks.map(ask => ({
        price: parseFloat(ask[0]),
        size: parseFloat(ask[1])
      })),
      timestamp: Date.now()
    };

    // Cache order book data
    this.redis.setex(`orderbook:${data.symbol}`, 1, JSON.stringify(orderBook));
    
    // Check for arbitrage opportunities
    this.checkArbitrageOpportunities(connection, orderBook);
  }

  /**
   * Process trade data
   */
  processTradeData(connection, data) {
    const trade = {
      symbol: data.symbol,
      price: parseFloat(data.price),
      size: parseFloat(data.size),
      side: data.side,
      timestamp: Date.now()
    };

    // Update trade history
    this.redis.lpush(`trades:${data.symbol}`, JSON.stringify(trade));
    this.redis.ltrim(`trades:${data.symbol}`, 0, 999); // Keep last 1000 trades
    
    // Check for momentum opportunities
    this.checkMomentumOpportunities(connection, trade);
  }

  /**
   * Check for trading opportunities
   */
  checkTradingOpportunities(connection, ticker) {
    // Implement your HFT strategy here
    // This is a simplified example
    
    const strategy = connection.config.strategy;
    if (!strategy) return;

    // Example: Mean reversion strategy
    if (strategy.type === 'mean_reversion') {
      const meanPrice = this.calculateMeanPrice(ticker.symbol, 100);
      const deviation = Math.abs(ticker.price - meanPrice) / meanPrice;
      
      if (deviation > strategy.threshold) {
        const side = ticker.price > meanPrice ? 'sell' : 'buy';
        const size = this.calculateOrderSize(connection, ticker.price, strategy.positionSize);
        
        this.submitOrder(connection, {
          symbol: ticker.symbol,
          side,
          size,
          price: ticker.price,
          type: 'market'
        });
      }
    }
  }

  /**
   * Check for arbitrage opportunities
   */
  checkArbitrageOpportunities(connection, orderBook) {
    const spread = orderBook.asks[0].price - orderBook.bids[0].price;
    const spreadPercentage = spread / orderBook.bids[0].price;
    
    if (spreadPercentage > connection.config.minSpread) {
      // Potential arbitrage opportunity
      const size = Math.min(orderBook.bids[0].size, orderBook.asks[0].size);
      
      // Submit buy order
      this.submitOrder(connection, {
        symbol: orderBook.symbol,
        side: 'buy',
        size,
        price: orderBook.bids[0].price,
        type: 'limit'
      });
      
      // Submit sell order
      this.submitOrder(connection, {
        symbol: orderBook.symbol,
        side: 'sell',
        size,
        price: orderBook.asks[0].price,
        type: 'limit'
      });
    }
  }

  /**
   * Check for momentum opportunities
   */
  checkMomentumOpportunities(connection, trade) {
    // Get recent trades
    this.redis.lrange(`trades:${trade.symbol}`, 0, 9, (err, trades) => {
      if (err) return;
      
      const recentTrades = trades.map(t => JSON.parse(t));
      const momentum = this.calculateMomentum(recentTrades);
      
      if (Math.abs(momentum) > connection.config.momentumThreshold) {
        const side = momentum > 0 ? 'buy' : 'sell';
        const size = this.calculateOrderSize(connection, trade.price, connection.config.positionSize);
        
        this.submitOrder(connection, {
          symbol: trade.symbol,
          side,
          size,
          price: trade.price,
          type: 'market'
        });
      }
    });
  }

  /**
   * Submit order to exchange
   */
  async submitOrder(connection, order) {
    // Check risk limits
    if (!this.checkRiskLimits(connection)) {
      console.log('Risk limit exceeded, order rejected');
      return;
    }

    // Check latency
    if (!this.checkLatency(connection)) {
      console.log('Latency too high, order rejected');
      return;
    }

    try {
      const orderId = crypto.randomUUID();
      const orderMessage = {
        method: 'order',
        params: {
          id: orderId,
          symbol: order.symbol,
          side: order.side,
          size: order.size,
          price: order.price,
          type: order.type,
          timestamp: Date.now()
        }
      };

      connection.ws.send(JSON.stringify(orderMessage));
      
      // Track order
      connection.orderCount++;
      connection.lastOrderTime = Date.now();
      
      // Add to queue for tracking
      this.orderQueues.get(connection.id).push({
        id: orderId,
        order,
        timestamp: Date.now(),
        status: 'pending'
      });
      
      console.log(`HFT order submitted: ${orderId} - ${order.side} ${order.size} ${order.symbol} @ ${order.price}`);
      
    } catch (error) {
      console.error('Error submitting HFT order:', error);
    }
  }

  /**
   * Check risk limits
   */
  checkRiskLimits(connection) {
    const riskLimit = this.riskLimits.get(connection.id);
    const now = Date.now();
    
    // Reset counter if needed
    if (now - riskLimit.lastReset >= 1000) {
      riskLimit.ordersThisSecond = 0;
      riskLimit.lastReset = now;
    }
    
    // Check orders per second limit
    if (riskLimit.ordersThisSecond >= connection.config.maxOrdersPerSecond) {
      return false;
    }
    
    // Check position size limit
    if (Math.abs(connection.risk.currentPosition) >= connection.config.maxPositionSize) {
      return false;
    }
    
    // Check drawdown limit
    if (connection.risk.maxDrawdown <= -connection.config.maxDrawdown) {
      return false;
    }
    
    riskLimit.ordersThisSecond++;
    return true;
  }

  /**
   * Check latency
   */
  checkLatency(connection) {
    const avgLatency = connection.latency.average;
    return avgLatency <= connection.config.maxLatency;
  }

  /**
   * Update latency statistics
   */
  updateLatencyStats(connection, latency) {
    connection.latency.samples.push(latency);
    
    // Keep only last 100 samples
    if (connection.latency.samples.length > 100) {
      connection.latency.samples.shift();
    }
    
    // Calculate statistics
    connection.latency.min = Math.min(connection.latency.min, latency);
    connection.latency.max = Math.max(connection.latency.max, latency);
    connection.latency.average = connection.latency.samples.reduce((a, b) => a + b, 0) / connection.latency.samples.length;
  }

  /**
   * Start heartbeat
   */
  startHeartbeat(connection) {
    setInterval(() => {
      if (connection.status === 'connected' && connection.ws) {
        connection.ws.send(JSON.stringify({
          method: 'ping',
          timestamp: Date.now()
        }));
        connection.lastHeartbeat = Date.now();
      }
    }, connection.config.heartbeatInterval);
  }

  /**
   * Start order processing
   */
  startOrderProcessing(connection) {
    setInterval(() => {
      this.processOrderQueue(connection);
    }, 10); // Process every 10ms
  }

  /**
   * Process order queue
   */
  processOrderQueue(connection) {
    const queue = this.orderQueues.get(connection.id);
    const now = Date.now();
    
    // Remove old orders (older than 5 seconds)
    const filteredQueue = queue.filter(order => 
      now - order.timestamp < 5000
    );
    
    this.orderQueues.set(connection.id, filteredQueue);
  }

  /**
   * Reconnect to exchange
   */
  async reconnect(connection) {
    let attempts = 0;
    const maxAttempts = connection.config.reconnectAttempts;
    
    const attemptReconnect = () => {
      if (attempts >= maxAttempts) {
        console.log(`Max reconnection attempts reached for ${connection.id}`);
        connection.status = 'failed';
        return;
      }
      
      attempts++;
      console.log(`Reconnection attempt ${attempts} for ${connection.id}`);
      
      setTimeout(async () => {
        try {
          await this.connectToExchange(connection);
        } catch (error) {
          console.error(`Reconnection failed: ${connection.id}`, error);
          attemptReconnect();
        }
      }, 1000 * attempts); // Exponential backoff
    };
    
    attemptReconnect();
  }

  /**
   * Calculate mean price from recent trades
   */
  calculateMeanPrice(symbol, count) {
    return new Promise((resolve) => {
      this.redis.lrange(`trades:${symbol}`, 0, count - 1, (err, trades) => {
        if (err || trades.length === 0) {
          resolve(0);
          return;
        }
        
        const prices = trades.map(t => JSON.parse(t).price);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        resolve(mean);
      });
    });
  }

  /**
   * Calculate order size based on risk management
   */
  calculateOrderSize(connection, price, maxPositionSize) {
    const availableCapital = connection.config.maxPositionSize - Math.abs(connection.risk.currentPosition);
    const maxSize = availableCapital / price;
    return Math.min(maxSize, connection.config.maxOrderSize || 1);
  }

  /**
   * Calculate momentum from recent trades
   */
  calculateMomentum(trades) {
    if (trades.length < 2) return 0;
    
    const prices = trades.map(t => t.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    return returns.reduce((a, b) => a + b, 0) / returns.length;
  }

  /**
   * Get HFT statistics
   */
  getHFTStats(userId) {
    const userConnections = Array.from(this.connections.values()).filter(c => c.userId === userId);
    
    return {
      activeConnections: userConnections.filter(c => c.status === 'connected').length,
      totalOrders: userConnections.reduce((sum, c) => sum + c.orderCount, 0),
      averageLatency: userConnections.reduce((sum, c) => sum + c.latency.average, 0) / userConnections.length || 0,
      totalPnL: userConnections.reduce((sum, c) => sum + c.risk.dailyPnL, 0)
    };
  }

  /**
   * Stop HFT connection
   */
  async stopHFT(userId, tenantId) {
    const connectionId = `${userId}_${tenantId}`;
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error('HFT connection not found');
    }

    if (connection.ws) {
      connection.ws.close();
    }

    this.connections.delete(connectionId);
    this.orderQueues.delete(connectionId);
    this.latencyStats.delete(connectionId);
    this.riskLimits.delete(connectionId);

    return { success: true, message: 'HFT connection stopped' };
  }
}

<<<<<<< HEAD
module.exports = new HighFrequencyTradingService(); 
=======
module.exports = new HighFrequencyTradingService(); 
>>>>>>> 9bbf1ecc9d48877375d9c66279f02298925b488d
