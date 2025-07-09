const Accounting = require('./accounting.model');

// ثبت سند حسابداری جدید
exports.createEntry = async (req, res) => {
  try {
    const { tenant, branch, _id: user } = req.user;
    const entry = new Accounting({ ...req.body, tenant, branch, user });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت همه اسناد حسابداری (با امکان فیلتر)
exports.getEntries = async (req, res) => {
  try {
    const { tenant } = req.user;
    const filter = { tenant, ...req.query };
    const entries = await Accounting.find(filter).sort('-createdAt').limit(100);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ویرایش سند حسابداری
exports.updateEntry = async (req, res) => {
  try {
    const { tenant } = req.user;
    const entry = await Accounting.findOneAndUpdate(
      { _id: req.params.id, tenant },
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
    const { tenant } = req.user;
    const entry = await Accounting.findOneAndDelete({ _id: req.params.id, tenant });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
