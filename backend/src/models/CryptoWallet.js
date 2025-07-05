const mongoose = require('mongoose');

const cryptoWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, enum: ['USDT', 'BTC', 'ETH', 'BNB', 'XRP'], required: true },
  address: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  isInternal: { type: Boolean, default: false }, // آیا کیف پول داخلی است؟
  label: { type: String }, // نام مستعار کیف پول
  history: [{
    type: { type: String, enum: ['deposit', 'withdraw', 'trade', 'adjustment'] },
    amount: Number,
    txHash: String,
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'CryptoOrder' },
    createdAt: { type: Date, default: Date.now },
    notes: String
  }],
  meta: mongoose.Schema.Types.Mixed
});

cryptoWalletSchema.index({ userId: 1, currency: 1, address: 1 }, { unique: true });

module.exports = mongoose.model('CryptoWallet', cryptoWalletSchema); 