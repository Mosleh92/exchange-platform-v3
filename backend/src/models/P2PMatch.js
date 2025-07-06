const mongoose = require('mongoose');

const P2PMatchSchema = new mongoose.Schema({
  buyOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'P2POrder', required: true },
  sellOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'P2POrder', required: true },
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'disputed', 'cancelled'], default: 'pending' },
  buyerConfirmed: { type: Boolean, default: false },
  sellerConfirmed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('P2PMatch', P2PMatchSchema); 