const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

/**
 * Authenticate requests using JWT token.
 * Attaches a simplified user object to the request on success.
 */
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'توکن احراز هویت ارائه نشده است'
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.app.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'توکن منقضی شده است' });
    }
    return res.status(401).json({ success: false, message: 'توکن نامعتبر است' });
  }

  try {
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'کاربر یافت نشد' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'حساب کاربری غیرفعال شده است' });
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'سازمان شما غیرفعال شده است' });
    }

    req.user = {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      permissions: user.permissions,
      branchId: user.branchId,
      status: user.status
    };
    req.userData = user;
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensure a request is scoped to the authenticated user's tenant.
 */
const tenantIsolation = async (req, res, next) => {
  const tenantId =
    req.params.tenantId ||
    req.body.tenantId ||
    req.query.tenantId ||
    req.headers['x-tenant-id'];

  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'شناسه صرافی ارائه نشده است' });
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return res.status(400).json({ success: false, message: 'شناسه صرافی نامعتبر است' });
  }

  if (req.user && req.user.tenantId && req.user.tenantId.toString() !== tenantId.toString()) {
    return res.status(403).json({ success: false, message: 'شما دسترسی به این صرافی را ندارید' });
  }

  req.params.tenantId = tenantId;
  next();
};

/**
 * Authorize access based on roles or permissions.
 * Usage: authorize('role1', 'resource:action')
 */
const authorize = (...requirements) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'احراز هویت لازم است' });
    }

    const { role, permissions = [] } = req.user;

    const hasRole = requirements.some((r) => r === role);
    const hasPermission = requirements.some((reqStr) => {
      if (!reqStr.includes(':')) return false;
      const [resource, action] = reqStr.split(':');
      return permissions.some(
        (p) => p.resource === resource && p.actions && p.actions.includes(action)
      );
    });

    if (!hasRole && !hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی به این عملیات را ندارید'
      });
    }

    next();
  };
};

// Expose middleware and aliases for backward compatibility
auth.auth = auth;
auth.authenticate = auth;
auth.protect = auth;
auth.authenticateToken = auth;
auth.authorize = authorize;
auth.authorizeRoles = authorize;
auth.tenantIsolation = tenantIsolation;
auth.tenantAccess = tenantIsolation;

module.exports = auth;

