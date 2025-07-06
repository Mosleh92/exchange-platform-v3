const mongoose = require('mongoose');

const DiscrepancySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  expected: { type: Number, required: true },
  paid: { type: Number, required: true },
  status: { type: String, enum: ['unmatched', 'overpaid', 'underpaid', 'matched'], default: 'unmatched' },
  createdAt: { type: Date, default: Date.now }
});

DiscrepancySchema.index({ tenantId: 1 });
DiscrepancySchema.index({ branchId: 1 });
DiscrepancySchema.index({ transactionId: 1 });
DiscrepancySchema.index({ status: 1 });

module.exports = mongoose.model('Discrepancy', DiscrepancySchema); 