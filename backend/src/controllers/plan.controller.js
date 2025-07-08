const PlanService = require("../services/PlanService");

class PlanController {
  async createPlan(req, res) {
    try {
      if (req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "دسترسی غیرمجاز" });
      }
      const plan = await PlanService.createPlan(req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updatePlan(req, res) {
    try {
      if (req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "دسترسی غیرمجاز" });
      }
      const plan = await PlanService.updatePlan(req.params.id, req.body);
      res.json({ success: true, data: plan });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deletePlan(req, res) {
    try {
      if (req.user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "دسترسی غیرمجاز" });
      }
      await PlanService.deletePlan(req.params.id);
      res.json({ success: true, message: "پلن حذف شد" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPlan(req, res) {
    try {
      const plan = await PlanService.getPlanById(req.params.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async listPlans(req, res) {
    try {
      const plans = await PlanService.listPlans({
        activeOnly: req.query.activeOnly === "true",
      });
      res.json({ success: true, data: plans });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PlanController();
