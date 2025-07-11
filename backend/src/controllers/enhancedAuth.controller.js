// backend/src/controllers/enhancedAuth.controller.js
const UserSecure = require('../models/UserSecure');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const i18n = require('../utils/i18n');
const securityAudit = require('../utils/securityAudit');
const sessionSecurity = require('../utils/sessionSecurity');
const sanitization = require('../utils/sanitization');
const TwoFactorAuthService = require('../services/twoFactorAuthService');

/**
 * Enhanced Authentication Controller with comprehensive security features
 */
class EnhancedAuthController {
    constructor() {
        this.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
        this.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';
        this.ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
        this.REFRESH_TOKEN_EXPIRY = '7d'; // Longer-lived refresh tokens
    }

    /**
     * Enhanced user registration with security validations
     */
    async register(req, res) {
        try {
            const { username, email, password, fullName, phone, nationalId, role = 'customer', tenantId } = req.body;

            // Validate and sanitize input
            const validation = sanitization.validateAndSanitize(req.body, {
                username: { type: 'string', required: true, minLength: 3, maxLength: 50 },
                email: { type: 'email', required: true },
                password: { type: 'string', required: true, minLength: 8 },
                fullName: { type: 'string', required: true, minLength: 2 },
                phone: { type: 'phone', required: true },
                nationalId: { type: 'string', required: false }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر است',
                    errors: validation.errors
                });
            }

            // Check if user already exists
            const existingUser = await UserSecure.findOne({
                $or: [{ email: validation.data.email }, { username: validation.data.username }]
            });

            if (existingUser) {
                securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_FAILED, {
                    req,
                    reason: 'user_already_exists',
                    email: validation.data.email
                });

                return res.status(400).json({
                    success: false,
                    message: i18n.t('auth.user_exists')
                });
            }

            // Validate password strength
            if (!this.validatePasswordStrength(validation.data.password)) {
                return res.status(400).json({
                    success: false,
                    message: 'رمز عبور باید شامل حداقل 8 کاراکتر، یک حرف بزرگ، یک حرف کوچک، یک عدد و یک کاراکتر خاص باشد'
                });
            }

            // Create user with encrypted fields
            const user = new UserSecure({
                username: validation.data.username,
                email: validation.data.email,
                password: validation.data.password,
                firstName: validation.data.fullName.split(' ')[0],
                lastName: validation.data.fullName.split(' ').slice(1).join(' ') || validation.data.fullName,
                phone: validation.data.phone,
                nationalId: validation.data.nationalId,
                role,
                tenantId,
                isActive: true,
                isVerified: false
            });

            await user.save();

            // Log successful registration
            securityAudit.trackAuth(securityAudit.securityEvents.USER_CREATED, {
                req,
                user: { id: user._id, email: user.email, role: user.role }
            });

            res.status(201).json({
                success: true,
                message: i18n.t('auth.registration_success'),
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
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

    /**
     * Enhanced login with 2FA, session management, and security checks
     */
    async login(req, res) {
        try {
            const { email, password, twoFactorToken } = req.body;

            // Validate input
            const validation = sanitization.validateAndSanitize(req.body, {
                email: { type: 'email', required: true },
                password: { type: 'string', required: true },
                twoFactorToken: { type: 'string', required: false }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر است',
                    errors: validation.errors
                });
            }

            // Find user
            const user = await UserSecure.findOne({ email: validation.data.email })
                .populate('tenantId', 'name code status')
                .select('+twoFactorSecret');

            if (!user) {
                securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_FAILED, {
                    req,
                    reason: 'user_not_found',
                    email: validation.data.email
                });

                return res.status(401).json({
                    success: false,
                    message: i18n.t('auth.invalid_credentials')
                });
            }

            // Check if account is locked
            if (user.isCurrentlyLocked) {
                securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_BLOCKED, {
                    req,
                    user: { id: user._id, email: user.email },
                    reason: 'account_locked'
                });

                return res.status(423).json({
                    success: false,
                    message: i18n.t('auth.account_locked')
                });
            }

            // Check if account is active
            if (!user.isActive) {
                securityAudit.trackAuth(securityAudit.securityEvents.ACCESS_DENIED, {
                    req,
                    user: { id: user._id, email: user.email },
                    reason: 'account_inactive'
                });

                return res.status(401).json({
                    success: false,
                    message: 'حساب کاربری غیرفعال است'
                });
            }

            // Verify password
            const isPasswordValid = await user.comparePassword(validation.data.password);
            if (!isPasswordValid) {
                await user.incLoginAttempts();
                
                securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_FAILED, {
                    req,
                    user: { id: user._id, email: user.email },
                    reason: 'invalid_password'
                });

                return res.status(401).json({
                    success: false,
                    message: i18n.t('auth.invalid_credentials')
                });
            }

