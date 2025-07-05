const mongoose = require('mongoose');
const PersianUtils = require('../utils/persian');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const currencyTransactionSchema = new mongoose.Schema({
  // شناسه یکتا تراکنش
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // اطلاعات مستأجر (صرافی)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // اطلاعات مشتری
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerType: {
    type: String,
    enum: ['regular', 'loyal', 'vip'],
    default: 'regular'
  },
  
  // نوع معامله
  type: {
    type: String,
    enum: ['buy', 'sell', 'exchange', 'remittance'],
    required: true
  },
  
  // ارز مبدا
  currencyFrom: {
    type: String,
    required: true,
    uppercase: true
  },
  amountFrom: {
    type: Number,
    required: true,
    min: 0
  },
  
  // ارز مقصد
  currencyTo: {
    type: String,
    required: true,
    uppercase: true
  },
  amountTo: {
    type: Number,
    required: true,
    min: 0
  },
  
  // نرخ تبدیل
  exchangeRate: {
    type: Number,
    required: true,
    min: 0
  },
  rateType: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  
  // طرف مقابل (صرافی همکار)
  counterparty: {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant'
    },
    name: String,
    country: String,
    contactPerson: String,
    phone: String,
    email: String
  },
  
  // کارمزد و تخفیف
  fees: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'IRR'
    },
    description: String
  },
  discount: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'IRR'
    },
    reason: String
  },
  
  // وضعیت تراکنش
  status: {
    type: String,
    enum: [
      'pending_payment',      // در انتظار پرداخت
      'partial_paid',         // پرداخت جزئی
      'payment_complete',     // پرداخت کامل
      'processing',           // در حال پردازش
      'completed',            // تکمیل شده
      'cancelled',            // لغو شده
      'failed'                // ناموفق
    ],
    default: 'pending_payment'
  },
  
  // شماره مرجع
  referenceNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // تقسیم پرداخت خودکار
  paymentSplit: {
    totalAmount: {
      type: Number,
      required: true
    },
    accounts: [{
      accountNumber: String,
      accountName: String,
      bankName: String,
      iban: String,
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'paid', 'verified'],
        default: 'pending'
      },
      receipt: {
        filePath: String,
        fileName: String,
        uploadedAt: Date,
        verified: {
          type: Boolean,
          default: false
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        verifiedAt: Date
      },
      paidAt: Date
    }],
    progress: {
      total: Number,
      completed: Number,
      percentage: Number
    }
  },
  
  // اطلاعات تحویل
  delivery: {
    method: {
      type: String,
      enum: ['bank_transfer', 'cash_pickup', 'account_credit'],
      required: true
    },
    recipient: {
      name: String,
      idNumber: String,
      phone: String,
      email: String
    },
    bankAccount: {
      bankName: String,
      accountNumber: String,
      accountHolder: String,
      iban: String
    },
    pickupLocation: {
      address: String,
      city: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    status: {
      type: String,
      enum: ['pending', 'ready', 'delivered', 'cancelled'],
      default: 'pending'
    },
    deliveredAt: Date,
    deliveryReceipt: {
      filePath: String,
      fileName: String,
      uploadedAt: Date
    }
  },
  
  // امنیت و تأیید
  security: {
    verificationCode: String,
    twoFactorVerified: {
      type: Boolean,
      default: false
    },
    managerApproval: {
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
    ipAddress: String,
    deviceInfo: {
      type: String,
      os: String,
      browser: String
    }
  },
  
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
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  
  // اطلاعات فارسی
  persianDate: {
    type: String,
    default: function() {
      return PersianUtils.toJalaliDate(this.created_at);
    }
  },
  persianTime: {
    type: String,
    default: function() {
      return PersianUtils.toJalaliTime(this.created_at);
    }
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
currencyTransactionSchema.index({ tenantId: 1, transactionId: 1 });
currencyTransactionSchema.index({ tenantId: 1, customerId: 1 });
currencyTransactionSchema.index({ tenantId: 1, status: 1 });
currencyTransactionSchema.index({ tenantId: 1, 'counterparty.tenantId': 1 });
currencyTransactionSchema.index({ referenceNumber: 1 });

// Static method to generate transaction ID
currencyTransactionSchema.statics.generateTransactionId = function(tenantCode) {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${tenantCode}${timestamp}${random}`;
};

// Static method to generate reference number
currencyTransactionSchema.statics.generateReferenceNumber = function() {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REF${timestamp}${random}`;
};

// Method to update payment progress
currencyTransactionSchema.methods.updatePaymentProgress = function() {
  const accounts = this.paymentSplit.accounts;
  const completed = accounts.filter(acc => acc.status === 'verified').length;
  const total = accounts.length;
  
  this.paymentSplit.progress = {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
  
  // Update transaction status based on progress
  if (this.paymentSplit.progress.percentage === 100) {
    this.status = 'payment_complete';
  } else if (this.paymentSplit.progress.completed > 0) {
    this.status = 'partial_paid';
  }
  
  return this.save();
};

// Method to add status to history
currencyTransactionSchema.methods.addStatusHistory = function(status, changedBy, reason = '', notes = '') {
  this.statusHistory.push({
    status,
    changedBy,
    reason,
    notes
  });
  return this.save();
};

// Pre-save middleware
currencyTransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.transactionId) {
      this.transactionId = this.constructor.generateTransactionId('TXN');
    }
    if (!this.referenceNumber) {
      this.referenceNumber = this.constructor.generateReferenceNumber();
    }
  }
  
  // Update payment progress on save
  if (this.paymentSplit && this.paymentSplit.accounts) {
    this.updatePaymentProgress();
  }
  
  next();
});

module.exports = mongoose.model('CurrencyTransaction', currencyTransactionSchema); 