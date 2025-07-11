// src/services/financial/P2PService.js
const AccountingService = require('./AccountingService');
const { Transaction, AccountBalance, User } = require('../../models/postgresql');

/**
 * Peer-to-Peer Trading Service
 * Handles P2P order matching, escrow, and settlement
 */
class P2PService {
  constructor() {
    this.orderTypes = ['buy', 'sell'];
    this.orderStatus = ['active', 'matched', 'completed', 'cancelled', 'expired'];
    this.escrowTimeout = 30 * 60 * 1000; // 30 minutes escrow timeout
    this.p2pFeeRate = 0.005; // 0.5% P2P trading fee
  }
  
  /**
   * Create a P2P order
   */
  async createP2POrder(orderData) {
    const {
      tenantId,
      userId,
      type, // 'buy' or 'sell'
      baseCurrency,
      quoteCurrency,
      amount,
      price,
      minAmount = null,
      maxAmount = null,
      description = '',
      paymentMethods = [],
      autoMatch = true
    } = orderData;
    
    try {
      // Validate order
      const validation = this.validateP2POrder(orderData);
      if (!validation.isValid) {
        throw new Error(`Invalid P2P order: ${validation.errors.join(', ')}`);
      }
      
      // Calculate total value and fees
      const totalValue = parseFloat(amount) * parseFloat(price);
      const fee = totalValue * this.p2pFeeRate;
      
      // For sell orders, check if user has sufficient balance
      if (type === 'sell') {
        const userBalance = await AccountBalance.findOne({
          where: { userId, currency: baseCurrency }
        });
        
        if (!userBalance || parseFloat(userBalance.availableBalance) < parseFloat(amount)) {
          throw new Error('Insufficient balance to create sell order');
        }
        
        // Freeze the sell amount
        await userBalance.transferBalance('available', 'frozen', amount);
      }
      
      // Create P2P order transaction
      const orderTransaction = await Transaction.create({
        tenantId,
        userId,
        type: 'p2p_order',
        amount: parseFloat(amount),
        currency: baseCurrency,
        counterpartAmount: totalValue,
        counterpartCurrency: quoteCurrency,
        exchangeRate: parseFloat(price),
        status: 'pending',
        description: `P2P ${type} order: ${amount} ${baseCurrency} at ${price} ${quoteCurrency}`,
        fee: fee,
        metadata: {
          orderType: type,
          baseCurrency,
          quoteCurrency,
          price: parseFloat(price),
          minAmount: minAmount ? parseFloat(minAmount) : null,
          maxAmount: maxAmount ? parseFloat(maxAmount) : null,
          paymentMethods,
          autoMatch,
          orderDescription: description,
          createdAt: new Date().toISOString()
        }
      });
      
      // If auto-match is enabled, try to find matching orders
      let matchedOrder = null;
      if (autoMatch) {
        matchedOrder = await this.findMatchingOrder(orderTransaction);
        if (matchedOrder) {
          await this.executeP2PMatch(orderTransaction, matchedOrder);
        }
      }
      
      return {
        success: true,
        orderId: orderTransaction.id,
        orderReference: orderTransaction.referenceNumber,
        status: matchedOrder ? 'matched' : 'active',
        matchedOrderId: matchedOrder?.id,
        fee,
        frozenAmount: type === 'sell' ? amount : 0
      };
      
    } catch (error) {
      throw new Error(`P2P order creation failed: ${error.message}`);
    }
  }
  
