const mongoose = require('mongoose');

const ReportViolationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['p2p', 'financial', 'other'], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

ReportViolationSchema.index({ tenantId: 1 });
ReportViolationSchema.index({ status: 1 });

module.exports = mongoose.model('ReportViolation', ReportViolationSchema); 