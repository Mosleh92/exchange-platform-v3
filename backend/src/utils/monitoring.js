const mongoose = require('mongoose');
const cache = require('../utils/cache');
const { logger } = require('../utils/logger');

class HealthMonitor {
  constructor() {
    this.stats = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // Check database connectivity
  async checkDatabase() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (state === 1) {
        // Test with a simple query
        await mongoose.connection.db.admin().ping();
        return {
          status: 'healthy',
          state: states[state],
          host: mongoose.connection.host,
          database: mongoose.connection.name,
          responseTime: await this.measureDbResponseTime()
        };
      }

      return {
        status: 'unhealthy',
        state: states[state] || 'unknown',
        error: 'Database not connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Measure database response time
  async measureDbResponseTime() {
    const start = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  // Check Redis connectivity
  async checkRedis() {
    try {
      const start = Date.now();
      const testKey = 'health_check_' + Date.now();
      
      await cache.set(testKey, 'test', 5);
      const value = await cache.get(testKey);
      await cache.del(testKey);
      
      const responseTime = Date.now() - start;
      
      if (value === 'test') {
        return {
          status: 'healthy',
          responseTime
        };
      }
      
      return {
        status: 'unhealthy',
        error: 'Redis read/write test failed'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Check memory usage
  checkMemory() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      status: memoryUsagePercent > 90 ? 'warning' : 'healthy',
      totalMemory: this.formatBytes(totalMemory),
      usedMemory: this.formatBytes(usedMemory),
      freeMemory: this.formatBytes(freeMemory),
      usagePercent: Math.round(memoryUsagePercent * 100) / 100,
      external: this.formatBytes(memoryUsage.external),
      buffers: this.formatBytes(memoryUsage.arrayBuffers)
    };
  }

  // Check system uptime and performance
  checkSystem() {
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    
    return {
      status: 'healthy',
      uptime: this.formatUptime(uptime),
      uptimeSeconds: uptime,
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    };
  }

  // Check environment variables
  checkEnvironment() {
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ];

    const missing = [];
    const present = [];

    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        present.push(envVar);
      } else {
        missing.push(envVar);
      }
    });

    return {
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      required: requiredEnvVars.length,
      present: present.length,
      missing,
      environment: process.env.NODE_ENV
    };
  }

  // Comprehensive health check
  async getHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkMemory()),
      Promise.resolve(this.checkSystem()),
      Promise.resolve(this.checkEnvironment())
    ]);

    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: this.stats.version,
      uptime: this.stats.uptime,
      checks: {
        database: checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy', error: checks[0].reason.message },
        redis: checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unhealthy', error: checks[1].reason.message },
        memory: checks[2].value,
        system: checks[3].value,
        environment: checks[4].value
      }
    };

    // Determine overall status
    const checkStatuses = Object.values(results.checks).map(check => check.status);
    if (checkStatuses.includes('unhealthy')) {
      results.status = 'unhealthy';
    } else if (checkStatuses.includes('warning')) {
      results.status = 'warning';
    }

    return results;
  }

  // Get basic status for load balancer health checks
  async getBasicStatus() {
    try {
      const dbStatus = await this.checkDatabase();
      const memoryStatus = this.checkMemory();
      
      const isHealthy = dbStatus.status === 'healthy' && 
                       memoryStatus.status !== 'unhealthy';

      return {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Performance metrics
  async getMetrics() {
    const dbResponseTime = await this.measureDbResponseTime();
    const memoryUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      performance: {
        databaseResponseTime: dbResponseTime,
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage()
      },
      connections: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    };
  }

  // Alert on critical issues
  async checkForAlerts() {
    const health = await this.getHealthStatus();
    const alerts = [];

    // Database alerts
    if (health.checks.database.status === 'unhealthy') {
      alerts.push({
        type: 'critical',
        component: 'database',
        message: 'Database is not accessible',
        details: health.checks.database.error
      });
    }

    // Memory alerts
    if (health.checks.memory.usagePercent > 90) {
      alerts.push({
        type: 'warning',
        component: 'memory',
        message: `High memory usage: ${health.checks.memory.usagePercent}%`,
        details: health.checks.memory
      });
    }

    // Environment alerts
    if (health.checks.environment.status === 'unhealthy') {
      alerts.push({
        type: 'critical',
        component: 'environment',
        message: 'Missing required environment variables',
        details: health.checks.environment.missing
      });
    }

    // Log alerts
    alerts.forEach(alert => {
      if (alert.type === 'critical') {
        logger.error('System Alert', alert);
      } else {
        logger.warn('System Alert', alert);
      }
    });

    return alerts;
  }

  // Utility methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
}

// Monitoring middleware
const healthMonitorMiddleware = async (req, res, next) => {
  const monitor = new HealthMonitor();
  
  // Add monitoring data to request
  req.monitoring = {
    requestStart: Date.now(),
    monitor
  };

  // Add response time tracking
  res.on('finish', () => {
    const responseTime = Date.now() - req.monitoring.requestStart;
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow Request', {
        url: req.originalUrl,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userAgent: req.get('user-agent'),
        ip: req.ip
      });
    }
  });

  next();
};

module.exports = {
  HealthMonitor,
  healthMonitorMiddleware
};