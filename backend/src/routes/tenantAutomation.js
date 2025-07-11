const express = require('express');
const { body, validationResult } = require('express-validator');
const tenantAutomationService = require('../services/tenantAutomation');
const enhancedSecurity = require('../middleware/enhancedSecurity');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/tenants
 * @desc Create a complete tenant with branches and users
 * @access Private (SuperAdmin only)
 */
router.post('/',
  // Apply security middleware
  enhancedSecurity.applyAllSecurity(),
  
  // Validation middleware
  [
    body('name')
      .notEmpty()
      .isLength({ min: 2, max: 100 })
      .withMessage('Tenant name must be between 2 and 100 characters'),
    
    body('domain')
      .optional()
      .isURL({ require_tld: false })
      .withMessage('Invalid domain format'),
    
    body('currency')
      .optional()
      .isIn(['IRR', 'USD', 'EUR', 'GBP', 'AED'])
      .withMessage('Invalid currency code'),
    
    body('branches')
      .optional()
      .isArray()
      .withMessage('Branches must be an array'),
    
    body('branches.*.name')
      .if(body('branches').exists())
      .notEmpty()
      .withMessage('Branch name is required'),
    
    body('users')
      .optional()
      .isArray()
      .withMessage('Users must be an array'),
    
    body('users.*.email')
      .if(body('users').exists())
      .isEmail()
      .withMessage('Valid email is required for users'),
    
    body('users.*.role')
      .if(body('users').exists())
      .isIn(['TenantAdmin', 'BranchAdmin', 'BranchUser'])
      .withMessage('Invalid user role')
  ],
  
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check if user has permission to create tenants
      if (!req.user || !req.user.permissions.includes('tenant:create') && !req.user.permissions.includes('*')) {
        return res.status(403).json({
          error: 'Insufficient permissions to create tenants'
        });
      }

      const tenantData = req.body;
      
      logger.info('Tenant creation request', {
        userId: req.user.id,
        tenantName: tenantData.name,
        ip: req.ip
      });

      // Create tenant with all components
      const result = await tenantAutomationService.createTenantWithStructure(tenantData);

      res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: {
          tenant: {
            id: result.tenant._id,
            name: result.tenant.name,
            domain: result.tenant.domain,
            isActive: result.tenant.isActive
          },
          branches: result.branches.map(branch => ({
            id: branch._id,
            name: branch.name,
            isActive: branch.isActive
          })),
          users: result.users.map(user => ({
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive
          }))
        }
      });

    } catch (error) {
      logger.error('Tenant creation failed', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        error: 'Failed to create tenant',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/tenants/bulk
 * @desc Create multiple tenants in bulk
 * @access Private (SuperAdmin only)
 */
router.post('/bulk',
  enhancedSecurity.applyAllSecurity(),
  
  [
    body('tenants')
      .isArray({ min: 1, max: 10 })
      .withMessage('Must provide 1-10 tenants for bulk creation'),
    
    body('tenants.*.name')
      .notEmpty()
      .withMessage('Each tenant must have a name')
  ],
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.user || !req.user.permissions.includes('tenant:create') && !req.user.permissions.includes('*')) {
        return res.status(403).json({
          error: 'Insufficient permissions to create tenants'
        });
      }

      const { tenants } = req.body;
      
      logger.info('Bulk tenant creation request', {
        userId: req.user.id,
        tenantCount: tenants.length,
        ip: req.ip
      });

      const results = await tenantAutomationService.bulkCreateTenants(tenants);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.status(200).json({
        success: true,
        message: `Bulk creation completed: ${successful.length} successful, ${failed.length} failed`,
        data: {
          successful: successful.map(r => ({
            tenant: {
              id: r.tenant._id,
              name: r.tenant.name,
              domain: r.tenant.domain
            },
            branchCount: r.branches.length,
            userCount: r.users.length
          })),
          failed: failed.map(r => ({
            tenantName: r.tenantData.name,
            error: r.error
          }))
        }
      });

    } catch (error) {
      logger.error('Bulk tenant creation failed', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to create tenants',
        message: error.message
      });
    }
  }
);

/**
 * @route GET /api/tenants/:id/status
 * @desc Get tenant creation status and statistics
 * @access Private
 */
router.get('/:id/status',
  enhancedSecurity.applyAllSecurity(),
  
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify user has access to this tenant
      if (!req.user.permissions.includes('*') && req.user.tenantId !== id) {
        return res.status(403).json({
          error: 'Access denied to this tenant'
        });
      }

      const status = await tenantAutomationService.getTenantCreationStatus(id);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get tenant status', {
        tenantId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });

      if (error.message === 'Tenant not found') {
        return res.status(404).json({
          error: 'Tenant not found'
        });
      }

      res.status(500).json({
        error: 'Failed to get tenant status',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/tenants/:id/branches
 * @desc Add a new branch to existing tenant
 * @access Private (TenantAdmin)
 */
router.post('/:id/branches',
  enhancedSecurity.applyAllSecurity(),
  
  [
    body('name')
      .notEmpty()
      .withMessage('Branch name is required'),
    
    body('location.address')
      .optional()
      .isString()
      .withMessage('Address must be a string'),
    
    body('contact.phone')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid phone number')
  ],
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      
      // Check permissions
      if (!req.user.permissions.includes('branch:create') && 
          !req.user.permissions.includes('*') &&
          req.user.tenantId !== id) {
        return res.status(403).json({
          error: 'Insufficient permissions to create branches'
        });
      }

      const branchData = {
        ...req.body,
        tenantId: id
      };

      const session = await require('mongoose').startSession();
      session.startTransaction();

      try {
        const branch = await tenantAutomationService.createBranch(branchData, session);
        await session.commitTransaction();

        res.status(201).json({
          success: true,
          message: 'Branch created successfully',
          data: {
            id: branch._id,
            name: branch.name,
            tenantId: branch.tenantId,
            isActive: branch.isActive,
            createdAt: branch.createdAt
          }
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      logger.error('Branch creation failed', {
        tenantId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to create branch',
        message: error.message
      });
    }
  }
);

/**
 * @route POST /api/tenants/:id/users
 * @desc Add a new user to existing tenant
 * @access Private (TenantAdmin, BranchAdmin)
 */
router.post('/:id/users',
  enhancedSecurity.applyAllSecurity(),
  
  [
    body('email')
      .isEmail()
      .withMessage('Valid email is required'),
    
    body('firstName')
      .notEmpty()
      .withMessage('First name is required'),
    
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required'),
    
    body('role')
      .isIn(['TenantAdmin', 'BranchAdmin', 'BranchUser'])
      .withMessage('Invalid user role'),
    
    body('branchId')
      .optional()
      .isMongoId()
      .withMessage('Invalid branch ID')
  ],
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { id } = req.params;
      
      // Check permissions
      if (!req.user.permissions.includes('user:create') && 
          !req.user.permissions.includes('*') &&
          req.user.tenantId !== id) {
        return res.status(403).json({
          error: 'Insufficient permissions to create users'
        });
      }

      const userData = {
        ...req.body,
        tenantId: id,
        password: req.body.password || tenantAutomationService.generateRandomPassword()
      };

      const session = await require('mongoose').startSession();
      session.startTransaction();

      try {
        const user = await tenantAutomationService.createUser(userData, session);
        await session.commitTransaction();

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
            isActive: user.isActive,
            createdAt: user.createdAt
          },
          temporaryPassword: userData.password // Only show if generated
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      logger.error('User creation failed', {
        tenantId: req.params.id,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to create user',
        message: error.message
      });
    }
  }
);

module.exports = router;