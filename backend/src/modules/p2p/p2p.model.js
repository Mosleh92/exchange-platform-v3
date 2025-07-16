const mongoose = require('mongoose');

const p2pSchema = new mongoose.Schema({
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  sender: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('P2P', p2pSchema);
