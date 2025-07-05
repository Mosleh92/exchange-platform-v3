const mongoose = require('mongoose');

const vipCustomerSchema = new mongoose.Schema({
  // شناسه مستأجر (صرافی)
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
  
  // سطح VIP
  vipLevel: {
    type: String,
    enum: ['regular', 'loyal', 'vip', 'premium'],
    default: 'regular'
  },
  
  // حساب بانکی اختصاصی
  bankAccount: {
    accountNumber: String,
    accountHolder: String,
    bankName: String,
    iban: String,
    swiftCode: String,
    currency: {
      type: String,
      default: 'IRR'
    },
    balance: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed'],
      default: 'active'
    }
  },
  
  // محدودیت‌های معاملاتی
  limits: {
    daily: {
      type: Number,
      default: 1000000000 // 1 میلیارد تومان
    },
    monthly: {
      type: Number,
      default: 10000000000 // 10 میلیارد تومان
    },
    singleTransaction: {
      type: Number,
      default: 500000000 // 500 میلیون تومان
    }
  },
  
  // تخفیف‌های ویژه
  discounts: {
    commission: {
      type: Number,
      default: 0, // درصد تخفیف کارمزد
      min: 0,
      max: 100
    },
    exchangeRate: {
      type: Number,
      default: 0, // درصد تخفیف نرخ ارز
      min: 0,
      max: 5
    }
  },
  
  // نرخ‌های ویژه
  specialRates: [{
    currency: String,
    buyRate: Number,
    sellRate: Number,
    validFrom: Date,
    validTo: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // آمار معاملات
  statistics: {
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    averageTransactionSize: {
      type: Number,
      default: 0
    },
    lastTransactionDate: Date,
    memberSince: {
      type: Date,
      default: Date.now
    }
  },
  
  // ترجیحات
  preferences: {
    preferredCurrencies: [String],
    preferredPaymentMethods: [String],
    preferredDeliveryMethods: [String],
    notificationSettings: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // اطلاعات تماس اضافی
  contacts: [{
    name: String,
    relationship: String,
    phone: String,
    email: String,
    isEmergency: {
      type: Boolean,
      default: false
    }
  }],
  
  // مدارک و احراز هویت
  kyc: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    documents: [{
      type: String,
      filePath: String,
      fileName: String,
      uploadedAt: Date,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // یادداشت‌های ویژه
  specialNotes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  
  // وضعیت
  status: {
    type: String,
    enum: ['active', 'suspended', 'blacklisted'],
    default: 'active'
  },
  
  // اطلاعات ثبت کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // تاریخچه تغییرات
  history: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
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
vipCustomerSchema.index({ tenantId: 1, customerId: 1 }, { unique: true });
vipCustomerSchema.index({ tenantId: 1, vipLevel: 1 });
vipCustomerSchema.index({ tenantId: 1, status: 1 });

// Method to update statistics
vipCustomerSchema.methods.updateStatistics = function(transactionAmount) {
  this.statistics.totalTransactions += 1;
  this.statistics.totalVolume += transactionAmount;
  this.statistics.averageTransactionSize = this.statistics.totalVolume / this.statistics.totalTransactions;
  this.statistics.lastTransactionDate = new Date();
  return this.save();
};

// Method to add history
vipCustomerSchema.methods.addHistory = function(field, oldValue, newValue, changedBy) {
  this.history.push({
    field,
    oldValue,
    newValue,
    changedBy
  });
  return this.save();
};

// Method to get special rate for currency
vipCustomerSchema.methods.getSpecialRate = function(currency) {
  const now = new Date();
  return this.specialRates.find(rate => 
    rate.currency === currency && 
    rate.isActive &&
    rate.validFrom <= now &&
    rate.validTo >= now
  );
};

// Method to check if transaction is within limits
vipCustomerSchema.methods.checkTransactionLimit = function(amount) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // This would need to be implemented with actual transaction data
  // For now, returning true
  return true;
};

module.exports = mongoose.model('VIPCustomer', vipCustomerSchema); 