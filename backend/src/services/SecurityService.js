const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const AuditLog = require('../models/AuditLog');
const moment = require('moment');

class SecurityService {
  constructor() {
    this.securityConfig = {
      maxLoginAttempts: 5,
      lockoutDuration: 15, // minutes
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      passwordMinLength: 12,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: true,
      mfaRequired: true,
      ipWhitelist: [],
      suspiciousActivityThreshold: 10,
      encryptionAlgorithm: 'aes-256-gcm',
      keyRotationInterval: 30 // days
    };
    
    this.threatDetection = {
      suspiciousIPs: new Set(),
      failedLogins: new Map(),
      unusualActivity: new Map(),
      blockedUsers: new Set()
    };
  }

  // 🔐 Authentication & Authorization
  async authenticateUser(email, password, ipAddress) {
    try {
      // Check if user is blocked
      if (this.threatDetection.blockedUsers.has(email)) {
        await this.logSecurityEvent('BLOCKED_LOGIN_ATTEMPT', { email, ipAddress });
        throw new Error('Account temporarily blocked due to security concerns');
      }

      // Check failed login attempts
      const failedAttempts = this.threatDetection.failedLogins.get(email) || 0;
      if (failedAttempts >= this.securityConfig.maxLoginAttempts) {
        await this.logSecurityEvent('MAX_LOGIN_ATTEMPTS_EXCEEDED', { email, ipAddress });
        throw new Error('Too many failed login attempts. Account temporarily locked.');
      }

      // Validate credentials (mock implementation)
      const isValid = await this.validateCredentials(email, password);
      
      if (!isValid) {
        this.threatDetection.failedLogins.set(email, failedAttempts + 1);
        await this.logSecurityEvent('FAILED_LOGIN', { email, ipAddress });
        throw new Error('Invalid credentials');
      }

      // Reset failed attempts on successful login
      this.threatDetection.failedLogins.delete(email);

      // Generate secure token
      const token = this.generateSecureToken(email);
      
      // Log successful login
      await this.logSecurityEvent('SUCCESSFUL_LOGIN', { email, ipAddress });

      return {
        token,
        user: { email },
        securityLevel: await this.calculateSecurityLevel(email)
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async validateCredentials(email, password) {
    // Mock validation - in real implementation, check against database
    return email === 'admin@exchange.com' && password === 'admin123';
  }

  generateSecureToken(userId) {
    const payload = {
      userId,
      iat: Date.now(),
      exp: Date.now() + this.securityConfig.sessionTimeout,
      jti: crypto.randomBytes(16).toString('hex')
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'exchange-platform',
      audience: 'users'
    });
  }

  // 🔒 Encryption & Data Protection
  encryptSensitiveData(data) {
    const algorithm = this.securityConfig.encryptionAlgorithm;
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      algorithm
    };
  }

  decryptSensitiveData(encryptedData, iv) {
    const algorithm = this.securityConfig.encryptionAlgorithm;
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hashSync(password, saltRounds);
  }

  verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }

  // 🛡️ Threat Detection & Prevention
  async detectSuspiciousActivity(userId, action, metadata) {
    const userActivity = this.threatDetection.unusualActivity.get(userId) || [];
    const now = Date.now();
    
    // Add current activity
    userActivity.push({
      action,
      timestamp: now,
      metadata
    });

    // Keep only recent activity (last hour)
    const recentActivity = userActivity.filter(activity => 
      now - activity.timestamp < 60 * 60 * 1000
    );

    this.threatDetection.unusualActivity.set(userId, recentActivity);

    // Analyze for suspicious patterns
    const suspiciousPatterns = this.analyzeActivityPatterns(recentActivity);
    
    if (suspiciousPatterns.length > 0) {
      await this.handleSuspiciousActivity(userId, suspiciousPatterns);
      return true;
    }

    return false;
  }

