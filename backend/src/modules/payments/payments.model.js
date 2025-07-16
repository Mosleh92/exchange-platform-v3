const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  branch: { type: mongoose.Types.ObjectId, ref: 'Branch' },
  user: { type: mongoose.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'fee', 'commission'], required: true },
  method: { type: String, enum: ['cash', 'bank', 'check', 'internal'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  relatedAccounts: [{ type: mongoose.Types.ObjectId, ref: 'Account' }],
  description: { type: String },
  receiptUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
