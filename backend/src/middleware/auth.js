const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
// Remove duplicate JWT import
const UserModel = require('../modules/user/user.model');

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
  authMiddleware,
  roleMiddleware,
  tenantMiddleware
};
