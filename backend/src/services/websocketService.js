// backend/src/services/websocketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const P2PChat = require('../models/p2p/P2PChat');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map(); // userId -> socketId
    this.setupEventHandlers();
    
    // Make io globally available
    global.io = this.io;
  }

  setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).populate('tenantId');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.email} (${socket.id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.user.id, socket.id);
      
      // Join user's personal room
      socket.join(`user_${socket.user.id}`);
      
      // Join tenant room
      if (socket.user.tenantId) {
        socket.join(`tenant_${socket.user.tenantId._id}`);
      }

      // Update user online status
      this.updateUserOnlineStatus(socket.user.id, true);

      // P2P Chat Events
      this.setupP2PChatEvents(socket);
      
      // P2P Marketplace Events
      this.setupP2PMarketplaceEvents(socket);
      
      // General Events
      this.setupGeneralEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.email} (${socket.id})`);
        this.connectedUsers.delete(socket.user.id);
        this.updateUserOnlineStatus(socket.user.id, false);
      });
    });
  }

  setupP2PChatEvents(socket) {
    // Join P2P chat room
    socket.on('join_p2p_chat', async (chatId) => {
      try {
        const chat = await P2PChat.findById(chatId);
        if (!chat) return;

        // Check if user is participant
        const isParticipant = chat.participants.some(
          p => p.userId.toString() === socket.user.id
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }

        socket.join(`p2p_chat_${chatId}`);
        console.log(`User ${socket.user.email} joined P2P chat ${chatId}`);

        // Update participant online status
        await this.updateChatParticipantStatus(chatId, socket.user.id, true);

        // Notify other participants
        socket.to(`p2p_chat_${chatId}`).emit('user_joined_chat', {
          userId: socket.user.id,
          userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        });

      } catch (error) {
        socket.emit('error', { message: 'Error joining chat' });
      }
    });

    // Leave P2P chat room
    socket.on('leave_p2p_chat', async (chatId) => {
      socket.leave(`p2p_chat_${chatId}`);
      await this.updateChatParticipantStatus(chatId, socket.user.id, false);
      
      socket.to(`p2p_chat_${chatId}`).emit('user_left_chat', {
        userId: socket.user.id
      });
    });

    // Handle real-time messages
    socket.on('p2p_message', async (data) => {
      try {
        const { chatId, message, messageType = 'text', replyTo } = data;
        
        const chat = await P2PChat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check participant access
        const isParticipant = chat.participants.some(
          p => p.userId.toString() === socket.user.id
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message object
        const newMessage = {
          messageId: chat.generateMessageId(),
          senderId: socket.user.id,
          message: message || '',
          messageType,
          sentAt: new Date()
        };

        if (replyTo) {
          const originalMessage = chat.messages.find(m => m.messageId === replyTo);
          if (originalMessage) {
            newMessage.replyTo = {
              messageId: replyTo,
              preview: originalMessage.message.substring(0, 100)
            };
          }
        }

        // Save message to database
        chat.messages.push(newMessage);
        await chat.save();

        // Broadcast to chat room
        this.io.to(`p2p_chat_${chatId}`).emit('new_message', {
          chatId,
          message: newMessage,
          sender: {
            id: socket.user.id,
            name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
            avatar: socket.user.profile.avatar
          }
        });

        // Send push notification to offline users
        await this.sendNotificationToOfflineUsers(chatId, socket.user.id, message);

      } catch (error) {
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing events
    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(`p2p_chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: socket.user.id,
        userName: socket.user.profile.firstName
      });
    });

    socket.on('stop_typing', (data) => {
      const { chatId } = data;
      socket.to(`p2p_chat_${chatId}`).emit('user_stopped_typing', {
        chatId,
        userId: socket.user.id
      });
    });

    // Handle message reactions
    socket.on('react_to_message', async (data) => {
      try {
        const { chatId, messageId, emoji } = data;
        
        const chat = await P2PChat.findById(chatId);
        if (!chat) return;

        const message = chat.messages.find(m => m.messageId === messageId);
        if (!message) return;

        // Toggle reaction
        const existingReaction = message.reactions.find(
          r => r.userId.toString() === socket.user.id && r.emoji === emoji
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === socket.user.id && r.emoji === emoji)
          );
        } else {
          // Add reaction
          message.reactions.push({
            userId: socket.user.id,
            emoji,
            reactedAt: new Date()
          });
        }

        await chat.save();

        // Broadcast reaction update
        this.io.to(`p2p_chat_${chatId}`).emit('message_reaction_update', {
          chatId,
          messageId,
          reactions: message.reactions
        });

      } catch (error) {
        socket.emit('error', { message: 'Error updating reaction' });
      }
    });
  }

  setupP2PMarketplaceEvents(socket) {
    // Join marketplace room
    socket.on('join_marketplace', () => {
      socket.join('p2p_marketplace');
      console.log(`User ${socket.user.email} joined P2P marketplace`);
    });

    // Handle new announcement creation
    socket.on('new_announcement', (data) => {
      // Broadcast new announcement to marketplace
      socket.to('p2p_marketplace').emit('announcement_created', {
        announcement: data,
        creator: {
          id: socket.user.id,
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        }
      });
    });

    // Handle announcement updates
    socket.on('announcement_updated', (data) => {
      socket.to('p2p_marketplace').emit('announcement_updated', data);
    });

    // Handle interest notifications
    socket.on('show_interest', (data) => {
      const { announcementId, sellerId } = data;
      
      // Notify seller
      this.sendToUser(sellerId, 'new_p2p_interest', {
        announcementId,
        interestedUser: {
          id: socket.user.id,
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        }
      });
    });
  }

  setupGeneralEvents(socket) {
    // Handle payment notifications
    socket.on('payment_update', (data) => {
      const { tenantId, paymentId, status } = data;
      
      // Broadcast to tenant
      this.sendToTenant(tenantId, 'payment_status_update', {
        paymentId,
        status,
        updatedBy: socket.user.id
      });
    });

    // Handle transaction status updates
    socket.on('transaction_update', (data) => {
      const { transactionId, status, participants } = data;
      
      // Notify all participants
      participants.forEach(participantId => {
        if (participantId !== socket.user.id) {
          this.sendToUser(participantId, 'transaction_status_update', {
            transactionId,
            status,
            updatedBy: socket.user.id
          });
        }
      });
    });

    // Handle general notifications
    socket.on('send_notification', (data) => {
      const { targetUserId, type, title, message, data: notificationData } = data;
      
      this.sendToUser(targetUserId, 'notification', {
        type,
        title,
        message,
        data: notificationData,
        from: socket.user.id,
        timestamp: new Date()
      });
    });

    // Handle user status updates
    socket.on('update_status', (status) => {
      socket.user.status = status;
      
      // Broadcast status to user's contacts/chats
      this.broadcastUserStatus(socket.user.id, status);
    });
  }

  // Utility methods
  async updateUserOnlineStatus(userId, isOnline) {
    try {async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: new Date()
      });

      // Update status in all user's active chats
      const chats = await P2PChat.find({
        'participants.userId': userId,
        status: 'active'
      });

      for (const chat of chats) {
        const participant = chat.participants.find(p => p.userId.toString() === userId);
        if (participant) {
          participant.isOnline = isOnline;
          participant.lastSeen = new Date();
          await chat.save();

          // Notify other participants
          this.io.to(`p2p_chat_${chat._id}`).emit('participant_status_update', {
            userId,
            isOnline,
            lastSeen: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async updateChatParticipantStatus(chatId, userId, isOnline) {
    try {
      const chat = await P2PChat.findById(chatId);
      if (!chat) return;

      const participant = chat.participants.find(p => p.userId.toString() === userId);
      if (participant) {
        participant.isOnline = isOnline;
        participant.lastSeen = new Date();
        await chat.save();
      }
    } catch (error) {
      console.error('Error updating chat participant status:', error);
    }
  }

  async sendNotificationToOfflineUsers(chatId, senderId, message) {
    try {
      const chat = await P2PChat.findById(chatId).populate('participants.userId');
      if (!chat) return;

      const offlineParticipants = chat.participants.filter(p => 
        p.userId._id.toString() !== senderId && !p.isOnline
      );

      for (const participant of offlineParticipants) {
        // Send push notification or email
        const NotificationService = require('./notificationService');
        await NotificationService.sendMultiChannelNotification(
          participant.userId._id,
          {
            type: 'p2p_message',
            title: 'پیام جدید P2P',
            message: message.substring(0, 100),
            channels: ['push', 'inApp'],
            data: {
              chatId,
              senderId,
              actionUrl: `/p2p/chat/${chatId}`
            }
          }
        );
      }
    } catch (error) {
      console.error('Error sending offline notifications:', error);
    }
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // Send notification to all users in a tenant
  sendToTenant(tenantId, event, data) {
    this.io.to(`tenant_${tenantId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Broadcast user status to relevant chats
  async broadcastUserStatus(userId, status) {
    try {
      const chats = await P2PChat.find({
        'participants.userId': userId,
        status: 'active'
      });

      for (const chat of chats) {
        this.io.to(`p2p_chat_${chat._id}`).emit('user_status_update', {
          userId,
          status,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  // Get online users for a tenant
  getOnlineUsersForTenant(tenantId) {
    const room = this.io.sockets.adapter.rooms.get(`tenant_${tenantId}`);
    return room ? room.size : 0;
  }

  // Send real-time P2P marketplace updates
  async broadcastMarketplaceUpdate(type, data) {
    this.io.to('p2p_marketplace').emit('marketplace_update', {
      type,
      data,
      timestamp: new Date()
    });
  }

  // Handle emergency shutdown
  shutdown() {
    console.log('Shutting down WebSocket service...');
    
    // Notify all connected users
    this.io.emit('server_shutdown', {
      message: 'سرور در حال بازراه‌اندازی است. لطفاً چند دقیقه صبر کنید.',
      timestamp: new Date()
    });

    // Close all connections
    this.io.close();
  }
}

module.exports = WebSocketService;

// backend/src/app.js (Updated to include WebSocket)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const path = require('path');

// Import services
const WebSocketService = require('./services/websocketService');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const accountingRoutes = require('./routes/accounting');
const paymentRoutes = require('./routes/payments');
const p2pRoutes = require('./routes/p2p');

// Import middleware
const { rateLimiters, securityHeaders } = require('./middleware/securityMiddleware');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = createServer(app);

// Initialize WebSocket service
const websocketService = new WebSocketService(server);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use('/api/', rateLimiters.api);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: websocketService.getOnlineUsersCount(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', rateLimiters.login, authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/payments', rateLimiters.payment, paymentRoutes);
app.use('/api/p2p', p2pRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'مسیر درخواستی یافت نشد'
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB successfully');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close WebSocket connections
  websocketService.shutdown();
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connection
  await mongoose.connection.close();
  logger.info('Database connection closed');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`WebSocket service initialized`);
});

module.exports = app;

// backend/src/controllers/p2p/P2PController.js (Additional methods)

// ... (previous P2PController code) ...

class P2PController {
  // ... (previous methods) ...

  // Get announcement details
  static async getAnnouncementDetails(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await P2PAnnouncement.findById(announcementId)
        .populate('userId', 'profile email rating')
        .populate('tenantId', 'name');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'آگهی یافت نشد'
        });
      }

      // Increment view count (but not for owner)
      if (announcement.userId._id.toString() !== req.user.id) {
        await P2PAnnouncement.findByIdAndUpdate(announcementId, {
          $inc: { views: 1 }
        });
      }

      // Check if current user has already shown interest
      const existingInterest = await P2PTransaction.findOne({
        announcementId,
        'buyer.userId': req.user.id,
        status: { $in: ['pending', 'accepted', 'negotiating', 'agreed'] }
      });

      res.json({
        success: true,
        data: {
          announcement,
          hasShownInterest: !!existingInterest,
          interestTransactionId: existingInterest?._id
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت جزئیات آگهی',
        error: error.message
      });
    }
  }

  // Update announcement
  static async updateAnnouncement(req, res) {
    try {
      const { announcementId } = req.params;
      const updateData = req.body;

      const announcement = await P2PAnnouncement.findById(announcementId);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'آگهی یافت نشد'
        });
      }

      // Check ownership
      if (announcement.userId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'فقط صاحب آگهی می‌تواند آن را ویرایش کند'
        });
      }

      // Don't allow editing if there are active transactions
      const activeTransactions = await P2PTransaction.countDocuments({
        announcementId,
        status: { $in: ['pending', 'accepted', 'negotiating', 'agreed', 'in_progress'] }
      });

      if (activeTransactions > 0) {
        return res.status(400).json({
          success: false,
          message: 'نمی‌توان آگهی با تراکنش‌های فعال را ویرایش کرد'
        });
      }

      // Update announcement
      Object.assign(announcement, updateData);
      announcement.totalValue = announcement.amount * announcement.rate;
      
      await announcement.save();

      // Broadcast update to marketplace
      if (global.io) {
        global.io.to('p2p_marketplace').emit('announcement_updated', {
          announcementId,
          updatedData: updateData,
          updatedBy: req.user.id
        });
      }

      res.json({
        success: true,
        data: announcement,
        message: 'آگهی بروزرسانی شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در بروزرسانی آگهی',
        error: error.message
      });
    }
  }

  // Delete announcement
  static async deleteAnnouncement(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await P2PAnnouncement.findById(announcementId);
      
      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'آگهی یافت نشد'
        });
      }

      // Check ownership
      if (announcement.userId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'فقط صاحب آگهی می‌تواند آن را حذف کند'
        });
      }

      // Check for active transactions
      const activeTransactions = await P2PTransaction.countDocuments({
        announcementId,
        status: { $in: ['pending', 'accepted', 'negotiating', 'agreed', 'in_progress'] }
      });

      if (activeTransactions > 0) {
        return res.status(400).json({
          success: false,
          message: 'نمی‌توان آگهی با تراکنش‌های فعال را حذف کرد'
        });
      }

      await P2PAnnouncement.findByIdAndDelete(announcementId);

      res.json({
        success: true,
        message: 'آگهی حذف شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در حذف آگهی',
        error: error.message
      });
    }
  }

  // Get my P2P statistics
  static async getMyP2PStats// backend/src/services/websocketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const P2PChat = require('../models/p2p/P2PChat');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map(); // userId -> socketId
    this.setupEventHandlers();
    
    // Make io globally available
    global.io = this.io;
  }

  setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).populate('tenantId');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.user.email} (${socket.id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.user.id, socket.id);
      
      // Join user's personal room
      socket.join(`user_${socket.user.id}`);
      
      // Join tenant room
      if (socket.user.tenantId) {
        socket.join(`tenant_${socket.user.tenantId._id}`);
      }

      // Update user online status
      this.updateUserOnlineStatus(socket.user.id, true);

      // P2P Chat Events
      this.setupP2PChatEvents(socket);
      
      // P2P Marketplace Events
      this.setupP2PMarketplaceEvents(socket);
      
      // General Events
      this.setupGeneralEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.email} (${socket.id})`);
        this.connectedUsers.delete(socket.user.id);
        this.updateUserOnlineStatus(socket.user.id, false);
      });
    });
  }

  setupP2PChatEvents(socket) {
    // Join P2P chat room
    socket.on('join_p2p_chat', async (chatId) => {
      try {
        const chat = await P2PChat.findById(chatId);
        if (!chat) return;

        // Check if user is participant
        const isParticipant = chat.participants.some(
          p => p.userId.toString() === socket.user.id
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Access denied to chat' });
          return;
        }

        socket.join(`p2p_chat_${chatId}`);
        console.log(`User ${socket.user.email} joined P2P chat ${chatId}`);

        // Update participant online status
        await this.updateChatParticipantStatus(chatId, socket.user.id, true);

        // Notify other participants
        socket.to(`p2p_chat_${chatId}`).emit('user_joined_chat', {
          userId: socket.user.id,
          userName: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        });

      } catch (error) {
        socket.emit('error', { message: 'Error joining chat' });
      }
    });

    // Leave P2P chat room
    socket.on('leave_p2p_chat', async (chatId) => {
      socket.leave(`p2p_chat_${chatId}`);
      await this.updateChatParticipantStatus(chatId, socket.user.id, false);
      
      socket.to(`p2p_chat_${chatId}`).emit('user_left_chat', {
        userId: socket.user.id
      });
    });

    // Handle real-time messages
    socket.on('p2p_message', async (data) => {
      try {
        const { chatId, message, messageType = 'text', replyTo } = data;
        
        const chat = await P2PChat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check participant access
        const isParticipant = chat.participants.some(
          p => p.userId.toString() === socket.user.id
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message object
        const newMessage = {
          messageId: chat.generateMessageId(),
          senderId: socket.user.id,
          message: message || '',
          messageType,
          sentAt: new Date()
        };

        if (replyTo) {
          const originalMessage = chat.messages.find(m => m.messageId === replyTo);
          if (originalMessage) {
            newMessage.replyTo = {
              messageId: replyTo,
              preview: originalMessage.message.substring(0, 100)
            };
          }
        }

        // Save message to database
        chat.messages.push(newMessage);
        await chat.save();

        // Broadcast to chat room
        this.io.to(`p2p_chat_${chatId}`).emit('new_message', {
          chatId,
          message: newMessage,
          sender: {
            id: socket.user.id,
            name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`,
            avatar: socket.user.profile.avatar
          }
        });

        // Send push notification to offline users
        await this.sendNotificationToOfflineUsers(chatId, socket.user.id, message);

      } catch (error) {
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing events
    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(`p2p_chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: socket.user.id,
        userName: socket.user.profile.firstName
      });
    });

    socket.on('stop_typing', (data) => {
      const { chatId } = data;
      socket.to(`p2p_chat_${chatId}`).emit('user_stopped_typing', {
        chatId,
        userId: socket.user.id
      });
    });

    // Handle message reactions
    socket.on('react_to_message', async (data) => {
      try {
        const { chatId, messageId, emoji } = data;
        
        const chat = await P2PChat.findById(chatId);
        if (!chat) return;

        const message = chat.messages.find(m => m.messageId === messageId);
        if (!message) return;

        // Toggle reaction
        const existingReaction = message.reactions.find(
          r => r.userId.toString() === socket.user.id && r.emoji === emoji
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === socket.user.id && r.emoji === emoji)
          );
        } else {
          // Add reaction
          message.reactions.push({
            userId: socket.user.id,
            emoji,
            reactedAt: new Date()
          });
        }

        await chat.save();

        // Broadcast reaction update
        this.io.to(`p2p_chat_${chatId}`).emit('message_reaction_update', {
          chatId,
          messageId,
          reactions: message.reactions
        });

      } catch (error) {
        socket.emit('error', { message: 'Error updating reaction' });
      }
    });
  }

  setupP2PMarketplaceEvents(socket) {
    // Join marketplace room
    socket.on('join_marketplace', () => {
      socket.join('p2p_marketplace');
      console.log(`User ${socket.user.email} joined P2P marketplace`);
    });

    // Handle new announcement creation
    socket.on('new_announcement', (data) => {
      // Broadcast new announcement to marketplace
      socket.to('p2p_marketplace').emit('announcement_created', {
        announcement: data,
        creator: {
          id: socket.user.id,
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        }
      });
    });

    // Handle announcement updates
    socket.on('announcement_updated', (data) => {
      socket.to('p2p_marketplace').emit('announcement_updated', data);
    });

    // Handle interest notifications
    socket.on('show_interest', (data) => {
      const { announcementId, sellerId } = data;
      
      // Notify seller
      this.sendToUser(sellerId, 'new_p2p_interest', {
        announcementId,
        interestedUser: {
          id: socket.user.id,
          name: `${socket.user.profile.firstName} ${socket.user.profile.lastName}`
        }
      });
    });
  }

  setupGeneralEvents(socket) {
    // Handle payment notifications
    socket.on('payment_update', (data) => {
      const { tenantId, paymentId, status } = data;
      
      // Broadcast to tenant
      this.sendToTenant(tenantId, 'payment_status_update', {
        paymentId,
        status,
        updatedBy: socket.user.id
      });
    });

    // Handle transaction status updates
    socket.on('transaction_update', (data) => {
      const { transactionId, status, participants } = data;
      
      // Notify all participants
      participants.forEach(participantId => {
        if (participantId !== socket.user.id) {
          this.sendToUser(participantId, 'transaction_status_update', {
            transactionId,
            status,
            updatedBy: socket.user.id
          });
        }
      });
    });

    // Handle general notifications
    socket.on('send_notification', (data) => {
      const { targetUserId, type, title, message, data: notificationData } = data;
      
      this.sendToUser(targetUserId, 'notification', {
        type,
        title,
        message,
        data: notificationData,
        from: socket.user.id,
        timestamp: new Date()
      });
    });

    // Handle user status updates
    socket.on('update_status', (status) => {
      socket.user.status = status;
      
      // Broadcast status to user's contacts/chats
      this.broadcastUserStatus(socket.user.id, status);
    });
  }

  // Utility methods
  async updateUserOnlineStatus(userId, isOnline) {
    try {
