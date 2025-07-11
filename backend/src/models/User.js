// backend/src/models/User.js - Updated with 2FA fields
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
    
    // SMS 2FA
    smsCode: {
        type: String,
        select: false
    },
    smsCodeExpiry: {
        type: Date,
        select: false
    },
    
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

module.exports = mongoose.model('User', userSchema);
