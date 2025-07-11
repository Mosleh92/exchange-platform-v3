const express = require('express');
const router = express.Router();
const tenantAutomationService = require('../services/tenantAutomation');
const { validateCSRFToken } = require('../middleware/csrf');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Tenant Management Routes
 * Handles automated tenant creation and management
 */

/**
 * @route POST /api/tenants
 * @desc Create new tenant with branches and users
 * @access Private (SuperAdmin only)
 */
router.post('/', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        // Validate user permissions
        if (req.user.role !== 'SuperAdmin') {
            return res.status(403).json({
                success: false,
                message: 'فقط مدیران کل می‌توانند صرافی جدید ایجاد کنند'
            });
        }

        const {
            name,
            timezone,
            currency,
            language,
            features,
            branches = [],
            users = []
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'نام صرافی الزامی است'
            });
        }

        // Structure tenant data
        const tenantData = {
            name,
            timezone,
            currency,
            language,
            features,
            branches: branches.map(branch => ({
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                email: branch.email,
                operatingHours: branch.operatingHours,
                services: branch.services
            })),
            users: users.map(user => ({
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                password: user.password,
                role: user.role || 'Operator',
                branchId: user.branchId
            }))
        };

        // Create tenant structure
        const result = await tenantAutomationService.createTenantStructure(tenantData);

        logger.info('Tenant created successfully', {
            tenantId: result.tenant._id,
            createdBy: req.user.id,
            tenantName: name
        });

        res.status(201).json({
            success: true,
            message: 'صرافی با موفقیت ایجاد شد',
            data: {
                tenant: {
                    id: result.tenant._id,
                    name: result.tenant.name,
                    code: result.tenant.code,
                    status: result.tenant.status
                },
                branches: result.branches.map(branch => ({
                    id: branch._id,
                    name: branch.name,
                    code: branch.code
                })),
                users: result.users.map(user => ({
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    role: user.role
                })),
                statistics: {
                    branchCount: result.branches.length,
                    userCount: result.users.length
                }
            }
        });

    } catch (error) {
        logger.error('Error creating tenant', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در ایجاد صرافی',
            error: error.message
        });
    }
});

/**
 * @route GET /api/tenants/:id
 * @desc Get tenant structure details
 * @access Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Check if user has access to this tenant
        if (req.user.role !== 'SuperAdmin' && req.user.tenantId !== tenantId) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به این صرافی ندارید'
            });
        }

        const tenantStructure = await tenantAutomationService.getTenantStructure(tenantId);

        res.json({
            success: true,
            data: tenantStructure
        });

    } catch (error) {
        logger.error('Error fetching tenant structure', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت اطلاعات صرافی',
            error: error.message
        });
    }
});

/**
 * @route PUT /api/tenants/:id
 * @desc Update tenant information
 * @access Private (TenantAdmin or SuperAdmin)
 */
router.put('/:id', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Check permissions
        if (req.user.role !== 'SuperAdmin' && 
            (req.user.role !== 'TenantAdmin' || req.user.tenantId !== tenantId)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به ویرایش این صرافی ندارید'
            });
        }

        const updates = req.body;
        const updatedTenant = await tenantAutomationService.updateTenantStructure(tenantId, updates);

        logger.info('Tenant updated', {
            tenantId,
            updatedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'اطلاعات صرافی با موفقیت به‌روزرسانی شد',
            data: updatedTenant
        });

    } catch (error) {
        logger.error('Error updating tenant', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در به‌روزرسانی صرافی',
            error: error.message
        });
    }
});

/**
 * @route POST /api/tenants/:id/branches
 * @desc Add new branch to tenant
 * @access Private (TenantAdmin or SuperAdmin)
 */
router.post('/:id/branches', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Check permissions
        if (req.user.role !== 'SuperAdmin' && 
            (req.user.role !== 'TenantAdmin' || req.user.tenantId !== tenantId)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به افزودن شعبه ندارید'
            });
        }

        const branchData = req.body;
        
        // Create single branch
        const result = await tenantAutomationService.createTenantStructure({
            name: 'temp', // Not used for branch-only creation
            branches: [branchData],
            users: []
        });

        res.status(201).json({
            success: true,
            message: 'شعبه با موفقیت اضافه شد',
            data: result.branches[0]
        });

    } catch (error) {
        logger.error('Error adding branch', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در افزودن شعبه',
            error: error.message
        });
    }
});

/**
 * @route POST /api/tenants/:id/users
 * @desc Add new user to tenant
 * @access Private (TenantAdmin or SuperAdmin)
 */
router.post('/:id/users', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Check permissions
        if (req.user.role !== 'SuperAdmin' && 
            (req.user.role !== 'TenantAdmin' || req.user.tenantId !== tenantId)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به افزودن کاربر ندارید'
            });
        }

        const userData = req.body;
        
        // Create single user
        const result = await tenantAutomationService.createTenantStructure({
            name: 'temp', // Not used for user-only creation
            branches: [],
            users: [userData]
        });

        res.status(201).json({
            success: true,
            message: 'کاربر با موفقیت اضافه شد',
            data: {
                id: result.users[0]._id,
                name: result.users[0].name,
                username: result.users[0].username,
                role: result.users[0].role
            }
        });

    } catch (error) {
        logger.error('Error adding user', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در افزودن کاربر',
            error: error.message
        });
    }
});

/**
 * @route GET /api/tenants
 * @desc List all tenants (SuperAdmin only)
 * @access Private (SuperAdmin)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'SuperAdmin') {
            return res.status(403).json({
                success: false,
                message: 'فقط مدیران کل می‌توانند لیست صرافی‌ها را مشاهده کنند'
            });
        }

        const mongoose = require('mongoose');
        const Tenant = mongoose.model('Tenant');
        
        const tenants = await Tenant.find({})
            .select('name code status createdAt settings')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: tenants,
            count: tenants.length
        });

    } catch (error) {
        logger.error('Error fetching tenants', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت لیست صرافی‌ها',
            error: error.message
        });
    }
});

module.exports = router;