const Accounting = require('./accounting.model');

// ثبت سند حسابداری جدید
exports.createEntry = async (req, res) => {
  try {
    const entry = new Accounting({
      ...req.body,
      tenant: req.user.tenant,
      branch: req.user.branch,
      user: req.user._id
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت لیست اسناد با فیلتر
exports.getEntries = async (req, res) => {
  try {
    const { tenant } = req.user;
    const filter = { tenant };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.currency) filter.currency = req.query.currency;
    if (req.query.branch) filter.branch = req.query.branch;
    if (req.query.customer) filter.customer = req.query.customer;
    const entries = await Accounting.find(filter).sort({ date: -1 }).limit(100);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// دریافت یک سند خاص
exports.getEntryById = async (req, res) => {
  try {
    const entry = await Accounting.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ویرایش سند حسابداری
exports.updateEntry = async (req, res) => {
  try {
    const entry = await Accounting.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true }
    );
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// حذف سند حسابداری
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await Accounting.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
