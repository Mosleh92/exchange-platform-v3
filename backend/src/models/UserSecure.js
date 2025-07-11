// backend/src/models/UserSecure.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const encryption = require('../utils/encryption');
const securityAudit = require('../utils/securityAudit');

/**
 * Enhanced User model with field-level encryption for sensitive data
 */
const userSecureSchema = new mongoose.Schema({
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
    
    // Encrypted personal information
    firstName: {
        type: String,
        required: true,
        set: function(value) {
            return encryption.encrypt(value);
        },
        get: function(value) {
            try {
                return encryption.decrypt(value);
            } catch (error) {
                return value; // Return as-is if decryption fails (for backward compatibility)
            }
        }
    },
    lastName: {
        type: String,
        required: true,
        set: function(value) {
            return encryption.encrypt(value);
        },
        get: function(value) {
            try {
                return encryption.decrypt(value);
            } catch (error) {
                return value;
            }
        }
    },
    
    // Encrypted phone number
    phone: {
        type: String,
        required: true,
        set: function(value) {
            return encryption.encrypt(value);
        },
        get: function(value) {
            try {
                return encryption.decrypt(value);
            } catch (error) {
                return value;
            }
        }
    },
    
    // Encrypted national ID
    nationalId: {
        type: String,
        set: function(value) {
            return value ? encryption.encrypt(value) : value;
        },
        get: function(value) {
            if (!value) return value;
            try {
                return encryption.decrypt(value);
            } catch (error) {
                return value;
            }
        }
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
    dateOfBirth: {
        type: Date,
        set: function(value) {
            return value ? encryption.encrypt(value.toISOString()) : value;
        },
        get: function(value) {
            if (!value) return value;
            try {
                return new Date(encryption.decrypt(value));
            } catch (error) {
                return value;
            }
        }
    },
    
    // Encrypted address
    address: {
        street: {
            type: String,
            set: function(value) {
                return value ? encryption.encrypt(value) : value;
            },
            get: function(value) {
                if (!value) return value;
                try {
                    return encryption.decrypt(value);
                } catch (error) {
                    return value;
                }
            }
        },
        city: {
            type: String,
            set: function(value) {
                return value ? encryption.encrypt(value) : value;
            },
            get: function(value) {
                if (!value) return value;
                try {
                    return encryption.decrypt(value);
                } catch (error) {
                    return value;
                }
            }
        },
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
    isLocked: {
        type: Boolean,
        default: false
    },
    
    // Security tracking
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    lastLogin: Date,
    passwordChangedAt: {
        type: Date,
        default: Date.now
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
        select: false,
        set: function(value) {
            return value ? encryption.encrypt(value) : value;
        },
        get: function(value) {
            if (!value) return value;
            try {
                return encryption.decrypt(value);
            } catch (error) {
                return value;
            }
        }
    },
    twoFactorBackupCodes: [{
        code: {
            type: String,
            select: false,
            set: function(value) {
                return value ? encryption.encrypt(value) : value;
            },
            get: function(value) {
                if (!value) return value;
                try {
                    return encryption.decrypt(value);
                } catch (error) {
                    return value;
                }
            }
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
    
    // Session tracking
    activeSessions: [{
        sessionId: String,
        deviceFingerprint: String,
        ipAddress: String,
        userAgent: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Financial information (encrypted)
    bankAccounts: [{
        accountNumber: {
            type: String,
            set: function(value) {
                return value ? encryption.encrypt(value) : value;
            },
            get: function(value) {
                if (!value) return value;
                try {
                    return encryption.decrypt(value);
                } catch (error) {
                    return value;
                }
            }
        },
        routingNumber: {
            type: String,
            set: function(value) {
                return value ? encryption.encrypt(value) : value;
            },
            get: function(value) {
                if (!value) return value;
                try {
                    return encryption.decrypt(value);
                } catch (error) {
                    return value;
                }
            }
        },
        bankName: String,
        accountType: String,
        isDefault: Boolean
    }],
    
    // Preferences
    preferences: {
        language: {
            type: String,
            default: 'fa'
        },
        timezone: {
            type: String,
            default: 'Asia/Tehran'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        security: {
            requireTwoFactor: {
                type: Boolean,
                default: false
            },
            sessionTimeout: {
                type: Number,
                default: 30 // minutes
            }
        }
    },
    
    // Audit fields
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
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for performance and security
userSecureSchema.index({ email: 1 });
userSecureSchema.index({ tenantId: 1, role: 1 });
userSecureSchema.index({ isActive: 1, isLocked: 1 });
userSecureSchema.index({ kycStatus: 1 });
userSecureSchema.index({ createdAt: 1 });

// Virtual for checking if account is locked
userSecureSchema.virtual('isCurrentlyLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSecureSchema.pre('save', async function(next) {
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
        this.passwordChangedAt = new Date();
        
        // Log password change
        securityAudit.trackAuth(securityAudit.securityEvents.USER_CREATED, {
            userId: this._id,
            action: 'password_changed'
        });
    }
    
    // Update timestamp
    this.updatedAt = new Date();
    
    next();
});

// Methods
userSecureSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSecureSchema.methods.incLoginAttempts = async function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // If we have hit max attempts and it's not locked yet, lock it
    if (this.loginAttempts + 1 >= 5 && !this.isCurrentlyLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
        
        // Log account lock
        securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_BLOCKED, {
            userId: this._id,
            loginAttempts: this.loginAttempts + 1
        });
    }
    
    return this.updateOne(updates);
};

userSecureSchema.methods.resetLoginAttempts = async function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

userSecureSchema.methods.addSession = async function(sessionData) {
    this.activeSessions.push(sessionData);
    
    // Keep only last 10 sessions
    if (this.activeSessions.length > 10) {
        this.activeSessions = this.activeSessions.slice(-10);
    }
    
    return this.save();
};

userSecureSchema.methods.removeSession = async function(sessionId) {
    this.activeSessions = this.activeSessions.filter(s => s.sessionId !== sessionId);
    return this.save();
};

userSecureSchema.methods.clearAllSessions = async function() {
    this.activeSessions = [];
    return this.save();
};

// Statics
userSecureSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSecureSchema.statics.findActiveUsers = function() {
    return this.find({ isActive: true, isLocked: false });
};

module.exports = mongoose.model('UserSecure', userSecureSchema);