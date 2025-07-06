const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdmin.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const auditLogController = require('../controllers/auditLog.controller');

// All routes require super admin role
router.use(authenticateToken);
router.use(authorizeRoles(['super_admin']));

// Tenant management
router.get('/tenants', superAdminController.getAllTenants);
router.get('/tenants/:tenantId', superAdminController.getTenant);
router.post('/tenants', superAdminController.createTenant);
router.put('/tenants/:tenantId', superAdminController.updateTenant);
router.delete('/tenants/:tenantId', superAdminController.deleteTenant);

// Tenant actions
router.post('/tenants/:tenantId/activate', superAdminController.activateTenant);
router.post('/tenants/:tenantId/suspend', superAdminController.suspendTenant);
router.post('/tenants/:tenantId/extend-subscription', superAdminController.extendSubscription);
router.post('/tenants/:tenantId/reset-password', superAdminController.resetTenantAdminPassword);

// Plan management
router.post('/tenants/:tenantId/assign-plan', superAdminController.assignTenantPlan);
router.post('/tenants/:tenantId/suspend-plan', superAdminController.suspendTenantPlan);
router.post('/tenants/:tenantId/expire-plan', superAdminController.expireTenantPlan);

// Statistics and reports
router.get('/stats/tenants', superAdminController.getTenantStats);
router.get('/tenants/expiring', superAdminController.getExpiringTenants);

// Audit logs
router.get('/audit-logs', auditLogController.getLogs);

module.exports = router; 