const CustomerTransaction = require('../models/CustomerTransaction');
const { recordTransaction } = require('./accountingService');
const { /*publish,*/ consume } = require('./messageQueue'); // publish is unused

async function settleMatchedOrder(order) {
  // فرض: order شامل اطلاعات معامله matched است
  // ایجاد تراکنش مالی و ثبت حسابداری
  await CustomerTransaction.create({
    company: order.company,
    amount: order.amount,
    type: order.type,
    status: 'settled',
    referenceOrder: order._id
  });
  await recordTransaction({
    description: 'Settlement for matched order',
    debitAccount: order.type === 'buy' ? 'ForeignCurrency' : 'Cash',
    creditAccount: order.type === 'buy' ? 'Cash' : 'ForeignCurrency',
    amount: order.amount,
    reference: order._id
  });
}

if (process.env.NODE_ENV !== 'test') {
  consume('settlement', async (_msg) => { // msg marked as unused
    // فرض: msg شامل orderId است
    // اینجا می‌توانید order را از دیتابیس بخوانید و settleMatchedOrder را فراخوانی کنید
    // await settleMatchedOrder(order)
  });
}

module.exports = { settleMatchedOrder }; 