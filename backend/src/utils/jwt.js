const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Redis = require('ioredis');

// Redis client for token blacklisting and session management
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class JWTManager {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m'; // کاهش زمان انقضا برای امنیت بیشتر
    this.refreshTokenExpiry = '7d';
    
    if (!this.secret || !this.refreshSecret) {
      throw new Error('JWT secrets must be configured');
    }
  }

  /**
   * تولید Access Token با اطلاعات کامل کاربر
   */
  generateAccessToken(user) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId?.toString(),
      branchId: user.branchId?.toString(),
      permissions: user.permissions || [],
      jti: crypto.randomBytes(16).toString('hex'), // JWT ID برای blacklisting
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 دقیقه
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * تولید Refresh Token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user._id.toString(),
      jti: crypto.randomBytes(32).toString('hex'),
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 روز
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * تولید هر دو توکن
   */
  generateTokenPair(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // ذخیره refresh token در Redis
    this.storeRefreshToken(user._id.toString(), refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 دقیقه
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7 روز
    };
  }

  /**
   * تایید Access Token
   */
  async verifyAccessToken(token) {
    try {
      // بررسی blacklist
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256']
      });

      // بررسی نوع توکن
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * تایید Refresh Token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256']
      });

      // بررسی نوع توکن
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // بررسی وجود در Redis
      const storedToken = await this.getStoredRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== token) {
        throw new Error('Refresh token not found');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * تمدید توکن
   */
  async refreshTokens(refreshToken) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // دریافت اطلاعات کاربر
      const User = require('../models/User');
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // تولید توکن‌های جدید
      const newTokens = this.generateTokenPair(user);

      // حذف refresh token قدیمی
      await this.removeRefreshToken(decoded.userId);

      return newTokens;
    } catch (error) {
      throw error;
    }
  }

  /**
   * خروج از سیستم و blacklist کردن توکن
   */
  async logout(accessToken, userId) {
    try {
      // اضافه کردن به blacklist
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.jti) {
        await this.blacklistToken(decoded.jti, decoded.exp);
      }

      // حذف refresh token
      await this.removeRefreshToken(userId);

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * خروج از همه دستگاه‌ها
   */
  async logoutAllDevices(userId) {
    try {
      // حذف همه refresh token های کاربر
      await this.removeAllRefreshTokens(userId);
      
      // اضافه کردن کاربر به blacklist برای force logout
      await redis.setex(`force_logout:${userId}`, 3600, Date.now().toString());
      
      return true;
    } catch (error) {
      console.error('Logout all devices error:', error);
      return false;
    }
  }

  // ===== REDIS OPERATIONS =====

  /**
   * ذخیره Refresh Token در Redis
   */
  async storeRefreshToken(userId, token) {
    const key = `refresh_token:${userId}`;
    await redis.setex(key, 7 * 24 * 60 * 60, token); // 7 روز
  }

  /**
   * دریافت Refresh Token از Redis
   */
  async getStoredRefreshToken(userId) {
    const key = `refresh_token:${userId}`;
    return await redis.get(key);
  }

  /**
   * حذف Refresh Token
   */
  async removeRefreshToken(userId) {
    const key = `refresh_token:${userId}`;
    await redis.del(key);
  }

  /**
   * حذف همه Refresh Token های کاربر
   */
  async removeAllRefreshTokens(userId) {
    const pattern = `refresh_token:${userId}`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Blacklist کردن توکن
   */
  async blacklistToken(jti, exp) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redis.setex(`blacklist:${jti}`, ttl, '1');
    }
  }

  /**
   * بررسی blacklist بودن توکن
   */
  async isTokenBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.jti) return false;
      
      const blacklisted = await redis.get(`blacklist:${decoded.jti}`);
      return !!blacklisted;
    } catch (error) {
      return false;
    }
  }

  /**
   * بررسی force logout بودن کاربر
   */
  async isUserForceLoggedOut(userId) {
    const forceLogout = await redis.get(`force_logout:${userId}`);
    return !!forceLogout;
  }

  /**
   * دریافت اطلاعات session های فعال کاربر
   */
  async getActiveSessions(userId) {
    const pattern = `refresh_token:${userId}`;
    const keys = await redis.keys(pattern);
    return keys.length;
  }

  /**
   * پاکسازی توکن‌های منقضی شده
   */
  async cleanupExpiredTokens() {
    try {
      // پاکسازی blacklist های منقضی شده (Redis خودکار انجام می‌دهد)
      // پاکسازی force logout های قدیمی
      const forceLogoutKeys = await redis.keys('force_logout:*');
      for (const key of forceLogoutKeys) {
        const timestamp = await redis.get(key);
        if (timestamp && Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
          await redis.del(key);
        }
      }
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }
}

// ایجاد instance از JWT Manager
const jwtManager = new JWTManager();

// Export functions for backward compatibility
exports.generateToken = (user) => jwtManager.generateAccessToken(user);
exports.verifyToken = (token) => jwtManager.verifyAccessToken(token);

// Export the manager for advanced usage
exports.jwtManager = jwtManager;
exports.JWTManager = JWTManager;
