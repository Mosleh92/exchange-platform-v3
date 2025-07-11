const mongoose = require('mongoose');

/**
 * Enhanced Payment Model for Multi-stage Payments
 * Supports multiple receipts, verification stages, and complex payment workflows
 */

// Receipt sub-schema
const receiptSchema = new mongoose.Schema({
    receiverName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'IRR'
    },
    receiptUrl: {
        type: String,
        required: true
    },
    bankInfo: {
        accountNumber: String,
        bankName: String,
        branchName: String
    },
    transactionId: String,
    notes: String,
    status: {
        type: String,
        enum: ['UPLOADED', 'VERIFIED', 'REJECTED'],
        default: 'UPLOADED'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: true });

// Payment stage sub-schema
const stageSchema = new mongoose.Schema({
    stageNumber: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    receiptId: {
        type: mongoose.Schema.Types.ObjectId
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected'],
        default: 'pending'
    },
    completedAt: Date,
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

// Main payment schema
const paymentSchema = new mongoose.Schema({
    // Legacy fields for backward compatibility
    payment_id: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    deal_id: { 
        type: String
    },
    paid_amount: { 
        type: Number
    },
    payment_date: { 
        type: Date
    },
    bank_account: { 
        type: String
    },
    receipt_image: { 
        type: String
    },
    verified: { 
        type: Boolean, 
        default: false 
    },
    recorded_by: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    description: { 
        type: String
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    },

    // New enhanced fields
    dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deal',
        required: function() { return !this.deal_id; }
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
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
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'IRR'
    },
    status: {
        type: String,
        enum: ['در انتظار', 'پرداخت جزئی', 'پرداخت کامل', 'تایید شده', 'رد شده', 'لغو شده'],
        default: 'در انتظار'
    },
    receipts: [receiptSchema],
    stages: [stageSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: Date,
    metadata: {
        dealType: String,
        customerInfo: {
            name: String,
            phone: String,
            email: String
        },
        isMultiStage: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    collection: 'payments'
});

// Indexes for performance
paymentSchema.index({ payment_id: 1 });
paymentSchema.index({ deal_id: 1 });
paymentSchema.index({ dealId: 1 });
paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ branchId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ verified: 1 });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ 'receipts.status': 1 });

// Virtual for payment progress
paymentSchema.virtual('progress').get(function() {
    return {
        percentage: this.totalAmount > 0 ? (this.paidAmount / this.totalAmount) * 100 : 0,
        isComplete: this.paidAmount >= this.totalAmount,
        receiptsCount: this.receipts.length,
        stagesCount: this.stages.length
    };
});

// Pre-save middleware to sync legacy fields
paymentSchema.pre('save', function(next) {
    // Sync new fields to legacy fields for backward compatibility
    if (this.isNew || this.isModified('paidAmount')) {
        this.paid_amount = this.paidAmount;
    }
    if (this.isNew || this.isModified('dealId')) {
        this.deal_id = this.dealId ? this.dealId.toString() : this.deal_id;
    }
    if (this.isNew || this.isModified('createdBy')) {
        this.recorded_by = this.createdBy;
    }
    if (this.isNew || this.isModified('status')) {
        this.verified = this.status === 'تایید شده';
    }
    if (this.isNew) {
        this.created_at = this.createdAt || new Date();
        this.payment_date = this.createdAt || new Date();
    }

    next();
});

module.exports = mongoose.model('Payment', paymentSchema); 