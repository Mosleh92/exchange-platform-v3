// backend/src/models/remittance/RemittanceTracking.js
const mongoose = require('mongoose');

const remittanceTrackingSchema = new mongoose.Schema({
  remittanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Remittance',
    required: true
  },
  trackingEvents: [{
    status: {
      type: String,
      enum: ['created', 'verified', 'processing', 'partner_sent', 'partner_received', 'delivered', 'cancelled', 'failed'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      country: String,
      city: String,
      office: String
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }],
  currentStatus: {
    type: String,
    enum: ['created', 'verified', 'processing', 'partner_sent', 'partner_received', 'delivered', 'cancelled', 'failed'],
    default: 'created'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  smsNotifications: [{
    phoneNumber: String,
    message: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  emailNotifications: [{
    email: String,
    subject: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }]
}, {
  timestamps: true
});

remittanceTrackingSchema.index({ remittanceId: 1 });
remittanceTrackingSchema.index({ currentStatus: 1 });
remittanceTrackingSchema.index({ 'trackingEvents.timestamp': -1 });

module.exports = mongoose.model('RemittanceTracking', remittanceTrackingSchema);