  /**
   * Find matching P2P order
   */
  async findMatchingOrder(order) {
    const orderType = order.metadata.orderType;
    const baseCurrency = order.metadata.baseCurrency;
    const quoteCurrency = order.metadata.quoteCurrency;
    const price = order.metadata.price;
    const amount = parseFloat(order.amount);
    
    // Find opposite type orders
    const oppositeType = orderType === 'buy' ? 'sell' : 'buy';
    
    const matchingOrders = await Transaction.findAll({
      where: {
        tenantId: order.tenantId,
        type: 'p2p_order',
        status: 'pending',
        userId: {
          [require('sequelize').Op.ne]: order.userId // Not same user
        }
      },
      order: [
        // For buy orders, prioritize lowest prices
        // For sell orders, prioritize highest prices
        orderType === 'buy' ? ['exchangeRate', 'ASC'] : ['exchangeRate', 'DESC'],
        ['createdAt', 'ASC'] // Then by time priority
      ]
    });
    
    for (const matchingOrder of matchingOrders) {
      const matchMetadata = matchingOrder.metadata;
      
      // Check if currencies match
      if (matchMetadata.baseCurrency !== baseCurrency || 
          matchMetadata.quoteCurrency !== quoteCurrency) {
        continue;
      }
      
      // Check if order types are opposite
      if (matchMetadata.orderType !== oppositeType) {
        continue;
      }
      
      // Check price compatibility
      const matchPrice = matchMetadata.price;
      const isPriceMatch = orderType === 'buy' ? 
        price >= matchPrice : // Buy order accepts sell price <= buy price
        price <= matchPrice;   // Sell order accepts buy price >= sell price
      
      if (!isPriceMatch) {
        continue;
      }
      
      // Check amount compatibility
      const matchAmount = parseFloat(matchingOrder.amount);
      const isAmountMatch = this.checkAmountCompatibility(
        amount, matchAmount,
        order.metadata.minAmount, order.metadata.maxAmount,
        matchMetadata.minAmount, matchMetadata.maxAmount
      );
      
      if (!isAmountMatch) {
        continue;
      }
      
      return matchingOrder;
    }
    
    return null;
  }
  
  /**
   * Execute P2P order match
   */
  async executeP2PMatch(order1, order2) {
    try {
      // Determine final execution price and amount
      const executionPrice = Math.min(order1.metadata.price, order2.metadata.price);
      const executionAmount = Math.min(parseFloat(order1.amount), parseFloat(order2.amount));
      const executionValue = executionAmount * executionPrice;
      
      // Create escrow transaction
      const escrowResult = await this.createEscrowTransaction({
        tenantId: order1.tenantId,
        buyOrder: order1.metadata.orderType === 'buy' ? order1 : order2,
        sellOrder: order1.metadata.orderType === 'sell' ? order1 : order2,
        executionAmount,
        executionPrice,
        executionValue
      });
      
      // Update order statuses
      await order1.update({ 
        status: 'matched',
        metadata: {
          ...order1.metadata,
          matchedOrderId: order2.id,
          escrowId: escrowResult.escrowId,
          executionAmount,
          executionPrice,
          executionValue,
          matchedAt: new Date().toISOString()
        }
      });
      
      await order2.update({ 
        status: 'matched',
        metadata: {
          ...order2.metadata,
          matchedOrderId: order1.id,
          escrowId: escrowResult.escrowId,
          executionAmount,
          executionPrice,
          executionValue,
          matchedAt: new Date().toISOString()
        }
      });
      
      return {
        success: true,
        matchId: escrowResult.escrowId,
        executionAmount,
        executionPrice,
        executionValue
      };
      
    } catch (error) {
      throw new Error(`P2P match execution failed: ${error.message}`);
    }
  }
  
  /**
   * Create escrow transaction for P2P trade
   */
  async createEscrowTransaction(escrowData) {
    const {
      tenantId,
      buyOrder,
      sellOrder,
      executionAmount,
      executionPrice,
      executionValue
    } = escrowData;
    
    // Create escrow transaction using double-entry accounting
    const escrowResult = await AccountingService.createDoubleEntryTransaction({
      tenantId,
      fromUserId: sellOrder.userId, // Seller provides the asset
      toUserId: null, // Escrow account (system)
      amount: executionAmount,
      currency: buyOrder.metadata.baseCurrency,
      type: 'p2p_escrow',
      description: `P2P Escrow: ${executionAmount} ${buyOrder.metadata.baseCurrency}`,
      metadata: {
        escrowType: 'p2p_trade',
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerId: buyOrder.userId,
        sellerId: sellOrder.userId,
        executionAmount,
        executionPrice,
        executionValue,
        expiresAt: new Date(Date.now() + this.escrowTimeout).toISOString()
      }
    });
    
    return {
      escrowId: escrowResult.referenceNumber,
      transactions: escrowResult.transactions
    };
  }
  
