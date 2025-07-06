// backend/src/routes/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { auth, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');

const router = express.Router();
// Create a single instance of the controller
const authController = new AuthController();

// A helper to ensure errors in async functions are caught and passed to the error handler
const asyncHandler = (fn) => (req, res, next) => {
    return Promise
        .resolve(fn(req, res, next))
        .catch(next);
};

// User Registration
router.post('/register', 
    [
        auth,
        authorize(['superAdmin', 'tenantAdmin']),
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('A valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        body('role').isIn(['tenantAdmin', 'branchManager', 'staff', 'customer']).withMessage('A valid role is required'),
    ],
    validateRequest, 
    asyncHandler(authController.register.bind(authController))
);

// User Login
router.post('/login', [
    body('email').isEmail().withMessage('ایمیل معتبر الزامی است'),
    body('password').notEmpty().withMessage('رمز عبور الزامی است'),
    validateRequest
], asyncHandler(authController.login.bind(authController)));

// User Logout
router.post('/logout', 
    auth, 
    asyncHandler(authController.logout.bind(authController))
);

// Get Current User Profile
router.get('/me', 
    auth, 
    asyncHandler(authController.getCurrentUser.bind(authController))
);

// Validate Token
router.get('/validate', 
    auth, 
    asyncHandler(authController.validateToken.bind(authController))
);

// Change Password
router.put('/change-password',
    auth,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 })
    ],
    validateRequest,
    asyncHandler(authController.changePassword.bind(authController))
);

// Update Profile
router.put('/me',
    auth,
    [
        body('fullName').optional().isString(),
        body('phone').optional().isString()
    ],
    validateRequest,
    asyncHandler(authController.updateProfile.bind(authController))
);

// Request Password Reset
router.post('/forgot-password', 
    [ body('email').isEmail() ], 
    validateRequest, 
    asyncHandler(authController.requestPasswordReset.bind(authController))
);

// Reset Password with Token
router.post('/reset-password', 
    [
        body('token').notEmpty(),
        body('newPassword').isLength({ min: 6 })
    ], 
    validateRequest, 
    asyncHandler(authController.resetPassword.bind(authController))
);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;