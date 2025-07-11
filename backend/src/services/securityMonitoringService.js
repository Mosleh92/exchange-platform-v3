// backend/src/services/securityMonitoringService.js
const EventEmitter = require('events');

// Fallback logger if winston logger fails
const logger = (() => {
  try {
    return require('../utils/logger');
  } catch (error) {
    console.warn('Using fallback logger');
    return {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
  }
})();

/**
 * Security Monitoring and Alerting Service
 * Provides real-time security event monitoring, threat detection, and alerting
 */
class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.metrics = new Map();
    this.thresholds = this.initializeThresholds();
    this.alertHandlers = new Map();
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
    
    this.initializeEventHandlers();
    this.startPeriodicMonitoring();
  }

  /**
   * Initialize security thresholds
   */
  initializeThresholds() {
    return {
      // Authentication failures
      auth_failures: {
        threshold: 5,
        window: 15 * 60 * 1000, // 15 minutes
        severity: 'HIGH'
      },
      
      // Suspicious login patterns
      suspicious_login: {
        threshold: 3,
        window: 60 * 60 * 1000, // 1 hour
        severity: 'MEDIUM'
      },
      
      // Rate limit violations
      rate_limit_violations: {
        threshold: 10,
        window: 10 * 60 * 1000, // 10 minutes
        severity: 'MEDIUM'
      },
      
      // SQL injection attempts
      sql_injection: {
        threshold: 1,
        window: 5 * 60 * 1000, // 5 minutes
        severity: 'CRITICAL'
      },
      
      // XSS attempts
      xss_attempts: {
        threshold: 3,
        window: 10 * 60 * 1000, // 10 minutes
        severity: 'HIGH'
      },
      
      // File upload threats
      file_threats: {
        threshold: 1,
        window: 30 * 60 * 1000, // 30 minutes
        severity: 'HIGH'
      },
      
      // Unauthorized access attempts
      unauthorized_access: {
        threshold: 10,
        window: 30 * 60 * 1000, // 30 minutes
        severity: 'HIGH'
      },
      
      // Database anomalies
      db_anomalies: {
        threshold: 5,
        window: 15 * 60 * 1000, // 15 minutes
        severity: 'MEDIUM'
      },
      
      // Performance anomalies
      performance_issues: {
        threshold: 20,
        window: 5 * 60 * 1000, // 5 minutes
        severity: 'LOW'
      },
      
      // Mass data access
      mass_data_access: {
        threshold: 100,
        window: 60 * 1000, // 1 minute
        severity: 'HIGH'
      }
    };
  }

  /**
   * Initialize event handlers
   */
  initializeEventHandlers() {
    // Authentication events
    this.on('auth_failure', (data) => this.handleAuthFailure(data));
    this.on('auth_success', (data) => this.handleAuthSuccess(data));
    this.on('suspicious_login', (data) => this.handleSuspiciousLogin(data));
    
    // Security violations
    this.on('sql_injection', (data) => this.handleSQLInjection(data));
    this.on('xss_attempt', (data) => this.handleXSSAttempt(data));
    this.on('file_threat', (data) => this.handleFileThreat(data));
    
    // Access violations
    this.on('unauthorized_access', (data) => this.handleUnauthorizedAccess(data));
    this.on('rate_limit_violation', (data) => this.handleRateLimitViolation(data));
    
    // System anomalies
    this.on('db_anomaly', (data) => this.handleDatabaseAnomaly(data));
    this.on('performance_issue', (data) => this.handlePerformanceIssue(data));
    
    // Mass operations
    this.on('mass_data_access', (data) => this.handleMassDataAccess(data));
  }

  /**
   * Log security event and check for threshold violations
   */
  logSecurityEvent(eventType, data) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date(),
      data: data,
      severity: this.getSeverityForEventType(eventType),
      ip: data.ip,
      userId: data.userId,
      tenantId: data.tenantId
    };

    // Log the event
    logger.warn(`Security event: ${eventType}`, event);

    // Update metrics
    this.updateMetrics(eventType, event);

    // Check thresholds
    this.checkThresholds(eventType, event);

    // Emit specific event
    this.emit(eventType, event);

    return event.id;
  }

  /**
   * Update metrics for event type
   */
  updateMetrics(eventType, event) {
    const key = `${eventType}:${event.ip}`;
    const now = Date.now();
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const events = this.metrics.get(key);
    events.push(now);
    
    // Clean old events outside the threshold window
    const threshold = this.thresholds[eventType];
    if (threshold) {
      const cutoff = now - threshold.window;
      const filteredEvents = events.filter(timestamp => timestamp > cutoff);
      this.metrics.set(key, filteredEvents);
    }
  }

  /**
   * Check if thresholds are violated
   */
  checkThresholds(eventType, event) {
    const threshold = this.thresholds[eventType];
    if (!threshold) return;

    const key = `${eventType}:${event.ip}`;
    const events = this.metrics.get(key) || [];
    
    if (events.length >= threshold.threshold) {
      this.triggerAlert({
        type: 'THRESHOLD_EXCEEDED',
        eventType,
        ip: event.ip,
        count: events.length,
        threshold: threshold.threshold,
        severity: threshold.severity,
        timeWindow: threshold.window,
        events: events
      });
    }
  }

  /**
   * Trigger security alert
   */
  triggerAlert(alertData) {
    const alert = {
      id: this.generateAlertId(),
      ...alertData,
      timestamp: new Date(),
      status: 'ACTIVE',
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);

    logger.error('Security alert triggered', alert);

    // Emit alert event
    this.emit('security_alert', alert);

    // Execute alert handlers
    this.executeAlertHandlers(alert);

    // Auto-response for critical alerts
    if (alert.severity === 'CRITICAL') {
      this.handleCriticalAlert(alert);
    }

    return alert.id;
  }

  /**
   * Execute registered alert handlers
   */
  executeAlertHandlers(alert) {
    for (const [name, handler] of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        logger.error(`Alert handler '${name}' failed:`, error);
      }
    }
  }

  /**
   * Handle critical alerts with automatic response
   */
  handleCriticalAlert(alert) {
    // Automatically block IP for critical security violations
    if (alert.ip && ['sql_injection', 'xss_attempt', 'file_threat'].includes(alert.eventType)) {
      this.blockIP(alert.ip, 'Critical security violation', 24 * 60 * 60 * 1000); // 24 hours
    }

    // Send immediate notifications
    this.sendImmediateNotification(alert);
  }

  /**
   * Block IP address
   */
  blockIP(ip, reason, duration = 60 * 60 * 1000) {
    this.blockedIPs.add(ip);
    
    logger.warn(`IP blocked: ${ip}`, { reason, duration });

    // Schedule unblock
    setTimeout(() => {
      this.unblockIP(ip);
    }, duration);

    // Emit IP blocked event
    this.emit('ip_blocked', { ip, reason, duration });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    logger.info(`IP unblocked: ${ip}`);
    
    this.emit('ip_unblocked', { ip });
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Mark IP as suspicious
   */
  markIPSuspicious(ip, reason) {
    this.suspiciousIPs.add(ip);
    logger.warn(`IP marked suspicious: ${ip}`, { reason });
    
    this.emit('ip_suspicious', { ip, reason });
  }

  /**
   * Check if IP is suspicious
   */
  isIPSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Handle authentication failure
   */
  handleAuthFailure(event) {
    // Track failed attempts per IP and user
    this.trackFailedAttempt(event.ip, event.data.email);
    
    // Check for brute force patterns
    if (this.detectBruteForce(event.ip, event.data.email)) {
      this.markIPSuspicious(event.ip, 'Brute force detected');
    }
  }

  /**
   * Handle authentication success
   */
  handleAuthSuccess(event) {
    // Clear failed attempts for this IP/user combination
    this.clearFailedAttempts(event.ip, event.data.email);
    
    // Check for suspicious login patterns
    if (this.detectSuspiciousLogin(event)) {
      this.emit('suspicious_login', event);
    }
  }

  /**
   * Track failed authentication attempts
   */
  trackFailedAttempt(ip, email) {
    const key = `failed_auth:${ip}:${email}`;
    const now = Date.now();
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const attempts = this.metrics.get(key);
    attempts.push(now);
    
    // Keep only recent attempts (last hour)
    const cutoff = now - (60 * 60 * 1000);
    const recentAttempts = attempts.filter(timestamp => timestamp > cutoff);
    this.metrics.set(key, recentAttempts);
  }

  /**
   * Clear failed attempts
   */
  clearFailedAttempts(ip, email) {
    const key = `failed_auth:${ip}:${email}`;
    this.metrics.delete(key);
  }

  /**
   * Detect brute force attacks
   */
  detectBruteForce(ip, email) {
    const key = `failed_auth:${ip}:${email}`;
    const attempts = this.metrics.get(key) || [];
    
    // More than 5 attempts in 15 minutes indicates brute force
    return attempts.length > 5;
  }

  /**
   * Detect suspicious login patterns
   */
  detectSuspiciousLogin(event) {
    const patterns = [
      this.detectUnusualLocation(event),
      this.detectUnusualTime(event),
      this.detectUnusualDevice(event),
      this.detectImpossibleTravel(event)
    ];
    
    return patterns.some(pattern => pattern);
  }

  /**
   * Detect unusual location
   */
  detectUnusualLocation(event) {
    // This would typically integrate with GeoIP service
    // For now, just check if IP is in suspicious list
    return this.isIPSuspicious(event.ip);
  }

  /**
   * Detect unusual time
   */
  detectUnusualTime(event) {
    const hour = new Date().getHours();
    
    // Login between 2 AM and 6 AM might be suspicious
    return hour >= 2 && hour <= 6;
  }

  /**
   * Detect unusual device
   */
  detectUnusualDevice(event) {
    const userAgent = event.data.userAgent || '';
    
    // Check for suspicious user agents
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /wget/i,
      /curl/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Detect impossible travel
   */
  detectImpossibleTravel(event) {
    // This would require storing previous login locations
    // and calculating travel time between them
    return false; // Placeholder
  }

  /**
   * Handle SQL injection attempts
   */
  handleSQLInjection(event) {
    logger.error('SQL injection attempt detected', event);
    
    // Immediately block the IP
    this.blockIP(event.ip, 'SQL injection attempt', 24 * 60 * 60 * 1000);
    
    // Send critical alert
    this.triggerAlert({
      type: 'CRITICAL_SECURITY_VIOLATION',
      eventType: 'sql_injection',
      ip: event.ip,
      severity: 'CRITICAL',
      details: event.data
    });
  }

  /**
   * Handle XSS attempts
   */
  handleXSSAttempt(event) {
    logger.warn('XSS attempt detected', event);
    
    this.markIPSuspicious(event.ip, 'XSS attempt');
  }

  /**
   * Handle file threats
   */
  handleFileThreat(event) {
    logger.error('File threat detected', event);
    
    this.markIPSuspicious(event.ip, 'Malicious file upload');
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorizedAccess(event) {
    logger.warn('Unauthorized access attempt', event);
    
    this.markIPSuspicious(event.ip, 'Unauthorized access');
  }

  /**
   * Handle rate limit violations
   */
  handleRateLimitViolation(event) {
    logger.warn('Rate limit violation', event);
    
    // Mark as suspicious after multiple violations
    const key = `rate_limit:${event.ip}`;
    const violations = this.metrics.get(key) || [];
    
    if (violations.length > 5) {
      this.markIPSuspicious(event.ip, 'Excessive rate limit violations');
    }
  }

  /**
   * Handle database anomalies
   */
  handleDatabaseAnomaly(event) {
    logger.warn('Database anomaly detected', event);
  }

  /**
   * Handle performance issues
   */
  handlePerformanceIssue(event) {
    logger.info('Performance issue detected', event);
  }

  /**
   * Handle mass data access
   */
  handleMassDataAccess(event) {
    logger.warn('Mass data access detected', event);
    
    this.markIPSuspicious(event.ip, 'Mass data access pattern');
  }

  /**
   * Send immediate notification
   */
  sendImmediateNotification(alert) {
    // This would integrate with notification services
    logger.error('IMMEDIATE SECURITY ALERT', alert);
  }

  /**
   * Register alert handler
   */
  registerAlertHandler(name, handler) {
    this.alertHandlers.set(name, handler);
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics() {
    return {
      alerts: {
        total: this.alerts.size,
        active: Array.from(this.alerts.values()).filter(a => a.status === 'ACTIVE').length,
        critical: Array.from(this.alerts.values()).filter(a => a.severity === 'CRITICAL').length
      },
      ips: {
        blocked: this.blockedIPs.size,
        suspicious: this.suspiciousIPs.size
      },
      events: this.metrics.size,
      timestamp: new Date()
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50) {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      
      logger.info('Alert acknowledged', { alertId, acknowledgedBy });
      return true;
    }
    return false;
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);

    // Generate health report every hour
    setInterval(() => {
      this.generateHealthReport();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, events] of this.metrics) {
      if (Array.isArray(events)) {
        const recentEvents = events.filter(timestamp => (now - timestamp) < maxAge);
        
        if (recentEvents.length === 0) {
          this.metrics.delete(key);
        } else {
          this.metrics.set(key, recentEvents);
        }
      }
    }
  }

  /**
   * Generate health report
   */
  generateHealthReport() {
    const metrics = this.getSecurityMetrics();
    
    logger.info('Security monitoring health report', metrics);
    
    this.emit('health_report', metrics);
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get severity for event type
   */
  getSeverityForEventType(eventType) {
    const threshold = this.thresholds[eventType];
    return threshold ? threshold.severity : 'LOW';
  }
}

module.exports = new SecurityMonitoringService();