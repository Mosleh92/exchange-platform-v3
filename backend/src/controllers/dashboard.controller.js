const DashboardService = require('../services/DashboardService');

const DashboardController = {
  // داشبورد سوپرادمین
  async superAdminDashboard(req, res) {
    try {
      const data = await DashboardService.getSuperAdminDashboard();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // داشبورد tenant_admin
  async tenantAdminDashboard(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const data = await DashboardService.getTenantAdminDashboard(tenantId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // داشبورد branch_manager
  async branchManagerDashboard(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const branchId = req.user.branchId;
      const data = await DashboardService.getBranchManagerDashboard(tenantId, branchId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // داشبورد staff
  async staffDashboard(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const staffId = req.user._id;
      const data = await DashboardService.getStaffDashboard(tenantId, staffId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // داشبورد customer
  async customerDashboard(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const customerId = req.user._id;
      const data = await DashboardService.getCustomerDashboard(tenantId, customerId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = DashboardController;
