const Notification = require("../models/Notification");
const { consume } = require("./messageQueue");
const User = require("../models/User");
const logger = require("../utils/logger");

async function sendNotification({ user, type, message }) {
  await Notification.create({ user, type, message });
}

if (process.env.NODE_ENV !== "test") {
  consume("notification", async (msg) => {
    await sendNotification(msg);
  });
}

exports.send = async ({ to, type, message }) => {
  // اینجا می‌توانید به SMS/واتساپ/ایمیل متصل شوید
  console.log(`[NOTIFY][${type}] to=${to}: ${message}`);
  // مثال: ارسال SMS با Kavenegar یا Twilio
};

async function notifyTenantAdmins(tenantId, subject, message) {
  // پیدا کردن مدیران tenant
  const admins = await User.find({
    tenantId,
    role: { $in: ["tenant_admin", "super_admin"] },
  });
  for (const admin of admins) {
    // اینجا می‌توانید ایمیل یا پیامک واقعی ارسال کنید
    logger.info(
      `[NOTIFY] ${subject} to ${admin.email || admin._id}: ${message}`,
    );
    // await sendEmail(admin.email, subject, message);
  }
}

module.exports = { sendNotification, notifyTenantAdmins };
