const mongoose = require('mongoose');

/**
 * Activity Log Model
 * Tracks all user activities and system events
 */
const activityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Some activities might be system-generated
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
    actionType: {
        type: String,
        required: true,
        enum: [
            'LOGIN', 'LOGOUT', 'CREATE_TRANSACTION', 'UPDATE_TRANSACTION', 'DELETE_TRANSACTION',
            'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'CREATE_TENANT', 'UPDATE_TENANT',
            'PAYMENT_CREATED', 'PAYMENT_VERIFIED', 'PAYMENT_RECEIPT_ADDED', 'RATE_UPDATED',
            'REPORT_GENERATED', 'BACKUP_CREATED', 'SYSTEM_CONFIG_CHANGED'
        ]
    },
    actionDescription: {
        type: String,
        required: true
    },
    details: {
        userAgent: String,
        ip: String,
        method: String,
        path: String,
        timestamp: Date,
        // Additional custom details as needed
        paymentId: mongoose.Schema.Types.ObjectId,
        dealId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        receiptId: mongoose.Schema.Types.ObjectId,
        approved: Boolean,
        notes: String,
        reportType: String,
        format: String,
        filters: mongoose.Schema.Types.Mixed,
        // System-level details
        action: String,
        retentionDays: Number,
        deletedCount: Number
    },
    metadata: {
        sessionId: String,
        requestId: String,
        manualLog: Boolean,
        loggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    collection: 'activity_logs'
});

// Indexes for performance
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ tenantId: 1, timestamp: -1 });
activityLogSchema.index({ branchId: 1, timestamp: -1 });
activityLogSchema.index({ actionType: 1, timestamp: -1 });
activityLogSchema.index({ severity: 1, timestamp: -1 });

// TTL index to automatically delete old logs (optional)
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

module.exports = mongoose.model('ActivityLog', activityLogSchema);