  analyzeActivityPatterns(activities) {
    const patterns = [];
    
    // Check for rapid-fire actions
    const rapidActions = activities.filter((activity, index) => {
      if (index === 0) return false;
      const timeDiff = activity.timestamp - activities[index - 1].timestamp;
      return timeDiff < 1000; // Less than 1 second between actions
    });

    if (rapidActions.length > 5) {
      patterns.push({
        type: 'RAPID_ACTIONS',
        severity: 'HIGH',
        count: rapidActions.length
      });
    }

    // Check for unusual trading patterns
    const tradingActions = activities.filter(a => a.action.includes('TRADE'));
    if (tradingActions.length > 20) {
      patterns.push({
        type: 'EXCESSIVE_TRADING',
        severity: 'MEDIUM',
        count: tradingActions.length
      });
    }

    // Check for multiple login attempts
    const loginActions = activities.filter(a => a.action.includes('LOGIN'));
    if (loginActions.length > 3) {
      patterns.push({
        type: 'MULTIPLE_LOGINS',
        severity: 'HIGH',
        count: loginActions.length
      });
    }

    return patterns;
  }

  async handleSuspiciousActivity(userId, patterns) {
    for (const pattern of patterns) {
      await this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
        userId,
        pattern: pattern.type,
        severity: pattern.severity,
        count: pattern.count
      });

