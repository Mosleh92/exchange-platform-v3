const Plan = require('../models/Plan');

const PlanService = {
  async createPlan(data) {
    const plan = new Plan(data);
    await plan.save();
    return plan;
  },
  async updatePlan(planId, updateData) {
    const plan = await Plan.findByIdAndUpdate(planId, updateData, { new: true });
    if (!plan) throw new Error('پلن یافت نشد');
    return plan;
  },
  async deletePlan(planId) {
    const plan = await Plan.findByIdAndDelete(planId);
    if (!plan) throw new Error('پلن یافت نشد');
    return plan;
  },
  async getPlanById(planId) {
    const plan = await Plan.findById(planId);
    if (!plan) throw new Error('پلن یافت نشد');
    return plan;
  },
  async listPlans({ activeOnly = false } = {}) {
    const query = activeOnly ? { isActive: true } : {};
    return Plan.find(query).sort({ price: 1 });
  }
};

module.exports = PlanService; 