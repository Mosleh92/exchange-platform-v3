const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

class AuthService {
    // Enhanced token generation with full context
    generateToken(user) {
        const payload = {
            userId: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
            permissions: user.permissions || [],
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        };
        
        return jwt.sign(payload, process.env.JWT_SECRET);
    }
    
    // Generate refresh token
    generateRefreshToken(user) {
        const payload = {
            userId: user._id,
            type: 'refresh',
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
        };
        
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET);
    }
    
    // Enhanced login with security logging
    async login(email, password, ipAddress, userAgent) {
        try {
            // Find user with tenant context
            const user = await User.findOne({ 
                email: email.toLowerCase(),
                status: 'active'
            }).populate('tenantId', 'name status');
            
            if (!user) {
                await this.logSecurityEvent('LOGIN_FAILED', {
                    email,
                    reason: 'User not found',
                    ipAddress,
                    userAgent
                });
                throw new Error('Invalid credentials');
            }
            
            // Check tenant status
            if (user.tenantId && user.tenantId.status !== 'active') {
                await this.logSecurityEvent('LOGIN_FAILED', {
                    email,
                    reason: 'Tenant inactive',
                    ipAddress,
                    userAgent
                });
                throw new Error('Account suspended');
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                await this.logSecurityEvent('LOGIN_FAILED', {
                    email,
                    reason: 'Invalid password',
                    ipAddress,
                    userAgent
                });
                throw new Error('Invalid credentials');
            }
            
            // Generate tokens
            const accessToken = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);
            
            // Update last login
            await User.findByIdAndUpdate(user._id, {
                lastLogin: new Date(),
                lastLoginIp: ipAddress
            });
            
            // Log successful login
            await this.logSecurityEvent('LOGIN_SUCCESS', {
                userId: user._id,
                email,
                role: user.role,
                tenantId: user.tenantId,
                ipAddress,
                userAgent
            });
            
            return {
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    tenantId: user.tenantId,
                    branchId: user.branchId,
                    permissions: user.permissions
                },
                accessToken,
                refreshToken
            };
            
        } catch (error) {
            throw error;
        }
    }
    
    // Token refresh functionality
    async refreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            
            const user = await User.findById(decoded.userId);
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }
            
            const newAccessToken = this.generateToken(user);
            const newRefreshToken = this.generateRefreshToken(user);
            
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            };
            
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    
    // Security event logging
    async logSecurityEvent(eventType, details) {
        try {
            await AuditLog.create({
                eventType,
                details,
                timestamp: new Date(),
                severity: eventType.includes('FAILED') ? 'HIGH' : 'MEDIUM'
            });
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }
}

module.exports = new AuthService();