  /**
   * Confirm P2P trade completion
   */
  async confirmP2PTrade(tradeData) {
    const {
      escrowId,
      userId,
      tenantId,
      confirmationType = 'buyer' // 'buyer' or 'seller'
    } = tradeData;
    
    try {
      // Find escrow transaction
      const escrowTransaction = await Transaction.findOne({
        where: {
          tenantId,
          referenceNumber: escrowId,
          type: 'p2p_escrow'
        }
      });
      
      if (!escrowTransaction) {
        throw new Error('Escrow transaction not found');
      }
      
      const metadata = escrowTransaction.metadata;
      
      // Verify user is part of this trade
      if (userId !== metadata.buyerId && userId !== metadata.sellerId) {
        throw new Error('User not authorized for this trade');
      }
      
      // Check if already confirmed
      const confirmationKey = `${confirmationType}Confirmed`;
      if (metadata[confirmationKey]) {
        throw new Error(`Trade already confirmed by ${confirmationType}`);
      }
      
      // Update confirmation
      metadata[confirmationKey] = true;
      metadata[`${confirmationType}ConfirmedAt`] = new Date().toISOString();
      
      await escrowTransaction.update({ metadata });
      
      // If both parties confirmed, complete the trade
      if (metadata.buyerConfirmed && metadata.sellerConfirmed) {
        await this.completeP2PTrade(escrowTransaction);
      }
      
      return {
        success: true,
        escrowId,
        confirmation: confirmationType,
        isCompleted: metadata.buyerConfirmed && metadata.sellerConfirmed
      };
      
    } catch (error) {
      throw new Error(`P2P trade confirmation failed: ${error.message}`);
    }
  }
  
  /**
   * Complete P2P trade and release escrow
   */
  async completeP2PTrade(escrowTransaction) {
    const metadata = escrowTransaction.metadata;
    
    // Release escrow to buyer
    const releaseResult = await AccountingService.createDoubleEntryTransaction({
      tenantId: escrowTransaction.tenantId,
      fromUserId: null, // From escrow (system)
      toUserId: metadata.buyerId,
      amount: metadata.executionAmount,
      currency: escrowTransaction.currency,
      type: 'p2p_settlement',
      description: `P2P Settlement: Release ${metadata.executionAmount} to buyer`,
      metadata: {
        originalEscrowId: escrowTransaction.referenceNumber,
        tradeType: 'p2p_completion',
        completedAt: new Date().toISOString()
      }
    });
    
    // Transfer payment from buyer to seller
    const paymentResult = await AccountingService.createDoubleEntryTransaction({
      tenantId: escrowTransaction.tenantId,
      fromUserId: metadata.buyerId,
      toUserId: metadata.sellerId,
      amount: metadata.executionValue,
      currency: metadata.quoteCurrency,
      type: 'p2p_payment',
      description: `P2P Payment: ${metadata.executionValue} ${metadata.quoteCurrency}`,
      fee: metadata.executionValue * this.p2pFeeRate,
      metadata: {
        originalEscrowId: escrowTransaction.referenceNumber,
        tradeType: 'p2p_payment',
        completedAt: new Date().toISOString()
      }
    });
    
    // Update escrow transaction status
    await escrowTransaction.update({
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        ...metadata,
        completedAt: new Date().toISOString(),
        releaseTransactionId: releaseResult.referenceNumber,
        paymentTransactionId: paymentResult.referenceNumber
      }
    });
    
