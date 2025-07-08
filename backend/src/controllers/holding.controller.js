const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Receipt = require("../models/Receipt");
const User = require("../models/User");

// خلاصه دارایی‌ها و مانده‌ها
exports.overview = async (req, res) => {
  try {
    const wallets = await Wallet.find({
      userId: req.user.userId,
      isActive: true,
    });
    const summary = wallets.map((w) => ({
      currency: w.currency,
      type: w.type,
      balance: w.balance,
      locked: w.lockedAmount,
      available: w.available,
    }));
    res.json({ success: true, summary });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در دریافت دارایی‌ها",
        error: err.message,
      });
  }
};

// لیست تراکنش‌ها
exports.transactions = async (req, res) => {
  try {
    const { currency, type, status, from, to } = req.query;
    const filter = { userId: req.user.userId };
    if (currency) filter.currency = currency;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در دریافت تراکنش‌ها",
        error: err.message,
      });
  }
};

// لیست رسیدها و اسناد
exports.receipts = async (req, res) => {
  try {
    const { transactionId } = req.query;
    const filter = {};
    if (transactionId) filter.transactionId = transactionId;
    const receipts = await Receipt.find(filter).sort({ upload_time: -1 });
    res.json({ success: true, receipts });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در دریافت رسیدها",
        error: err.message,
      });
  }
};

// مشخصات حساب و لاگ ورود
exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "fullName phone branchId createdAt lastLogin",
    );
    // فرض: لاگ ورود در مدل User ذخیره شده است
    res.json({ success: true, profile: user });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در دریافت پروفایل",
        error: err.message,
      });
  }
};

// هشدارهای مهم (کاهش موجودی، سررسید، ...)
exports.alerts = async (req, res) => {
  try {
    const wallets = await Wallet.find({
      userId: req.user.userId,
      isActive: true,
    });
    const alerts = [];
    wallets.forEach((w) => {
      if (w.available < 10)
        alerts.push({
          currency: w.currency,
          type: "low_balance",
          message: "موجودی کم است",
        });
      // هشدارهای دیگر قابل افزودن است
    });
    res.json({ success: true, alerts });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در دریافت هشدارها",
        error: err.message,
      });
  }
};

// تغییر وضعیت هولد/تحویل برای یک تراکنش
exports.setHoldStatus = async (req, res) => {
  try {
    const { transactionId, holdStatus } = req.body; // holdStatus: 'hold' یا 'delivered'
    const userId = req.user.userId;

    const transaction = await Transaction.findOne({
      transactionId,
      customerId: userId,
    });
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "تراکنش یافت نشد" });

    transaction.holdStatus = holdStatus;
    transaction.status_history.push({
      status: transaction.status,
      holdStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason: `تغییر وضعیت به ${holdStatus}`,
    });
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "خطا در تغییر وضعیت هولد/تحویل",
        error: err.message,
      });
  }
};
