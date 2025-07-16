const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { validateBranch, validateStaffAssignment } = require('../middleware/validation');

// Apply authentication to all routes
router.use(authMiddleware);

// Branch CRUD operations
router.post('/', 
  roleMiddleware(['super_admin', 'tenant_admin']),
  validateBranch,
  BranchController.createBranch
);

router.get('/', 
  BranchController.getBranches
);

router.get('/:branchId', 
  BranchController.getBranch
);

router.put('/:branchId', 
  roleMiddleware(['super_admin', 'tenant_admin', 'branch_admin']),
  BranchController.updateBranch
);

router.delete('/:branchId', 
  roleMiddleware(['super_admin', 'tenant_admin']),
  BranchController.deleteBranch
);

// Staff management
router.post('/:branchId/staff', 
  roleMiddleware(['super_admin', 'tenant_admin', 'branch_admin']),
  validateStaffAssignment,
  BranchController.assignStaff
);

router.delete('/:branchId/staff/:staffId', 
  roleMiddleware(['super_admin', 'tenant_admin', 'branch_admin']),
  BranchController.removeStaff
);

// Branch operations
router.put('/:branchId/currencies', 
  roleMiddleware(['super_admin', 'tenant_admin', 'branch_admin']),
  BranchController.updateCurrencies
);

router.put('/:branchId/status', 
  roleMiddleware(['super_admin', 'tenant_admin']),
  BranchController.updateStatus
);

module.exports = router;
