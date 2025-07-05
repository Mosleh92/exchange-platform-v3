const express = require('express');
const router = express.Router();
const CustomerService = require('../services/CustomerService');
const { auth, authorize } = require('../middleware/auth');
const { tenantAccess } = require('../middleware/tenant');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validators');
const logger = require('../utils/logger');
const customerController = require('../controllers/customer.controller');
const staffController = require('../controllers/staff.controller');

// Apply authentication and tenant isolation middleware to all customer routes
router.use(auth);

/**
 * @route POST /api/customers
 * @desc Create a new customer for the authenticated tenant
 * @access Private (Admin/Manager/Operator roles can create customers)
 */
router.post('/',
    authorize(['admin', 'manager', 'operator']),
    [
        body('name').notEmpty().withMessage('نام مشتری الزامی است').trim().isLength({ min: 2, max: 100 }),
        body('phone').notEmpty().withMessage('شماره تلفن مشتری الزامی است').trim().matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/).withMessage('فرمت شماره تلفن نامعتبر است'),
        body('email').optional().isEmail().withMessage('ایمیل معتبر نیست').normalizeEmail(),
        body('national_id').optional().trim().isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقمی باشد'),
        body('address').optional().trim().isLength({ max: 500 }).withMessage('آدرس نمی‌تواند بیش از 500 کاراکتر باشد'),
        body('notes').optional().trim().isLength({ max: 500 }).withMessage('توضیحات نمی‌تواند بیش از 500 کاراکتر باشد'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const newCustomer = await CustomerService.createCustomer(tenantId, userId, req.body);
            res.status(201).json({
                success: true,
                message: 'مشتری با موفقیت ثبت شد',
                data: newCustomer
            });
        } catch (error) {
            logger.error('Error creating customer:', { error: error.message, tenantId: req.user.tenantId, body: req.body });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در ثبت مشتری جدید'
            });
        }
    }
);

/**
 * @route GET /api/customers
 * @desc Get all customers for the authenticated tenant
 * @access Private (All authenticated roles can view customers)
 */
router.get('/',
    authorize(['admin', 'manager', 'operator', 'viewer', 'branch_manager', 'staff']),
    [
        query('term').optional().trim().isLength({ min: 1 }).withMessage('عبارت جستجو نمی‌تواند خالی باشد'),
        query('filter').optional().isIn(['all', 'active', 'inactive']).withMessage('فیلتر نامعتبر است'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const { term, filter } = req.query;
            const customers = await CustomerService.getCustomers(tenantId, { term, filter }, req.user);
            res.json({
                success: true,
                data: customers
            });
        } catch (error) {
            logger.error('Error fetching customers:', { error: error.message, tenantId: req.user.tenantId, query: req.query });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در دریافت لیست مشتریان'
            });
        }
    }
);

/**
 * @route GET /api/customers/:customerId
 * @desc Get a single customer by ID for the authenticated tenant
 * @access Private (All authenticated roles can view customers)
 */
router.get('/:customerId',
    authorize(['admin', 'manager', 'operator', 'viewer']),
    [
        param('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const customer = await CustomerService.getCustomerById(tenantId, req.params.customerId);
            res.json({
                success: true,
                data: customer
            });
        } catch (error) {
            logger.error('Error fetching customer by ID:', { error: error.message, tenantId: req.user.tenantId, customerId: req.params.customerId });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در دریافت مشتری'
            });
        }
    }
);

/**
 * @route PUT /api/customers/:customerId
 * @desc Update a customer for the authenticated tenant
 * @access Private (Admin/Manager role can update customers)
 */
router.put('/:customerId',
    authorize(['admin', 'manager', 'operator']),
    [
        param('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است'),
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('phone').optional().trim().matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/).withMessage('فرمت شماره تلفن نامعتبر است'),
        body('email').optional().isEmail().withMessage('ایمیل معتبر نیست').normalizeEmail(),
        body('national_id').optional().trim().isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقمی باشد'),
        body('address').optional().trim().isLength({ max: 500 }).withMessage('آدرس نمی‌تواند بیش از 500 کاراکتر باشد'),
        body('notes').optional().trim().isLength({ max: 500 }).withMessage('توضیحات نمی‌تواند بیش از 500 کاراکتر باشد'),
        body('status').optional().isIn(['pending', 'verified', 'rejected', 'active', 'inactive']).withMessage('وضعیت مشتری نامعتبر است'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId; // User performing the update
            const updatedCustomer = await CustomerService.updateCustomer(tenantId, req.params.customerId, userId, req.body);
            res.json({
                success: true,
                message: 'مشتری با موفقیت به‌روزرسانی شد',
                data: updatedCustomer
            });
        } catch (error) {
            logger.error('Error updating customer:', { error: error.message, tenantId: req.user.tenantId, customerId: req.params.customerId, body: req.body });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در به‌روزرسانی مشتری'
            });
        }
    }
);

