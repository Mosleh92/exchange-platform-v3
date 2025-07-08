const SubscriptionService = require("../services/SubscriptionService");
const Plan = require("../models/Plan");

class SubscriptionController {
  // خرید اشتراک جدید
  async createSubscription(req, res) {
    try {
      const { planId, autoRenew } = req.body;
      const tenantId = req.user.tenantId;
      const plan = await Plan.findById(planId);
      if (!plan)
        return res
          .status(404)
          .json({ success: false, message: "پلن یافت نشد" });
      // محاسبه تاریخ شروع و پایان
      const startDate = new Date();
      let endDate = new Date(startDate);
      if (plan.duration === "monthly") endDate.setMonth(endDate.getMonth() + 1);
      else if (plan.duration === "yearly")
        endDate.setFullYear(endDate.getFullYear() + 1);
      const subscription = await SubscriptionService.createSubscription({
        tenantId,
        planId,
        startDate,
        endDate,
        autoRenew,
      });
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // تمدید اشتراک
  async renewSubscription(req, res) {
    try {
      const { subscriptionId } = req.body;
      const subscription = await SubscriptionService.getActiveSubscription(
        req.user.tenantId,
      );
      if (!subscription || subscription._id.toString() !== subscriptionId) {
        return res
          .status(404)
          .json({ success: false, message: "اشتراک فعال یافت نشد" });
      }
      // محاسبه تاریخ جدید پایان
      let newEndDate = new Date(subscription.endDate);
      const plan = await Plan.findById(subscription.planId);
      if (plan.duration === "monthly")
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      else if (plan.duration === "yearly")
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      const renewed = await SubscriptionService.renewSubscription({
        subscriptionId,
        newEndDate,
      });
      res.json({ success: true, data: renewed });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // مشاهده اشتراک فعال
  async getActiveSubscription(req, res) {
    try {
      const subscription = await SubscriptionService.getActiveSubscription(
        req.user.tenantId,
      );
      res.json({ success: true, data: subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // تاریخچه اشتراک‌ها
  async getSubscriptionHistory(req, res) {
    try {
      const history = await SubscriptionService.getSubscriptionHistory(
        req.user.tenantId,
      );
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SubscriptionController();
