const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic user information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    
    // Role and tenant
    role: {
        type: String,
        enum: ['super_admin', 'tenant_admin', 'manager', 'staff', 'customer'],
        default: 'customer'
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: function() {
            return this.role !== 'super_admin';
        }
    },
    
    // Profile information
    avatar: String,
    dateOfBirth: Date,
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    // KYC information
    kycStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'none'],
        default: 'none'
    },
    kycDocuments: [{
        type: {
            type: String,
            enum: ['passport', 'national_id', 'driver_license', 'utility_bill', 'bank_statement']
        },
        url: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        reviewedAt: Date,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rejectionReason: String
    }],
    
    // 2FA Configuration
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false // Don't include in regular queries
    },
    twoFactorBackupCodes: [{
        code: {
            type: String,
            select: false
        },
        used: {
            type: Boolean,
            default: false
        },
        usedAt: Date
    }],
    twoFactorLastUsed: Date,
    
    // Security settings
    ipWhitelist: [{
        ip: String,
        description: String,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    allowedIPs: [String], // For IP whitelisting
    
    // Login tracking
    lastLoginAt: Date,
    lastLoginIP: String,
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockoutUntil: Date,
    
    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Email verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // API access
    apiKeys: [{
        name: String,
        key: String,
        secret: String,
        permissions: [String],
        isActive: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastUsed: Date
    }],
    
    // Notifications preferences
    notifications: {
        email: {
            login: { type: Boolean, default: true },
            transaction: { type: Boolean, default: true },
            security: { type: Boolean, default: true },
            marketing: { type: Boolean, default: false }
        },
        sms: {
            login: { type: Boolean, default: false },
            transaction: { type: Boolean, default: true },
            security: { type: Boolean, default: true }
        },
        push: {
            login: { type: Boolean, default: false },
            transaction: { type: Boolean, default: true },
            security: { type: Boolean, default: true }
        }
    },
    
    // Audit trail
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            // Remove sensitive fields from JSON output
            delete ret.password;
            delete ret.twoFactorSecret;
            delete ret.twoFactorBackupCodes;
            delete ret.passwordResetToken;
            delete ret.emailVerificationToken;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment failed login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockoutUntil: 1 },
            $set: { failedLoginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { failedLoginAttempts: 1 } };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockoutUntil: Date.now() + 2 * 60 * 60 * 1000 };
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { failedLoginAttempts: 1, lockoutUntil: 1 }
    });
};

// Method to generate API key
userSchema.methods.generateApiKey = function() {
    const crypto = require('crypto');
    return {
        key: crypto.randomBytes(32).toString('hex'),
        secret: crypto.randomBytes(64).toString('hex')
    };
};

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
    const rolePermissions = {
        super_admin: ['*'],
        tenant_admin: ['tenant.*', 'user.*', 'transaction.*', 'report.*'],
        manager: ['user.read', 'transaction.*', 'report.read'],
        staff: ['user.read', 'transaction.read', 'transaction.create'],
        customer: ['profile.*', 'transaction.own', 'wallet.own']
    };
    
    const permissions = rolePermissions[this.role] || [];
    return permissions.includes('*') || permissions.includes(permission) || 
           permissions.some(p => p.endsWith('.*') && permission.startsWith(p.slice(0, -1)));
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
=======
module.exports = mongoose.model('User', userSchema);
 main