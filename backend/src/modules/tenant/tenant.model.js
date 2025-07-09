const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  branches: [{ type: mongoose.Types.ObjectId, ref: 'Branch' }],
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', tenantSchema);
