const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, required: true, enum: ['IRR', 'AED', 'USD', 'EUR', 'USDT', 'BTC', 'ETH', 'BNB', 'XRP'] },
  type: { type: String, enum: ['fiat', 'crypto'], required: true },
  balance: { type: Number, default: 0 },
  lockedAmount: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  label: { type: String },
  history: [{
    type: { type: String, enum: ['deposit', 'withdraw', 'trade', 'lock', 'unlock', 'adjustment'] },
    amount: Number,
    relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    createdAt: { type: Date, default: Date.now },
    notes: String
  }],
  meta: mongoose.Schema.Types.Mixed
});

walletSchema.index({ userId: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema); 