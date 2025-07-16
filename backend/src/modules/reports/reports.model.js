const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
  branch: { type: mongoose.Types.ObjectId, ref: 'Branch' },
  type: { 
    type: String, 
    enum: ['daily', 'financial', 'p2p', 'transactions', 'custom'], 
    required: true 
  },
  data: { type: Object, required: true },
  generatedAt: { type: Date, default: Date.now },
  filters: { type: Object }
});

module.exports = mongoose.model('Report', reportSchema);