            // Check 2FA if enabled
            if (user.twoFactorEnabled) {
                if (!twoFactorToken) {
                    return res.status(200).json({
                        success: false,
                        requiresTwoFactor: true,
                        message: 'کد تأیید دو مرحله‌ای الزامی است'
                    });
                }

                const twoFactorValid = await TwoFactorAuthService.verifyToken(user._id, twoFactorToken);
                if (!twoFactorValid.success) {
                    securityAudit.trackAuth(securityAudit.securityEvents.TWO_FA_FAILED, {
                        req,
                        user: { id: user._id, email: user.email }
                    });

                    return res.status(401).json({
                        success: false,
                        message: 'کد تأیید دو مرحله‌ای نامعتبر است'
                    });
                }

                securityAudit.trackAuth(securityAudit.securityEvents.TWO_FA_SUCCESS, {
                    req,
                    user: { id: user._id, email: user.email }
                });
            }

            // Reset login attempts on successful login
            await user.resetLoginAttempts();

            // Check tenant status for non-super admin users
            if (user.role !== 'super_admin' && user.tenantId) {
                if (user.tenantId.status !== 'active') {
                    securityAudit.trackAuth(securityAudit.securityEvents.ACCESS_DENIED, {
                        req,
                        user: { id: user._id, email: user.email },
                        reason: 'tenant_inactive'
                    });

                    return res.status(403).json({
                        success: false,
                        message: i18n.t('auth.tenant_inactive')
                    });
                }
            }

            // Create secure session
            const sessionData = await sessionSecurity.createSession(user, req);

