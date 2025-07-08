// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Never include in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: function() {
      return ['STAFF', 'BRANCH_MANAGER'].includes(this.role);
    },
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['SUPER_ADMIN', 'TENANT_ADMIN', 'BRANCH_MANAGER', 'STAFF', 'CUSTOMER'],
      message: 'Invalid role'
    },
    required: [true, 'Role is required'],
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'READ_USERS', 'WRITE_USERS', 'DELETE_USERS',
      'READ_TRANSACTIONS', 'WRITE_TRANSACTIONS', 'DELETE_TRANSACTIONS',
      'READ_RATES', 'WRITE_RATES',
      'READ_REPORTS', 'WRITE_REPORTS',
      'MANAGE_BRANCHES', 'MANAGE_SETTINGS',
      'APPROVE_TRANSACTIONS', 'MANAGE_P2P'
    ]
  }],
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
    max: [10000000, 'Balance exceeds maximum limit'],
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  currencies: [{
    code: {
      type: String,
      required: true,
      length: 3,
      uppercase: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000000
    }
  }],
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v);
      },
      message: 'Invalid phone number'
    }
  },
  address: {
    street: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    postalCode: { type: String, maxlength: 20 },
    country: { type: String, maxlength: 100 }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
    default: 'PENDING_VERIFICATION'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  profileImage: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isURL(v);
      },
      message: 'Invalid profile image URL'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// ===== COMPOUND INDEXES FOR MULTI-TENANT QUERIES =====
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, branchId: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ tenantId: 1, createdAt: -1 });

// ===== MIDDLEWARE =====
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// ===== METHODS =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementFailedLogins = async function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.accountLocked = true;
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
  
  await this.save();
};

userSchema.methods.resetFailedLogins = async function() {
  this.failedLoginAttempts = 0;
  this.accountLocked = false;
  this.lockUntil = null;
  await this.save();
};

userSchema.methods.isLocked = function() {
  return this.accountLocked && this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.twoFactorSecret;
  return user;
};

// ===== STATIC METHODS =====
userSchema.statics.findByTenant = function(tenantId, query = {}) {
  return this.find({ tenantId, ...query });
};

userSchema.statics.findByTenantAndBranch = function(tenantId, branchId, query = {}) {
  return this.find({ tenantId, branchId, ...query });
};

const User = mongoose.model('User', userSchema);

// ===== TRANSACTION MODEL =====
const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'From user ID is required']
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'To user ID is required']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch ID is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    max: [1000000, 'Amount exceeds maximum limit'],
    set: v => Math.round(v * 100) / 100
  },
  currencyFrom: {
    type: String,
    required: [true, 'From currency is required'],
    length: 3,
    uppercase: true
  },
  currencyTo: {
    type: String,
    required: [true, 'To currency is required'],
    length: 3,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    required: [true, 'Exchange rate is required'],
    min: [0, 'Exchange rate must be positive']
  },
  convertedAmount: {
    type: Number,
    required: [true, 'Converted amount is required'],
    min: [0, 'Converted amount must be positive']
  },
  fees: {
    type: Number,
    default: 0,
    min: [0, 'Fees cannot be negative']
  },
  type: {
    type: String,
    enum: ['EXCHANGE', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'P2P'],
    required: [true, 'Transaction type is required']
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING',
    index: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  reference: {
    type: String,
    maxlength: [100, 'Reference cannot exceed 100 characters'],
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  failureReason: {
    type: String,
    maxlength: [200, 'Failure reason cannot exceed 200 characters']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ===== TRANSACTION INDEXES =====
transactionSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, fromUserId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, toUserId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });

// ===== TRANSACTION MIDDLEWARE =====
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

transactionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// ===== TRANSACTION METHODS =====
transactionSchema.methods.approve = async function(approvedBy) {
  this.status = 'PROCESSING';
  this.approvedBy = approvedBy;
  this.approvedAt = Date.now();
  await this.save();
};

transactionSchema.methods.complete = async function(processedBy) {
  this.status = 'COMPLETED';
  this.processedBy = processedBy;
  this.processedAt = Date.now();
  await this.save();
};

transactionSchema.methods.fail = async function(reason) {
  this.status = 'FAILED';
  this.failureReason = reason;
  await this.save();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

// ===== P2P ANNOUNCEMENT MODEL =====
const p2pAnnouncementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: [true, 'Branch ID is required']
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: [true, 'Announcement type is required']
  },
  currencyFrom: {
    type: String,
    required: [true, 'From currency is required'],
    length: 3,
    uppercase: true
  },
  currencyTo: {
    type: String,
    required: [true, 'To currency is required'],
    length: 3,
    uppercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    max: [1000000, 'Amount exceeds maximum limit']
  },
  rate: {
    type: Number,
    required: [true, 'Exchange rate is required'],
    min: [0, 'Rate must be positive']
  },
  minAmount: {
    type: Number,
    min: [0.01, 'Minimum amount must be greater than 0']
  },
  maxAmount: {
    type: Number,
    min: [0.01, 'Maximum amount must be greater than 0']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE',
    index: true
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE', 'TENANT_ONLY'],
    default: 'PUBLIC'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  completedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Completed amount cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ===== P2P INDEXES =====
p2pAnnouncementSchema.index({ status: 1, createdAt: -1 });
p2pAnnouncementSchema.index({ currencyFrom: 1, currencyTo: 1, status: 1 });
p2pAnnouncementSchema.index({ tenantId: 1, status: 1 });
p2pAnnouncementSchema.index({ expiresAt: 1 });

// ===== P2P METHODS =====
p2pAnnouncementSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    type: this.type,
    currencyFrom: this.currencyFrom,
    currencyTo: this.currencyTo,
    amount: this.amount,
    rate: this.rate,
    minAmount: this.minAmount,
    maxAmount: this.maxAmount,
    description: this.description,
    completedAmount: this.completedAmount,
    createdAt: this.createdAt
    // No tenantId, userId, or other sensitive info
  };
};

const P2PAnnouncement = mongoose.model('P2PAnnouncement', p2pAnnouncementSchema);

// ===== AUDIT LOG MODEL =====
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false
  },
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'TENANT_ADMIN', 'BRANCH_MANAGER', 'STAFF', 'CUSTOMER']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
      'TRANSACTION_CREATED', 'TRANSACTION_APPROVED', 'TRANSACTION_COMPLETED',
      'BALANCE_UPDATED', 'RATE_UPDATED',
      'RBAC_VIOLATION', 'PERMISSION_VIOLATION', 'RATE_LIMIT_EXCEEDED',
      'API_ACCESS', 'FILE_UPLOAD', 'WEBSOCKET_CONNECTION',
      'SYSTEM_ERROR', 'SECURITY_ALERT'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  endpoint: {
    type: String,
    required: false
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    required: false
  },
  statusCode: {
    type: Number,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// ===== AUDIT LOG INDEXES =====
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  User,
  Transaction,
  P2PAnnouncement,
  AuditLog
};
