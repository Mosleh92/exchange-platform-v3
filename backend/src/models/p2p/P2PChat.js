// backend/src/models/p2p/P2PChat.js
const mongoose = require('mongoose');

const p2pChatSchema = new mongoose.Schema({
  announcementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2PAnnouncement',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    attachments: [{
      filename: String,
      originalName: String,
      url: String,
      size: Number
    }],
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'reported'],
    default: 'active'
  },
  dealStatus: {
    type: String,
    enum: ['negotiating', 'agreed', 'payment_pending', 'completed', 'cancelled', 'disputed'],
    default: 'negotiating'
  },
  agreedTerms: {
    amount: Number,
    rate: Number,
    totalValue: Number,
    meetingLocation: String,
    paymentMethod: String,
    agreedAt: Date,
    agreedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      agreedAt: Date
    }]
  }
}, {
  timestamps: true
});

p2pChatSchema.index({ announcementId: 1 });
p2pChatSchema.index({ 'participants.userId': 1 });
p2pChatSchema.index({ status: 1 });

module.exports = mongoose.model('P2PChat', p2pChatSchema);
