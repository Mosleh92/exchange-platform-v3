const CryptoOrder = require('../models/CryptoOrder');
const CryptoWallet = require('../models/CryptoWallet');
const CryptoTransaction = require('../models/CryptoTransaction');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const Account = require('../models/Account');

// ایجاد سفارش خرید/فروش
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { type, currency, amount, rate, fiatCurrency, fiatAmount, paymentMethod, receiveMethod, walletAddress, isInternalWallet } = req.body;
    const trackingCode = uuidv4();
    const order = await CryptoOrder.create({
      userId: req.user.userId,
      type,
      currency,
      amount,
      rate,
      fiatCurrency,
      fiatAmount,
      paymentMethod,
      receiveMethod,
      walletAddress,
      isInternalWallet,
      trackingCode,
      status: 'pending_payment',
      statusHistory: [{ status: 'pending_payment', changedBy: req.user.userId }]
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ثبت سفارش', error: err.message });
  }
};

// دریافت لیست سفارش‌های کاربر
exports.getOrders = async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.currency) filter.currency = req.query.currency;
    if (req.query.status) filter.status = req.query.status;
    const orders = await CryptoOrder.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در دریافت سفارش‌ها', error: err.message });
  }
};

// دریافت جزئیات یک سفارش
exports.getOrderById = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order || order.userId.toString() !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در دریافت سفارش', error: err.message });
  }
};

// آپلود یا ویرایش رسید بانکی یا هش بلاک‌چین
exports.uploadReceipt = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order || order.userId.toString() !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    const { fileUrl, txHash } = req.body;
    order.receipt = { fileUrl, txHash };
    order.status = 'paid';
    order.statusHistory.push({ status: 'paid', changedBy: req.user.userId });
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در بارگذاری رسید', error: err.message });
  }
};

// لغو سفارش
exports.cancelOrder = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order || order.userId.toString() !== req.user.userId) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'سفارش قابل لغو نیست' });
    }
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', changedBy: req.user.userId });
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در لغو سفارش', error: err.message });
  }
};

// تایید یا رد سفارش توسط اپراتور
exports.verifyOrder = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    const { status, adminNotes } = req.body; // status: 'confirmed' or 'rejected'
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'وضعیت نامعتبر است' });
    }
    order.status = status;
    order.adminNotes = adminNotes;
    order.operatorId = req.user.userId;
    order.statusHistory.push({ status, changedBy: req.user.userId });
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در تایید سفارش', error: err.message });
  }
};

// تسویه سفارش (انتقال ارز یا پرداخت وجه)
exports.settleOrder = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    // منطق انتقال ارز یا پرداخت وجه (در صورت نیاز به صورت دستی یا اتصال به کیف پول)
    order.status = 'under_review';
    order.statusHistory.push({ status: 'under_review', changedBy: req.user.userId });
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در تسویه سفارش', error: err.message });
  }
};

// ثبت معامله حضوری توسط اپراتور
exports.createInPersonOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const {
      type, currency, amount, rate, fiatCurrency, fiatAmount,
      paymentMethod, receiveMethod, walletAddress, isInternalWallet,
      customerName, customerPhone, operatorNotes
    } = req.body;
    const trackingCode = uuidv4();
    const order = await CryptoOrder.create({
      userId: req.user.userId,
      type,
      currency,
      amount,
      rate,
      fiatCurrency,
      fiatAmount,
      paymentMethod,
      receiveMethod,
      walletAddress,
      isInternalWallet,
      trackingCode,
      status: 'pending_payment',
      statusHistory: [{ status: 'pending_payment', changedBy: req.user.userId }],
      adminNotes: operatorNotes,
      meta: { customerName, customerPhone, inPerson: true }
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ثبت معامله حضوری', error: err.message });
  }
};

// علامت‌گذاری پرداخت نقدی توسط اپراتور (برای خرید)
exports.markCashPaid = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'سفارش قابل تغییر نیست' });
    }
    order.status = 'paid';
    order.statusHistory.push({ status: 'paid', changedBy: req.user.userId, notes: 'پرداخت نقدی انجام شد' });
    order.meta = { ...order.meta, cashPaid: true };
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ثبت پرداخت نقدی', error: err.message });
  }
};

// علامت‌گذاری دریافت نقدی توسط اپراتور (برای فروش)
exports.markCashReceived = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'سفارش قابل تغییر نیست' });
    }
    order.status = 'paid';
    order.statusHistory.push({ status: 'paid', changedBy: req.user.userId, notes: 'دریافت نقدی انجام شد' });
    order.meta = { ...order.meta, cashReceived: true };
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در ثبت دریافت نقدی', error: err.message });
  }
};

