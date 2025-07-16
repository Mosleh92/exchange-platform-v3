const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

exports.authorize = (roles = []) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || (roles.length && !roles.includes(user.role))) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

 copilot/fix-7bcc1d48-f060-4cc7-83e6-8f7e91fc2fc5
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
=======
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .populate('tenantId')
      .select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    if (user.isLocked) {
      return res.status(401).json({ message: 'Account is locked' });
    }

    // Check tenant status for non-super admins
    if (user.role !== 'super_admin' && user.tenantId && !user.tenantId.isActive) {
      return res.status(401).json({ message: 'Tenant is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error' });
main
  }
};

const roleMiddleware = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

const tenantMiddleware = async (req, res, next) => {
  try {
    const subdomain = req.headers['x-tenant-subdomain'] || req.query.tenant;
    
    if (!subdomain) {
      return res.status(400).json({ message: 'Tenant subdomain required' });
    }

    const tenant = await Tenant.findOne({ subdomain, isActive: true });
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
 copilot/fix-7bcc1d48-f060-4cc7-83e6-8f7e91fc2fc5
    auth: authMiddleware,
    authMiddleware, // alias
    authenticate: authMiddleware, // alias for compatibility
    protect: authMiddleware, // alias for compatibility  
    authorize,
    tenantAccess,
    superAdmin: authorize('super_admin') // helper for super admin role
};
=======
  authMiddleware,
  roleMiddleware,
  tenantMiddleware
};
 main
