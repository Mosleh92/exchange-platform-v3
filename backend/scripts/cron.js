const cron = require('node-cron');
const notifyExpiringRemittances = require('./remittanceExpiryNotifier');

cron.schedule('0 8 * * *', async () => {
  await notifyExpiringRemittances();
  console.log('Remittance expiry notification job ran at 8:00 AM');
}); 