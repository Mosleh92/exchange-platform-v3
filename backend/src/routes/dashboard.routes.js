const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

// روت سوپرادمین
router.get('/superadmin', auth(['super_admin']), DashboardController.superAdminDashboard);

// روت tenant_admin
router.get('/tenant', auth(['tenant_admin']), DashboardController.tenantAdminDashboard);

// روت branch_manager
router.get('/branch', auth(['branch_manager']), DashboardController.branchManagerDashboard);

// روت staff
router.get('/staff', auth(['staff']), DashboardController.staffDashboard);

// روت customer
router.get('/customer', auth(['customer']), DashboardController.customerDashboard);

module.exports = router; 