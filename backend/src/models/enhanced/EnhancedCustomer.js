// backend/src/models/enhanced/EnhancedCustomer.js
const mongoose = require('mongoose');
const mongooseEncryption = require('mongoose-encryption');

/**
 * Enhanced Customer Model - Fourth level of the hierarchy
 * Platform → Tenant → Branch → Customer
 */
const enhancedCustomerSchema = new mongoose.Schema({
  platformId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EnhancedTenant',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EnhancedBranch',
    required: true
  },
  customerNumber: {
    type: String,
    required: true,
    unique: true
  },
  personalInfo: {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    nationality: String,
    countryOfBirth: String,
    placeOfBirth: String,
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
    occupation: String,
    employer: String
  },
  contact: {
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    alternatePhone: String,
    preferredLanguage: { type: String, default: 'en' },
    preferredContactMethod: { type: String, enum: ['email', 'phone', 'sms'], default: 'email' }
  },
  address: {
    current: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      postalCode: String,
      country: { type: String, required: true },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    permanent: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      sameAsCurrent: { type: Boolean, default: true }
    },
    billing: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      sameAsCurrent: { type: Boolean, default: true }
    }
  },
  identification: {
    nationalId: { type: String, required: true, unique: true },
    passport: {
      number: String,
      country: String,
      expiryDate: Date
    },
    drivingLicense: {
      number: String,
      state: String,
      expiryDate: Date
    },
    socialSecurity: String,
    taxId: String
  },
  kyc: {
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'approved', 'rejected', 'expired'], 
      default: 'pending' 
    },
    level: { 
      type: String, 
      enum: ['basic', 'enhanced', 'premium'], 
      default: 'basic' 
    },
    riskRating: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    },
    submittedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    expiryDate: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    lastReviewDate: Date,
    nextReviewDate: Date,
    documentsRequired: [String],
    documentsSubmitted: [{
      type: String,
      url: String,
      submittedAt: { type: Date, default: Date.now },
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  },
  compliance: {
    amlStatus: { type: String, enum: ['clear', 'pending', 'flagged'], default: 'pending' },
    sanctionsScreening: {
      status: { type: String, enum: ['clear', 'pending', 'match'], default: 'pending' },
      lastChecked: Date,
      nextCheck: Date
    },
    pepScreening: {
      status: { type: String, enum: ['clear', 'pending', 'match'], default: 'pending' },
      lastChecked: Date,
      nextCheck: Date
    },
    watchlistScreening: {
      status: { type: String, enum: ['clear', 'pending', 'match'], default: 'pending' },
      lastChecked: Date,
      nextCheck: Date
    },
    riskAssessment: {
      score: { type: Number, min: 0, max: 100 },
      level: { type: String, enum: ['low', 'medium', 'high'] },
      factors: [String],
      lastAssessed: Date,
      assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  preferences: {
    communications: {
      marketing: { type: Boolean, default: false },
      transactional: { type: Boolean, default: true },
      security: { type: Boolean, default: true }
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    privacy: {
      dataSharing: { type: Boolean, default: false },
      analytics: { type: Boolean, default: true },
      profiling: { type: Boolean, default: false }
    }
  },
  limits: {
    daily: {
      sendAmount: { type: Number, default: 5000 },
      receiveAmount: { type: Number, default: 10000 },
      transactionCount: { type: Number, default: 10 }
    },
    monthly: {
      sendAmount: { type: Number, default: 50000 },
      receiveAmount: { type: Number, default: 100000 },
      transactionCount: { type: Number, default: 100 }
    },
    single: {
      maxTransactionAmount: { type: Number, default: 10000 }
    }
  },
  status: {
    account: { 
      type: String, 
      enum: ['active', 'inactive', 'suspended', 'closed', 'pending_verification'], 
      default: 'pending_verification' 
    },
    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false }
    },
    lastLogin: Date,
    lastTransaction: Date,
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  financial: {
    sourceOfFunds: { type: String, enum: ['salary', 'business', 'investment', 'inheritance', 'loan', 'other'] },
    estimatedMonthlyIncome: Number,
    bankAccounts: [{
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountType: { type: String, enum: ['checking', 'savings'] },
      isVerified: { type: Boolean, default: false },
      isPrimary: { type: Boolean, default: false }
    }],
    creditCards: [{
      last4Digits: String,
      cardType: String,
      expiryMonth: Number,
      expiryYear: Number,
      isVerified: { type: Boolean, default: false },
      isPrimary: { type: Boolean, default: false }
    }]
  },
  segments: [{
    name: String,
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  tags: [String],
  notes: [{
    content: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['general', 'compliance', 'support', 'sales'] },
    isInternal: { type: Boolean, default: false }
  }],
  relationships: [{
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'EnhancedCustomer' },
    relationship: { type: String, enum: ['spouse', 'child', 'parent', 'sibling', 'business_partner', 'authorized_user'] },
    addedAt: { type: Date, default: Date.now }
  }],
  analytics: {
    totalTransactions: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },
    averageTransactionAmount: { type: Number, default: 0 },
    preferredServices: [String],
    behaviorScore: { type: Number, min: 0, max: 100, default: 50 },
    loyaltyScore: { type: Number, min: 0, max: 100, default: 0 },
    riskScore: { type: Number, min: 0, max: 100, default: 50 },
    lastAnalyticsUpdate: { type: Date, default: Date.now }
  },
  metadata: {
    referralSource: String,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EnhancedCustomer' },
    acquisitionCost: Number,
    lifetimeValue: Number,
    churnRisk: { type: Number, min: 0, max: 1 },
    segmentationData: mongoose.Schema.Types.Mixed
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Encryption for sensitive fields
const encryptionKey = process.env.CUSTOMER_ENCRYPTION_KEY;
if (encryptionKey) {
  enhancedCustomerSchema.plugin(mongooseEncryption, {
    secret: encryptionKey,
    encryptedFields: [
      'personalInfo.firstName',
      'personalInfo.lastName',
      'contact.phone',
      'contact.email',
      'identification.nationalId',
      'identification.passport.number',
      'identification.drivingLicense.number',
      'identification.socialSecurity',
      'address.current.street',
      'financial.bankAccounts.accountNumber'
    ]
  });
}

// Compound indexes for performance and tenant isolation
enhancedCustomerSchema.index({ tenantId: 1, customerNumber: 1 }, { unique: true });
enhancedCustomerSchema.index({ platformId: 1, tenantId: 1, branchId: 1 });
enhancedCustomerSchema.index({ tenantId: 1, 'contact.email': 1 });
enhancedCustomerSchema.index({ tenantId: 1, 'contact.phone': 1 });
enhancedCustomerSchema.index({ tenantId: 1, 'identification.nationalId': 1 });
enhancedCustomerSchema.index({ tenantId: 1, 'kyc.status': 1 });
enhancedCustomerSchema.index({ tenantId: 1, 'status.account': 1 });
enhancedCustomerSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
enhancedCustomerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate customer number before saving
enhancedCustomerSchema.pre('save', async function(next) {
  if (this.isNew && !this.customerNumber) {
    const tenant = await mongoose.model('EnhancedTenant').findById(this.tenantId);
    const branch = await mongoose.model('EnhancedBranch').findById(this.branchId);
    
    if (tenant && branch) {
      const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
      this.customerNumber = `${tenant.code}${branch.code}${(count + 1).toString().padStart(6, '0')}`;
    }
  }
  next();
});

// Virtual for full name
enhancedCustomerSchema.virtual('fullName').get(function() {
  const parts = [this.personalInfo.firstName];
  if (this.personalInfo.middleName) parts.push(this.personalInfo.middleName);
  parts.push(this.personalInfo.lastName);
  return parts.join(' ');
});

// Virtual for age
enhancedCustomerSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Static methods
enhancedCustomerSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantId });
};

