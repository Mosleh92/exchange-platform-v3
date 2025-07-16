// backend/src/models/Transaction.js
const mongoose = require('mongoose');
const PersianUtils = require('../utils/persian');
const validator = require('validator');

const transactionSchema = new mongoose.Schema({
    // شناسه تراکنش
    transactionId: {
        type: String,
        required: true,
        unique: true
    },
    
    // ارتباط با Tenant
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    
    // اطلاعات مشتری
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customer_name: {
        type: String,
        required: true
    },
    
    // اطلاعات تراکنش
    type: {
        type: String,
        enum: [
            'currency_buy',      // خرید ارز
            'currency_sell',     // فروش ارز
            'transfer',          // انتقال بین حساب‌ها
            'remittance',        // حواله
            'deposit',           // واریز
            'withdrawal',        // برداشت
            'loan',              // وام
            'interest',          // سود
            'fee',               // کارمزد
            'refund',            // بازگشت
            'adjustment'         // تعدیل
        ],
        required: true
    },
    fromCurrency: {
        type: String,
        required: true
    },
    toCurrency: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    exchangeRate: {
        type: Number,
        required: true,
        min: 0
    },
    convertedAmount: {
        type: Number,
        required: true,
        min: 0
    },
    commission: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    remainingAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: [
            'cash',              // نقدی
            'bank_transfer',     // انتقال بانکی
            'card',              // کارت
            'crypto',            // ارز دیجیتال
            'check',             // چک
            'multiple'           // چندگانه
        ],
        required: true
    },
    
    // Multiple payment support
    payments: [{
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment'
        },
        amount: Number,
        currency: String,
        method: String,
        status: String,
        date: Date
    }],
    
    // Multiple receipts support
    receipts: [{
        filePath: String,
        fileName: String,
        fileSize: Number,
        mimeType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        description: String,
        verified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verifiedAt: Date
    }],
    
    // Delivery Method and Details
    deliveryMethod: {
        type: String,
        enum: [
            'physical',          // فیزیکی
            'bank_transfer',     // انتقال بانکی
            'account_credit',    // اعتبار به حساب
            'crypto_wallet'      // کیف پول ارز دیجیتال
        ],
        required: true
    },
    bank_details: {
        bank_name: String,
        account_number: String,
        iban: String,
        swift_code: String,
        recipient_name: String,
        _id: false // Prevents Mongoose from creating an _id for this subdocument
    },
    in_person_delivery_details: {
        recipient_full_name: String,
        recipient_id_number: String,
        recipient_id_document_url: String,
        delivery_agent_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        delivery_status: {
            type: String,
            enum: ['pending_pickup', 'picked_up', 'failed_pickup', null],
            default: null
        },
        delivery_date: Date,
        _id: false
    },
    
    // وضعیت تراکنش
    status: {
        type: String,
        enum: [
            'pending',           // در انتظار پرداخت
            'partial_paid',      // پرداخت جزئی
            'completed',         // تکمیل شده
            'cancelled',         // لغو شده
            'failed',            // ناموفق
            'refunded'           // بازگشت شده
        ],
        default: 'pending'
    },
    holdStatus: {
        type: String,
        enum: ['hold', 'delivered'],
        default: 'hold'
    },
    status_history: [{
        status: String,
        holdStatus: String,
        changed_by: mongoose.Schema.Types.ObjectId,
        changed_at: Date,
        reason: String
    }],
    
    // اطلاعات اضافی
    reference_number: String,
    receipt_url: String, // Field for deposit receipt URL
    notes: {
        customer: String,
        staff: String,
        system: String
    },
    
    // اطلاعات ثبت کننده
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_by_name: {
        type: String,
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
    },
    
    // اطلاعات فارسی
    persian_date: {
        type: String,
        default: function() {
            return PersianUtils.toJalaliDate(this.created_at);
        }
    },
    persian_time: {
        type: String,
        default: function() {
            return PersianUtils.toJalaliTime(this.created_at);
        }
    },
    
    // Customer information
    customer_type: {
        type: String,
        enum: ['individual', 'business', 'government'],
        default: 'individual'
    },
    customer_national_id: String,
    customer_phone: String,
    customer_email: String,
    
    // Transaction workflow
    workflow: {
        current_step: {
            type: String,
            enum: ['payment_pending', 'payment_received', 'verification_pending', 'approved', 'processing', 'completed'],
            default: 'payment_pending'
        },
        steps: [{
            step: String,
            status: {
                type: String,
                enum: ['pending', 'completed', 'failed'],
                default: 'pending'
            },
            completed_by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            completed_at: Date,
            notes: String
        }]
    },
    
    // Security and verification
    security: {
        verification_code: String,
        two_factor_verified: {
            type: Boolean,
            default: false
        },
        ip_whitelist: [String],
        device_fingerprint: String
    },
    
    // Transaction status and flow
    transaction_flow: {
        status: {
            type: String,
            enum: ['pending_payment', 'payment_received', 'processing', 'completed', 'cancelled'],
            default: 'pending_payment'
        },
        payment_type: {
            type: String,
            enum: ['direct_deposit', 'hold', 'transfer'],
            default: 'direct_deposit'
        },
        payment_destination: {
            type: String,
            enum: ['exchange_account', 'other_accounts', 'hold'],
            default: 'exchange_account'
        }
    },
    
    // Multi-account payment details
    split_payments: [{
        account_name: String,
        account_number: String,
        bank_name: String,
        amount: Number,
        currency: String,
        receipt_url: String,
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending'
        },
        receipt_uploaded_at: Date,
        receipt_verified_at: Date,
        verified_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Payment tracking
    payment_status: {
        type: String,
        enum: ['pending', 'partial', 'completed', 'cancelled'],
        default: 'pending'
    },
    payment_details: {
        total_amount: Number,
        paid_amount: Number,
        remaining_amount: Number,
        payment_method: {
            type: String,
            enum: ['cash', 'bank_transfer', 'card', 'crypto', 'other']
        },
        payment_reference: String,
        payment_notes: String,
        receipts: [{
            amount: Number,
            receipt_url: String,
            uploaded_at: Date,
            verified_at: Date,
            verified_by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },
    
    // Exchange account details
    exchange_account: {
        account_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExchangeAccount'
        },
        balance: {
            type: Number,
            default: 0
        },
        currency: String
    },
    
    // Additional metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: {
            country: String,
            city: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        },
        deviceInfo: {
            type: String,
            os: String,
            browser: String
        },
        session_id: String,
        tenant_id: mongoose.Schema.Types.ObjectId,
        customer_portal_url: String,
        payment_deadline: Date,
        exchange_notes: String,
        customer_notes: String
    },
    
    // Audit information
    audit: {
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        cancelledAt: Date,
        reason: String
    },
    description: {
        type: String,
        maxlength: 500
    },
    reference: {
        type: String,
        maxlength: 100
    },
    note: {
        type: String,
        maxlength: 300
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Enhanced Database Indexes for Performance
transactionSchema.index({ tenantId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, status: 1 });
transactionSchema.index({ tenantId: 1, type: 1 });
transactionSchema.index({ tenantId: 1, customerId: 1 });
transactionSchema.index({ tenantId: 1, fromCurrency: 1, toCurrency: 1 });
transactionSchema.index({ tenantId: 1, paymentMethod: 1 });
transactionSchema.index({ tenantId: 1, deliveryMethod: 1 });
transactionSchema.index({ tenantId: 1, 'status_history.changed_at': -1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ 'payments.paymentId': 1 });
transactionSchema.index({ 'receipts.verified': 1 });

// Compound indexes for complex queries
transactionSchema.index({ tenantId: 1, type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
transactionSchema.index({ tenantId: 1, fromCurrency: 1, toCurrency: 1, createdAt: -1 });

// Text search index for customer name
transactionSchema.index({ customer_name: 'text' });

// Virtual for isCompleted
transactionSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

// Virtual for isPending
transactionSchema.virtual('isPending').get(function() {
    return this.status === 'pending';
});

// Virtual for isPartial
transactionSchema.virtual('isPartial').get(function() {
    return this.status === 'partial_paid';
});

// Static method to generate transaction ID
transactionSchema.statics.generateTransactionId = function() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN${timestamp}${random}`;
};

// Method to calculate remaining amount
transactionSchema.methods.calculateRemaining = function() {
    const totalPaid = this.payments
        .filter(p => p.verified)
        .reduce((sum, p) => sum + p.amount, 0);
    
    this.paidAmount = totalPaid;
    this.remainingAmount = Math.max(0, this.totalAmount - totalPaid);
    
    // Update status based on payment
    if (this.remainingAmount === 0) {
        this.status = 'completed';
    } else if (this.paidAmount > 0) {
        this.status = 'partial_paid';
    } else {
        this.status = 'pending';
    }
    
    return this.save();
};

// Method to add payment
transactionSchema.methods.addPayment = function(paymentData) {
    this.payments.push(paymentData);
    return this.calculateRemaining();
};

// Method to verify payment
transactionSchema.methods.verifyPayment = function(paymentIndex, verifiedBy) {
    if (paymentIndex >= 0 && paymentIndex < this.payments.length) {
        this.payments[paymentIndex].verified = true;
        this.payments[paymentIndex].verifiedBy = verifiedBy;
        this.payments[paymentIndex].verifiedAt = new Date();
        return this.calculateRemaining();
    }
    throw new Error('پرداخت یافت نشد');
};

// Method to cancel transaction
transactionSchema.methods.cancel = function(reason, cancelledBy) {
    if (this.status === 'completed') {
        throw new Error('تراکنش تکمیل شده قابل لغو نیست');
    }
    
    this.status = 'cancelled';
    this.audit.cancelledBy = cancelledBy;
    this.audit.cancelledAt = new Date();
    this.audit.reason = reason;
    
    return this.save();
};

// Method to approve transaction
transactionSchema.methods.approve = function(approvedBy) {
    this.audit.approvedBy = approvedBy;
    this.audit.approvedAt = new Date();
    return this.save();
};

// Static method to get transaction statistics
transactionSchema.statics.getStats = async function(tenantId, filters = {}) {
    const matchStage = { tenantId, ...filters };
    
    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$paidAmount' },
                totalRemaining: { $sum: '$remainingAmount' },
                totalCommission: { $sum: '$commission' },
                byStatus: {
                    $push: {
                        status: '$status',
                        amount: '$totalAmount'
                    }
                },
                byType: {
                    $push: {
                        type: '$type',
                        amount: '$totalAmount'
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalCommission: 0,
        byStatus: [],
        byType: []
    };
};

transactionSchema.pre('save', function(next) {
    if (this.isModified('description')) this.description = validator.escape(this.description);
    if (this.isModified('reference')) this.reference = validator.escape(this.reference);
    if (this.isModified('note')) this.note = validator.escape(this.note);
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);