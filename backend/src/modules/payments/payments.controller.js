const Payment = require('./payments.model');

// ثبت پرداخت جدید
exports.createPayment = async (req, res) => {
  try {
    const { tenant, branch, _id: user } = req.user;
    const payment = new Payment({ ...req.body, tenant, branch, user });
    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// دریافت لیست پرداخت‌ها
exports.getPayments = async (req, res) => {
  try {
    const { tenant } = req.user;
    const payments = await Payment.find({ tenant }).sort('-createdAt').limit(100);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// بروزرسانی وضعیت پرداخت
exports.updatePayment = async (req, res) => {
  try {
    const { tenant } = req.user;
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, tenant },
      req.body,
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
