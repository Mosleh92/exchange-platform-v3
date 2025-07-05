const AuditLog = require('../models/AuditLog');

exports.getLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('user', 'username email');
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 