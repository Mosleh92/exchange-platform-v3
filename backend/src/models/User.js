const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 100
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    phone: {
        type: String,
        trim: true
    },
    nationalId: {
        type: String,
        trim: true
    },
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
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'pending'
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    profileImage: {
        type: String
    },
    preferences: {
        language: {
            type: String,
            enum: ['fa', 'en'],
            default: 'fa'
        },
        timezone: {
            type: String,
            default: 'Asia/Tehran'
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        }
    },
    permissions: [{
        resource: String,
        actions: [String]
    }],
    metadata: {
        ipAddress: String,
        userAgent: String,
        lastActivity: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: String
    },
    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Virtual for isLocked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for isSuperAdmin
userSchema.virtual('isSuperAdmin').get(function() {
    return this.role === 'super_admin';
});

// Virtual for isTenantAdmin
userSchema.virtual('isTenantAdmin').get(function() {
    return this.role === 'tenant_admin';
});

// Pre-save middleware to hash password and escape sensitive string fields
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        
        // Escape sensitive string fields
        if (this.isModified('username')) this.username = validator.escape(this.username);
        if (this.isModified('fullName')) this.fullName = validator.escape(this.fullName);
        if (this.isModified('email')) this.email = validator.escape(this.email);
        if (this.isModified('phone')) this.phone = validator.escape(this.phone);
        
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after 5 failed attempts
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// Method to check permission
userSchema.methods.hasPermission = function(resource, action) {
    if (this.isSuperAdmin) return true;
    
    const permission = this.permissions.find(p => p.resource === resource);
    return permission && permission.actions.includes(action);
};

// Method to add permission
userSchema.methods.addPermission = function(resource, actions) {
    const existingPermission = this.permissions.find(p => p.resource === resource);
    
    if (existingPermission) {
        existingPermission.actions = [...new Set([...existingPermission.actions, ...actions])];
    } else {
        this.permissions.push({ resource, actions });
    }
    
    return this.save();
};

// Method to remove permission
userSchema.methods.removePermission = function(resource, action) {
    const permission = this.permissions.find(p => p.resource === resource);
    
    if (permission) {
        permission.actions = permission.actions.filter(a => a !== action);
        
        if (permission.actions.length === 0) {
            this.permissions = this.permissions.filter(p => p.resource !== resource);
        }
    }
    
    return this.save();
};

// Static method to create super admin
userSchema.statics.createSuperAdmin = async function(userData) {
    const superAdmin = new this({
        ...userData,
        role: 'super_admin',
        status: 'active',
        emailVerified: true,
        phoneVerified: true
    });
    
    return superAdmin.save();
};

// Static method to create tenant admin
userSchema.statics.createTenantAdmin = async function(userData, tenantId) {
    const tenantAdmin = new this({
        ...userData,
        role: 'tenant_admin',
        tenantId,
        status: 'active',
        emailVerified: true,
        phoneVerified: true
    });
    
    return tenantAdmin.save();
};

// Static method to get users by tenant
userSchema.statics.getByTenant = function(tenantId, filters = {}) {
    const query = { tenantId, ...filters };
    return this.find(query).populate('branchId', 'name');
};

// Static method to get super admins
userSchema.statics.getSuperAdmins = function() {
    return this.find({ role: 'super_admin', status: 'active' });
};

// Static method to get tenant admins
userSchema.statics.getTenantAdmins = function() {
    return this.find({ role: 'tenant_admin' }).populate('tenantId', 'name code');
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function(tenantId = null) {
    const matchStage = tenantId ? { tenantId } : {};
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                pendingUsers: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                suspendedUsers: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                byRole: {
                    $push: {
                        role: '$role',
                        status: '$status'
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('User', userSchema);