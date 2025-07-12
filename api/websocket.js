const http = require('http');
const socketIo = require('socket.io');

class WebSocketManager {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });
    
    this.setupConnectionHandlers();
    this.setupRealTimeUpdates();
  }

  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📡 Client connected: ${socket.id}`);
      
      // Handle user authentication
      socket.on('authenticate', (data) => {
        try {
          // Decode token (in production, use proper JWT verification)
          const payload = JSON.parse(Buffer.from(data.token, 'base64').toString());
          socket.userId = payload.userId;
          socket.userRole = payload.role;
          socket.tenant = payload.tenant;
          
          // Join tenant-specific rooms
          if (socket.tenant) {
            socket.join(`tenant-${socket.tenant}`);
          }
          socket.join(`user-${socket.userId}`);
          
          socket.emit('authenticated', { 
            success: true, 
            userId: socket.userId,
            role: socket.userRole 
          });
          
          console.log(`🔐 User ${socket.userId} authenticated`);
        } catch (error) {
          socket.emit('authentication_error', { message: 'Invalid token' });
        }
      });

      // Handle trading room subscriptions
      socket.on('subscribe_trading', (data) => {
        const { pairs } = data;
        pairs.forEach(pair => {
          socket.join(`trading-${pair}`);
        });
        socket.emit('subscribed', { pairs });
        console.log(`📈 User subscribed to trading pairs: ${pairs.join(', ')}`);
      });

      // Handle P2P room subscriptions
      socket.on('subscribe_p2p', () => {
        socket.join('p2p-orders');
        socket.emit('p2p_subscribed');
        console.log(`🤝 User subscribed to P2P updates`);
      });

      // Handle order placement
      socket.on('place_order', (orderData) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Process order (mock implementation)
        const order = {
          id: `ORD-${Date.now()}`,
          userId: socket.userId,
          ...orderData,
          status: 'placed',
          timestamp: new Date().toISOString()
        };

        // Emit to user
        socket.emit('order_placed', order);
        
        // Emit to trading room
        socket.to(`trading-${orderData.pair}`).emit('new_order', {
          pair: orderData.pair,
          type: orderData.type,
          amount: orderData.amount,
          price: orderData.price
        });

        console.log(`📋 Order placed by user ${socket.userId}: ${order.id}`);
      });

      // Handle P2P order creation
      socket.on('create_p2p_order', (orderData) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const p2pOrder = {
          id: `P2P-${Date.now()}`,
          userId: socket.userId,
          ...orderData,
          status: 'active',
          timestamp: new Date().toISOString()
        };

        socket.emit('p2p_order_created', p2pOrder);
        socket.to('p2p-orders').emit('new_p2p_order', p2pOrder);

        console.log(`🤝 P2P order created by user ${socket.userId}: ${p2pOrder.id}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📴 Client disconnected: ${socket.id}`);
      });
    });
  }

  setupRealTimeUpdates() {
    // Simulate real-time price updates
    setInterval(() => {
      const pairs = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD'];
      
      pairs.forEach(pair => {
        const basePrice = this.getBasePrice(pair);
        const change = (Math.random() - 0.5) * basePrice * 0.02; // 2% max change
        const newPrice = basePrice + change;
        const changePercentage = ((change / basePrice) * 100).toFixed(2);

        this.io.to(`trading-${pair}`).emit('price_update', {
          pair,
          price: parseFloat(newPrice.toFixed(2)),
          change: parseFloat(changePercentage),
          timestamp: new Date().toISOString()
        });
      });
    }, 5000); // Update every 5 seconds

    // Simulate order book updates
    setInterval(() => {
      const pairs = ['BTC/USD', 'ETH/USD'];
      
      pairs.forEach(pair => {
        this.io.to(`trading-${pair}`).emit('orderbook_update', {
          pair,
          bids: this.generateOrderBook('buy'),
          asks: this.generateOrderBook('sell'),
          timestamp: new Date().toISOString()
        });
      });
    }, 10000); // Update every 10 seconds

    // Simulate system notifications
    setInterval(() => {
      this.io.emit('system_notification', {
        type: 'info',
        message: 'System operating normally',
        timestamp: new Date().toISOString()
      });
    }, 60000); // Every minute
  }

  getBasePrice(pair) {
    const basePrices = {
      'BTC/USD': 43250,
      'ETH/USD': 2640,
      'EUR/USD': 1.0856,
      'GBP/USD': 1.2734
    };
    return basePrices[pair] || 1.0;
  }

  generateOrderBook(type) {
    const orders = [];
    for (let i = 0; i < 5; i++) {
      orders.push({
        price: (Math.random() * 1000 + 1000).toFixed(2),
        amount: (Math.random() * 10 + 0.1).toFixed(4),
        total: (Math.random() * 10000 + 100).toFixed(2)
      });
    }
    return orders;
  }

  // Method to send notifications to specific users
  sendToUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  // Method to send notifications to specific tenant
  sendToTenant(tenantId, event, data) {
    this.io.to(`tenant-${tenantId}`).emit(event, data);
  }

  // Method to broadcast system-wide notifications
  broadcast(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = WebSocketManager;