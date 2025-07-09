// backend/src/models/accounting/Account.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  accountCode: {
    type: String,
    required: true,
    unique: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true
  },
  subType: {
    type: String,
    enum: [
      'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability',
      'owner_equity', 'operating_revenue', 'non_operating_revenue',
      'operating_expense', 'non_operating_expense'
    ]
  },
  parentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  balance: {
    type: Number,
    default: 0
  },
  description: String
}, {
  timestamps: true
});

// ایجاد index برای جستجوی سریع
accountSchema.index({ tenantId: 1, accountCode: 1 });
accountSchema.index({ tenantId: 1, accountType: 1 });

module.exports = mongoose.model('Account', accountSchema);

// backend/src/models/accounting/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  subTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubTenant'
  },
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  transactionDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  referenceNumber: String,
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  transactionType: {
    type: String,
    enum: ['cash_receipt', 'cash_payment', 'bank_deposit', 'bank_withdrawal', 
           'currency_exchange', 'remittance', 'p2p_trade', 'commission', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true
});

// Auto-increment transaction number
transactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.transactionNumber = `TXN-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

transactionSchema.index({ tenantId: 1, transactionDate: -1 });
transactionSchema.index({ tenantId: 1, transactionNumber: 1 });
transactionSchema.index({ tenantId: 1, customerId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

// backend/src/models/accounting/TransactionEntry.js
const mongoose = require('mongoose');

const transactionEntrySchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  debitAmount: {
    type: Number,
    default: 0
  },
  creditAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  description: String,
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

transactionEntrySchema.index({ transactionId: 1, order: 1 });
transactionEntrySchema.index({ accountId: 1 });

module.exports = mongoose.model('TransactionEntry', transactionEntrySchema);

// backend/src/models/accounting/GeneralLedger.js
const mongoose = require('mongoose');

const generalLedgerSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  transactionDate: {
    type: Date,
    required: true
  },
  description: String,
  referenceNumber: String,
  debitAmount: {
    type: Number,
    default: 0
  },
  creditAmount: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'IRR'
  }
}, {
  timestamps: true
});

generalLedgerSchema.index({ tenantId: 1, accountId: 1, transactionDate: -1 });
generalLedgerSchema.index({ tenantId: 1, transactionDate: -1 });

module.exports = mongoose.model('GeneralLedger', generalLedgerSchema);

// backend/src/controllers/accounting/AccountingController.js
const Account = require('../../models/accounting/Account');
const Transaction = require('../../models/accounting/Transaction');
const TransactionEntry = require('../../models/accounting/TransactionEntry');
const GeneralLedger = require('../../models/accounting/GeneralLedger');

class AccountingController {
  // ایجاد حساب جدید
  static async createAccount(req, res) {
    try {
      const { accountCode, accountName, accountType, subType, parentAccountId, currency, description } = req.body;
      const tenantId = req.tenant ? req.tenant._id : req.body.tenantId;

      // بررسی تکراری نبودن کد حساب
      const existingAccount = await Account.findOne({ accountCode });
      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'کد حساب تکراری است'
        });
      }

      const account = new Account({
        tenantId,
        accountCode,
        accountName,
        accountType,
        subType,
        parentAccountId,
        currency: currency || 'IRR',
        description
      });

      await account.save();

      res.status(201).json({
        success: true,
        data: account,
        message: 'حساب جدید با موفقیت ایجاد شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد حساب',
        error: error.message
      });
    }
  }

  // دریافت لیست حساب‌ها
  static async getAccounts(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { accountType, isActive = true } = req.query;
      
      const query = { tenantId };
      if (accountType) query.accountType = accountType;
      if (isActive !== undefined) query.isActive = isActive;

      const accounts = await Account.find(query)
        .populate('parentAccountId', 'accountName accountCode')
        .sort({ accountCode: 1 });

      res.json({
        success: true,
        data: accounts
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت حساب‌ها',
        error: error.message
      });
    }
  }

  // ثبت تراکنش دوطرفه
  static async createTransaction(req, res) {
    try {
      const { 
        description, 
        transactionDate, 
        transactionType, 
        referenceNumber, 
        customerId,
        entries,
        attachments 
      } = req.body;
      
      const tenantId = req.tenant ? req.tenant._id : req.body.tenantId;

      // بررسی تعادل دبت و کردیت
      const totalDebit = entries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
      const totalCredit = entries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'مجموع دبت و کردیت باید برابر باشد'
        });
      }

      // ایجاد تراکنش
      const transaction = new Transaction({
        tenantId,
        description,
        transactionDate: new Date(transactionDate),
        transactionType,
        referenceNumber,
        totalAmount: totalDebit,
        customerId,
        createdBy: req.user.id,
        attachments: attachments || []
      });

      await transaction.save();

      // ایجاد رکوردهای ورودی
      const transactionEntries = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const transactionEntry = new TransactionEntry({
          transactionId: transaction._id,
          accountId: entry.accountId,
          debitAmount: entry.debitAmount || 0,
          creditAmount: entry.creditAmount || 0,
          currency: entry.currency || 'IRR',
          exchangeRate: entry.exchangeRate || 1,
          description: entry.description,
          order: i
        });
        
        await transactionEntry.save();
        transactionEntries.push(transactionEntry);

        // بروزرسانی موجودی حساب
        await this.updateAccountBalance(entry.accountId, entry.debitAmount || 0, entry.creditAmount || 0);
        
        // ثبت در دفتر کل
        await this.createGeneralLedgerEntry(
          tenantId,
          entry.accountId,
          transaction._id,
          transaction.transactionDate,
          transaction.description,
          transaction.referenceNumber,
          entry.debitAmount || 0,
          entry.creditAmount || 0,
          entry.currency || 'IRR'
        );
      }

      res.status(201).json({
        success: true,
        data: {
          transaction,
          entries: transactionEntries
        },
        message: 'تراکنش با موفقیت ثبت شد'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ثبت تراکنش',
        error: error.message
      });
    }
  }

  // بروزرسانی موجودی حساب
  static async updateAccountBalance(accountId, debitAmount, creditAmount) {
    const account = await Account.findById(accountId);
    if (!account) return;

    // برای حساب‌های دارایی و هزینه: دبت افزایش، کردیت کاهش
    // برای حساب‌های بدهی، سرمایه و درآمد: کردیت افزایش، دبت کاهش
    let balanceChange = 0;
    if (['asset', 'expense'].includes(account.accountType)) {
      balanceChange = debitAmount - creditAmount;
    } else {
      balanceChange = creditAmount - debitAmount;
    }

    await Account.findByIdAndUpdate(accountId, {
      $inc: { balance: balanceChange }
    });
  }

  // ایجاد رکورد دفتر کل
  static async createGeneralLedgerEntry(tenantId, accountId, transactionId, transactionDate, description, referenceNumber, debitAmount, creditAmount, currency) {
    // محاسبه موجودی جدید
    const lastEntry = await GeneralLedger.findOne({
      tenantId,
      accountId
    }).sort({ transactionDate: -1, createdAt: -1 });

    const previousBalance = lastEntry ? lastEntry.balance : 0;
    const account = await Account.findById(accountId);
    
    let newBalance = previousBalance;
    if (['asset', 'expense'].includes(account.accountType)) {
      newBalance = previousBalance + debitAmount - creditAmount;
    } else {
      newBalance = previousBalance + creditAmount - debitAmount;
    }

    const ledgerEntry = new GeneralLedger({
      tenantId,
      accountId,
      transactionId,
      transactionDate,
      description,
      referenceNumber,
      debitAmount,
      creditAmount,
      balance: newBalance,
      currency
    });

    await ledgerEntry.save();
  }

  // دریافت دفتر کل
  static async getGeneralLedger(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { accountId, startDate, endDate, page = 1, limit = 50 } = req.query;

      const query = { tenantId };
      if (accountId) query.accountId = accountId;
      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) query.transactionDate.$gte = new Date(startDate);
        if (endDate) query.transactionDate.$lte = new Date(endDate);
      }

      const ledgerEntries = await GeneralLedger.find(query)
        .populate('accountId', 'accountName accountCode')
        .populate('transactionId', 'transactionNumber description')
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await GeneralLedger.countDocuments(query);

      res.json({
        success: true,
        data: {
          entries: ledgerEntries,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در دریافت دفتر کل',
        error: error.message
      });
    }
  }

  // گزارش ترازنامه
  static async getBalanceSheet(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { asOfDate = new Date() } = req.query;

      const accounts = await Account.find({ tenantId, isActive: true })
        .sort({ accountCode: 1 });

      const balanceSheet = {
        assets: { current: [], fixed: [], total: 0 },
        liabilities: { current: [], longTerm: [], total: 0 },
        equity: { items: [], total: 0 },
        asOfDate: asOfDate
      };

      for (const account of accounts) {
        // محاسبه موجودی در تاریخ مشخص
        const balance = await this.getAccountBalanceAsOfDate(account._id, asOfDate);
        
        const accountData = {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: balance,
          currency: account.currency
        };

        switch (account.accountType) {
          case 'asset':
            if (account.subType === 'current_asset') {
              balanceSheet.assets.current.push(accountData);
            } else {
              balanceSheet.assets.fixed.push(accountData);
            }
            balanceSheet.assets.total += balance;
            break;
          
          case 'liability':
            if (account.subType === 'current_liability') {
              balanceSheet.liabilities.current.push(accountData);
            } else {
              balanceSheet.liabilities.longTerm.push(accountData);
            }
            balanceSheet.liabilities.total += balance;
            break;
          
          case 'equity':
            balanceSheet.equity.items.push(accountData);
            balanceSheet.equity.total += balance;
            break;
        }
      }

      res.json({
        success: true,
        data: balanceSheet
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در تهیه ترازنامه',
        error: error.message
      });
    }
  }

  // محاسبه موجودی حساب در تاریخ مشخص
  static async getAccountBalanceAsOfDate(accountId, asOfDate) {
    const lastEntry = await GeneralLedger.findOne({
      accountId,
      transactionDate: { $lte: new Date(asOfDate) }
    }).sort({ transactionDate: -1, createdAt: -1 });

    return lastEntry ? lastEntry.balance : 0;
  }

  // گزارش سود و زیان
  static async getProfitLoss(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.query.tenantId;
      const { startDate, endDate } = req.query;

      const query = { tenantId };
      if (startDate || endDate) {
        query.transactionDate = {};
        if (startDate) query.transactionDate.$gte = new Date(startDate);
        if (endDate) query.transactionDate.$lte = new Date(endDate);
      }

      const revenueAccounts = await Account.find({ 
        tenantId, 
        accountType: 'revenue', 
        isActive: true 
      });
      
      const expenseAccounts = await Account.find({ 
        tenantId, 
        accountType: 'expense', 
        isActive: true 
      });

      const profitLoss = {
        revenue: { items: [], total: 0 },
        expenses: { items: [], total: 0 },
        netProfit: 0,
        period: { startDate, endDate }
      };

      // محاسبه درآمدها
      for (const account of revenueAccounts) {
        const sum = await GeneralLedger.aggregate([
          { $match: { accountId: account._id, ...query } },
          { $group: { _id: null, totalCredit: { $sum: '$creditAmount' }, totalDebit: { $sum: '$debitAmount' } } }
        ]);

        const netRevenue = sum.length > 0 ? sum[0].totalCredit - sum[0].totalDebit : 0;
        
        if (netRevenue !== 0) {
          profitLoss.revenue.items.push({
            accountCode: account.accountCode,
            accountName: account.accountName,
            amount: netRevenue,
            currency: account.currency
          });
          profitLoss.revenue.total += netRevenue;
        }
      }

      // محاسبه هزینه‌ها
      for (const account of expenseAccounts) {
        const sum = await GeneralLedger.aggregate([
          { $match: { accountId: account._id, ...query } },
          { $group: { _id: null, totalCredit: { $sum: '$creditAmount' }, totalDebit: { $sum: '$debitAmount' } } }
        ]);

        const netExpense = sum.length > 0 ? sum[0].totalDebit - sum[0].totalCredit : 0;
        
        if (netExpense !== 0) {
          profitLoss.expenses.items.push({
            accountCode: account.accountCode,
            accountName: account.accountName,
            amount: netExpense,
            currency: account.currency
          });
          profitLoss.expenses.total += netExpense;
        }
      }

      profitLoss.netProfit = profitLoss.revenue.total - profitLoss.expenses.total;

      res.json({
        success: true,
        data: profitLoss
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در تهیه گزارش سود و زیان',
        error: error.message
      });
    }
  }

  // ایجاد حساب‌های پیش‌فرض
  static async createDefaultAccounts(req, res) {
    try {
      const tenantId = req.tenant ? req.tenant._id : req.body.tenantId;

      const defaultAccounts = [
        // دارایی‌ها
        { accountCode: '1000', accountName: 'صندوق', accountType: 'asset', subType: 'current_asset' },
        { accountCode: '1100', accountName: 'حساب بانکی', accountType: 'asset', subType: 'current_asset' },
        { accountCode: '1200', accountName: 'طلبکاران', accountType: 'asset', subType: 'current_asset' },
        { accountCode: '1300', accountName: 'موجودی ارز', accountType: 'asset', subType: 'current_asset' },
        { accountCode: '1400', accountName: 'اثاثیه', accountType: 'asset', subType: 'fixed_asset' },
        
        // بدهی‌ها
        { accountCode: '2000', accountName: 'بدهکاران', accountType: 'liability', subType: 'current_liability' },
        { accountCode: '2100', accountName: 'حقوق و دستمزد', accountType: 'liability', subType: 'current_liability' },
        { accountCode: '2200', accountName: 'مالیات', accountType: 'liability', subType: 'current_liability' },
        
        // سرمایه
        { accountCode: '3000', accountName: 'سرمایه', accountType: 'equity' },
        { accountCode: '3100', accountName: 'سود انباشته', accountType: 'equity' },
        
        // درآمدها
        { accountCode: '4000', accountName: 'درآمد کمیسیون', accountType: 'revenue', subType: 'operating_revenue' },
        { accountCode: '4100', accountName: 'درآمد صرافی', accountType: 'revenue', subType: 'operating_revenue' },
        { accountCode: '4200', accountName: 'درآمد حواله', accountType: 'revenue', subType: 'operating_revenue' },
        
        // هزینه‌ها
        { accountCode: '5000', accountName: 'هزینه عملیاتی', accountType: 'expense', subType: 'operating_expense' },
        { accountCode: '5100', accountName: 'حقوق و دستمزد', accountType: 'expense', subType: 'operating_expense' },
        { accountCode: '5200', accountName: 'اجاره', accountType: 'expense', subType: 'operating_expense' },
        { accountCode: '5300', accountName: 'برق و گاز', accountType: 'expense', subType: 'operating_expense' }
      ];

      const createdAccounts = [];
      for (const accountData of defaultAccounts) {
        const existingAccount = await Account.findOne({ 
          tenantId, 
          accountCode: accountData.accountCode 
        });
        
        if (!existingAccount) {
          const account = new Account({
            tenantId,
            ...accountData
          });
          await account.save();
          createdAccounts.push(account);
        }
      }

      res.json({
        success: true,
        data: createdAccounts,
        message: `${createdAccounts.length} حساب پیش‌فرض ایجاد شد`
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'خطا در ایجاد حساب‌های پیش‌فرض',
        error: error.message
      });
    }
  }
}

module.exports = AccountingController;
