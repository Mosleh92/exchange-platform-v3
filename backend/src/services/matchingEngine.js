const Order = require('../models/Order');

async function matchOrders(tenantId) {
  // CRITICAL FIX: Add tenant_id filter to prevent full table scan
  if (!tenantId) {
    throw new Error('tenantId is required for order matching');
  }
  
  const buyOrders = await Order.find({ type: 'buy', status: 'open', tenant_id: tenantId }).sort({ price: -1 });
  const sellOrders = await Order.find({ type: 'sell', status: 'open', tenant_id: tenantId }).sort({ price: 1 });
  for (let buy of buyOrders) {
    for (let sell of sellOrders) {
      if (buy.price >= sell.price && buy.amount === sell.amount) {
        // ایجاد معامله و تغییر وضعیت سفارشات
        buy.status = 'matched';
        sell.status = 'matched';
        await buy.save();
        await sell.save();
        // اینجا می‌توانید event settlement را emit کنید
      }
    }
  }
}

module.exports = { matchOrders }; 