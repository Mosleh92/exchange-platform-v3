const P2P = require('./p2p.model');

// ثبت معامله جدید P2P
exports.createP2P = async (req, res) => {
  try {
    const { tenant, _id: sender } = req.user;
    const p2p = new P2P({ ...req.body, tenant, sender });
    await p2p.save();
    res.status(201).json(p2p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت لیست معاملات P2P
exports.getP2Ps = async (req, res) => {
  try {
    const { tenant } = req.user;
    const p2ps = await P2P.find({ tenant }).sort('-createdAt').limit(100);
    res.json(p2ps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// تغییر وضعیت معامله P2P
exports.updateP2P = async (req, res) => {
  try {
    const { tenant } = req.user;
    const p2p = await P2P.findOneAndUpdate(
      { _id: req.params.id, tenant },
      req.body,
      { new: true }
    );
    if (!p2p) return res.status(404).json({ error: 'Not found' });
    res.json(p2p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
