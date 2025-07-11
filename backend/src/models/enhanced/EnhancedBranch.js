// backend/src/models/enhanced/EnhancedBranch.js
const mongoose = require('mongoose');

/**
 * Enhanced Branch Model - Third level of the hierarchy
 * Platform → Tenant → Branch → Customer
 */
const enhancedBranchSchema = new mongoose.Schema({
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
  parentBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EnhancedBranch',
    default: null // For hierarchical branches
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['headquarters', 'main', 'sub', 'virtual', 'agent', 'kiosk'],
    default: 'sub'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'pending_approval'
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 5 // Maximum branch hierarchy depth
  },
  location: {
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      postalCode: String,
      country: { type: String, required: true }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    timezone: { type: String, default: 'UTC' },
    region: String,
    landmark: String
  },
  contact: {
    phone: String,
    email: String,
    fax: String,
    website: String,
    emergencyContact: String
  },
  operatingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } },
    holidays: [{ date: Date, description: String }]
  },
  configuration: {
    services: {
      cashExchange: { type: Boolean, default: true },
      remittance: { type: Boolean, default: true },
      p2pTrading: { type: Boolean, default: false },
      cryptoTrading: { type: Boolean, default: false },
      bankTransfers: { type: Boolean, default: true },
      checkCashing: { type: Boolean, default: false },
      billPayments: { type: Boolean, default: false }
    },
    limits: {
      dailyCashLimit: { type: Number, default: 50000 },
      transactionLimit: { type: Number, default: 10000 },
      monthlyVolumeLimit: { type: Number, default: 1000000 },
      maxCustomersPerDay: { type: Number, default: 200 },
      maxConcurrentTransactions: { type: Number, default: 10 }
    },
    fees: {
      exchangeFeePercentage: { type: Number, default: 0.5 },
      remittanceFeeFlat: { type: Number, default: 5 },
      remittanceFeePercentage: { type: Number, default: 1.0 },
      minimumFee: { type: Number, default: 1 },
      maximumFee: { type: Number, default: 50 }
    },
    security: {
      kycRequired: { type: Boolean, default: true },
      maxDailyAmountWithoutKYC: { type: Number, default: 1000 },
      biometricEnabled: { type: Boolean, default: false },
      cameraRequired: { type: Boolean, default: true },
      documentsRequired: { type: Boolean, default: true }
    },
    compliance: {
      amlChecks: { type: Boolean, default: true },
      sanctionsScreening: { type: Boolean, default: true },
      transactionReporting: { type: Boolean, default: true },
      suspiciousActivityReporting: { type: Boolean, default: true },
      recordKeepingDays: { type: Number, default: 2555 } // 7 years
    }
  },
  staff: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { 
      type: String, 
      enum: ['manager', 'cashier', 'agent', 'security', 'supervisor'],
      required: true 
    },
    permissions: [String],
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    isActive: { type: Boolean, default: true },
    shiftSchedule: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      startTime: String,
      endTime: String
    }]
  }],
  equipment: [{
    type: { 
      type: String, 
      enum: ['computer', 'printer', 'scanner', 'cash_counter', 'camera', 'safe', 'atm', 'pos_terminal'],
      required: true 
    },
    brand: String,
    model: String,
    serialNumber: String,
    status: { type: String, enum: ['active', 'maintenance', 'broken', 'retired'], default: 'active' },
    purchaseDate: Date,
    warrantyExpiry: Date,
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date
  }],
  inventory: {
    cashOnHand: [{
      currency: { type: String, required: true },
      amount: { type: Number, required: true },
      lastUpdated: { type: Date, default: Date.now }
    }],
    supplies: [{
      item: String,
      quantity: Number,
      unit: String,
      minimumStock: Number,
      lastRestocked: Date
    }]
  },
  metrics: {
    dailyStats: {
      transactionCount: { type: Number, default: 0 },
      transactionVolume: { type: Number, default: 0 },
      customerCount: { type: Number, default: 0 },
      averageTransactionAmount: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    monthlyStats: {
      transactionCount: { type: Number, default: 0 },
      transactionVolume: { type: Number, default: 0 },
      customerCount: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    },
    performance: {
      averageServiceTime: { type: Number, default: 0 }, // in minutes
      customerSatisfactionScore: { type: Number, default: 0, min: 0, max: 10 },
      uptime: { type: Number, default: 100 }, // percentage
      lastPerformanceUpdate: { type: Date, default: Date.now }
    }
  },
  notifications: {
    lowCashAlert: { type: Boolean, default: true },
    highVolumeAlert: { type: Boolean, default: true },
    systemDownAlert: { type: Boolean, default: true },
    securityAlert: { type: Boolean, default: true },
    complianceAlert: { type: Boolean, default: true }
  },
  integrations: {
    bankingPartners: [{
      bankName: String,
      bankCode: String,
      accountNumber: String,
      routingNumber: String,
      isActive: { type: Boolean, default: true }
    }],
    paymentProcessors: [{
      processor: String,
      merchantId: String,
      apiKey: String,
      isActive: { type: Boolean, default: true }
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Compound indexes for performance
enhancedBranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
enhancedBranchSchema.index({ platformId: 1, tenantId: 1 });
enhancedBranchSchema.index({ parentBranchId: 1 });
enhancedBranchSchema.index({ status: 1 });
enhancedBranchSchema.index({ type: 1 });
enhancedBranchSchema.index({ 'location.coordinates': '2dsphere' }); // For geospatial queries
enhancedBranchSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
enhancedBranchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for branch hierarchy path
enhancedBranchSchema.virtual('hierarchyPath').get(function() {
  // This would need to be populated with actual parent branch data
  return this.parentBranchId ? `${this.parentBranchId}/${this._id}` : this._id.toString();
});

// Static methods
enhancedBranchSchema.statics.findByTenant = function(tenantId) {
  return this.find({ tenantId });
};

enhancedBranchSchema.statics.findActiveBranches = function() {
  return this.find({ status: 'active' });
};

enhancedBranchSchema.statics.findByLocation = function(coordinates, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  });
};

enhancedBranchSchema.statics.findByType = function(type, tenantId = null) {
  const query = { type };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

// Instance methods
enhancedBranchSchema.methods.getCustomerCount = async function() {
  const EnhancedCustomer = mongoose.model('EnhancedCustomer');
  return await EnhancedCustomer.countDocuments({ branchId: this._id });
};

enhancedBranchSchema.methods.getTodayTransactionCount = async function() {
  const Transaction = mongoose.model('Transaction');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await Transaction.countDocuments({
    branchId: this._id,
    createdAt: { $gte: today }
  });
};

enhancedBranchSchema.methods.getTodayVolume = async function() {
  const Transaction = mongoose.model('Transaction');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await Transaction.aggregate([
    {
      $match: {
        branchId: this._id,
        createdAt: { $gte: today },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalVolume: { $sum: '$amount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalVolume : 0;
};

enhancedBranchSchema.methods.getSubBranches = function() {
  return this.constructor.find({ parentBranchId: this._id });
};

enhancedBranchSchema.methods.addStaffMember = function(userId, role, permissions = []) {
  const staffMember = {
    userId,
    role,
    permissions,
    startDate: new Date(),
    isActive: true
  };
  
  this.staff.push(staffMember);
  return staffMember;
};

enhancedBranchSchema.methods.removeStaffMember = function(userId) {
  const staffIndex = this.staff.findIndex(s => s.userId.toString() === userId.toString());
  if (staffIndex > -1) {
    this.staff[staffIndex].isActive = false;
    this.staff[staffIndex].endDate = new Date();
    return true;
  }
  return false;
};

enhancedBranchSchema.methods.updateCashInventory = function(currency, amount) {
  const cashIndex = this.inventory.cashOnHand.findIndex(c => c.currency === currency);
  
  if (cashIndex > -1) {
    this.inventory.cashOnHand[cashIndex].amount = amount;
    this.inventory.cashOnHand[cashIndex].lastUpdated = new Date();
  } else {
    this.inventory.cashOnHand.push({
      currency,
      amount,
      lastUpdated: new Date()
    });
  }
};

enhancedBranchSchema.methods.isOpenNow = function() {
  const now = new Date();
  const day = now.toLocaleLowerCase().substring(0, 3) + 'day'; // e.g., 'monday'
  const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1430 for 2:30 PM
  
  const schedule = this.operatingHours[day];
  if (!schedule || schedule.closed) return false;
  
  const openTime = parseInt(schedule.open.replace(':', ''));
  const closeTime = parseInt(schedule.close.replace(':', ''));
  
  return currentTime >= openTime && currentTime <= closeTime;
};

enhancedBranchSchema.methods.hasExceededDailyLimit = async function() {
  const todayVolume = await this.getTodayVolume();
  return todayVolume >= this.configuration.limits.dailyVolumeLimit;
};

enhancedBranchSchema.methods.canProvideService = function(serviceType) {
  return this.configuration.services[serviceType] === true && this.status === 'active';
};

enhancedBranchSchema.methods.updateDailyStats = async function() {
  const transactionCount = await this.getTodayTransactionCount();
  const transactionVolume = await this.getTodayVolume();
  const customerCount = await this.getCustomerCount();
  
  this.metrics.dailyStats = {
    transactionCount,
    transactionVolume,
    customerCount,
    averageTransactionAmount: transactionCount > 0 ? transactionVolume / transactionCount : 0,
    lastUpdated: new Date()
  };
  
  await this.save();
};

enhancedBranchSchema.methods.getDashboardStats = async function() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return {
    basic: {
      name: this.name,
      code: this.code,
      type: this.type,
      status: this.status,
      isOpen: this.isOpenNow()
    },
    daily: {
      transactions: await this.getTodayTransactionCount(),
      volume: await this.getTodayVolume(),
      customers: await this.getCustomerCount()
    },
    limits: this.configuration.limits,
    cashOnHand: this.inventory.cashOnHand,
    staff: this.staff.filter(s => s.isActive).length,
    performance: this.metrics.performance
  };
};

module.exports = mongoose.model('EnhancedBranch', enhancedBranchSchema);