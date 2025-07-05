const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  // شناسه یکتا تراکنش
  transactionId: {
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
  
  // شناسه مشتری
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // شماره حساب
  accountNumber: {
    type: String,
    required: true
  },
  
  // نوع تراکنش
  type: {
    type: String,
    enum: [
      'deposit',           // واریز
      'withdrawal',        // برداشت
      'transfer_in',       // انتقال ورودی
      'transfer_out',      // انتقال خروجی
      'exchange_buy',      // خرید ارز
      'exchange_sell',     // فروش ارز
      'fee',               // کارمزد
      'interest',          // سود
      'adjustment',        // تعدیل
      'refund',            // بازپرداخت
      'buy',               // خرید
      'sell',              // فروش
      'withdraw',          // برداشت
      'transfer'           // انتقال
    ],
    required: true
  },
  
  // ارز تراکنش
  currency: {
    type: String,
    required: true,
    enum: ['IRR', 'AED', 'USD', 'EUR', 'USDT', 'BTC', 'ETH', 'BNB', 'XRP'],
    uppercase: true
  },
  
  // مبلغ
  amount: {
    type: Number,
    required: true
  },
  
  // موجودی قبل از تراکنش
  balanceBefore: {
    type: Number,
    required: true
  },
  
  // موجودی بعد از تراکنش
  balanceAfter: {
    type: Number,
    required: true
  },
  
  // توضیحات
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // اطلاعات اضافی
  metadata: {
    // برای تراکنش‌های ارزی
    exchangeRate: Number,
    fromCurrency: String,
    toCurrency: String,
    
    // برای انتقال‌ها
    fromAccount: String,
    toAccount: String,
    recipientName: String,
    recipientPhone: String,
    
    // برای کارمزدها
    feeType: String,
    feeReason: String,
    
    // برای تعدیلات
    adjustmentReason: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // اطلاعات مرجع
    referenceId: String,
    referenceType: String
  },
  
  // وضعیت تراکنش
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'pending'
  },
  
  // تأیید تراکنش
  approval: {
    required: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    notes: String
  },
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // اطلاعات تأیید کننده
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  
  // تاریخچه وضعیت
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    notes: String
  }],
  
  // یادداشت‌ها
  notes: {
    customer: String,
    staff: String,
    system: String
  },
  
  // اطلاعات فارسی
  persianDate: {
    type: String,
    default: function() {
      return new Date(this.created_at).toLocaleDateString('fa-IR');
    }
  },
  persianTime: {
    type: String,
    default: function() {
      return new Date(this.created_at).toLocaleTimeString('fa-IR');
    }
  },
  
  paymentBreakdown: [{
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    amount: Number,
    currency: String,
    senderName: String,
    receiptFile: String,
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
    submittedAt: Date,
    sentAt: Date,
    status: { type: String, enum: ['pending', 'under_review', 'verified', 'rejected'], default: 'pending' }
  }],
  
  // اضافه شده برای جدید
  rate: {
    type: Number
  },
  
  // اضافه شده برای جدید
  source: {
    type: String
  },
  
  // اضافه شده برای جدید
  related_deal_id: {
    type: String
  },
  
  // اضافه شده برای جدید
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
customerTransactionSchema.index({ tenantId: 1, transactionId: 1 });
customerTransactionSchema.index({ tenantId: 1, customerId: 1 });
customerTransactionSchema.index({ tenantId: 1, accountNumber: 1 });
customerTransactionSchema.index({ tenantId: 1, type: 1 });
customerTransactionSchema.index({ tenantId: 1, currency: 1 });
customerTransactionSchema.index({ tenantId: 1, status: 1 });
customerTransactionSchema.index({ 'created_at': -1 });
customerTransactionSchema.index({ transactionId: 1 });
customerTransactionSchema.index({ customerId: 1, timestamp: -1 });

// Static method to generate transaction ID
customerTransactionSchema.statics.generateTransactionId = function(tenantCode) {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${tenantCode}${timestamp}${random}`;
};

// Method to add status to history
customerTransactionSchema.methods.addStatusHistory = function(status, changedBy, reason = '', notes = '') {
  this.statusHistory.push({
    status,
    changedBy,
    reason,
    notes
  });
  return this.save();
};

// Method to approve transaction
customerTransactionSchema.methods.approve = function(approvedBy, notes = '') {
  this.status = 'completed';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  this.approval.notes = notes;
  this.processedBy = approvedBy;
  this.processedAt = new Date();
  
  this.addStatusHistory('completed', approvedBy, 'Transaction approved', notes);
  
  return this.save();
};

// Method to reverse transaction
customerTransactionSchema.methods.reverse = function(reversedBy, reason = '') {
  this.status = 'reversed';
  this.processedBy = reversedBy;
  this.processedAt = new Date();
  
  this.addStatusHistory('reversed', reversedBy, reason);
  
  return this.save();
};

// Pre-save middleware
customerTransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.transactionId) {
      this.transactionId = this.constructor.generateTransactionId('CUST');
    }
  }
  next();
});

module.exports = mongoose.model('CustomerTransaction', customerTransactionSchema); 