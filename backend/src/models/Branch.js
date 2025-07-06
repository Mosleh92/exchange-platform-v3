const mongoose = require('mongoose');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['main', 'branch', 'sub_branch'],
    default: 'branch'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  address: {
    country: { type: String, required: true },
    city: { type: String, required: true },
    street: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: String,
    email: String,
    fax: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  staff: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['staff', 'manager', 'cashier'] },
    assignedAt: { type: Date, default: Date.now }
  }],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  services: [{
    type: String,
    enum: ['currency_exchange', 'remittance', 'banking', 'crypto'],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  }],
  limits: {
    dailyTransactionLimit: { type: Number, default: 1000000000 },
    monthlyTransactionLimit: { type: Number, default: 10000000000 },
    maxCashAmount: { type: Number, default: 100000000 }
  },
  settings: {
    allowInternational: { type: Boolean, default: true },
    allowCrypto: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    autoApprovalLimit: { type: Number, default: 10000000 }
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
  }
}, {
  timestamps: true
});

// Indexes
branchSchema.index({ branchId: 1 });
branchSchema.index({ tenantId: 1 });
branchSchema.index({ code: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ 'address.city': 1 });

// Static method to generate branch ID
branchSchema.statics.generateBranchId = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BR${timestamp}${random}`;
};

// Static method to generate branch code
branchSchema.statics.generateBranchCode = function(tenantId, city) {
  const cityCode = city.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${cityCode}${timestamp}`;
};

// Method to add staff member
branchSchema.methods.addStaff = function(userId, role) {
  const existingStaff = this.staff.find(s => s.userId.toString() === userId.toString());
  if (existingStaff) {
    existingStaff.role = role;
    existingStaff.assignedAt = new Date();
  } else {
    this.staff.push({ userId, role, assignedAt: new Date() });
  }
  return this.save();
};

// Method to remove staff member
branchSchema.methods.removeStaff = function(userId) {
  this.staff = this.staff.filter(s => s.userId.toString() !== userId.toString());
  return this.save();
};

// Method to check if service is available
branchSchema.methods.hasService = function(service) {
  const serviceConfig = this.services.find(s => s.type === service);
  return serviceConfig && serviceConfig.status === 'active';
};

// Method to get active staff
branchSchema.methods.getActiveStaff = function() {
  return this.staff.filter(s => s.status !== 'inactive');
};

// Static method to get branches by tenant
branchSchema.statics.getByTenant = function(tenantId, filters = {}) {
  const query = { tenantId, ...filters };
  return this.find(query).populate('manager', 'name email');
};

// Static method to get branch statistics
branchSchema.statics.getBranchStats = async function(tenantId) {
  return this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: null,
        totalBranches: { $sum: 1 },
        activeBranches: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalStaff: { $sum: { $size: '$staff' } },
        byType: {
          $push: {
            type: '$type',
            name: '$name'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Branch', branchSchema); 