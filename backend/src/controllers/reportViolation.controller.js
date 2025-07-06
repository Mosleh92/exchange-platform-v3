const ReportViolation = require('../models/ReportViolation');

exports.create = async (req, res) => {
  try {
    const { type, description } = req.body;
    if (!type || !description) return res.status(400).json({ error: 'نوع و توضیح الزامی است.' });
    const report = await ReportViolation.create({
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
      userId: req.user._id,
      type,
      description
    });
    res.status(201).json({ id: report._id });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ثبت گزارش تخلف.' });
  }
};

exports.list = async (req, res) => {
  try {
    // فقط مدیران tenant یا super_admin می‌توانند همه گزارش‌ها را ببینند
    if (!['tenant_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
    }
    const filter = { tenantId: req.user.tenantId };
    if (req.query.status) filter.status = req.query.status;
    const reports = await ReportViolation.find(filter).sort({ createdAt: -1 });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت گزارش‌ها.' });
  }
}; 