// تایید نهایی معامله توسط مدیر شعبه
exports.markVerified = async (req, res) => {
  try {
    const order = await CryptoOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'سفارش باید ابتدا پرداخت شود' });
    }
    // منطق حسابداری: بروزرسانی مانده صندوق و مشتری
    // 1. صندوق (Account)
    let cashAccount = await Account.findOne({
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
      currency: order.fiatCurrency,
      accountType: 'current',
      status: 'active'
    });
    if (!cashAccount) {
      cashAccount = await Account.create({
        accountNumber: Account.generateAccountNumber(order.fiatCurrency, req.user.tenantId),
        customerId: req.user.userId,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        currency: order.fiatCurrency,
        accountType: 'current',
        status: 'active',
        balance: 0,
        availableBalance: 0
      });
    }
    // 2. کیف پول داخلی مشتری (CryptoWallet)
    let wallet = await CryptoWallet.findOne({ userId: order.userId, currency: order.currency, isInternal: true });
    if (!wallet) {
      wallet = await CryptoWallet.create({
        userId: order.userId,
        currency: order.currency,
        address: `internal_${order.userId}_${order.currency}`,
        isInternal: true,
        balance: 0
      });
    }
    // 3. عملیات بر اساس نوع معامله
    let profit = 0, fee = order.fee || 0;
    if (order.type === 'buy') {
      // مشتری خریدار است: پول به صندوق اضافه، ارز به کیف پول افزوده
      cashAccount.balance += order.fiatAmount;
      cashAccount.availableBalance += order.fiatAmount;
      wallet.balance += order.amount;
      // سود صرافی از تفاوت نرخ (در صورت وجود)
      if (order.meta && order.meta.marketRate) {
        profit = (order.rate - order.meta.marketRate) * order.amount;
      }
      // ثبت تراکنش حسابداری
      await CryptoTransaction.create({
        orderId: order._id,
        walletId: wallet._id,
        userId: order.userId,
        type: 'deposit',
        currency: order.currency,
        amount: order.amount,
        status: 'confirmed',
        notes: 'خرید ارز دیجیتال حضوری توسط مشتری'
      });
      await CryptoTransaction.create({
        orderId: order._id,
        userId: req.user.userId,
        type: 'deposit',
        currency: order.fiatCurrency,
        amount: order.fiatAmount,
        status: 'confirmed',
        notes: 'دریافت وجه نقدی بابت خرید ارز دیجیتال'
      });
    } else if (order.type === 'sell') {
      // مشتری فروشنده است: ارز از کیف پول کسر، پول از صندوق کسر
      if (wallet.balance < order.amount) {
        return res.status(400).json({ success: false, message: 'موجودی کیف پول کافی نیست' });
      }
      wallet.balance -= order.amount;
      cashAccount.balance -= order.fiatAmount;
      cashAccount.availableBalance -= order.fiatAmount;
      // سود صرافی از تفاوت نرخ (در صورت وجود)
      if (order.meta && order.meta.marketRate) {
        profit = (order.meta.marketRate - order.rate) * order.amount;
      }
      // ثبت تراکنش حسابداری
      await CryptoTransaction.create({
        orderId: order._id,
        walletId: wallet._id,
        userId: order.userId,
        type: 'withdraw',
        currency: order.currency,
        amount: order.amount,
        status: 'confirmed',
        notes: 'فروش ارز دیجیتال حضوری توسط مشتری'
      });
      await CryptoTransaction.create({
        orderId: order._id,
        userId: req.user.userId,
        type: 'withdraw',
        currency: order.fiatCurrency,
        amount: order.fiatAmount,
        status: 'confirmed',
        notes: 'پرداخت وجه نقدی بابت فروش ارز دیجیتال'
      });
    }
    await cashAccount.save();
    await wallet.save();
    // 4. ثبت سود و کارمزد در سفارش
    order.status = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', changedBy: req.user.userId, notes: 'تایید نهایی و حسابداری انجام شد' });
    order.profit = profit;
    order.fee = fee;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در تایید نهایی و حسابداری معامله', error: err.message });
  }
};

// گزارش معاملات دیجیتال با فیلتر
exports.reportOrders = async (req, res) => {
  try {
    const { currency, status, operatorId, from, to } = req.query;
    const filter = {};
    if (currency) filter.currency = currency;
    if (status) filter.status = status;
    if (operatorId) filter.operatorId = operatorId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const orders = await CryptoOrder.find(filter).sort({ createdAt: -1 });
    // جمع سود، کارمزد، مبلغ کل
    const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const totalFee = orders.reduce((sum, o) => sum + (o.fee || 0), 0);
    const totalAmount = orders.reduce((sum, o) => sum + (o.fiatAmount || 0), 0);
    res.json({ success: true, orders, totalProfit, totalFee, totalAmount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در گزارش معاملات', error: err.message });
  }
};

// هشدار معاملات ناقص (سفارش‌های معطل)
exports.pendingAlerts = async (req, res) => {
  try {
    // سفارش‌هایی که در وضعیت "pending_payment" یا "paid" مانده‌اند
    const pendingOrders = await CryptoOrder.find({
      status: { $in: ['pending_payment', 'paid'] }
    }).sort({ createdAt: 1 });
    // محاسبه مدت زمان معطلی (بر حسب دقیقه)
    const now = new Date();
    const alerts = pendingOrders.map(order => ({
      _id: order._id,
      trackingCode: order.trackingCode,
      status: order.status,
      currency: order.currency,
      amount: order.amount,
      createdAt: order.createdAt,
      minutesPending: Math.floor((now - order.createdAt) / 60000),
      userId: order.userId
    }));
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در هشدار معاملات ناقص', error: err.message });
  }
}; 