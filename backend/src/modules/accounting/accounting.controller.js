const mongoose = require('mongoose');

// ساختار سند حسابداری پایه برای ثبت تمام رویدادهای مالی
const accountingSchema = new mongoose.Schema({
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true }, // صرافی یا بانک
  branch: { type: mongoose.Types.ObjectId, ref: 'Branch' }, // شعبه (اختیاری)
  user: { type: mongoose.Types.ObjectId, ref: 'User' }, // ثبت کننده سند
  type: {
    type: String,
    enum: [
      'cash_in',       // دریافت نقدی
      'cash_out',      // پرداخت نقدی
      'cheque_in',     // چک دریافتی
      'cheque_out',    // چک پرداختی
      'bank_deposit',  // واریز به حساب بانکی
      'bank_withdraw', // برداشت از حساب بانکی
      'internal_transfer', // انتقال داخلی
      'customer_payment',  // پرداخت بجای مشتری
      'fx_buy',        // خرید ارز
      'fx_sell',       // فروش ارز
      'fx_dual',       // معامله دو ارزی
      'remittance_send',   // ارسال حواله
      'remittance_receive',// دریافت حواله
      'commission',    // کمیسیون
      'expense',       // هزینه
      'revenue'        // درآمد
    ],
    required: true
  },
  description: { type: String },
  currency: { type: String, required: true }, // مانند USD, AED, IRR
  amount: { type: Number, required: true },
  relatedAccounts: [{ type: mongoose.Types.ObjectId, ref: 'Account' }], // حساب‌های مرتبط (در صورت انتقال بین حساب‌ها)
  customer: { type: mongoose.Types.ObjectId, ref: 'User' }, // مشتری دخیل در تراکنش
  referenceNo: { type: String }, // شماره سند یا رسید
  date: { type: Date, default: Date.now },
  extraData: { type: mongoose.Schema.Types.Mixed }, // داده‌های اضافی سفارشی (برای توسعه‌پذیری)
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
});

module.exports = mongoose.model('Accounting', accountingSchema);
