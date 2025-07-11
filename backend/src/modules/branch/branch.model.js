const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  country: { type: String },
  city: { type: String },
  address: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Branch', branchSchema);
