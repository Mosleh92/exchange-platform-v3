const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // create, update, delete, login, logout, etc.
  resource: { type: String, required: true }, // نام مدل یا جدول (مثلاً Transaction, Customer)
  resourceId: { type: mongoose.Schema.Types.ObjectId }, // شناسه رکورد
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  ip: String,
  details: mongoose.Schema.Types.Mixed, // جزئیات تغییرات (قبل/بعد)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema); 