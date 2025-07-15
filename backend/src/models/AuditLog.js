const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const auditLogSchema = new mongoose.Schema({
  tenant_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  user_id: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  resource_type: {
    type: String,
    required: true,
  },
  resource_id: {
    type: ObjectId,
  },
  old_values: {
    type: Object,
  },
  new_values: {
    type: Object,
  },
  ip_address: {
    type: String,
  },
  user_agent: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