/**
 * @route DELETE /api/customers/:customerId
 * @desc Delete a customer for the authenticated tenant
 * @access Private (Admin role only can delete customers)
 */
router.delete('/:customerId',
    authorize(['admin']),
    [
        param('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            await CustomerService.deleteCustomer(tenantId, req.params.customerId);
            res.json({
                success: true,
                message: 'مشتری با موفقیت حذف شد'
            });
        } catch (error) {
            logger.error('Error deleting customer:', { error: error.message, tenantId: req.user.tenantId, customerId: req.params.customerId });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در حذف مشتری'
            });
        }
    }
);

/**
 * @route POST /api/customers/findOrCreate
 * @desc Find an existing customer by phone/name, or create a new one
 * @access Private (Admin/Manager/Operator roles)
 */
router.post('/findOrCreate',
    authorize(['admin', 'manager', 'operator']),
    [
        body('name').notEmpty().withMessage('نام مشتری الزامی است').trim().isLength({ min: 2, max: 100 }),
        body('phone').notEmpty().withMessage('شماره تلفن مشتری الزامی است').trim().matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/).withMessage('فرمت شماره تلفن نامعتبر است'),
        body('email').optional().isEmail().withMessage('ایمیل معتبر نیست').normalizeEmail(),
        body('national_id').optional().trim().isLength({ min: 10, max: 10 }).withMessage('کد ملی باید 10 رقمی باشد'),
        body('address').optional().trim().isLength({ max: 500 }).withMessage('آدرس نمی‌تواند بیش از 500 کاراکتر باشد'),
        body('notes').optional().trim().isLength({ max: 500 }).withMessage('توضیحات نمی‌تواند بیش از 500 کاراکتر باشد'),
        validateRequest
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const { name, phone, email, national_id, address, notes } = req.body;

            // Use the new service method to find or create customer and their default account
            const { customer, account } = await CustomerService.findOrCreateCustomerAndAccount(tenantId, userId, {
                name, phone, email, national_id, address, notes
            });

            res.status(200).json({
                success: true,
                message: 'مشتری و حساب با موفقیت یافت یا ثبت شد',
                data: {
                    customer,
                    account
                }
            });

        } catch (error) {
            logger.error('Error in findOrCreate customer route:', { error: error.message, tenantId: req.user.tenantId, body: req.body });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در یافتن یا ثبت مشتری و حساب'
            });
        }
    }
);

// Get special rates for the logged-in customer (customer portal)
router.get('/my-special-rates', authorize(['customer']), customerController.getMySpecialRates);

// Change password for the logged-in customer
router.post('/change-password', auth, (req, res, next) => {
  if (req.user.role !== 'customer') return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  next();
}, customerController.changeMyPassword);

// Enable or disable OTP for the logged-in customer
router.post('/set-otp', auth, (req, res, next) => {
  if (req.user.role !== 'customer') return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  next();
}, customerController.setMyOTP);

// Get audit logs for the logged-in customer
router.get('/my-audit-logs', auth, (req, res, next) => {
  if (req.user.role !== 'customer') return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  next();
}, customerController.getMyAuditLogs);

// مانده حساب مشتری
router.get('/:customerId/balance', customerController.getCustomerBalance);

/**
 * @route POST /api/customers/verify-phone
 * @desc Verify customer phone by code
 * @access Public (no auth required)
 */
router.post('/verify-phone', staffController.verifyCustomerPhone);

// مثال: فقط سوپرادمین و tenant_admin به لیست همه مشتریان دسترسی دارند
router.get('/all', authorize(['super_admin', 'tenant_admin']), customerController.getCustomers);

module.exports = router; 