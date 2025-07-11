const db = require('../config/database');
const logger = require('../utils/logger');
const Redis = require('ioredis');
const { EventEmitter } = require('events');
const os = require('os');

/**
 * Comprehensive Monitoring Service
 * Handles system health, business metrics, error tracking, and performance monitoring
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    
    this.initializeMonitoring();
    this.startPeriodicChecks();
  }

  /**
   * Initialize monitoring system
   */
  initializeMonitoring() {
    // Initialize system metrics
    this.initializeSystemMetrics();
    
    // Initialize business metrics
    this.initializeBusinessMetrics();
    
    // Initialize health checks
    this.initializeHealthChecks();
    
    // Initialize alerting rules
    this.initializeAlertingRules();
  }

  /**
   * Initialize system metrics
   */
  initializeSystemMetrics() {
    // CPU usage
    this.metrics.set('cpu_usage', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 80
    });

    // Memory usage
    this.metrics.set('memory_usage', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 85
    });

    // Disk usage
    this.metrics.set('disk_usage', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 90
    });

    // Database connections
    this.metrics.set('db_connections', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 80
    });

    // API response time
    this.metrics.set('api_response_time', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 2000 // 2 seconds
    });

    // Error rate
    this.metrics.set('error_rate', {
      current: 0,
      average: 0,
      max: 0,
      threshold: 5 // 5%
    });
  }

  /**
   * Initialize business metrics
   */
  initializeBusinessMetrics() {
    // Transaction volume
    this.metrics.set('transaction_volume', {
      current: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      threshold: 1000
    });

    // Revenue
    this.metrics.set('revenue', {
      current: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      threshold: 10000
    });

    // Active users
    this.metrics.set('active_users', {
      current: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      threshold: 100
    });

    // Order success rate
    this.metrics.set('order_success_rate', {
      current: 0,
      average: 0,
      threshold: 95 // 95%
    });

    // Customer satisfaction
    this.metrics.set('customer_satisfaction', {
      current: 0,
      average: 0,
      threshold: 4.0 // 4.0/5.0
    });
  }

  /**
   * Initialize health checks
   */
  initializeHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      check: () => this.checkDatabaseHealth(),
      interval: 30000, // 30 seconds
      lastCheck: null,
      status: 'UNKNOWN'
    });

    // Redis health check
    this.healthChecks.set('redis', {
      check: () => this.checkRedisHealth(),
      interval: 30000, // 30 seconds
      lastCheck: null,
      status: 'UNKNOWN'
    });

    // API health check
    this.healthChecks.set('api', {
      check: () => this.checkAPIHealth(),
      interval: 60000, // 1 minute
      lastCheck: null,
      status: 'UNKNOWN'
    });

    // External services health check
    this.healthChecks.set('external_services', {
      check: () => this.checkExternalServicesHealth(),
      interval: 120000, // 2 minutes
      lastCheck: null,
      status: 'UNKNOWN'
    });
  }

  /**
   * Initialize alerting rules
   */
  initializeAlertingRules() {
    // System alerts
    this.alerts.set('high_cpu_usage', {
      condition: (metric) => metric.current > metric.threshold,
      severity: 'WARNING',
      message: 'High CPU usage detected',
      action: 'SCALE_UP'
    });

    this.alerts.set('high_memory_usage', {
      condition: (metric) => metric.current > metric.threshold,
      severity: 'WARNING',
      message: 'High memory usage detected',
      action: 'SCALE_UP'
    });

    this.alerts.set('high_error_rate', {
      condition: (metric) => metric.current > metric.threshold,
      severity: 'CRITICAL',
      message: 'High error rate detected',
      action: 'INVESTIGATE'
    });

    // Business alerts
    this.alerts.set('low_transaction_volume', {
      condition: (metric) => metric.current < metric.threshold * 0.5,
      severity: 'WARNING',
      message: 'Low transaction volume detected',
      action: 'INVESTIGATE'
    });

    this.alerts.set('low_order_success_rate', {
      condition: (metric) => metric.current < metric.threshold,
      severity: 'CRITICAL',
      message: 'Low order success rate detected',
      action: 'INVESTIGATE'
    });
  }

  /**
   * Start periodic monitoring checks
   */
  startPeriodicChecks() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Update business metrics every 5 minutes
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 300000);

    // Run health checks
    setInterval(() => {
      this.runHealthChecks();
    }, 30000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Generate reports every hour
    setInterval(() => {
      this.generateMonitoringReport();
    }, 3600000);
  }

  /**
   * Update system metrics
   */
  async updateSystemMetrics() {
    try {
      // CPU usage
      const cpuUsage = os.loadavg()[0] * 100;
      this.updateMetric('cpu_usage', cpuUsage);

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      this.updateMetric('memory_usage', memoryUsage);

      // Disk usage (simplified)
      const diskUsage = await this.getDiskUsage();
      this.updateMetric('disk_usage', diskUsage);

      // Database connections
      const dbConnections = await this.getDatabaseConnections();
      this.updateMetric('db_connections', dbConnections);

      // API response time
      const apiResponseTime = await this.measureAPIResponseTime();
      this.updateMetric('api_response_time', apiResponseTime);

      // Error rate
      const errorRate = await this.calculateErrorRate();
      this.updateMetric('error_rate', errorRate);

    } catch (error) {
      logger.error('Failed to update system metrics:', error);
    }
  }

  /**
   * Update business metrics
   */
  async updateBusinessMetrics() {
    try {
      // Transaction volume
      const transactionVolume = await this.getTransactionVolume();
      this.updateMetric('transaction_volume', transactionVolume);

      // Revenue
      const revenue = await this.getRevenue();
      this.updateMetric('revenue', revenue);

      // Active users
      const activeUsers = await this.getActiveUsers();
      this.updateMetric('active_users', activeUsers);

      // Order success rate
      const orderSuccessRate = await this.getOrderSuccessRate();
      this.updateMetric('order_success_rate', orderSuccessRate);

      // Customer satisfaction
      const customerSatisfaction = await this.getCustomerSatisfaction();
      this.updateMetric('customer_satisfaction', customerSatisfaction);

    } catch (error) {
      logger.error('Failed to update business metrics:', error);
    }
  }

  /**
   * Update metric value
   */
  updateMetric(metricName, value) {
    const metric = this.metrics.get(metricName);
    if (metric) {
      metric.current = value;
      metric.average = (metric.average + value) / 2;
      metric.max = Math.max(metric.max, value);
      
      // Store metric in Redis for persistence
      this.redis.setex(`metric:${metricName}`, 3600, JSON.stringify(metric));
    }
  }

  /**
   * Run health checks
   */
  async runHealthChecks() {
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const status = await healthCheck.check();
        healthCheck.status = status;
        healthCheck.lastCheck = new Date();

        // Emit health check event
        this.emit('healthCheckCompleted', {
          service: name,
          status,
          timestamp: new Date()
        });

        logger.info(`Health check completed for ${name}: ${status}`);

      } catch (error) {
        healthCheck.status = 'FAILED';
        healthCheck.lastCheck = new Date();
        
        logger.error(`Health check failed for ${name}:`, error);
        
        // Emit health check failure event
        this.emit('healthCheckFailed', {
          service: name,
          error: error.message,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await db.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return 'DEGRADED';
      }

      return 'HEALTHY';
    } catch (error) {
      return 'FAILED';
    }
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (responseTime > 100) {
        return 'DEGRADED';
      }

      return 'HEALTHY';
    } catch (error) {
      return 'FAILED';
    }
  }

  /**
   * Check API health
   */
  async checkAPIHealth() {
    try {
      // Check main API endpoints
      const endpoints = [
        '/api/health',
        '/api/auth/login',
        '/api/transaction'
      ];

      let healthyEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://localhost:3000${endpoint}`);
          if (response.status === 200 || response.status === 401) {
            healthyEndpoints++;
          }
        } catch (error) {
          // Endpoint failed
        }
      }

      const healthPercentage = (healthyEndpoints / endpoints.length) * 100;
      
      if (healthPercentage >= 90) {
        return 'HEALTHY';
      } else if (healthPercentage >= 70) {
        return 'DEGRADED';
      } else {
        return 'FAILED';
      }
    } catch (error) {
      return 'FAILED';
    }
  }

  /**
   * Check external services health
   */
  async checkExternalServicesHealth() {
    try {
      const services = [
        { name: 'email_service', url: process.env.EMAIL_SERVICE_URL },
        { name: 'sms_service', url: process.env.SMS_SERVICE_URL },
        { name: 'payment_gateway', url: process.env.PAYMENT_GATEWAY_URL }
      ];

      let healthyServices = 0;
      
      for (const service of services) {
        if (service.url) {
          try {
            const response = await fetch(service.url + '/health');
            if (response.status === 200) {
              healthyServices++;
            }
          } catch (error) {
            // Service failed
          }
        }
      }

      const healthPercentage = (healthyServices / services.length) * 100;
      
      if (healthPercentage >= 90) {
        return 'HEALTHY';
      } else if (healthPercentage >= 70) {
        return 'DEGRADED';
      } else {
        return 'FAILED';
      }
    } catch (error) {
      return 'FAILED';
    }
  }

  /**
   * Check alerts
   */
  checkAlerts() {
    for (const [alertName, alert] of this.alerts) {
      for (const [metricName, metric] of this.metrics) {
        if (alert.condition(metric)) {
          this.triggerAlert(alertName, alert, metricName, metric);
        }
      }
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(alertName, alert, metricName, metric) {
    const alertData = {
      name: alertName,
      severity: alert.severity,
      message: alert.message,
      metric: metricName,
      value: metric.current,
      threshold: metric.threshold,
      action: alert.action,
      timestamp: new Date()
    };

    // Store alert
    await this.storeAlert(alertData);

    // Emit alert event
    this.emit('alertTriggered', alertData);

    // Send notification
    await this.sendAlertNotification(alertData);

    logger.warn(`Alert triggered: ${alertName}`, alertData);
  }

  /**
   * Track error
   */
  async trackError(error, context) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity: this.determineErrorSeverity(error)
    };

    // Store error
    await this.storeError(errorData);

    // Update error rate metric
    const currentErrorRate = this.metrics.get('error_rate').current;
    this.updateMetric('error_rate', currentErrorRate + 0.1);

    // Emit error event
    this.emit('errorTracked', errorData);

    logger.error('Error tracked:', errorData);
  }

  /**
   * Track performance metric
   */
  async trackPerformance(operation, duration, metadata = {}) {
    const performanceData = {
      operation,
      duration,
      metadata,
      timestamp: new Date()
    };

    // Store performance data
    await this.storePerformanceData(performanceData);

    // Update API response time metric
    this.updateMetric('api_response_time', duration);

    // Emit performance event
    this.emit('performanceTracked', performanceData);
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport() {
    try {
      const report = {
        timestamp: new Date(),
        systemMetrics: {},
        businessMetrics: {},
        healthStatus: {},
        alerts: await this.getRecentAlerts(),
        recommendations: await this.generateRecommendations()
      };

      // Collect system metrics
      for (const [name, metric] of this.metrics) {
        if (name.startsWith('cpu_') || name.startsWith('memory_') || 
            name.startsWith('disk_') || name.startsWith('db_') || 
            name.startsWith('api_') || name.startsWith('error_')) {
          report.systemMetrics[name] = metric;
        }
      }

      // Collect business metrics
      for (const [name, metric] of this.metrics) {
        if (name.startsWith('transaction_') || name.startsWith('revenue_') || 
            name.startsWith('active_') || name.startsWith('order_') || 
            name.startsWith('customer_')) {
          report.businessMetrics[name] = metric;
        }
      }

      // Collect health status
      for (const [name, healthCheck] of this.healthChecks) {
        report.healthStatus[name] = {
          status: healthCheck.status,
          lastCheck: healthCheck.lastCheck
        };
      }

      // Store report
      await this.storeMonitoringReport(report);

      // Emit report generated event
      this.emit('monitoringReportGenerated', report);

      logger.info('Monitoring report generated successfully');

      return report;

    } catch (error) {
      logger.error('Failed to generate monitoring report:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const status = {
      overall: 'HEALTHY',
      services: {},
      metrics: {},
      timestamp: new Date()
    };

    // Check health status
    let healthyServices = 0;
    let totalServices = 0;

    for (const [name, healthCheck] of this.healthChecks) {
      status.services[name] = healthCheck.status;
      totalServices++;
      
      if (healthCheck.status === 'HEALTHY') {
        healthyServices++;
      }
    }

    // Determine overall status
    const healthPercentage = (healthyServices / totalServices) * 100;
    if (healthPercentage >= 90) {
      status.overall = 'HEALTHY';
    } else if (healthPercentage >= 70) {
      status.overall = 'DEGRADED';
    } else {
      status.overall = 'FAILED';
    }

    // Add current metrics
    for (const [name, metric] of this.metrics) {
      status.metrics[name] = {
        current: metric.current,
        threshold: metric.threshold,
        status: metric.current > metric.threshold ? 'WARNING' : 'NORMAL'
      };
    }

    return status;
  }

  // Helper methods
  async getDiskUsage() {
    // Simplified disk usage calculation
    return 75; // 75% usage
  }

  async getDatabaseConnections() {
    // Get current database connections
    return 10; // Example value
  }

  async measureAPIResponseTime() {
    // Measure API response time
    return 150; // 150ms
  }

  async calculateErrorRate() {
    // Calculate error rate
    return 2.5; // 2.5%
  }

  async getTransactionVolume() {
    // Get current transaction volume
    return 500; // Example value
  }

  async getRevenue() {
    // Get current revenue
    return 15000; // Example value
  }

  async getActiveUsers() {
    // Get current active users
    return 250; // Example value
  }

  async getOrderSuccessRate() {
    // Get order success rate
    return 97.5; // 97.5%
  }

  async getCustomerSatisfaction() {
    // Get customer satisfaction score
    return 4.2; // 4.2/5.0
  }

  determineErrorSeverity(error) {
    if (error.message.includes('CRITICAL') || error.message.includes('FATAL')) {
      return 'CRITICAL';
    } else if (error.message.includes('WARNING')) {
      return 'WARNING';
    } else {
      return 'INFO';
    }
  }

  async storeAlert(alertData) {
    // Implementation to store alert
  }

  async sendAlertNotification(alertData) {
    // Implementation to send alert notification
  }

  async storeError(errorData) {
    // Implementation to store error
  }

  async storePerformanceData(performanceData) {
    // Implementation to store performance data
  }

  async getRecentAlerts() {
    // Implementation to get recent alerts
    return [];
  }

  async generateRecommendations() {
    // Implementation to generate recommendations
    return [];
  }

  async storeMonitoringReport(report) {
    // Implementation to store monitoring report
  }
}

module.exports = new MonitoringService();