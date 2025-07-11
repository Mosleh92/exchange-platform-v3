// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TwoFactorAuthService = require('../services/twoFactorAuthService');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'دسترسی غیرمجاز - توکن یافت نشد'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('tenantId');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'کاربر غیرفعال یا یافت نشد'
      });
    }

    // Check if 2FA is required for this user role
    if (TwoFactorAuthService.is2FARequired(user.role) && !user.twoFactorEnabled) {
      return res.status(403).json({
        success: false,
        message: 'کاربران مدیر باید احراز هویت دومرحله‌ای را فعال کنند',
        code: 'REQUIRE_2FA_SETUP',
        data: {
          userId: user.id,
          role: user.role,
          setup2FAUrl: '/api/auth/2fa/generate-secret'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'توکن نامعتبر'
    });
  }
};

module.exports = authMiddleware;