            // Generate tokens
            const accessToken = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId?._id,
                    sessionId: sessionData.sessionId
                },
                this.ACCESS_TOKEN_SECRET,
                { expiresIn: this.ACCESS_TOKEN_EXPIRY }
            );

            const refreshTokenValue = crypto.randomBytes(64).toString('hex');
            const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Store refresh token
            await RefreshToken.create({
                userId: user._id,
                tenantId: user.tenantId?._id,
                token: refreshTokenValue,
                expiresAt: refreshTokenExpiry,
                sessionId: sessionData.sessionId
            });

            // Update user's last login
            user.lastLogin = new Date();
            await user.save();

            // Log successful login
            securityAudit.trackAuth(securityAudit.securityEvents.LOGIN_SUCCESS, {
                req,
                user: { id: user._id, email: user.email, role: user.role },
                sessionId: sessionData.sessionId
            });

            res.json({
                success: true,
                message: i18n.t('auth.login_success'),
                data: {
                    accessToken,
                    refreshToken: refreshTokenValue,
                    expiresIn: 15 * 60, // 15 minutes in seconds
                    sessionId: sessionData.sessionId,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        tenantId: user.tenantId?._id,
                        twoFactorEnabled: user.twoFactorEnabled,
                        isVerified: user.isVerified
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            
            securityAudit.trackAuth(securityAudit.securityEvents.SYSTEM_ERROR, {
                req,
                error: error.message
            });

            res.status(500).json({
                success: false,
                message: i18n.t('messages.server_error')
            });
        }
    }

    /**
     * Enhanced refresh token mechanism with rotation
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token الزامی است'
                });
            }

            // Find and validate refresh token
            const storedToken = await RefreshToken.findOne({ token: refreshToken })
                .populate('userId', 'email role tenantId isActive');

            if (!storedToken || storedToken.expiresAt < new Date()) {
                if (storedToken) {
                    await storedToken.deleteOne();
                }

                securityAudit.trackAuth(securityAudit.securityEvents.TOKEN_EXPIRED, {
                    req,
                    reason: 'refresh_token_invalid'
                });

                return res.status(401).json({
                    success: false,
                    message: 'Refresh token نامعتبر یا منقضی است'
                });
            }

            const user = storedToken.userId;

            // Check if user is still active
            if (!user.isActive) {
                await storedToken.deleteOne();
                
                return res.status(401).json({
                    success: false,
                    message: 'حساب کاربری غیرفعال است'
                });
            }

            // Generate new access token
            const newAccessToken = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                    sessionId: storedToken.sessionId
                },
                this.ACCESS_TOKEN_SECRET,
                { expiresIn: this.ACCESS_TOKEN_EXPIRY }
            );

            // Rotate refresh token
            const newRefreshToken = crypto.randomBytes(64).toString('hex');
            const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            // Remove old refresh token and create new one
            await storedToken.deleteOne();
            await RefreshToken.create({
                userId: user._id,
                tenantId: user.tenantId,
                token: newRefreshToken,
                expiresAt: newExpiry,
                sessionId: storedToken.sessionId
            });

            // Log token refresh
            securityAudit.trackAuth(securityAudit.securityEvents.TOKEN_REFRESH, {
                req,
                user: { id: user._id, email: user.email }
            });

            res.json({
                success: true,
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresIn: 15 * 60 // 15 minutes in seconds
                }
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در تجدید توکن'
            });
        }
    }

    /**
     * Enhanced logout with session cleanup
     */
    async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            const sessionId = req.sessionData?.sessionId;

            // Remove refresh token if provided
            if (refreshToken) {
                await RefreshToken.deleteOne({ token: refreshToken });
            }

            // Invalidate session
            if (sessionId) {
                await sessionSecurity.invalidateSession(sessionId, 'USER_LOGOUT');
            }

            // Log logout
            securityAudit.trackAuth(securityAudit.securityEvents.LOGOUT, {
                req,
                user: req.user,
                sessionId
            });

            res.json({
                success: true,
                message: 'با موفقیت خارج شدید'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'خطا در خروج'
            });
        }
    }

    /**
     * Logout from all devices
     */
    async logoutAll(req, res) {
        try {
            const userId = req.user.userId || req.user._id;
            const currentSessionId = req.sessionData?.sessionId;

            // Remove all refresh tokens for this user
            await RefreshToken.deleteMany({ userId });

            // Invalidate all sessions except current one
            await sessionSecurity.invalidateAllUserSessions(userId, currentSessionId);

            // Log logout all
            securityAudit.trackAuth(securityAudit.securityEvents.LOGOUT, {
                req,
                user: req.user,
                reason: 'logout_all_devices'
            });

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

    /**
     * Validate password strength
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    /**
     * Get current user with security context
     */
    async getCurrentUser(req, res) {
        try {
            const userId = req.user.userId || req.user._id;
            const user = await UserSecure.findById(userId)
                .populate('tenantId', 'name code status')
                .select('-password -twoFactorSecret -twoFactorBackupCodes');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: i18n.t('messages.not_found')
                });
            }

            // Log data access
            securityAudit.trackDataAccess(securityAudit.securityEvents.SENSITIVE_DATA_ACCESS, {
                req,
                user: { id: user._id, email: user.email },
                dataType: 'user_profile'
            });

            res.json({
                success: true,
                data: { user }
            });
        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: i18n.t('messages.server_error')
            });
        }
    }

    /**
     * Validate token endpoint
     */
    async validateToken(req, res) {
        try {
            // Token is already validated by middleware
            res.json({
                success: true,
                message: 'توکن معتبر است',
                data: {
                    user: req.user,
                    session: req.sessionData
                }
            });
        } catch (error) {
            console.error('Validate token error:', error);
            res.status(500).json({
                success: false,
                message: i18n.t('messages.server_error')
            });
        }
    }
}

module.exports = EnhancedAuthController;