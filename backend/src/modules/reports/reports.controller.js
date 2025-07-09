const Report = require('./reports.model');

// تولید گزارش جدید
exports.createReport = async (req, res) => {
  try {
    const { tenant, branch } = req.user;
    const report = new Report({ ...req.body, tenant, branch });
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت لیست گزارش‌ها
exports.getReports = async (req, res) => {
  try {
    const { tenant } = req.user;
    const reports = await Report.find({ tenant }).sort('-generatedAt').limit(100);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
