// backend/src/services/websocketService.js
const { Server } = require('socket.io');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
      }
    });
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join tenant room
      socket.on('join_tenant', (tenantId) => {
        socket.join(`tenant_${tenantId}`);
        console.log(`User joined tenant: ${tenantId}`);
      });

      // Join P2P chat room
      socket.on('join_p2p_chat', (chatId) => {
        socket.join(`p2p_chat_${chatId}`);
      });

      // Handle P2P messages
      socket.on('p2p_message', async (data) => {
        try {
          const message = await this.saveP2PMessage(data);
          this.io.to(`p2p_chat_${data.chatId}`).emit('new_p2p_message', message);
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle payment status updates
      socket.on('payment_update', (data) => {
        this.io.to(`tenant_${data.tenantId}`).emit('payment_status_update', data);
      });

      // Handle remittance tracking updates
      socket.on('remittance_update', (data) => {
        this.io.to(`tenant_${data.tenantId}`).emit('remittance_status_update', data);
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send notification to tenant
  sendToTenant(tenantId, event, data) {
    this.io.to(`tenant_${tenantId}`).emit(event, data);
  }

  // Broadcast to all users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  async saveP2PMessage(data) {
    const P2PChat = require('../models/p2p/P2PChat');
    
    const chat = await P2PChat.findById(data.chatId);
    if (!chat) throw new Error('Chat not found');

    const message = {
      senderId: data.senderId,
      message: data.message,
      messageType: data.messageType || 'text',
      sentAt: new Date()
    };

    chat.messages.push(message);
    await chat.save();

    return message;
  }
}

module.exports = WebSocketService;
