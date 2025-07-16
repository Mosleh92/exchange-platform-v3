const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  plan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    required: true
  },
  features: [{
    name: String,
    enabled: Boolean,
    limit: Number
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'canceled', 'suspended'],
    default: 'pending'
  },
  nextRenewalDate: {
    type: Date
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  billingInfo: {
    method: String,
    lastBilled: Date,
    nextBilling: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema); 