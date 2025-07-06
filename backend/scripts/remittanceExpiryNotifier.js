const Remittance = require('../src/models/Remittance');
const NotificationService = require('../src/services/notificationService');
const moment = require('moment');

async function notifyExpiringRemittances() {
  const now = new Date();
  const tomorrow = moment(now).add(1, 'day').toDate();
  const expiring = await Remittance.find({
    status: 'pending',
    expiresAt: { $gte: now, $lte: tomorrow }
  });
  for (const rem of expiring) {
    // ارسال پیام به گیرنده و اپراتور
    await NotificationService.send({
      to: rem.receiverInfo?.phone || rem.receiverInfo?.email,
      type: 'remittance_expiry',
      message: `حواله شما با کد ${rem.secretCode} تا ۲۴ ساعت دیگر منقضی می‌شود.`
    });
    // پیام به اپراتور شعبه مبدا (در صورت نیاز)
  }
  console.log(`Expiring remittances notified: ${expiring.length}`);
}

module.exports = notifyExpiringRemittances; 