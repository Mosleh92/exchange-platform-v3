const mongoose = require('mongoose');

const p2pSubscriptionSchema = new mongoose.Schema({
  // شناسه مستأجر
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // نوع اشتراک
  type: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    required: true
  },
  
  // ویژگی‌های اشتراک
  features: {
    maxOrders: {
      type: Number,
      required: true
    },
    maxChats: {
      type: Number,
      required: true
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    }
  },
  
  // قیمت
  pricing: {
    monthly: {
      type: Number,
      required: true
    },
    yearly: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // وضعیت اشتراک
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'suspended'],
    default: 'active'
  },
  
  // دوره اشتراک
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true
    }
  },
  
  // پرداخت‌ها
  payments: [{
    paymentId: String,
    amount: Number,
    currency: String,
    method: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    dueDate: Date
  }],
  
  // آمار استفاده
  usage: {
    ordersCreated: {
      type: Number,
      default: 0
    },
    activeOrders: {
      type: Number,
      default: 0
    },
    chatsCreated: {
      type: Number,
      default: 0
    },
    activeChats: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  },
  
  // تنظیمات
  settings: {
    autoRenew: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  
  // یادداشت‌ها
  notes: String,
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // تاریخچه تغییرات
  history: [{
    action: String,
    details: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
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
p2pSubscriptionSchema.index({ tenantId: 1 }, { unique: true });
p2pSubscriptionSchema.index({ status: 1 });
p2pSubscriptionSchema.index({ 'period.endDate': 1 });

// Static method to get subscription features
p2pSubscriptionSchema.statics.getFeatures = function(type) {
  const features = {
    basic: {
      maxOrders: 10,
      maxChats: 50,
      prioritySupport: false,
      advancedAnalytics: false,
      customBranding: false,
      apiAccess: false,
      whiteLabel: false
    },
    premium: {
      maxOrders: 100,
      maxChats: 500,
      prioritySupport: true,
      advancedAnalytics: true,
      customBranding: false,
      apiAccess: false,
      whiteLabel: false
    },
    enterprise: {
      maxOrders: -1, // unlimited
      maxChats: -1, // unlimited
      prioritySupport: true,
      advancedAnalytics: true,
      customBranding: true,
      apiAccess: true,
      whiteLabel: true
    }
  };
  
  return features[type] || features.basic;
};

// Method to check if subscription is active
p2pSubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.period.endDate > new Date();
};

// Method to check usage limits
p2pSubscriptionSchema.methods.checkOrderLimit = function() {
  if (this.features.maxOrders === -1) return true; // unlimited
  return this.usage.ordersCreated < this.features.maxOrders;
};

p2pSubscriptionSchema.methods.checkChatLimit = function() {
  if (this.features.maxChats === -1) return true; // unlimited
  return this.usage.chatsCreated < this.features.maxChats;
};

// Method to increment usage
p2pSubscriptionSchema.methods.incrementOrders = function() {
  this.usage.ordersCreated += 1;
  this.usage.activeOrders += 1;
  this.usage.lastActivity = new Date();
  return this.save();
};

p2pSubscriptionSchema.methods.incrementChats = function() {
  this.usage.chatsCreated += 1;
  this.usage.activeChats += 1;
  this.usage.lastActivity = new Date();
  return this.save();
};

// Method to add payment
p2pSubscriptionSchema.methods.addPayment = function(paymentData) {
  this.payments.push(paymentData);
  return this.save();
};

// Method to add to history
p2pSubscriptionSchema.methods.addToHistory = function(action, details, changedBy) {
  this.history.push({
    action,
    details,
    changedBy
  });
  
  // Keep only last 100 entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
  
  return this.save();
};

// Pre-save middleware
p2pSubscriptionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set features based on type
    this.features = this.constructor.getFeatures(this.type);
  }
  next();
});

module.exports = mongoose.model('P2PSubscription', p2pSubscriptionSchema); 