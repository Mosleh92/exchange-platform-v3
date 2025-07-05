const mongoose = require('mongoose');

const p2pChatSchema = new mongoose.Schema({
  // شناسه یکتا چت
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  
  // سفارش مربوطه
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2POrder',
    required: true
  },
  
  // شرکت‌کنندگان
  participants: [{
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
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
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  
  // پیام‌ها
  messages: [{
    sender: {
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'offer', 'counter_offer', 'accept', 'reject'],
      default: 'text'
    },
    attachments: [{
      fileName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String
    }],
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // پیشنهادات معامله
  offers: [{
    offerId: {
      type: String,
      required: true
    },
    from: {
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    },
    amount: {
      type: Number,
      required: true
    },
    rate: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    terms: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date,
    response: {
      type: String,
      enum: ['accept', 'reject', 'counter']
    }
  }],
  
  // وضعیت چت
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },
  
  // تنظیمات
  settings: {
    autoArchive: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  
  // آمار
  statistics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalOffers: {
      type: Number,
      default: 0
    },
    acceptedOffers: {
      type: Number,
      default: 0
    }
  },
  
  // تاریخچه
  history: [{
    action: String,
    details: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
p2pChatSchema.index({ orderId: 1 });
p2pChatSchema.index({ 'participants.tenantId': 1 });
p2pChatSchema.index({ 'participants.userId': 1 });
p2pChatSchema.index({ status: 1 });
p2pChatSchema.index({ 'messages.createdAt': -1 });

// Static method to generate chat ID
p2pChatSchema.statics.generateChatId = function() {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CHAT${timestamp}${random}`;
};

// Method to add message
p2pChatSchema.methods.addMessage = function(senderTenantId, senderUserId, content, type = 'text', attachments = []) {
  this.messages.push({
    sender: {
      tenantId: senderTenantId,
      userId: senderUserId
    },
    content,
    type,
    attachments
  });
  
  this.statistics.totalMessages += 1;
  return this.save();
};

// Method to add offer
p2pChatSchema.methods.addOffer = function(fromTenantId, fromUserId, amount, rate, paymentMethod, terms, expiresInHours = 24) {
  const offerId = `OFFER${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
  
  this.offers.push({
    offerId,
    from: {
      tenantId: fromTenantId,
      userId: fromUserId
    },
    amount,
    rate,
    paymentMethod,
    terms,
    expiresAt
  });
  
  this.statistics.totalOffers += 1;
  return this.save();
};

// Method to respond to offer
p2pChatSchema.methods.respondToOffer = function(offerId, response, responderTenantId, responderUserId) {
  const offer = this.offers.find(o => o.offerId === offerId);
  if (offer && offer.status === 'pending') {
    offer.status = response === 'accept' ? 'accepted' : 'rejected';
    offer.response = response;
    offer.respondedAt = new Date();
    
    if (response === 'accept') {
      this.statistics.acceptedOffers += 1;
    }
    
    return this.save();
  }
  throw new Error('Offer not found or already responded');
};

// Method to mark message as read
p2pChatSchema.methods.markMessageAsRead = function(messageIndex, readerTenantId) {
  if (this.messages[messageIndex] && !this.messages[messageIndex].isRead) {
    this.messages[messageIndex].isRead = true;
    this.messages[messageIndex].readAt = new Date();
    return this.save();
  }
  return Promise.resolve();
};

// Method to update participant online status
p2pChatSchema.methods.updateParticipantStatus = function(tenantId, userId, isOnline) {
  const participant = this.participants.find(p => 
    p.tenantId.toString() === tenantId.toString() && 
    p.userId.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isOnline = isOnline;
    participant.lastSeen = new Date();
    return this.save();
  }
  return Promise.resolve();
};

// Pre-save middleware
p2pChatSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.chatId) {
      this.chatId = this.constructor.generateChatId();
    }
  }
  next();
});

module.exports = mongoose.model('P2PChat', p2pChatSchema); 