// backend/src/models/p2p/P2PAnnouncement.js
const mongoose = require('mongoose');

const p2pAnnouncementSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    required: true
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  paymentMethods: [{
    type: String,
    enum: ['cash', 'bank_transfer', 'online_payment', 'crypto']
  }],
  description: String,
  terms: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  },
  validUntil: Date,
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

p2pAnnouncementSchema.index({ tenantId: 1, status: 1 });
p2pAnnouncementSchema.index({ fromCurrency: 1, toCurrency: 1 });
p2pAnnouncementSchema.index({ userId: 1 });
p2pAnnouncementSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('P2PAnnouncement', p2pAnnouncementSchema);
