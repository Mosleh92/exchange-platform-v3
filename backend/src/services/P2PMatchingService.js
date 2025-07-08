const P2POrder = require("../models/P2POrder");
const P2PMatch = require("../models/P2PMatch");

async function matchOrder(newOrder) {
  // نوع مخالف را پیدا کن
  const oppositeType = newOrder.type === "buy" ? "sell" : "buy";
  // جستجوی سفارش‌های باز با قیمت مناسب
  const match = await P2POrder.findOne({
    type: oppositeType,
    currency: newOrder.currency,
    price:
      newOrder.type === "buy"
        ? { $lte: newOrder.price }
        : { $gte: newOrder.price },
    amount: newOrder.amount,
    status: "open",
  });

  if (match) {
    // ایجاد تطبیق
    const p2pMatch = await P2PMatch.create({
      buyOrder: newOrder.type === "buy" ? newOrder._id : match._id,
      sellOrder: newOrder.type === "sell" ? newOrder._id : match._id,
      amount: newOrder.amount,
      price: match.price,
    });

    // به‌روزرسانی وضعیت سفارش‌ها
    await P2POrder.updateMany(
      { _id: { $in: [newOrder._id, match._id] } },
      { $set: { status: "matched" } },
    );

    // TODO: انتقال مبلغ به Escrow

    return p2pMatch;
  }

  // اگر تطبیقی پیدا نشد، سفارش باز می‌ماند
  return null;
}

module.exports = { matchOrder };
