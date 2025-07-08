const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('توکن ارائه نشده است');
    }
    
    const decoded = jwt.verify(token, config.app.jwtSecret);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('کاربر یافت نشد');
    }

    // Check if user is active (status === 'active')
    if (user.status !== 'active') {
      throw new UnauthorizedError('حساب کاربری غیرفعال شده است');
    }

    // بررسی وضعیت Tenant
    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'سازمان شما غیرفعال شده است'
      });
    }

    req.user = decoded;
    
    // اضافه کردن tenant_id به تمام درخواستها
    req.tenantId = decoded.tenantId;
    
    // تنظیم اطلاعات کاربر در request (فقط یک بار)
    req.user = {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions,
      branchId: user.branchId,
      status: user.status
    };
    req.userData = user;
    
    next();
  } catch (error) {
    next(new UnauthorizedError('توکن نامعتبر است'));
  }
};

// Role-based and permission-based authorization middleware
const authorize = (...rolesOrPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'احراز هویت لازم است'
            });
        }

        // اگر نقش مجاز باشد
        if (rolesOrPermissions.some(role => req.user.role === role)) {
            return next();
        }

        // اگر مجوز ریزتر خواسته شده باشد (مثلاً resource:action)
        if (req.user.permissions && Array.isArray(req.user.permissions)) {
            for (const perm of rolesOrPermissions) {
                // perm به صورت resource:action
                const [resource, action] = perm.split(':');
                const found = req.user.permissions.find(p => p.resource === resource && p.actions.includes(action));
                if (found) return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: 'شما دسترسی به این عملیات را ندارید'
        });
    };
};

// Tenant access middleware
const tenantAccess = async (req, res, next) => {
    try {
        if (req.user.role === 'super_admin') {
            return next(); // Super admin has access to all tenants
        }

        const tenantId = req.params.tenantId || req.body.tenantId;
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'شناسه صرافی ارائه نشده است'
            });
        }

        if (req.user.tenantId && req.user.tenantId.toString() !== tenantId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'شما دسترسی به این صرافی را ندارید'
            });
        }

        next();
    } catch (error) {
        console.error('Tenant access middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'خطا در بررسی دسترسی به صرافی'
        });
    }
};

module.exports = {
    auth: authMiddleware,
    authMiddleware, // alias
    authenticate: authMiddleware, // alias for compatibility
    protect: authMiddleware, // alias for compatibility  
    authorize,
    tenantAccess,
    superAdmin: authorize('super_admin') // helper for super admin role
};