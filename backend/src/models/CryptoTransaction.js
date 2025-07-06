const mongoose = require('mongoose');

const cryptoTransactionSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CryptoOrder', required: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'CryptoWallet' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdraw', 'trade', 'fee', 'network_fee', 'adjustment'], required: true },
  currency: { type: String, enum: ['USDT', 'BTC', 'ETH', 'BNB', 'XRP'], required: true },
  amount: { type: Number, required: true },
  txHash: { type: String }, // هش بلاک‌چین
  status: { type: String, enum: ['pending', 'confirmed', 'failed', 'cancelled'], default: 'pending' },
  confirmations: { type: Number, default: 0 },
  networkFee: { type: Number, default: 0 },
  blockNumber: { type: Number },
  explorerUrl: { type: String },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  meta: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

cryptoTransactionSchema.index({ txHash: 1 });
cryptoTransactionSchema.index({ userId: 1, createdAt: -1 });
cryptoTransactionSchema.index({ orderId: 1 });

module.exports = mongoose.model('CryptoTransaction', cryptoTransactionSchema); 