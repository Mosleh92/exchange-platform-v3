const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  // شناسه یکتا رسید
  receiptId: {
    type: String,
    required: true,
    unique: true
  },
  
  // شناسه مستأجر (صرافی)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // شناسه تراکنش مرتبط
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerTransaction',
    required: true
  },
  
  // شناسه مشتری
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // نوع رسید
  type: {
    type: String,
    enum: ['transaction', 'transfer', 'exchange', 'payment'],
    required: true
  },
  
  // وضعیت رسید
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  // کانال‌های ارسال
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      error: String
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      error: String
    },
    whatsapp: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      error: String
    }
  },
  
  // محتوای رسید
  content: {
    // اطلاعات صرافی
    tenant: {
      name: String,
      logo: String,
      address: String,
      phone: String,
      email: String,
      website: String,
      license: String
    },
    
    // اطلاعات تراکنش
    transaction: {
      id: String,
      type: String,
      amount: Number,
      currency: String,
      date: Date,
      description: String,
      reference: String
    },
    
    // اطلاعات مشتری
    customer: {
      name: String,
      phone: String,
      email: String,
      accountNumber: String
    },
    
    // اطلاعات اضافی
    details: {
      exchangeRate: Number,
      fees: Number,
      totalAmount: Number,
      notes: String
    }
  },
  
  // قالب رسید
  template: {
    name: String,
    html: String,
    css: String
  },
  
  // فایل PDF رسید
  pdfFile: {
    path: String,
    fileName: String,
    size: Number,
    generatedAt: Date
  },
  
  // تنظیمات ارسال
  deliverySettings: {
    sendImmediately: {
      type: Boolean,
      default: true
    },
    scheduledAt: Date,
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    }
  },
  
  // تاریخچه ارسال
  deliveryHistory: [{
    channel: String,
    status: String,
    sentAt: Date,
    deliveredAt: Date,
    error: String,
    retryCount: Number
  }],
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // یادداشت‌ها
  notes: String,
  
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  senderName: String,
  amount: Number,
  currency: String,
  file: String,
  submittedAt: { type: Date, default: Date.now },
  sentAt: Date,
  // status: { type: String, enum: ['pending', 'under_review', 'verified', 'rejected'], default: 'pending' }, // Removed duplicate status
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
receiptSchema.index({ tenantId: 1, receiptId: 1 });
receiptSchema.index({ tenantId: 1, transactionId: 1 });
receiptSchema.index({ tenantId: 1, customerId: 1 });
receiptSchema.index({ tenantId: 1, status: 1 });
receiptSchema.index({ 'created_at': -1 });

// Static method to generate receipt ID
receiptSchema.statics.generateReceiptId = function(tenantCode) {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP${tenantCode}${timestamp}${random}`;
};

// Method to add delivery history
receiptSchema.methods.addDeliveryHistory = function(channel, status, error = null) {
  this.deliveryHistory.push({
    channel,
    status,
    sentAt: new Date(),
    error,
    retryCount: this.deliverySettings.retryCount
  });
  
  // Keep only last 20 entries
  if (this.deliveryHistory.length > 20) {
    this.deliveryHistory = this.deliveryHistory.slice(-20);
  }
  
  return this.save();
};

// Method to mark channel as sent
receiptSchema.methods.markChannelSent = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].sent = true;
    this.channels[channel].sentAt = new Date();
    this.channels[channel].error = null;
  }
  return this.save();
};

// Method to mark channel as failed
receiptSchema.methods.markChannelFailed = function(channel, error) {
  if (this.channels[channel]) {
    this.channels[channel].sent = false;
    this.channels[channel].error = error;
  }
  return this.save();
};

// Pre-save middleware
receiptSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.receiptId) {
      this.receiptId = this.constructor.generateReceiptId('RCP');
    }
  }
  next();
});

module.exports = mongoose.model('Receipt', receiptSchema); 
