// backend/src/models/p2p/P2PAnnouncement.js
const mongoose = require('mongoose');

const p2pAnnouncementSchema = new mongoose.Schema({
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
  announcementNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    required: true
  },
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    required: true
  },
  location: {
    country: { type: String, required: true },
    city: { type: String, required: true },
    area: String,
    meetingPoint: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  paymentMethods: [{
    type: String,
    enum: ['cash', 'bank_transfer', 'online_payment', 'crypto', 'mobile_money'],
    required: true
  }],
  timeSlots: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String, // "09:00"
    endTime: String,   // "18:00"
    isAvailable: { type: Boolean, default: true }
  }],
  description: {
    type: String,
    maxlength: 1000
  },
  terms: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled', 'suspended'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['normal', 'featured', 'premium'],
    default: 'normal'
  },
  validUntil: {
    type: Date,
    required: true
  },
  completedDeals: {
    type: Number,
    default: 0
  },
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  views: {
    type: Number,
    default: 0
  },
  interests: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  tags: [String],
  metadata: {
    lastActiveAt: { type: Date, default: Date.now },
    responseTime: Number, // در دقیقه
    autoReply: {
      enabled: { type: Boolean, default: false },
      message: String
    }
  }
}, {
  timestamps: true
});

// Auto-increment announcement number
p2pAnnouncementSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.announcementNumber = `P2P-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
    this.totalValue = this.amount * this.rate;
  }
  next();
});

// Indexes for performance
p2pAnnouncementSchema.index({ tenantId: 1, status: 1 });
p2pAnnouncementSchema.index({ fromCurrency: 1, toCurrency: 1 });
p2pAnnouncementSchema.index({ userId: 1 });
p2pAnnouncementSchema.index({ 'location.city': 1 });
p2pAnnouncementSchema.index({ type: 1, status: 1 });
p2pAnnouncementSchema.index({ validUntil: 1 });
p2pAnnouncementSchema.index({ createdAt: -1 });
p2pAnnouncementSchema.index({ priority: -1, createdAt: -1 });

module.exports = mongoose.model('P2PAnnouncement', p2pAnnouncementSchema);

// backend/src/models/p2p/P2PTransaction.js
const mongoose = require('mongoose');

const p2pTransactionSchema = new mongoose.Schema({
  announcementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2PAnnouncement',
    required: true
  },
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  buyer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  seller: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  amount: {
    requested: { type: Number, required: true },
    agreed: { type: Number },
    final: { type: Number }
  },
  rate: {
    initial: { type: Number, required: true },
    negotiated: { type: Number },
    final: { type: Number }
  },
  totalValue: {
    initial: { type: Number, required: true },
    final: { type: Number }
  },
  currencies: {
    from: { type: String, required: true },
    to: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'online_payment', 'crypto', 'mobile_money'],
    required: true
  },
  meetingDetails: {
    location: {
      address: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    scheduledTime: Date,
    actualTime: Date,
    duration: Number // in minutes
  },
  status: {
    type: String,
    enum: [
      'pending',           // در انتظار تأیید
      'accepted',          // پذیرفته شده
      'negotiating',       // در حال مذاکره
      'agreed',           // توافق شده
      'meeting_scheduled', // جلسه تعیین شده
      'in_progress',      // در حال انجام
      'payment_pending',  // در انتظار پرداخت
      'completed',        // تکمیل شده
      'cancelled',        // لغو شده
      'disputed',         // اختلاف
      'expired'           // منقضی شده
    ],
    default: 'pending'
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2PChat'
  },
  dispute: {
    isDisputed: { type: Boolean, default: false },
    reason: String,
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date,
    resolution: {
      status: {
        type: String,
        enum: ['pending', 'resolved', 'escalated']
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      resolvedAt: Date,
      notes: String
    }
  },
  commission: {
    buyerFee: { type: Number, default: 0 },
    sellerFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 }
  },
  feedback: {
    buyer: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date
    },
    seller: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date
    }
  },
  attachments: [{
    type: {
      type: String,
      enum: ['receipt', 'id_proof', 'meeting_photo', 'other']
    },
    filename: String,
    originalName: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: { type: Date, default: Date.now }
  }],
  expiresAt: Date
}, {
  timestamps: true
});

// Auto-increment transaction number
p2pTransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.transactionNumber = `P2PTX-${Date.now().toString().slice(-8)}-${(count + 1).toString().padStart(4, '0')}`;
    
    // Set expiration (24 hours for pending transactions)
    if (this.status === 'pending') {
      this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
  next();
});

// Update timeline when status changes
p2pTransactionSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this._updatedBy // Set this in controller
    });
  }
  next();
});

p2pTransactionSchema.index({ announcementId: 1 });
p2pTransactionSchema.index({ 'buyer.userId': 1 });
p2pTransactionSchema.index({ 'seller.userId': 1 });
p2pTransactionSchema.index({ status: 1 });
p2pTransactionSchema.index({ expiresAt: 1 });
p2pTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('P2PTransaction', p2pTransactionSchema);

// backend/src/models/p2p/P2PChat.js
const mongoose = require('mongoose');

const p2pChatSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2PTransaction',
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
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: false
    }
  }],
  messages: [{
    messageId: {
      type: String,
      required: true,
      unique: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system', 'location', 'contact'],
      default: 'text'
    },
    attachments: [{
      type: String, // 'image', 'document', 'audio'
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      mimetype: String
    }],
    replyTo: {
      messageId: String,
      preview: String
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
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
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      emoji: String,
      reactedAt: {
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
    enum: ['active', 'closed', 'archived', 'blocked'],
    default: 'active'
  },
  dealNegotiation: {
    currentOffer: {
      amount: Number,
      rate: Number,
      paymentMethod: String,
      proposedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      proposedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'counter_offered']
      }
    },
    history: [{
      amount: Number,
      rate: Number,
      paymentMethod: String,
      proposedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      proposedAt: Date,
      status: String,
      response: String
    }]
  },
  automatedMessages: {
    welcomeMessageSent: { type: Boolean, default: false },
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: Date
  },
  restrictions: {
    isRestricted: { type: Boolean, default: false },
    restrictedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    restrictedAt: Date,
    reason: String
  }
}, {
  timestamps: true
});

// Generate unique message ID
p2pChatSchema.methods.generateMessageId = function() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Mark messages as read
p2pChatSchema.methods.markAsRead = function(userId, messageIds = []) {
  this.messages.forEach(message => {
    if (messageIds.length === 0 || messageIds.includes(message.messageId)) {
      const existingRead = message.readBy.find(r => r.userId.toString() === userId);
      if (!existingRead) {
        message.readBy.push({ userId, readAt: new Date() });
      }
    }
  });
};

p2pChatSchema.index({ transactionId: 1 });
p2pChatSchema.index({ 'participants.userId': 1 });
p2pChatSchema.index({ status: 1 });
p2pChatSchema.index({ 'messages.sentAt': -1 });

module.exports = mongoose.model('P2PChat', p2pChatSchema);

// backend/src/controllers/p2p/P2PController.js
const P2PAnnouncement = require('../../models/p2p/P2PAnnouncement');
const P2PTransaction = require('../../models/p2p/P2PTransaction');
const P2PChat = require('../../models/p2p/P2PChat');
const User = require('../../models/User');
const NotificationService = require('../../services/notificationService');

class P2PController {
  // Create new announcement
  static async createAnnouncement(req, res) {
    try {
      const {
        type, fromCurrency, toCurrency, amount, rate,
        minAmount, maxAmount, location, paymentMethods,
        timeSlots, description, terms, validUntil, tags
      } = req.body;

      const announcement = new P2PAnnouncement({
        tenantId: req.tenant._id,
        userId: req.user.id,
        type,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        amount,
        rate,
        minAmount: minAmount || 0,
        maxAmount: maxAmount || amount,
        location,
        paymentMethods,
        timeSlots: timeSlots || [],
        description,
        terms,
        validUntil: new Date(validUntil),
        tags: tags || []
      });

      await announcement.save();

      // Populate user info
      await announcement.populate('userId', 'profile email');

      res.status(201).json({
        success: true,
        data: announcement,
        message: 'آگهی P2P با موفقیت ایجاد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد آگهی',
        error: error.message
      });
    }
  }

  // Get announcements with advanced filtering
  static async getAnnouncements(req, res) {
    try {
      const {
        type, fromCurrency, toCurrency, city, country,
        minAmount, maxAmount, minRate, maxRate,
        paymentMethod, sortBy = 'createdAt', sortOrder = 'desc',
        page = 1, limit = 20, search, userId
      } = req.query;

      // Build query
      const query = { status: 'active', validUntil: { $gt: new Date() } };
      
      if (type) query.type = type;
      if (fromCurrency) query.fromCurrency = fromCurrency.toUpperCase();
      if (toCurrency) query.toCurrency = toCurrency.toUpperCase();
      if (city) query['location.city'] = new RegExp(city, 'i');
      if (country) query['location.country'] = new RegExp(country, 'i');
      if (paymentMethod) query.paymentMethods = { $in: [paymentMethod] };
      if (userId) query.userId = userId;

      // Amount range
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }

      // Rate range
      if (minRate || maxRate) {
        query.rate = {};
        if (minRate) query.rate.$gte = parseFloat(minRate);
        if (maxRate) query.rate.$lte = parseFloat(maxRate);
      }

      // Search in description
      if (search) {
        query.$or = [
          { description: new RegExp(search, 'i') },
          { terms: new RegExp(search, 'i') },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Exclude user's own announcements (optional)
      if (req.query.excludeOwn === 'true') {
        query.userId = { $ne: req.user.id };
      }

      // Sorting
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Priority announcements first
      if (sortBy === 'createdAt') {
        sortOptions.priority = -1;
      }

      const announcements = await P2PAnnouncement.find(query)
        .populate('userId', 'profile email rating')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await P2PAnnouncement.countDocuments(query);

      // Update view counts
      const announcementIds = announcements.map(a => a._id);
      await P2PAnnouncement.updateMany(
        { _id: { $in: announcementIds } },
        { $inc: { views: 1 } }
      );

      res.json({
        success: true,
        data: {
          announcements,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          },
          filters: {
            appliedFilters: { type, fromCurrency, toCurrency, city, paymentMethod },
            totalResults: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت آگهی‌ها',
        error: error.message
      });
    }
  }

  // Show interest in announcement
  static async showInterest(req, res) {
    try {
      const { announcementId } = req.params;
      const { message, proposedAmount, proposedRate } = req.body;

      const announcement = await P2PAnnouncement.findById(announcementId)
        .populate('userId', 'profile email');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'آگهی یافت نشد'
        });
      }

      if (announcement.userId._id.toString() === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'نمی‌توانید به آگهی خود علاقه نشان دهید'
        });
      }

      // Check if user already has pending transaction for this announcement
      const existingTransaction = await P2PTransaction.findOne({
        announcementId,
        'buyer.userId': req.user.id,
        status: { $in: ['pending', 'accepted', 'negotiating'] }
      });

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: 'شما قبلاً برای این آگهی درخواست ارسال کرده‌اید'
        });
      }

      // Create transaction
      const transaction = new P2PTransaction({
        announcementId,
        buyer: {
          userId: req.user.id,
          tenantId: req.tenant._id
        },
        seller: {
          userId: announcement.userId._id,
          tenantId: announcement.tenantId
        },
        amount: {
          requested: proposedAmount || announcement.amount
        },
        rate: {
          initial: proposedRate || announcement.rate
        },
        totalValue: {
          initial: (proposedAmount || announcement.amount) * (proposedRate || announcement.rate)
        },
        currencies: {
          from: announcement.fromCurrency,
          to: announcement.toCurrency
        },
        paymentMethod: announcement.paymentMethods[0], // Default to first method
        status: 'pending'
      });

      await transaction.save();

      // Create chat room
      const chat = new P2PChat({
        transactionId: transaction._id,
        participants: [
          {
            userId: req.user.id,
            role: announcement.type === 'sell' ? 'buyer' : 'seller'
          },
          {
            userId: announcement.userId._id,
            role: announcement.type === 'sell' ? 'seller' : 'buyer'
          }
        ]
      });

      // Add initial message if provided
      if (message) {
        chat.messages.push({
          messageId: chat.generateMessageId(),
          senderId: req.user.id,
          message,
          messageType: 'text'
        });
      }

      await chat.save();

      // Update transaction with chat ID
      transaction.chatId = chat._id;
      await transaction.save();

      // Update announcement interest count
      await P2PAnnouncement.findByIdAndUpdate(announcementId, {
        $inc: { interests: 1 }
      });

      // Send notification to announcement owner
      await NotificationService.sendMultiChannelNotification(
        announcement.userId._id,
        {
          type: 'p2p_interest',
          title: 'علاقه جدید به آگهی P2P',
          message: `کاربری علاقه به آگهی ${announcement.announcementNumber} شما نشان داده است`,
          channels: ['inApp', 'email'],
          data: {
            transactionId: transaction._id,
            announcementId,
            actionUrl: `/p2p/transactions/${transaction._id}`
          }
        }
      );

      await transaction.populate([
        { path: 'buyer.userId', select: 'profile email' },
        { path: 'seller.userId', select: 'profile email' }
      ]);

      res.status(201).json({
        success: true,
        data: {
          transaction,
          chatId: chat._id
        },
        message: 'درخواست شما ارسال شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ارسال درخواست',
        error: error.message
      });
    }
  }

  // Get user's transactions
  static async getUserTransactions(req, res) {
    try {
      const { status, role, page = 1, limit = 10 } = req.query;
      const userId = req.user.id;

      const query = {
        $or: [
          { 'buyer.userId': userId },
          { 'seller.userId': userId }
        ]
      };

      if (status) {
        query.status = status;
      }

      if (role) {
        if (role === 'buyer') {
          query.$or = [{ 'buyer.userId': userId }];
        } else if (role === 'seller') {
          query.$or = [{ 'seller.userId': userId }];
        }
      }

      const transactions = await P2PTransaction.find(query)
        .populate('announcementId', 'announcementNumber type fromCurrency toCurrency')
        .populate('buyer.userId', 'profile email')
        .populate('seller.userId', 'profile email')
        .populate('chatId', 'status')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await P2PTransaction.countDocuments(query);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت تراکنش‌ها',
        error: error.message
      });
    }
  }

  // Update transaction status
  static async updateTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;
      const { status, note } = req.body;

      const transaction = await P2PTransaction.findById(transactionId)
        .populate('buyer.userId', 'profile email')
        .populate('seller.userId', 'profile email');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'تراکنش یافت نشد'
        });
      }

      // Check permissions
      const isParticipant = [
        transaction.buyer.userId._id.toString(),
        transaction.seller.userId._id.toString()
      ].includes(req.user.id);

      if (!isParticipant && req.user.role !== 'tenant_admin') {
        return res.status(403).json({
          success: false,
          message: 'عدم دسترسی'
        });
      }

      // Update transaction
      transaction.status = status;
      transaction._updatedBy = req.user.id;
      
      if (note) {
        transaction.timeline.push({
          status,
          note,
          updatedBy: req.user.id,
          timestamp: new Date()
        });
      }

      await transaction.save();

      // Send notification to other party
      const otherParty = transaction.buyer.userId._id.toString() === req.user.id 
        ? transaction.seller.userId._id 
        : transaction.buyer.userId._id;

      const statusMessages = {
        accepted: 'درخواست P2P شما پذیرفته شد',
        rejected: 'درخواست P2P شما رد شد',
        completed: 'تراکنش P2P تکمیل شد',
        cancelled: 'تراکنش P2P لغو شد'
      };

      if (statusMessages[status]) {
        await NotificationService.sendMultiChannelNotification(
          otherParty,
          {
            type: 'p2p_status_update',
            title: 'بروزرسانی وضعیت P2P',
            message: statusMessages[status],
            channels: ['inApp', 'push'],
            data: {
              transactionId,
              status,
              actionUrl: `/p2p/transactions/${transactionId}`
            }
          }
        );
      }

      res.json({
