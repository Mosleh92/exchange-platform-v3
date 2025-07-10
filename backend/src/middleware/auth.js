const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const tokenBlacklistService = require('../services/tokenBlacklistService');

exports.authorize = (roles = []) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - No token provided' 
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - Token revoked' 
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user tokens are blacklisted
    if (payload.iat) {
      const isUserTokenBlacklisted = await tokenBlacklistService.isUserTokenBlacklisted(
        payload.userId || payload.id, 
        payload.iat
      );
      if (isUserTokenBlacklisted) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized - User tokens revoked' 
        });
      }
    }

    const user = await User.findById(payload.userId || payload.id);
    if (!user || (roles.length && !roles.includes(user.role))) {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden' 
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(401).json({ 
      success: false,
      error: 'Unauthorized' 
    });
  }
};
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been revoked' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user tokens are blacklisted (for security incidents)
    if (decoded.iat) {
      const isUserTokenBlacklisted = await tokenBlacklistService.isUserTokenBlacklisted(
        decoded.userId || decoded.id, 
        decoded.iat
      );
      if (isUserTokenBlacklisted) {
        return res.status(401).json({ 
          success: false,
          message: 'All user tokens have been revoked for security reasons' 
        });
      }
    }

    // Find user
    const user = await User.findById(decoded.userId || decoded.id)
      .populate('tenantId')
      .select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    if (user.isLocked) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is locked' 
      });
    }

    // Check tenant status for non-super admins
    if (user.role !== 'super_admin' && user.tenantId && !user.tenantId.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Tenant is inactive' 
      });
    }

    // Add token to request for potential blacklisting on logout
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error in authentication' 
    });
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
