const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('redis');

class WebSocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    this.connectedUsers = new Map();
    this.setupSocketAuthentication();
    this.setupEventHandlers();
  }

  setupSocketAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).populate('tenantId');

        if (!user || !user.isActive) {
          return next(new Error('Authentication error'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.email} connected`);
      
      // Store user connection
      this.connectedUsers.set(socket.user.id.toString(), {
        socketId: socket.id,
        user: socket.user
      });

      // Join tenant room
      if (socket.user.tenantId) {
        socket.join(`tenant_${socket.user.tenantId._id}`);
      }

      // Join user-specific room
      socket.join(`user_${socket.user.id}`);

      // Handle trading events
      socket.on('join_trading_room', (data) => {
        socket.join(`trading_${data.pair}`);
        socket.emit('joined_trading_room', { pair: data.pair });
      });

      socket.on('leave_trading_room', (data) => {
        socket.leave(`trading_${data.pair}`);
        socket.emit('left_trading_room', { pair: data.pair });
      });

      // Handle P2P events
      socket.on('join_p2p_room', () => {
        socket.join('p2p_marketplace');
        socket.emit('joined_p2p_room');
      });

      // Handle notifications
      socket.on('mark_notification_read', (notificationId) => {
        // Mark notification as read in database
        this.markNotificationAsRead(socket.user.id, notificationId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.email} disconnected`);
        this.connectedUsers.delete(socket.user.id.toString());
      });
    });
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    const userConnection = this.connectedUsers.get(userId.toString());
    if (userConnection) {
      this.io.to(`user_${userId}`).emit('notification', notification);
    }
  }

  // Send notification to all users in tenant
  sendNotificationToTenant(tenantId, notification) {
    this.io.to(`tenant_${tenantId}`).emit('tenant_notification', notification);
  }

  // Send trading update
  sendTradingUpdate(pair, update) {
    this.io.to(`trading_${pair}`).emit('trading_update', update);
  }

  // Send P2P update
  sendP2PUpdate(update) {
    this.io.to('p2p_marketplace').emit('p2p_update', update);
  }

  async markNotificationAsRead(userId, notificationId) {
    // Implementation to mark notification as read
    // This would update the notification in your database
  }
}

module.exports = WebSocketService;
