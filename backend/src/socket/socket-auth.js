const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// **اصلاح شده**: Socket.IO Authentication Middleware
const socketAuth = async (socket, next) => {
    try {
        // Get token from handshake auth
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return next(new Error('Authentication token missing'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists
        const user = await User.findById(decoded.userId).populate('tenantId');
        if (!user) {
            return next(new Error('User not found'));
        }

        // Check if user is active
        if (user.status !== 'active') {
            return next(new Error('User account is inactive'));
        }

        // Check tenant status for non-super admin users
        if (user.role !== 'super_admin' && user.tenantId) {
            if (!user.tenantId || user.tenantId.status !== 'active') {
                return next(new Error('Tenant is inactive'));
            }
        }

        // Add user info to socket
        socket.user = {
            userId: user._id,
            tenantId: user.tenantId?._id,
            role: user.role,
            permissions: user.permissions,
            branchId: user.branchId
        };

        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
    }
};

// **اصلاح شده**: Tenant Access Control for Socket Events
const socketTenantAccess = (socket, tenantId, callback) => {
    try {
        // Super admin can access all tenants
        if (socket.user.role === 'super_admin') {
            return callback(null, true);
        }

        // Check if user belongs to the tenant
        if (!socket.user.tenantId || socket.user.tenantId.toString() !== tenantId.toString()) {
            return callback(new Error('Access denied to tenant'), false);
        }

        callback(null, true);
    } catch (error) {
        console.error('Socket tenant access error:', error);
        callback(new Error('Access validation failed'), false);
    }
};

module.exports = {
    socketAuth,
    socketTenantAccess
};
