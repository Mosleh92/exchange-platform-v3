// backend/src/services/monitoring/SystemMonitoringService.js
const os = require('os');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const DatabaseManager = require('../../core/database/DatabaseManager');

/**
 * Comprehensive System Monitoring Service
 * Monitors system health, performance metrics, and provides alerting
 */
class SystemMonitoringService {
  constructor() {
    this.metrics = new Map(); // Store real-time metrics
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.alertThresholds = {
      cpu: 80, // 80% CPU usage
      memory: 85, // 85% memory usage
      disk: 90, // 90% disk usage
      dbConnections: 80, // 80% of max connections
      responseTime: 2000, // 2 seconds response time
      errorRate: 5, // 5% error rate
      activeUsers: 1000 // 1000 concurrent users
    };
    this.alertChannels = []; // External alert channels (email, slack, etc.)
  }

  /**
   * Initialize monitoring service
   */
  async initialize() {
    try {
      // Setup monitoring schemas
      await this.setupMonitoringSchemas();
      
      // Start monitoring
      this.startMonitoring();
      
      // Setup alert handlers
      this.setupAlertHandlers();
      
      logger.info('System monitoring service initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  /**
   * Setup monitoring database schemas
   */
  async setupMonitoringSchemas() {
    // System metrics schema
    const systemMetricsSchema = new mongoose.Schema({
      timestamp: { type: Date, default: Date.now },
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }, // null for system-wide metrics
      metrics: {
        system: {
          cpu: { usage: Number, load: [Number] },
          memory: { used: Number, total: Number, percentage: Number },
          disk: { used: Number, total: Number, percentage: Number },
          network: { bytesIn: Number, bytesOut: Number }
        },
        database: {
          connections: { active: Number, total: Number, percentage: Number },
          queries: { total: Number, slow: Number, failed: Number },
          performance: { avgResponseTime: Number, operations: Number }
        },
        application: {
          requests: { total: Number, successful: Number, failed: Number },
          responseTime: { avg: Number, p95: Number, p99: Number },
          activeUsers: Number,
          activeSessions: Number
        },
        business: {
          totalTransactions: Number,
          totalUsers: Number,
          totalRevenue: Number,
          errorRate: Number
        }
      }
    });

    // Alert schema
    const alertSchema = new mongoose.Schema({
      alertId: { type: String, unique: true, required: true },
      type: { type: String, required: true }, // system, database, application, business
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
      metrics: { type: mongoose.Schema.Types.Mixed },
      threshold: { type: mongoose.Schema.Types.Mixed },
      status: { type: String, enum: ['active', 'resolved', 'acknowledged'], default: 'active' },
      acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      acknowledgedAt: { type: Date },
      resolvedAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Register models if not already registered
    if (!mongoose.models.SystemMetrics) {
      mongoose.model('SystemMetrics', systemMetricsSchema);
    }
    if (!mongoose.models.Alert) {
      mongoose.model('Alert', alertSchema);
    }
  }

  /**
   * Start monitoring process
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Collect metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
      } catch (error) {
        logger.error('Error during monitoring cycle:', error);
      }
    }, 30000);

    logger.info('System monitoring started');
  }

  /**
   * Stop monitoring process
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('System monitoring stopped');
  }

  /**
   * Collect system and application metrics
   */
  async collectMetrics() {
    try {
      const timestamp = new Date();
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      
      // Collect database metrics
      const databaseMetrics = await this.collectDatabaseMetrics();
      
      // Collect application metrics
      const applicationMetrics = await this.collectApplicationMetrics();
      
      // Collect business metrics
      const businessMetrics = await this.collectBusinessMetrics();
      
      const metrics = {
        system: systemMetrics,
        database: databaseMetrics,
        application: applicationMetrics,
        business: businessMetrics
      };

      // Store metrics in memory for real-time access
      this.metrics.set('latest', {
        timestamp,
        metrics
      });

      // Store metrics in database
      const SystemMetrics = mongoose.model('SystemMetrics');
      await SystemMetrics.create({
        timestamp,
        metrics
      });

      logger.debug('Metrics collected successfully');
      
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      // CPU usage calculation
      const loadAvg = os.loadavg();
      const cpuUsage = (loadAvg[0] / cpus.length) * 100;
      
      // Memory usage
      const memoryPercentage = (usedMem / totalMem) * 100;
      
      // Disk usage (for root partition)
      let diskUsage = { used: 0, total: 0, percentage: 0 };
      try {
        const stats = await fs.stat('/');
        // This is a simplified disk usage check
        // In production, use proper disk usage libraries
        diskUsage = {
          used: 0,
          total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
          percentage: 0
        };
      } catch (error) {
        logger.warn('Could not get disk usage:', error.message);
      }

      return {
        cpu: {
          usage: Math.min(100, Math.max(0, cpuUsage)),
          load: loadAvg
        },
        memory: {
          used: usedMem,
          total: totalMem,
          percentage: memoryPercentage
        },
        disk: diskUsage,
        network: {
          bytesIn: 0, // Placeholder - implement with network monitoring
          bytesOut: 0
        }
      };
      
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
      return {};
    }
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      const dbHealth = await DatabaseManager.getHealthMetrics();
      
      if (!dbHealth) {
        return {
          connections: { active: 0, total: 0, percentage: 0 },
          queries: { total: 0, slow: 0, failed: 0 },
          performance: { avgResponseTime: 0, operations: 0 }
        };
      }

      const totalConnections = dbHealth.server.connections.current || 0;
      const maxConnections = 100; // Should be configurable
      const connectionPercentage = (totalConnections / maxConnections) * 100;

      return {
        connections: {
          active: totalConnections,
          total: maxConnections,
          percentage: connectionPercentage
        },
        queries: {
          total: dbHealth.server.opcounters?.query || 0,
          slow: 0, // Implement slow query tracking
          failed: 0 // Implement failed query tracking
        },
        performance: {
          avgResponseTime: 0, // Implement response time tracking
          operations: dbHealth.server.opcounters?.command || 0
        }
      };
      
    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
      return {
        connections: { active: 0, total: 0, percentage: 0 },
        queries: { total: 0, slow: 0, failed: 0 },
        performance: { avgResponseTime: 0, operations: 0 }
      };
    }
  }

  /**
   * Collect application metrics
   */
  async collectApplicationMetrics() {
    try {
      // These would be collected from application middleware
      // For now, using placeholder values
      return {
        requests: {
          total: this.getMetricFromCache('requests.total', 0),
          successful: this.getMetricFromCache('requests.successful', 0),
          failed: this.getMetricFromCache('requests.failed', 0)
        },
        responseTime: {
          avg: this.getMetricFromCache('responseTime.avg', 0),
          p95: this.getMetricFromCache('responseTime.p95', 0),
          p99: this.getMetricFromCache('responseTime.p99', 0)
        },
        activeUsers: this.getMetricFromCache('activeUsers', 0),
        activeSessions: this.getMetricFromCache('activeSessions', 0)
      };
      
    } catch (error) {
      logger.error('Failed to collect application metrics:', error);
      return {
        requests: { total: 0, successful: 0, failed: 0 },
        responseTime: { avg: 0, p95: 0, p99: 0 },
        activeUsers: 0,
        activeSessions: 0
      };
    }
  }

  /**
   * Collect business metrics
   */
  async collectBusinessMetrics() {
    try {
      // Collect business metrics from database
      const Transaction = mongoose.model('Transaction');
      const User = mongoose.model('User');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const totalTransactions = await Transaction.countDocuments({
        createdAt: { $gte: today }
      });
      
      const totalUsers = await User.countDocuments({
        createdAt: { $gte: today }
      });
      
      // Calculate error rate
      const totalRequests = this.getMetricFromCache('requests.total', 1);
      const failedRequests = this.getMetricFromCache('requests.failed', 0);
      const errorRate = (failedRequests / totalRequests) * 100;
      
      return {
        totalTransactions,
        totalUsers,
        totalRevenue: 0, // Implement revenue calculation
        errorRate
      };
      
    } catch (error) {
      logger.error('Failed to collect business metrics:', error);
      return {
        totalTransactions: 0,
        totalUsers: 0,
        totalRevenue: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Check for alert conditions
   */
  async checkAlerts() {
    try {
      const currentMetrics = this.metrics.get('latest');
      if (!currentMetrics) return;

      const { metrics } = currentMetrics;
      const alerts = [];

      // System alerts
      if (metrics.system.cpu?.usage > this.alertThresholds.cpu) {
        alerts.push(this.createAlert('system', 'high', 'High CPU Usage', 
          `CPU usage is ${metrics.system.cpu.usage.toFixed(2)}%`, 
          { current: metrics.system.cpu.usage, threshold: this.alertThresholds.cpu }));
      }

      if (metrics.system.memory?.percentage > this.alertThresholds.memory) {
        alerts.push(this.createAlert('system', 'high', 'High Memory Usage', 
          `Memory usage is ${metrics.system.memory.percentage.toFixed(2)}%`, 
          { current: metrics.system.memory.percentage, threshold: this.alertThresholds.memory }));
      }

      if (metrics.system.disk?.percentage > this.alertThresholds.disk) {
        alerts.push(this.createAlert('system', 'critical', 'High Disk Usage', 
          `Disk usage is ${metrics.system.disk.percentage.toFixed(2)}%`, 
          { current: metrics.system.disk.percentage, threshold: this.alertThresholds.disk }));
      }

      // Database alerts
      if (metrics.database.connections?.percentage > this.alertThresholds.dbConnections) {
        alerts.push(this.createAlert('database', 'medium', 'High Database Connections', 
          `Database connections at ${metrics.database.connections.percentage.toFixed(2)}%`, 
          { current: metrics.database.connections.percentage, threshold: this.alertThresholds.dbConnections }));
      }

      // Application alerts
      if (metrics.application.responseTime?.avg > this.alertThresholds.responseTime) {
        alerts.push(this.createAlert('application', 'medium', 'High Response Time', 
          `Average response time is ${metrics.application.responseTime.avg}ms`, 
          { current: metrics.application.responseTime.avg, threshold: this.alertThresholds.responseTime }));
      }

      if (metrics.business.errorRate > this.alertThresholds.errorRate) {
        alerts.push(this.createAlert('application', 'high', 'High Error Rate', 
          `Error rate is ${metrics.business.errorRate.toFixed(2)}%`, 
          { current: metrics.business.errorRate, threshold: this.alertThresholds.errorRate }));
      }

      // Save alerts to database
      for (const alert of alerts) {
        await this.saveAlert(alert);
      }

      if (alerts.length > 0) {
        logger.warn(`Generated ${alerts.length} alerts`);
      }

    } catch (error) {
      logger.error('Failed to check alerts:', error);
    }
  }

  /**
   * Create alert object
   */
  createAlert(type, severity, title, description, metrics) {
    const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      alertId,
      type,
      severity,
      title,
      description,
      metrics,
      threshold: this.alertThresholds,
      timestamp: new Date()
    };
  }

  /**
   * Save alert to database
   */
  async saveAlert(alert) {
    try {
      const Alert = mongoose.model('Alert');
      
      // Check if similar alert already exists
      const existingAlert = await Alert.findOne({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Within last 5 minutes
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.updatedAt = new Date();
        existingAlert.metrics = alert.metrics;
        await existingAlert.save();
      } else {
        // Create new alert
        await Alert.create(alert);
        
        // Send notifications
        await this.sendAlertNotifications(alert);
      }

    } catch (error) {
      logger.error('Failed to save alert:', error);
    }
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(alert) {
    try {
      // Email notification
      if (this.alertChannels.includes('email')) {
        await this.sendEmailAlert(alert);
      }
      
      // Slack notification
      if (this.alertChannels.includes('slack')) {
        await this.sendSlackAlert(alert);
      }
      
      // SMS notification for critical alerts
      if (alert.severity === 'critical' && this.alertChannels.includes('sms')) {
        await this.sendSmsAlert(alert);
      }

    } catch (error) {
      logger.error('Failed to send alert notifications:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // Implementation would use email service
    logger.info(`Email alert sent: ${alert.title}`);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert) {
    // Implementation would use Slack API
    logger.info(`Slack alert sent: ${alert.title}`);
  }

  /**
   * Send SMS alert
   */
  async sendSmsAlert(alert) {
    // Implementation would use SMS service
    logger.info(`SMS alert sent: ${alert.title}`);
  }

  /**
   * Get metric from cache
   */
  getMetricFromCache(key, defaultValue = 0) {
    const latest = this.metrics.get('latest');
    if (!latest) return defaultValue;
    
    const keys = key.split('.');
    let value = latest.metrics;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return defaultValue;
    }
    
    return value || defaultValue;
  }

  /**
   * Record application metric
   */
  recordMetric(key, value) {
    const latest = this.metrics.get('latest');
    if (!latest) return;
    
    const keys = key.split('.');
    let target = latest.metrics;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k]) target[k] = {};
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
  }

  /**
   * Get system health dashboard
   */
  async getHealthDashboard() {
    try {
      const latest = this.metrics.get('latest');
      if (!latest) {
        return { status: 'no_data', message: 'No metrics available' };
      }

      const { metrics } = latest;
      
      // Calculate overall health score
      const healthScore = this.calculateHealthScore(metrics);
      
      // Get active alerts
      const Alert = mongoose.model('Alert');
      const activeAlerts = await Alert.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(10);

      // Get recent metrics history
      const SystemMetrics = mongoose.model('SystemMetrics');
      const recentMetrics = await SystemMetrics.find({})
        .sort({ timestamp: -1 })
        .limit(60); // Last 60 data points (30 minutes)

      return {
        status: healthScore.status,
        score: healthScore.score,
        timestamp: latest.timestamp,
        metrics: {
          system: {
            cpu: metrics.system.cpu,
            memory: metrics.system.memory,
            disk: metrics.system.disk
          },
          database: metrics.database,
          application: metrics.application,
          business: metrics.business
        },
        alerts: {
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length,
          recent: activeAlerts.slice(0, 5)
        },
        history: recentMetrics.map(m => ({
          timestamp: m.timestamp,
          cpu: m.metrics.system?.cpu?.usage || 0,
          memory: m.metrics.system?.memory?.percentage || 0,
          responseTime: m.metrics.application?.responseTime?.avg || 0,
          errorRate: m.metrics.business?.errorRate || 0
        }))
      };

    } catch (error) {
      logger.error('Failed to get health dashboard:', error);
      return { status: 'error', message: 'Failed to load dashboard' };
    }
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore(metrics) {
    try {
      const scores = [];
      
      // System health (40%)
      const cpuScore = Math.max(0, 100 - (metrics.system.cpu?.usage || 0));
      const memoryScore = Math.max(0, 100 - (metrics.system.memory?.percentage || 0));
      const diskScore = Math.max(0, 100 - (metrics.system.disk?.percentage || 0));
      const systemScore = (cpuScore + memoryScore + diskScore) / 3;
      scores.push({ weight: 0.4, score: systemScore });
      
      // Database health (25%)
      const dbScore = Math.max(0, 100 - (metrics.database.connections?.percentage || 0));
      scores.push({ weight: 0.25, score: dbScore });
      
      // Application health (25%)
      const responseTimeScore = Math.max(0, 100 - ((metrics.application.responseTime?.avg || 0) / 20));
      const errorRateScore = Math.max(0, 100 - ((metrics.business.errorRate || 0) * 10));
      const appScore = (responseTimeScore + errorRateScore) / 2;
      scores.push({ weight: 0.25, score: appScore });
      
      // Business health (10%)
      const businessScore = 100; // Placeholder
      scores.push({ weight: 0.1, score: businessScore });
      
      // Calculate weighted average
      const totalScore = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
      
      let status;
      if (totalScore >= 90) status = 'excellent';
      else if (totalScore >= 80) status = 'good';
      else if (totalScore >= 70) status = 'fair';
      else if (totalScore >= 50) status = 'poor';
      else status = 'critical';
      
      return { score: Math.round(totalScore), status };
      
    } catch (error) {
      logger.error('Failed to calculate health score:', error);
      return { score: 0, status: 'unknown' };
    }
  }

  /**
   * Setup alert handlers
   */
  setupAlertHandlers() {
    // Configure alert channels based on environment
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      this.alertChannels.push('email');
    }
    if (process.env.ALERT_SLACK_ENABLED === 'true') {
      this.alertChannels.push('slack');
    }
    if (process.env.ALERT_SMS_ENABLED === 'true') {
      this.alertChannels.push('sms');
    }
    
    logger.info(`Alert channels configured: ${this.alertChannels.join(', ')}`);
  }
}

module.exports = new SystemMonitoringService();