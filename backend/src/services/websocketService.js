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
    try {
