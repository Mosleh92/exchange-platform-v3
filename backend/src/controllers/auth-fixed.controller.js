const User = require('../models/User');
// const Tenant = require('../models/Tenant'); // Unused
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs'); // Unused
const { validationResult } = require('express-validator');
const i18n = require('../utils/i18n');
const { checkPlanLimit } = require('../services/planLimitService');
const RefreshToken = require('../models/RefreshToken');
// const crypto = require('crypto'); // Unused
const validator = require('validator');

// **اصلاح شده**: استفاده از JWT_SECRET به جای ACCESS_TOKEN_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Check if secrets are set
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets must be set in environment variables');
}

// **اصلاح شده**: Generate JWT tokens with proper validation
const generateAccessToken = (userId, role, tenantId) => {
    if (!userId || !role) {
        throw new Error('Invalid parameters for token generation');
    }
    
    return jwt.sign(
        { 
            userId: userId.toString(),
            role, 
            tenantId: tenantId?.toString(),
            type: 'access'
        },
        JWT_SECRET,
        { expiresIn: '1h' } // کاهش زمان انقضا برای امنیت بیشتر
    );
};

const generateRefreshToken = (userId, tenantId) => {
    if (!userId) {
        throw new Error('Invalid parameters for refresh token generation');
    }
    
    return jwt.sign(
        { 
            userId: userId.toString(),
            tenantId: tenantId?.toString(),
            type: 'refresh'
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

class AuthController {
    async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const { username, email, password, fullName, phone, nationalId, role = 'customer', tenantId } = req.body;

            // **اصلاح شده**: Sanitize inputs without breaking email
            const sanitizedData = {
                username: validator.escape(username),
                email: validator.normalizeEmail(email),
                fullName: validator.escape(fullName),
                phone: validator.escape(phone),
                nationalId: validator.escape(nationalId)
            };

            // Validate email format
            if (!validator.isEmail(sanitizedData.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'آدرس ایمیل نامعتبر است'
                });
            }

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: sanitizedData.email }, 
                    { username: sanitizedData.username }
                ]
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: i18n.t('auth.user_exists')
                });
            }

            // **اصلاح شده**: Check tenant plan limits
            if (tenantId && role === 'customer') {
                const canCreate = await checkPlanLimit(tenantId, 'users');
                if (!canCreate) {
                    return res.status(403).json({
                        success: false,
                        message: 'محدودیت تعداد کاربران در پلن فعلی'
                    });
                }
            }

            // Create user
            const user = new User({
                username: sanitizedData.username,
                email: sanitizedData.email,
                password, // Will be hashed by pre-save hook
                fullName: sanitizedData.fullName,
                phone: sanitizedData.phone,
                nationalId: sanitizedData.nationalId,
                role,
                tenantId: tenantId || null,
                status: 'pending'
            });

            await user.save();

            res.status(201).json({
                success: true,
                message: i18n.t('auth.registration_success'),
                data: { 
                    user: { 
                        id: user._id, 
                        username: user.username, 
                        email: user.email, 
                        fullName: user.fullName, 
                        role: user.role 
                    } 
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: i18n.t('messages.operation_failed')
            });
        }
    }

    async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // **اصلاح شده**: Sanitize email input
            const sanitizedEmail = validator.normalizeEmail(email);
            if (!validator.isEmail(sanitizedEmail)) {
                return res.status(400).json({
                    success: false,
                    message: 'آدرس ایمیل نامعتبر است'
                });
            }

            // Find user with tenant info
            const user = await User.findOne({ email: sanitizedEmail })
                .populate('tenantId', 'name code status');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: i18n.t('auth.invalid_credentials')
                });
            }

            // Check if account is locked
            if (user.isLocked) {
                return res.status(423).json({
                    success: false,
                    message: i18n.t('auth.account_locked')
                });
            }

            // Check password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                await user.incLoginAttempts();
                return res.status(401).json({
                    success: false,
                    message: i18n.t('auth.invalid_credentials')
                });
            }

            // **اصلاح شده**: Reset login attempts on successful login
            if (user.loginAttempts > 0) {
                await user.resetLoginAttempts();
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Check tenant status for non-super admin users
            if (user.role !== 'super_admin' && user.tenantId) {
                if (user.tenantId.status !== 'active') {
                    return res.status(403).json({
                        success: false,
                        message: i18n.t('auth.tenant_inactive')
                    });
                }
            }

            // **اصلاح شده**: Generate JWT tokens properly
            const accessToken = generateAccessToken(
                user._id, 
                user.role, 
                user.tenantId?._id
            );
            
            const refreshToken = generateRefreshToken(
                user._id, 
                user.tenantId?._id
            );

            // Store refresh token in database
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await RefreshToken.create({
                userId: user._id,
                tenantId: user.tenantId?._id,
                token: refreshToken,
                expiresAt
            });

            res.json({
                success: true,
                message: i18n.t('auth.login_success'),
                data: {
                    accessToken,
                    refreshToken,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        tenantId: user.tenantId?._id,
                        tenantName: user.tenantId?.name,
                        permissions: user.permissions,
                        branchId: user.branchId,
                        lastLogin: user.lastLogin
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در ورود به سیستم'
            });
        }
    }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token ارائه نشده است'
                });
            }

            // **اصلاح شده**: Verify refresh token as JWT
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token نامعتبر است'
                });
            }

            // Check if token type is refresh
            if (decoded.type !== 'refresh') {
                return res.status(401).json({
                    success: false,
                    message: 'نوع توکن نامعتبر است'
                });
            }

            // Check if refresh token exists in database
            const storedToken = await RefreshToken.findOne({
                token: refreshToken,
                userId: decoded.userId
            });

            if (!storedToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token یافت نشد'
                });
            }

            // Check if token is expired
            if (storedToken.expiresAt < new Date()) {
                await RefreshToken.deleteOne({ _id: storedToken._id });
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token منقضی شده است'
                });
            }

            // Get user info
            const user = await User.findById(decoded.userId)
                .populate('tenantId', 'name code status');

            if (!user || user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'کاربر یافت نشد یا غیرفعال است'
                });
            }

            // Generate new access token
            const newAccessToken = generateAccessToken(
                user._id, 
                user.role, 
                user.tenantId?._id
            );

            res.json({
                success: true,
                message: 'توکن با موفقیت تمدید شد',
                data: {
                    accessToken: newAccessToken,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        tenantId: user.tenantId?._id
                    }
                }
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در تمدید توکن'
            });
        }
    }

    async logout(req, res) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                // Remove refresh token from database
                await RefreshToken.deleteOne({ token: refreshToken });
            }

            res.json({
                success: true,
                message: 'با موفقیت خارج شدید'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در خروج از سیستم'
            });
        }
    }

    async logoutAll(req, res) {
        try {
            const userId = req.user.userId;

            // Remove all refresh tokens for this user
            await RefreshToken.deleteMany({ userId });

            res.json({
                success: true,
                message: 'از همه دستگاه‌ها خارج شدید'
            });
        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در خروج از همه دستگاه‌ها'
            });
        }
    }
}

module.exports = new AuthController();
