const mongoose = require('mongoose');

const exchangeDealSchema = new mongoose.Schema({
  deal_id: { type: String, unique: true, required: true },
  customer_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  currency: { type: String, required: true, enum: ['IRR', 'AED', 'USD', 'EUR', 'USDT', 'BTC', 'ETH', 'BNB', 'XRP'] },
  amount: { type: Number, required: true },
  rate: { type: Number, required: true },
  total_price: { type: Number, required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  status: { type: String, enum: ['pending_payment', 'paid', 'completed', 'cancelled'], default: 'pending_payment' },
  delivery_type: { type: String, enum: ['in_person', 'remittance', 'holding'], default: 'in_person' },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

exchangeDealSchema.index({ deal_id: 1 });
exchangeDealSchema.index({ phone_number: 1 });
exchangeDealSchema.index({ status: 1 });

module.exports = mongoose.model('ExchangeDeal', exchangeDealSchema); 