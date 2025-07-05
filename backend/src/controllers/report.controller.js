const Transaction = require('../models/CustomerTransaction');
const { reconcileTransactions } = require('../services/reconciliationService');
const Discrepancy = require('../models/Discrepancy');
const ExcelJS = require('exceljs');
const Account = require('../models/Account');

exports.dailyVolume = async (req, res) => {
  const { companyId, days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await Transaction.aggregate([
    { $match: { company: companyId, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        volume: { $sum: "$amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  res.json({ dailyVolume: result });
};

exports.profitAndLoss = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { from, to } = req.query;
    const filter = { tenantId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    // جمع خریدها
    const buyAgg = await Transaction.aggregate([
      { $match: { ...filter, type: 'currency_buy' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    // جمع فروش‌ها
    const sellAgg = await Transaction.aggregate([
      { $match: { ...filter, type: 'currency_sell' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    // جمع کارمزدها
    const commissionAgg = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$commission' } } }
    ]);
    const totalBuy = buyAgg[0]?.total || 0;
    const totalSell = sellAgg[0]?.total || 0;
    const totalCommission = commissionAgg[0]?.total || 0;
    const profit = totalSell - totalBuy + totalCommission;
    res.json({
      success: true,
      data: {
        totalBuy,
        totalSell,
        totalCommission,
        profit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReconciliationReport = async (req, res) => {
  try {
    const report = await reconcileTransactions();
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.financialReport = async (req, res) => {
  try {
    const { from, to, type, branchId, currency, customerId, status } = req.query;
    const match = {
      tenantId: req.user.tenantId,
      ...(branchId && { branchId }),
      ...(type && { type }),
      ...(currency && { currency }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(from && { createdAt: { $gte: new Date(from) } }),
      ...(to && { createdAt: { ...((from && { $gte: new Date(from) }) || {}), $lte: new Date(to) } })
    };
    const transactions = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'خطا در گزارش مالی.' });
  }
};

exports.financialReportExcel = async (req, res) => {
  try {
    const { from, to, type, branchId, currency, customerId, status } = req.query;
    const match = {
      tenantId: req.user.tenantId,
      ...(branchId && { branchId }),
      ...(type && { type }),
      ...(currency && { currency }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(from && { createdAt: { $gte: new Date(from) } }),
      ...(to && { createdAt: { ...((from && { $gte: new Date(from) }) || {}), $lte: new Date(to) } })
    };
    const transactions = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Financial Report');
    sheet.columns = [
      { header: 'نوع تراکنش', key: 'type', width: 20 },
      { header: 'تعداد', key: 'count', width: 10 },
      { header: 'مجموع', key: 'total', width: 20 }
    ];
    transactions.forEach(t => {
      sheet.addRow({ type: t._id, count: t.count, total: t.total });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'خطا در خروجی اکسل گزارش مالی.' });
  }
};

exports.discrepancyReport = async (req, res) => {
  try {
    const discrepancies = await Discrepancy.find({ tenantId: req.user.tenantId });
    res.json({ discrepancies });
  } catch (err) {
    res.status(500).json({ error: 'خطا در گزارش مغایرت‌ها.' });
  }
};

exports.discrepancyReportExcel = async (req, res) => {
  try {
    const discrepancies = await Discrepancy.find({ tenantId: req.user.tenantId });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Discrepancies');
    sheet.columns = [
      { header: 'شناسه تراکنش', key: 'transactionId', width: 30 },
      { header: 'مبلغ مورد انتظار', key: 'expected', width: 20 },
      { header: 'مبلغ پرداختی', key: 'paid', width: 20 },
      { header: 'وضعیت', key: 'status', width: 15 },
      { header: 'تاریخ', key: 'createdAt', width: 25 }
    ];
    discrepancies.forEach(d => {
      sheet.addRow({
        transactionId: d.transactionId,
        expected: d.expected,
        paid: d.paid,
        status: d.status,
        createdAt: d.createdAt
      });
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=discrepancies.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'خطا در خروجی اکسل مغایرت‌ها.' });
  }
};

// گزارش مجموع تراکنش‌ها بر اساس بازه زمانی و نوع تراکنش
async function transactionSummary(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { from, to, type } = req.query;
    const filter = { tenantId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (type) filter.type = type;
    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

exports.accountBalanceSummary = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const result = await Account.aggregate([
      { $match: { tenantId, status: 'active' } },
      {
        $group: {
          _id: '$currency',
          totalBalance: { $sum: '$availableBalance' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.transactionTrend = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { from, to, type, interval = 'daily' } = req.query;
    const filter = { tenantId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (type) filter.type = type;
    // تعیین فرمت گروه‌بندی بر اساس interval
    let dateFormat = '%Y-%m-%d';
    if (interval === 'monthly') dateFormat = '%Y-%m';
    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    // تبدیل خروجی به فرمت مورد انتظار
    const data = result.map(item => ({
      date: item._id,
      count: item.count,
      totalAmount: item.totalAmount
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  dailyVolume,
  profitAndLoss,
  getReconciliationReport,
  financialReport,
  financialReportExcel,
  discrepancyReport,
  discrepancyReportExcel,
  transactionSummary,
  accountBalanceSummary,
  transactionTrend
}; 