    return {
      success: true,
      escrowId: escrowTransaction.referenceNumber,
      releaseTransaction: releaseResult.referenceNumber,
      paymentTransaction: paymentResult.referenceNumber
    };
  }
  
  /**
   * Cancel P2P order
   */
  async cancelP2POrder(orderId, userId, tenantId, reason = 'User cancellation') {
    try {
      const order = await Transaction.findOne({
        where: {
          id: orderId,
          tenantId,
          userId,
          type: 'p2p_order'
        }
      });
      
      if (!order) {
        throw new Error('P2P order not found');
      }
      
      if (order.status === 'completed') {
        throw new Error('Cannot cancel completed order');
      }
      
      if (order.status === 'matched') {
        throw new Error('Cannot cancel matched order. Please complete or dispute the trade.');
      }
      
      // Release frozen funds for sell orders
      if (order.metadata.orderType === 'sell') {
        const userBalance = await AccountBalance.findOne({
          where: { userId, currency: order.currency }
        });
        
        if (userBalance) {
          await userBalance.transferBalance('frozen', 'available', order.amount);
        }
      }
      
      // Update order status
      await order.update({
        status: 'cancelled',
        metadata: {
          ...order.metadata,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason
        }
      });
      
      return {
        success: true,
        orderId,
        status: 'cancelled',
        releasedAmount: order.metadata.orderType === 'sell' ? order.amount : 0
      };
      
    } catch (error) {
      throw new Error(`P2P order cancellation failed: ${error.message}`);
    }
  }
  
  /**
   * Get P2P order book
   */
  async getP2POrderBook(tenantId, baseCurrency, quoteCurrency, limit = 50) {
    const orders = await Transaction.findAll({
      where: {
        tenantId,
        type: 'p2p_order',
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['exchangeRate', 'ASC'], ['createdAt', 'ASC']],
      limit
    });
    
    const buyOrders = [];
    const sellOrders = [];
    
    orders.forEach(order => {
      const metadata = order.metadata;
      
      if (metadata.baseCurrency === baseCurrency && 
          metadata.quoteCurrency === quoteCurrency) {
        
        const orderInfo = {
          id: order.id,
          type: metadata.orderType,
          amount: parseFloat(order.amount),
          price: metadata.price,
          total: parseFloat(order.amount) * metadata.price,
          minAmount: metadata.minAmount,
          maxAmount: metadata.maxAmount,
          user: {
            id: order.user.id,
            name: `${order.user.firstName} ${order.user.lastName}`
          },
          paymentMethods: metadata.paymentMethods,
          description: metadata.orderDescription,
          createdAt: order.createdAt
        };
        
        if (metadata.orderType === 'buy') {
          buyOrders.push(orderInfo);
        } else {
          sellOrders.push(orderInfo);
        }
      }
    });
    
    return {
      baseCurrency,
      quoteCurrency,
      buyOrders: buyOrders.sort((a, b) => b.price - a.price), // Highest price first
      sellOrders: sellOrders.sort((a, b) => a.price - b.price) // Lowest price first
    };
  }
  
  /**
   * Validate P2P order
   */
  validateP2POrder(orderData) {
    const {
      type, baseCurrency, quoteCurrency, amount, price,
      minAmount, maxAmount
    } = orderData;
    
    const errors = [];
    
    if (!this.orderTypes.includes(type)) {
      errors.push('Invalid order type');
    }
    
    if (!baseCurrency || !quoteCurrency) {
      errors.push('Base and quote currencies are required');
    }
    
    if (baseCurrency === quoteCurrency) {
      errors.push('Base and quote currencies must be different');
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!price || parseFloat(price) <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (minAmount && parseFloat(minAmount) > parseFloat(amount)) {
      errors.push('Minimum amount cannot be greater than order amount');
    }
    
    if (maxAmount && parseFloat(maxAmount) < parseFloat(amount)) {
      errors.push('Maximum amount cannot be less than order amount');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check amount compatibility for order matching
   */
  checkAmountCompatibility(amount1, amount2, min1, max1, min2, max2) {
    const minExecutable = Math.max(
      min1 || 0,
      min2 || 0
    );
    
    const maxExecutable = Math.min(
      max1 || amount1,
      max2 || amount2,
      amount1,
      amount2
    );
    
    return maxExecutable >= minExecutable;
  }
}

module.exports = new P2PService();