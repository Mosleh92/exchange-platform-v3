const mongoose = require("mongoose");
const databaseConfig = require("../src/config/database");
const Tenant = require("../src/models/Tenant");
const { reconcileTenant } = require("../src/services/reconciliationService");
const { notifyTenantAdmins } = require("../src/services/notificationService");
const Discrepancy = require("../src/models/Discrepancy");
// const notificationService = require('../src/services/notificationService'); // اگر سرویس نوتیفیکیشن دارید

async function run() {
  await databaseConfig.connect();
  const tenants = await Tenant.find({});
  for (const tenant of tenants) {
    await reconcileTenant(tenant._id);
    // هشدار مغایرت به مدیران tenant
    const discrepancies = await Discrepancy.find({
      tenantId: tenant._id,
      status: { $ne: "matched" },
    });
    if (discrepancies.length > 0) {
      await notifyTenantAdmins(
        tenant._id,
        "مغایرت مالی جدید",
        `تعداد ${discrepancies.length} مغایرت مالی برای بررسی وجود دارد.`,
      );
    }
    // اگر سرویس نوتیفیکیشن دارید، می‌توانید اینجا به مدیر tenant اطلاع دهید
    // const discrepancies = await Discrepancy.find({ tenantId: tenant._id, status: { $ne: 'matched' } });
    // if (discrepancies.length > 0) {
    //   await notificationService.notifyTenantAdmins(tenant._id, 'مغایرت مالی جدید شناسایی شد.');
    // }
  }
  console.log("Reconciliation job finished.");
  process.exit(0);
}

run();
