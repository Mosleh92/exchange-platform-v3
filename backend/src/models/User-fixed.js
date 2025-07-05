const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'نام کاربری الزامی است'],
        unique: true,
        trim: true,
        minlength: [3, 'نام کاربری باید حداقل 3 کاراکتر باشد'],
        maxlength: [50, 'نام کاربری نباید بیش از 50 کاراکتر باشد'],
        match: [/^[a-zA-Z0-9_]+$/, 'نام کاربری فقط می‌تواند شامل حروف، اعداد و _ باشد']
    },
    
    email: {
        type: String,
        required: [true, 'آدرس ایمیل الزامی است'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                return validator.isEmail(email);
            },
            message: 'آدرس ایمیل نامعتبر است'
        }
    },
    
    password: {
        type: String,
        required: [true, 'رمز عبور الزامی است'],
        minlength: [8, 'رمز عبور باید حداقل 8 کاراکتر باشد'],
        validate: {
            validator: function(password) {
                // At least one uppercase, one lowercase, one number, one special char
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
            },
            message: 'رمز عبور باید شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص باشد'
        }
    },
    
    fullName: {
        type: String,
        required: [true, 'نام کامل الزامی است'],
        trim: true,
        minlength: [2, 'نام کامل باید حداقل 2 کاراکتر باشد'],
        maxlength: [100, 'نام کامل نباید بیش از 100 کاراکتر باشد']
    },
    
    phone: {
        type: String,
        required: [true, 'شماره تلفن الزامی است'],
        validate: {
            validator: function(phone) {
                return validator.isMobilePhone(phone, 'fa-IR');
            },
            message: 'شماره تلفن نامعتبر است'
        }
    },
    
    nationalId: {
        type: String,
        required: [true, 'کد ملی الزامی است'],
        unique: true,
        validate: {
            validator: function(nationalId) {
                // Iranian national ID validation
                if (!/^\d{10}$/.test(nationalId)) return false;
                
                const digits = nationalId.split('').map(Number);
                const checkDigit = digits[9];
                
                let sum = 0;
                for (let i = 0; i < 9; i++) {
                    sum += digits[i] * (10 - i);
                }
                
                const remainder = sum % 11;
                return (remainder < 2 && checkDigit === remainder) || 
                       (remainder >= 2 && checkDigit === 11 - remainder);
            },
            message: 'کد ملی نامعتبر است'
        }
    },
    
    role: {
        type: String,
        enum: ['super_admin', 'tenant_admin', 'branch_manager', 'employee', 'customer'],
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
        ref: 'Branch',
        required: function() {
            return ['branch_manager', 'employee'].includes(this.role);
        }
    },
    
    permissions: [{
        resource: {
            type: String,
            required: true
        },
        actions: [{
            type: String,
            required: true
        }]
    }],
    
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'suspended'],
        default: 'pending'
    },
    
    // **اصلاح شده**: Login attempts tracking
    loginAttempts: {
        type: Number,
        default: 0
    },
    
    lockUntil: {
        type: Date
    },
    
    lastLogin: {
        type: Date
    },
    
    // **جدید**: Security fields
    twoFactorSecret: {
        type: String,
        select: false
    },
    
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    
    backupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    
    // **جدید**: Profile fields
    avatar: {
        type: String
    },
    
    timezone: {
        type: String,
        default: 'Asia/Tehran'
    },
    
    language: {
        type: String,
        enum: ['fa', 'en'],
        default: 'fa'
    },
    
    // **جدید**: Audit fields
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
            delete ret.password;
            delete ret.twoFactorSecret;
            delete ret.backupCodes;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// **اصلاح شده**: Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// **اصلاح شده**: Virtual for checking if user is super admin
userSchema.virtual('isSuperAdmin').get(function() {
    return this.role === 'super_admin';
});

// **اصلاح شده**: Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// **اصلاح شده**: Pre-save middleware for data sanitization
userSchema.pre('save', function(next) {
    // **اصلاح شده**: Only sanitize non-email fields
    if (this.isModified('fullName')) {
        this.fullName = validator.escape(this.fullName.trim());
    }
    
    if (this.isModified('email')) {
        this.email = validator.normalizeEmail(this.email);
    }
    
    if (this.isModified('phone')) {
        this.phone = this.phone.replace(/[^\d+]/g, '');
    }
    
    if (this.isModified('nationalId')) {
        this.nationalId = this.nationalId.replace(/\D/g, '');
    }
    
    next();
});

// **اصلاح شده**: Instance method for comparing password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('خطا در مقایسه رمز عبور');
    }
};

// **اصلاح شده**: Instance method for incrementing login attempts
userSchema.methods.incLoginAttempts = async function() {
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

// **اصلاح شده**: Instance method for resetting login attempts
userSchema.methods.resetLoginAttempts = async function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

// **جدید**: Static method for finding active users
userSchema.statics.findActive = function() {
    return this.find({ status: 'active' });
};

// **جدید**: Static method for finding users by tenant
userSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenantId, status: 'active' });
};

// **جدید**: Static method for getting user statistics
userSchema.statics.getUserStats = async function(tenantId) {
    const matchStage = tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {};
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$count' },
                statusCounts: {
                    $push: {
                        status: '$_id',
                        count: '$count'
                    }
                }
            }
        }
    ]);
};

// **جدید**: Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ nationalId: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
