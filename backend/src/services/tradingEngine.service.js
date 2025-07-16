const db = require('../config/database');
const logger = require('../utils/logger');
const Redis = require('ioredis');
const { EventEmitter } = require('events');

/**
 * Advanced Trading Engine Service
 * Handles order matching, atomic transactions, market data, and trading operations
 */
class TradingEngineService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.orderBook = new Map();
    this.pendingOrders = new Map();
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      threshold: 10,
      timeout: 60000 // 1 minute
    };
    
    this.initializeOrderBook();
    this.startMarketDataFeed();
  }

  /**
   * Initialize order book from database
   */
  async initializeOrderBook() {
    try {
      const query = `
        SELECT 
          symbol,
          side,
          price,
          quantity,
          order_id,
          status
        FROM orders 
        WHERE status IN ('PENDING', 'PARTIAL_FILLED')
        ORDER BY price ASC
      `;
      
      const result = await db.query(query);
      
      result.rows.forEach(order => {
        this.addToOrderBook(order);
      });
      
      logger.info('Order book initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize order book:', error);
    }
  }

  /**
   * Add order to order book
   */
  addToOrderBook(order) {
    const key = `${order.symbol}:${order.side}`;
    
    if (!this.orderBook.has(key)) {
      this.orderBook.set(key, []);
    }
    
    const orders = this.orderBook.get(key);
    orders.push({
      id: order.order_id,
      price: parseFloat(order.price),
      quantity: parseFloat(order.quantity),
      timestamp: new Date()
    });
    
    // Sort orders by price (ascending for bids, descending for asks)
    orders.sort((a, b) => {
      return order.side === 'BUY' ? a.price - b.price : b.price - a.price;
    });
    
    this.orderBook.set(key, orders);
  }

  /**
   * Place order with atomic transaction
   */
  async placeOrder(orderData) {
    const {
      userId,
      tenantId,
      symbol,
      side,
      quantity,
      price,
      orderType = 'LIMIT',
      timeInForce = 'GTC'
    } = orderData;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen) {
        throw new Error('Trading temporarily suspended due to market volatility');
      }

      // Validate order
      await this.validateOrder(orderData);

      // Start database transaction
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');

        // Create order record
        const orderQuery = `
          INSERT INTO orders (
            user_id, tenant_id, symbol, side, quantity, price, 
            order_type, time_in_force, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
          RETURNING id
        `;
        
        const orderResult = await client.query(orderQuery, [
          userId, tenantId, symbol, side, quantity, price, orderType, timeInForce
        ]);
        
        const orderId = orderResult.rows[0].id;

        // Check account balance
        await this.checkAccountBalance(client, userId, tenantId, side, quantity, price);

        // Reserve funds
        await this.reserveFunds(client, userId, tenantId, side, quantity, price);

        // Commit transaction
        await client.query('COMMIT');

        // Add to order book
        const order = {
          id: orderId,
          symbol,
          side,
          price: parseFloat(price),
          quantity: parseFloat(quantity),
          userId,
          tenantId
        };

        this.addToOrderBook(order);
        this.pendingOrders.set(orderId, order);

        // Emit order placed event
        this.emit('orderPlaced', order);

        logger.info('Order placed successfully', { orderId, symbol, side, quantity, price });

        return {
          orderId,
          status: 'PENDING',
          message: 'Order placed successfully'
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to place order:', error);
      this.handleTradingError(error);
      throw error;
    }
  }

  /**
   * Execute order matching with atomic transactions
   */
  async executeOrderMatching(symbol) {
    const buyKey = `${symbol}:BUY`;
    const sellKey = `${symbol}:SELL`;
    
    const buyOrders = this.orderBook.get(buyKey) || [];
    const sellOrders = this.orderBook.get(sellKey) || [];

    if (buyOrders.length === 0 || sellOrders.length === 0) {
      return;
    }

    const matches = [];
    let buyIndex = 0;
    let sellIndex = 0;

    while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
      const buyOrder = buyOrders[buyIndex];
      const sellOrder = sellOrders[sellIndex];

      // Check if orders can match
      if (buyOrder.price >= sellOrder.price) {
        const matchQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
        const matchPrice = sellOrder.price; // Price of the maker order

        matches.push({
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          quantity: matchQuantity,
          price: matchPrice,
          timestamp: new Date()
        });

        // Update order quantities
        buyOrder.quantity -= matchQuantity;
        sellOrder.quantity -= matchQuantity;

        // Remove filled orders
        if (buyOrder.quantity === 0) {
          buyOrders.splice(buyIndex, 1);
        } else {
          buyIndex++;
        }

        if (sellOrder.quantity === 0) {
          sellOrders.splice(sellIndex, 1);
        } else {
          sellIndex++;
        }
      } else {
        break; // No more matches possible
      }
    }

    // Execute matches atomically
    if (matches.length > 0) {
      await this.executeMatches(matches);
    }
  }

  /**
   * Execute matches with atomic transaction
   */
  async executeMatches(matches) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      for (const match of matches) {
        // Create trade record
        const tradeQuery = `
          INSERT INTO trades (
            buy_order_id, sell_order_id, quantity, price, 
            executed_at, status
          ) VALUES ($1, $2, $3, $4, NOW(), 'EXECUTED')
          RETURNING id
        `;
        
        const tradeResult = await client.query(tradeQuery, [
          match.buyOrderId, match.sellOrderId, match.quantity, match.price
        ]);
        
        const tradeId = tradeResult.rows[0].id;

        // Update orders
        await this.updateOrderStatus(client, match.buyOrderId, match.quantity);
        await this.updateOrderStatus(client, match.sellOrderId, match.quantity);

        // Transfer funds
        await this.transferFunds(client, match);

        // Update account balances
        await this.updateAccountBalances(client, match);

        // Emit trade executed event
        this.emit('tradeExecuted', { tradeId, ...match });
      }

      await client.query('COMMIT');
      
      logger.info('Matches executed successfully', { count: matches.length });

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to execute matches:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle partial fills
   */
  async handlePartialFill(orderId, filledQuantity, remainingQuantity) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Update order status
      const updateQuery = `
        UPDATE orders 
        SET 
          filled_quantity = filled_quantity + $1,
          remaining_quantity = $2,
          status = CASE 
            WHEN $2 = 0 THEN 'FILLED'
            ELSE 'PARTIAL_FILLED'
          END,
          updated_at = NOW()
        WHERE id = $3
      `;
      
      await client.query(updateQuery, [filledQuantity, remainingQuantity, orderId]);

      // Update order book
      const order = this.pendingOrders.get(orderId);
      if (order) {
        order.quantity = remainingQuantity;
        if (remainingQuantity === 0) {
          this.pendingOrders.delete(orderId);
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start market data feed
   */
  startMarketDataFeed() {
    setInterval(async () => {
      try {
        await this.updateMarketData();
        await this.executeOrderMatching('BTC/USD'); // Example symbol
      } catch (error) {
        logger.error('Market data feed error:', error);
        this.handleTradingError(error);
      }
    }, 1000); // Update every second
  }

  /**
   * Update market data with circuit breaker
   */
  async updateMarketData() {
    try {
      // Simulate market data updates
      const marketData = await this.fetchMarketData();
      
      // Check for extreme volatility
      if (this.detectExtremeVolatility(marketData)) {
        this.triggerCircuitBreaker();
        return;
      }

      // Update order book with new market data
      this.emit('marketDataUpdated', marketData);

    } catch (error) {
      logger.error('Failed to update market data:', error);
      this.handleTradingError(error);
    }
  }

  /**
   * Detect extreme volatility
   */
  detectExtremeVolatility(marketData) {
    // Implementation to detect extreme price movements
    const priceChange = Math.abs(marketData.priceChange);
    return priceChange > 10; // 10% price change threshold
  }

  /**
   * Trigger circuit breaker
   */
  triggerCircuitBreaker() {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    logger.warn('Circuit breaker triggered due to market volatility');
    this.emit('circuitBreakerTriggered');
    
    // Reset circuit breaker after timeout
    setTimeout(() => {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      logger.info('Circuit breaker reset');
    }, this.circuitBreaker.timeout);
  }

  /**
   * Handle trading errors
   */
  handleTradingError(error) {
    this.circuitBreaker.failureCount++;
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      this.triggerCircuitBreaker();
    }
  }

  /**
   * Validate order
   */
  async validateOrder(orderData) {
    const { symbol, side, quantity, price, orderType } = orderData;

    // Check if symbol is valid
    const validSymbols = ['BTC/USD', 'ETH/USD', 'LTC/USD'];
    if (!validSymbols.includes(symbol)) {
      throw new Error('Invalid symbol');
    }

    // Check quantity and price
    if (quantity <= 0 || price <= 0) {
      throw new Error('Invalid quantity or price');
    }

    // Check order type
    if (!['LIMIT', 'MARKET', 'STOP'].includes(orderType)) {
      throw new Error('Invalid order type');
    }

    // Additional validations...
  }

  /**
   * Check account balance
   */
  async checkAccountBalance(client, userId, tenantId, side, quantity, price) {
    const accountQuery = `
      SELECT balance, currency 
      FROM accounts 
      WHERE user_id = $1 AND tenant_id = $2
    `;
    
    const accountResult = await client.query(accountQuery, [userId, tenantId]);
    
    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const account = accountResult.rows[0];
    const requiredAmount = side === 'BUY' ? quantity * price : quantity;

    if (account.balance < requiredAmount) {
      throw new Error('Insufficient balance');
    }
  }

  /**
   * Reserve funds
   */
  async reserveFunds(client, userId, tenantId, side, quantity, price) {
    const requiredAmount = side === 'BUY' ? quantity * price : quantity;
    
    const reserveQuery = `
      UPDATE accounts 
      SET 
        balance = balance - $1,
        reserved_balance = reserved_balance + $1
      WHERE user_id = $2 AND tenant_id = $3
    `;
    
    await client.query(reserveQuery, [requiredAmount, userId, tenantId]);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(client, orderId, filledQuantity) {
    const updateQuery = `
      UPDATE orders 
      SET 
        filled_quantity = filled_quantity + $1,
        remaining_quantity = remaining_quantity - $1,
        status = CASE 
          WHEN remaining_quantity - $1 = 0 THEN 'FILLED'
          ELSE 'PARTIAL_FILLED'
        END,
        updated_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(updateQuery, [filledQuantity, orderId]);
  }

  /**
   * Transfer funds
   */
  async transferFunds(client, match) {
    // Implementation for fund transfer between accounts
    // This would involve updating both buyer and seller accounts
  }

  /**
   * Update account balances
   */
  async updateAccountBalances(client, match) {
    // Implementation for updating account balances after trade
  }

  /**
   * Fetch market data
   */
  async fetchMarketData() {
    // Implementation to fetch real-time market data
    return {
      symbol: 'BTC/USD',
      price: 50000,
      priceChange: 2.5,
      volume: 1000000,
      timestamp: new Date()
    };
  }

  /**
   * Get order book state
   */
  getOrderBookState(symbol) {
    const buyKey = `${symbol}:BUY`;
    const sellKey = `${symbol}:SELL`;
    
    return {
      symbol,
      bids: this.orderBook.get(buyKey) || [],
      asks: this.orderBook.get(sellKey) || [],
      timestamp: new Date()
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, userId, tenantId) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Check order ownership
      const orderQuery = `
        SELECT * FROM orders 
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3
      `;
      
      const orderResult = await client.query(orderQuery, [orderId, userId, tenantId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or access denied');
      }

      const order = orderResult.rows[0];
      
      if (order.status === 'FILLED') {
        throw new Error('Cannot cancel filled order');
      }

      // Cancel order
      const cancelQuery = `
        UPDATE orders 
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(cancelQuery, [orderId]);

      // Release reserved funds
      await this.releaseReservedFunds(client, userId, tenantId, order);

      // Remove from order book
      this.removeFromOrderBook(order);

      await client.query('COMMIT');

      logger.info('Order cancelled successfully', { orderId });

      return {
        orderId,
        status: 'CANCELLED',
        message: 'Order cancelled successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release reserved funds
   */
  async releaseReservedFunds(client, userId, tenantId, order) {
    const reservedAmount = order.side === 'BUY' ? 
      order.remaining_quantity * order.price : 
      order.remaining_quantity;
    
    const releaseQuery = `
      UPDATE accounts 
      SET 
        balance = balance + $1,
        reserved_balance = reserved_balance - $1
      WHERE user_id = $2 AND tenant_id = $3
    `;
    
    await client.query(releaseQuery, [reservedAmount, userId, tenantId]);
  }

  /**
   * Remove order from order book
   */
  removeFromOrderBook(order) {
    const key = `${order.symbol}:${order.side}`;
    const orders = this.orderBook.get(key) || [];
    
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
      orders.splice(index, 1);
      this.orderBook.set(key, orders);
    }
    
    this.pendingOrders.delete(order.id);
  }
}

module.exports = new TradingEngineService(); 