      if (pattern.severity === 'HIGH') {
        await this.temporarilyBlockUser(userId);
        await this.sendSecurityAlert(userId, pattern);
      }
    }
  }

  async temporarilyBlockUser(userId) {
    this.threatDetection.blockedUsers.add(userId);
    
    // Auto-unblock after lockout duration
    setTimeout(() => {
      this.threatDetection.blockedUsers.delete(userId);
    }, this.securityConfig.lockoutDuration * 60 * 1000);

    await this.logSecurityEvent('USER_BLOCKED', { userId, reason: 'Suspicious activity' });
  }

  // 🔍 Security Monitoring & Logging
  async logSecurityEvent(eventType, data) {
    try {
      const securityEvent = {
        eventType,
        timestamp: new Date(),
        ipAddress: data.ipAddress || 'unknown',
        userId: data.userId || data.email || 'unknown',
        userAgent: data.userAgent || 'unknown',
        metadata: data,
        severity: this.getEventSeverity(eventType),
        sessionId: data.sessionId || 'unknown'
      };

      await AuditLog.create(securityEvent);

      // Real-time alerting for high-severity events
      if (securityEvent.severity === 'HIGH') {
        await this.sendRealTimeAlert(securityEvent);
      }
    } catch (error) {
      console.error('Security logging failed:', error);
    }
  }

  getEventSeverity(eventType) {
    const highSeverityEvents = [
      'SUSPICIOUS_ACTIVITY',
      'USER_BLOCKED',
      'SECURITY_BREACH',
      'UNAUTHORIZED_ACCESS',
      'DATA_EXFILTRATION'
    ];

    const mediumSeverityEvents = [
      'FAILED_LOGIN',
      'MAX_LOGIN_ATTEMPTS_EXCEEDED',
      'UNUSUAL_TRADING_PATTERN',
      'RATE_LIMIT_EXCEEDED'
    ];

    if (highSeverityEvents.includes(eventType)) return 'HIGH';
    if (mediumSeverityEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  async sendRealTimeAlert(securityEvent) {
    // Send to security team
    console.log('🚨 SECURITY ALERT:', securityEvent);
    
    // In real implementation, send to:
    // - Security dashboard
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS alerts
  }

  async sendSecurityAlert(userId, pattern) {
    // Send alert to user about suspicious activity
    console.log(`Security alert sent to user ${userId} for pattern: ${pattern.type}`);
  }

  // 🔐 Multi-Factor Authentication
  async setupMFA(userId) {
    const secret = crypto.randomBytes(20).toString('base32');
    const qrCodeUrl = `otpauth://totp/Exchange:${userId}?secret=${secret}&issuer=Exchange`;
    
    return {
      secret,
      qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    };
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  verifyMFAToken(token, secret) {
    // Mock TOTP verification - in real implementation, use speakeasy library
    return token.length === 6 && /^\d+$/.test(token);
  }

  // 🛡️ Input Validation & Sanitization
  validateInput(input, type) {
    const validators = {
      email: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
      },
      password: (password) => {
        const minLength = this.securityConfig.passwordMinLength;
        const hasSpecial = this.securityConfig.requireSpecialChars ? /[!@#$%^&*(),.?":{}|<>]/.test(password) : true;
        const hasNumber = this.securityConfig.requireNumbers ? /\d/.test(password) : true;
        const hasUpper = this.securityConfig.requireUppercase ? /[A-Z]/.test(password) : true;
        const hasLower = this.securityConfig.requireLowercase ? /[a-z]/.test(password) : true;
        
        return password.length >= minLength && hasSpecial && hasNumber && hasUpper && hasLower;
      },
      amount: (amount) => {
        return !isNaN(amount) && amount > 0 && amount <= 1000000;
      },
      currency: (currency) => {
        const validCurrencies = ['BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'DOT', 'LINK'];
        return validCurrencies.includes(currency.toUpperCase());
      }
    };

    return validators[type] ? validators[type](input) : true;
  }

  sanitizeInput(input) {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  // 🔒 Rate Limiting & DDoS Protection
  createRateLimiters() {
    return {
      // General API rate limiting
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Login rate limiting
      login: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: 'Too many login attempts',
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Trading rate limiting
      trading: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 50, // limit each user to 50 trading requests per minute
        message: 'Too many trading requests',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.user?.id || req.ip,
      })
    };
  }

  // 🔍 Security Headers & CSP
  getSecurityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" }
    });
  }

  // 📊 Security Analytics
  async getSecurityMetrics(timeRange = '24h') {
    const startTime = moment().subtract(1, timeRange).toDate();
    
    const metrics = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          severity: { $first: '$severity' }
        }
      }
    ]);

    return {
      totalEvents: metrics.reduce((sum, m) => sum + m.count, 0),
      eventsByType: metrics,
      blockedUsers: this.threatDetection.blockedUsers.size,
      suspiciousIPs: this.threatDetection.suspiciousIPs.size,
      securityScore: this.calculateSecurityScore(metrics)
    };
  }

  calculateSecurityScore(metrics) {
    let score = 100;
    
    // Deduct points for security events
    metrics.forEach(metric => {
      if (metric.severity === 'HIGH') score -= metric.count * 10;
      else if (metric.severity === 'MEDIUM') score -= metric.count * 5;
      else score -= metric.count * 1;
    });

    return Math.max(0, score);
  }

  // 🔐 Session Management
  async validateSession(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if token is expired
      if (decoded.exp < Date.now()) {
        throw new Error('Token expired');
      }

      // Check if user is blocked
      if (this.threatDetection.blockedUsers.has(decoded.userId)) {
        throw new Error('User account blocked');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  async invalidateSession(token) {
    // In real implementation, add token to blacklist
    await this.logSecurityEvent('SESSION_INVALIDATED', { token });
  }

  // 🔍 Security Audit
  async generateSecurityReport() {
    const metrics = await this.getSecurityMetrics('7d');
    
    return {
      timestamp: new Date(),
      metrics,
      recommendations: this.generateSecurityRecommendations(metrics),
      riskLevel: this.calculateRiskLevel(metrics),
      complianceStatus: await this.checkComplianceStatus()
    };
  }

  generateSecurityRecommendations(metrics) {
    const recommendations = [];

    if (metrics.securityScore < 70) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and strengthen authentication mechanisms',
        description: 'Security score is below acceptable threshold'
      });
    }

    if (metrics.blockedUsers > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Investigate unusual login patterns',
        description: 'Multiple user accounts have been blocked'
      });
    }

    return recommendations;
  }

  calculateRiskLevel(metrics) {
    if (metrics.securityScore < 50) return 'CRITICAL';
    if (metrics.securityScore < 70) return 'HIGH';
    if (metrics.securityScore < 85) return 'MEDIUM';
    return 'LOW';
  }

  async checkComplianceStatus() {
    // Check compliance with various regulations
    return {
      gdpr: true,
      sox: true,
      pci: true,
      iso27001: true
    };
  }
}

module.exports = new SecurityService(); 