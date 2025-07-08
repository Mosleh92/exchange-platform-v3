const CustomerTransaction = require("../models/CustomerTransaction");
const { consume } = require("./messageQueue");
const { sendNotification } = require("./notificationService");
const Transaction = require("../models/Transaction");
const Payment = require("../models/Payment");
const Discrepancy = require("../models/Discrepancy");

async function reconcileTransaction(transactionId) {
  const tx =
    await CustomerTransaction.findById(transactionId).populate("customerId");
  if (!tx) return;
  // مجموع پرداخت‌های تایید شده
  const totalPaid = (tx.paymentBreakdown || [])
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  // اگر مغایرت وجود دارد
  if (totalPaid < tx.amount) {
    // اعلان به کاربر
    await sendNotification({
      user: tx.customerId._id,
      type: "reconciliation",
      message: `مغایرت پرداخت در تراکنش ${tx._id}: مبلغ پرداختی کمتر از مقدار مورد انتظار است.`,
    });
    // اعلان به مدیر سیستم (فرض: userId مدیر = 'adminUserId')
    await sendNotification({
      user: "adminUserId",
      type: "reconciliation",
      message: `مغایرت پرداخت در تراکنش ${tx._id} برای کاربر ${tx.customerId._id}`,
    });
  } else if (totalPaid > tx.amount) {
    await sendNotification({
      user: tx.customerId._id,
      type: "reconciliation",
      message: `مغایرت پرداخت در تراکنش ${tx._id}: مبلغ پرداختی بیشتر از مقدار مورد انتظار است.`,
    });
    await sendNotification({
      user: "adminUserId",
      type: "reconciliation",
      message: `مغایرت پرداخت در تراکنش ${tx._id} برای کاربر ${tx.customerId._id}`,
    });
  }
}

/**
 * بررسی مغایرت مالی برای همه معاملات و گزارش مغایرت‌ها
 * وضعیت‌های ممکن: paid, partial, debtor, overpaid
 */
async function reconcileTransactions(tenantId) {
  // CRITICAL FIX: Add tenant_id filter to prevent full table scan
  if (!tenantId) {
    throw new Error("tenantId is required for reconciliation");
  }

  const transactions = await Transaction.find({ tenant_id: tenantId });
  const report = [];
  for (const tx of transactions) {
    // فرض: tx.payments آرایه‌ای از PaymentId است یا باید پرداخت‌ها را پیدا کنیم
    let payments = [];
    if (tx.payments && tx.payments.length > 0) {
      payments = await Payment.find({
        _id: { $in: tx.payments },
        tenant_id: tenantId,
      });
    } else {
      payments = await Payment.find({
        transactionId: tx._id,
        tenant_id: tenantId,
      });
    }
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    let status = "paid";
    if (totalPaid === tx.amount) {
      status = "paid";
    } else if (totalPaid < tx.amount && totalPaid > 0) {
      status = "partial";
    } else if (totalPaid === 0) {
      status = "debtor";
    } else if (totalPaid > tx.amount) {
      status = "overpaid";
    }
    if (tx.status !== status) {
      tx.status = status;
      await tx.save();
    }
    if (status !== "paid") {
      report.push({
        transactionId: tx._id,
        status,
        amount: tx.amount,
        totalPaid,
        payments: payments.map((p) => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
        })),
      });
    }
  }
  return report;
}

async function reconcileTenant(tenantId) {
  const txs = await Transaction.find({ tenantId });
  for (const tx of txs) {
    const payments = await Payment.find({ transactionId: tx._id });
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    let status = "matched";
    if (paid < tx.amount) status = "underpaid";
    else if (paid > tx.amount) status = "overpaid";
    else if (paid !== tx.amount) status = "unmatched";
    await Discrepancy.updateOne(
      { transactionId: tx._id },
      {
        $set: {
          tenantId,
          branchId: tx.branchId,
          transactionId: tx._id,
          expected: tx.amount,
          paid,
          status,
        },
      },
      { upsert: true },
    );
  }
}

if (process.env.NODE_ENV !== "test") {
  consume("reconciliation", async (msg) => {
    await reconcileTransaction(msg.transactionId);
  });
}

module.exports = {
  reconcileTransaction,
  reconcileTransactions,
  reconcileTenant,
};