enhancedCustomerSchema.statics.findByBranch = function(branchId) {
  return this.find({ branchId });
};

enhancedCustomerSchema.statics.findByEmail = function(email, tenantId) {
  return this.findOne({ 'contact.email': email.toLowerCase(), tenantId });
};

enhancedCustomerSchema.statics.findByPhone = function(phone, tenantId) {
  return this.findOne({ 'contact.phone': phone, tenantId });
};

enhancedCustomerSchema.statics.findByNationalId = function(nationalId, tenantId) {
  return this.findOne({ 'identification.nationalId': nationalId, tenantId });
};

enhancedCustomerSchema.statics.searchCustomers = function(searchTerm, tenantId, options = {}) {
  const query = { tenantId };
  
  if (searchTerm) {
    query.$or = [
      { customerNumber: { $regex: searchTerm, $options: 'i' } },
      { 'personalInfo.firstName': { $regex: searchTerm, $options: 'i' } },
      { 'personalInfo.lastName': { $regex: searchTerm, $options: 'i' } },
      { 'contact.email': { $regex: searchTerm, $options: 'i' } },
      { 'contact.phone': { $regex: searchTerm, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .sort(options.sort || { createdAt: -1 });
};

// Instance methods
enhancedCustomerSchema.methods.getTransactionHistory = async function(limit = 20) {
  const Transaction = mongoose.model('Transaction');
  return await Transaction.find({
    $or: [
      { customerId: this._id },
      { 'metadata.customerId': this._id }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('branchId', 'name code');
};

enhancedCustomerSchema.methods.updateKycStatus = async function(status, reviewedBy, reason = null) {
  this.kyc.status = status;
  this.kyc.reviewedBy = reviewedBy;
  this.kyc.lastReviewDate = new Date();
  
  if (status === 'approved') {
    this.kyc.approvedAt = new Date();
    this.status.verification.identity = true;
    
    // Set next review date (annual review)
    const nextReview = new Date();
    nextReview.setFullYear(nextReview.getFullYear() + 1);
    this.kyc.nextReviewDate = nextReview;
    
  } else if (status === 'rejected') {
    this.kyc.rejectedAt = new Date();
    this.kyc.rejectionReason = reason;
  }
  
  await this.save();
};

enhancedCustomerSchema.methods.addNote = function(content, type, createdBy, isInternal = false) {
  const note = {
    content,
    type,
    createdBy,
    isInternal,
    createdAt: new Date()
  };
  
  this.notes.push(note);
  return note;
};

enhancedCustomerSchema.methods.addSegment = function(segmentName, addedBy) {
  if (!this.segments.find(s => s.name === segmentName)) {
    this.segments.push({
      name: segmentName,
      addedBy,
      addedAt: new Date()
    });
  }
};

enhancedCustomerSchema.methods.removeSegment = function(segmentName) {
  this.segments = this.segments.filter(s => s.name !== segmentName);
};

enhancedCustomerSchema.methods.updateAnalytics = async function() {
  const Transaction = mongoose.model('Transaction');
  
  const stats = await Transaction.aggregate([
    {
      $match: {
        $or: [
          { customerId: this._id },
          { 'metadata.customerId': this._id }
        ],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.analytics.totalTransactions = stats[0].totalTransactions;
    this.analytics.totalVolume = stats[0].totalVolume;
    this.analytics.averageTransactionAmount = stats[0].averageAmount;
    this.analytics.lastAnalyticsUpdate = new Date();
  }
  
  await this.save();
};

enhancedCustomerSchema.methods.isEligibleForService = function(serviceType) {
  if (this.status.account !== 'active') return false;
  if (this.kyc.status !== 'approved' && serviceType !== 'basic_exchange') return false;
  
  return true;
};

enhancedCustomerSchema.methods.hasExceededDailyLimit = async function(amount = 0) {
  const Transaction = mongoose.model('Transaction');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStats = await Transaction.aggregate([
    {
      $match: {
        $or: [
          { customerId: this._id },
          { 'metadata.customerId': this._id }
        ],
        createdAt: { $gte: today },
        status: { $in: ['completed', 'pending'] }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalCount: { $sum: 1 }
      }
    }
  ]);
  
  const todayAmount = todayStats.length > 0 ? todayStats[0].totalAmount : 0;
  const todayCount = todayStats.length > 0 ? todayStats[0].totalCount : 0;
  
  return {
    amount: (todayAmount + amount) > this.limits.daily.sendAmount,
    count: (todayCount + 1) > this.limits.daily.transactionCount
  };
};

enhancedCustomerSchema.methods.calculateRiskScore = function() {
  let score = 50; // Base score
  
  // KYC status impact
  if (this.kyc.status === 'approved') score -= 20;
  else if (this.kyc.status === 'pending') score += 10;
  else if (this.kyc.status === 'rejected') score += 30;
  
  // Compliance status impact
  if (this.compliance.amlStatus === 'flagged') score += 25;
  if (this.compliance.sanctionsScreening.status === 'match') score += 30;
  if (this.compliance.pepScreening.status === 'match') score += 20;
  
  // Transaction behavior impact
  if (this.analytics.totalTransactions > 100) score -= 10;
  if (this.analytics.averageTransactionAmount > 50000) score += 15;
  
  // Age impact
  const age = this.age;
  if (age && age < 25) score += 5;
  if (age && age > 65) score += 5;
  
  return Math.max(0, Math.min(100, score));
};

enhancedCustomerSchema.methods.getCustomerSummary = async function() {
  return {
    basic: {
      customerNumber: this.customerNumber,
      fullName: this.fullName,
      email: this.contact.email,
      phone: this.contact.phone,
      status: this.status.account,
      age: this.age
    },
    kyc: {
      status: this.kyc.status,
      level: this.kyc.level,
      riskRating: this.kyc.riskRating
    },
    analytics: this.analytics,
    riskScore: this.calculateRiskScore(),
    lastTransaction: this.status.lastTransaction,
    limits: this.limits,
    segments: this.segments.map(s => s.name)
  };
};

module.exports = mongoose.model('EnhancedCustomer', enhancedCustomerSchema);