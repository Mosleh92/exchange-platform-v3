const mongoose = require('mongoose');
const validator = require('validator');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  currency: {
    type: String,
    required: true,
    enum: ['IRR', 'USD', 'EUR', 'AED', 'GBP', 'TRY', 'BTC', 'ETH', 'USDT', 'BNB']
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'investment', 'crypto'],
    default: 'savings'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  frozenBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed', 'pending'],
    default: 'pending'
  },
  interestRate: {
    type: Number,
    default: 0
  },
  lastInterestDate: {
    type: Date
  },
  dailyLimit: {
    type: Number,
    default: 1000000000 // 1 billion IRR
  },
  monthlyLimit: {
    type: Number,
    default: 10000000000 // 10 billion IRR
  },
  dailyUsed: {
    type: Number,
    default: 0
  },
  monthlyUsed: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    autoInterest: { type: Boolean, default: true },
    allowOverdraft: { type: Boolean, default: false },
    overdraftLimit: { type: Number, default: 0 }
  },
  metadata: {
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    reason: String,
    documents: [{
      type: String,
      name: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  email: {
    type: String,
    maxlength: 100
  },
  phone: {
    type: String,
    maxlength: 20
  }
}, {
  timestamps: true
});

// Indexes
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ customerId: 1 });
accountSchema.index({ tenantId: 1 });
accountSchema.index({ currency: 1 });
accountSchema.index({ status: 1 });

// Virtual for total balance
accountSchema.virtual('totalBalance').get(function() {
  return this.balance + this.frozenBalance;
});

// Virtual for isOverdraft
accountSchema.virtual('isOverdraft').get(function() {
  return this.balance < 0;
});

// Static method to generate account number
accountSchema.statics.generateAccountNumber = function(currency, tenantId) {
  const prefix = currency === 'IRR' ? 'IR' : currency;
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Method to update daily/monthly limits
accountSchema.methods.updateLimits = function() {
  const now = new Date();
  const lastReset = new Date(this.lastResetDate);
  
  // Reset daily limit if it's a new day
  if (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.dailyUsed = 0;
  }
  
  // Reset monthly limit if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.monthlyUsed = 0;
  }
  
  this.lastResetDate = now;
};

// Method to check if transaction is allowed
accountSchema.methods.canTransact = function(amount) {
  if (this.status !== 'active') return false;
  
  this.updateLimits();
  
  // Check daily limit
  if (this.dailyUsed + amount > this.dailyLimit) return false;
  
  // Check monthly limit
  if (this.monthlyUsed + amount > this.monthlyLimit) return false;
  
  // Check available balance
  if (this.availableBalance < amount && !this.settings.allowOverdraft) return false;
  
  // Check overdraft limit
  if (this.settings.allowOverdraft && 
      this.balance - amount < -this.settings.overdraftLimit) return false;
  
  return true;
};

// Method to add transaction
accountSchema.methods.addTransaction = function(amount, type = 'debit') {
  const transactionAmount = type === 'credit' ? amount : -amount;
  
  this.balance += transactionAmount;
  this.availableBalance += transactionAmount;
  
  if (type === 'debit') {
    this.dailyUsed += amount;
    this.monthlyUsed += amount;
  }
  
  return this.save();
};

// Method to freeze amount
accountSchema.methods.freezeAmount = function(amount) {
  if (this.availableBalance < amount) {
    throw new Error('موجودی کافی نیست');
  }
  
  this.availableBalance -= amount;
  this.frozenBalance += amount;
  
  return this.save();
};

// Method to unfreeze amount
accountSchema.methods.unfreezeAmount = function(amount) {
  if (this.frozenBalance < amount) {
    throw new Error('مقدار فریز شده کافی نیست');
  }
  
  this.frozenBalance -= amount;
  this.availableBalance += amount;
  
  return this.save();
};

// Method to calculate interest
accountSchema.methods.calculateInterest = function() {
  if (!this.settings.autoInterest || this.interestRate <= 0) return 0;
  
  const now = new Date();
  const lastInterest = this.lastInterestDate || this.metadata.openedAt;
  const daysDiff = Math.floor((now - lastInterest) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 30) return 0; // Monthly interest
  
  const interest = (this.balance * this.interestRate * daysDiff) / (365 * 100);
  return Math.max(0, interest);
};

// Method to apply interest
accountSchema.methods.applyInterest = function() {
  const interest = this.calculateInterest();
  if (interest > 0) {
    this.balance += interest;
    this.availableBalance += interest;
    this.lastInterestDate = new Date();
    return this.save();
  }
  return this;
};

accountSchema.pre('save', function(next) {
    if (this.isModified('name')) this.name = validator.escape(this.name);
    if (this.isModified('description')) this.description = validator.escape(this.description);
    if (this.isModified('email')) this.email = validator.escape(this.email);
    if (this.isModified('phone')) this.phone = validator.escape(this.phone);
    next();
});

module.exports = mongoose.model('Account', accountSchema); 