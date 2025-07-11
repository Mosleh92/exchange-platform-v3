// backend/src/services/scaling/AutoScalingService.js
const os = require('os');
const cluster = require('cluster');
const logger = require('../../utils/logger');

/**
 * Auto-Scaling Service for SaaS Platform
 * Handles automatic scaling based on load, provides load balancing and resource optimization
 */
class AutoScalingService {
  constructor() {
    this.workers = new Map(); // worker ID -> worker info
    this.metrics = {
      cpu: [],
      memory: [],
      connections: [],
      responseTime: []
    };
    this.config = {
      minWorkers: parseInt(process.env.MIN_WORKERS) || 2,
      maxWorkers: parseInt(process.env.MAX_WORKERS) || os.cpus().length * 2,
      scaleUpThreshold: {
        cpu: 80, // 80% CPU usage
        memory: 85, // 85% memory usage
        connections: 1000, // 1000 concurrent connections
        responseTime: 2000 // 2 seconds response time
      },
      scaleDownThreshold: {
        cpu: 30, // 30% CPU usage
        memory: 40, // 40% memory usage
        connections: 200, // 200 concurrent connections
        responseTime: 500 // 500ms response time
      },
      scaleCheckInterval: 30000, // 30 seconds
      metricWindowSize: 10, // Keep last 10 measurements
      cooldownPeriod: 300000 // 5 minutes cooldown between scaling events
    };
    this.lastScaleEvent = 0;
    this.isMonitoring = false;
    this.loadBalancer = new LoadBalancer();
  }

  /**
   * Initialize auto-scaling service
   */
  async initialize() {
    try {
      if (cluster.isMaster) {
        // Master process - manage workers
        await this.initializeMaster();
      } else {
        // Worker process - handle requests
        await this.initializeWorker();
      }

      // Start monitoring
      this.startMonitoring();

      logger.info('Auto-scaling service initialized');
    } catch (error) {
      logger.error('Failed to initialize auto-scaling service:', error);
      throw error;
    }
  }

  /**
   * Initialize master process
   */
  async initializeMaster() {
    logger.info('Initializing master process for auto-scaling');

    // Fork initial workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.forkWorker();
    }

    // Handle worker events
    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
      this.workers.delete(worker.id);
      
      // Replace dead worker if not intentional shutdown
      if (!worker.exitedAfterDisconnect) {
        this.forkWorker();
      }
    });

    cluster.on('online', (worker) => {
      logger.info(`Worker ${worker.process.pid} is online`);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Initialize worker process
   */
  async initializeWorker() {
    logger.info(`Worker ${process.pid} initializing`);

    // Setup worker-specific monitoring
    this.setupWorkerMonitoring();

    // Handle master messages
    process.on('message', (message) => {
      this.handleMasterMessage(message);
    });
  }

  /**
   * Fork a new worker
   */
  forkWorker() {
    const worker = cluster.fork();
    
    this.workers.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid,
      startTime: Date.now(),
      connections: 0,
      requests: 0,
      cpu: 0,
      memory: 0,
      status: 'starting'
    });

    // Setup worker monitoring
    worker.on('message', (message) => {
      this.handleWorkerMessage(worker.id, message);
    });

    setTimeout(() => {
      const workerInfo = this.workers.get(worker.id);
      if (workerInfo) {
        workerInfo.status = 'ready';
        this.workers.set(worker.id, workerInfo);
      }
    }, 5000); // Mark as ready after 5 seconds

    return worker;
  }

  /**
   * Handle messages from workers
   */
  handleWorkerMessage(workerId, message) {
    if (message.type === 'metrics') {
      const workerInfo = this.workers.get(workerId);
      if (workerInfo) {
        Object.assign(workerInfo, message.data);
        this.workers.set(workerId, workerInfo);
      }
    }
  }

  /**
   * Handle messages from master
   */
  handleMasterMessage(message) {
    switch (message.type) {
      case 'shutdown':
        this.gracefulWorkerShutdown();
        break;
      case 'health_check':
        this.sendWorkerHealth();
        break;
    }
  }

  /**
   * Setup worker monitoring
   */
  setupWorkerMonitoring() {
    setInterval(() => {
      const metrics = this.collectWorkerMetrics();
      
      // Send metrics to master
      if (process.send) {
        process.send({
          type: 'metrics',
          data: metrics
        });
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect worker metrics
   */
  collectWorkerMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      cpu: this.getCurrentCpuUsage(),
      memory: memUsage.rss / (1024 * 1024), // MB
      heapUsed: memUsage.heapUsed / (1024 * 1024), // MB
      uptime: process.uptime(),
      connections: this.getActiveConnections(),
      timestamp: Date.now()
    };
  }

  /**
   * Get current CPU usage (simplified)
   */
  getCurrentCpuUsage() {
    const startUsage = process.cpuUsage();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(100, percentage));
      }, 100);
    });
  }

  /**
   * Get active connections count
   */
  getActiveConnections() {
    // This would be implemented based on your server framework
    // For now, return a placeholder
    return Math.floor(Math.random() * 100);
  }

  /**
   * Start monitoring and auto-scaling
   */
  startMonitoring() {
    if (!cluster.isMaster || this.isMonitoring) return;

    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.checkScalingNeeds();
    }, this.config.scaleCheckInterval);

    logger.info('Auto-scaling monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Auto-scaling monitoring stopped');
  }

  /**
   * Check if scaling is needed
   */
  async checkScalingNeeds() {
    try {
      // Collect current metrics
      const currentMetrics = await this.collectClusterMetrics();
      
      // Store metrics for trend analysis
      this.storeMetrics(currentMetrics);
      
      // Check if we're in cooldown period
      if (Date.now() - this.lastScaleEvent < this.config.cooldownPeriod) {
        return;
      }

      // Determine scaling action
      const scalingDecision = this.analyzeScalingNeeds(currentMetrics);
      
      if (scalingDecision.action !== 'none') {
        await this.executeScaling(scalingDecision);
      }

    } catch (error) {
      logger.error('Error checking scaling needs:', error);
    }
  }

  /**
   * Collect cluster-wide metrics
   */
  async collectClusterMetrics() {
    const workers = Array.from(this.workers.values());
    
    if (workers.length === 0) {
      return {
        cpu: 0,
        memory: 0,
        connections: 0,
        responseTime: 0,
        activeWorkers: 0,
        totalWorkers: 0
      };
    }

    const metrics = {
      cpu: workers.reduce((sum, w) => sum + (w.cpu || 0), 0) / workers.length,
      memory: workers.reduce((sum, w) => sum + (w.memory || 0), 0) / workers.length,
      connections: workers.reduce((sum, w) => sum + (w.connections || 0), 0),
      responseTime: this.getAverageResponseTime(),
      activeWorkers: workers.filter(w => w.status === 'ready').length,
      totalWorkers: workers.length
    };

    return metrics;
  }

  /**
   * Store metrics for trend analysis
   */
  storeMetrics(metrics) {
    Object.keys(this.metrics).forEach(key => {
      if (metrics[key] !== undefined) {
        this.metrics[key].push(metrics[key]);
        
        // Keep only recent measurements
        if (this.metrics[key].length > this.config.metricWindowSize) {
          this.metrics[key].shift();
        }
      }
    });
  }

  /**
   * Analyze scaling needs
   */
  analyzeScalingNeeds(currentMetrics) {
    const { scaleUpThreshold, scaleDownThreshold } = this.config;
    
    // Check scale up conditions
    const shouldScaleUp = (
      currentMetrics.cpu > scaleUpThreshold.cpu ||
      currentMetrics.memory > scaleUpThreshold.memory ||
      currentMetrics.connections > scaleUpThreshold.connections ||
      currentMetrics.responseTime > scaleUpThreshold.responseTime
    ) && currentMetrics.totalWorkers < this.config.maxWorkers;

    // Check scale down conditions
    const shouldScaleDown = (
      currentMetrics.cpu < scaleDownThreshold.cpu &&
      currentMetrics.memory < scaleDownThreshold.memory &&
      currentMetrics.connections < scaleDownThreshold.connections &&
      currentMetrics.responseTime < scaleDownThreshold.responseTime
    ) && currentMetrics.totalWorkers > this.config.minWorkers;

    // Determine action
    let action = 'none';
    let reason = '';
    let targetWorkers = currentMetrics.totalWorkers;

    if (shouldScaleUp) {
      action = 'scale_up';
      targetWorkers = Math.min(this.config.maxWorkers, currentMetrics.totalWorkers + 1);
      reason = `High load detected - CPU: ${currentMetrics.cpu.toFixed(1)}%, Memory: ${currentMetrics.memory.toFixed(1)}%, Connections: ${currentMetrics.connections}`;
    } else if (shouldScaleDown) {
      action = 'scale_down';
      targetWorkers = Math.max(this.config.minWorkers, currentMetrics.totalWorkers - 1);
      reason = `Low load detected - scaling down to optimize resources`;
    }

    return {
      action,
      reason,
      currentWorkers: currentMetrics.totalWorkers,
      targetWorkers,
      metrics: currentMetrics
    };
  }

  /**
   * Execute scaling action
   */
  async executeScaling(decision) {
    try {
      logger.info(`Executing scaling: ${decision.action} - ${decision.reason}`);
      
      if (decision.action === 'scale_up') {
        await this.scaleUp(decision.targetWorkers - decision.currentWorkers);
      } else if (decision.action === 'scale_down') {
        await this.scaleDown(decision.currentWorkers - decision.targetWorkers);
      }

      this.lastScaleEvent = Date.now();
      
      // Log scaling event
      this.logScalingEvent(decision);

    } catch (error) {
      logger.error('Error executing scaling:', error);
    }
  }

  /**
   * Scale up by adding workers
   */
  async scaleUp(workersToAdd) {
    logger.info(`Scaling up: adding ${workersToAdd} workers`);
    
    for (let i = 0; i < workersToAdd; i++) {
      this.forkWorker();
    }
    
    // Wait for workers to be ready
    await this.waitForWorkersReady();
  }

  /**
   * Scale down by removing workers
   */
  async scaleDown(workersToRemove) {
    logger.info(`Scaling down: removing ${workersToRemove} workers`);
    
    const workers = Array.from(this.workers.values())
      .filter(w => w.status === 'ready')
      .sort((a, b) => b.startTime - a.startTime); // Remove newest workers first
    
    for (let i = 0; i < Math.min(workersToRemove, workers.length); i++) {
      const workerToRemove = workers[i];
      await this.gracefullyRemoveWorker(workerToRemove.id);
    }
  }

  /**
   * Gracefully remove a worker
   */
  async gracefullyRemoveWorker(workerId) {
    const worker = cluster.workers[workerId];
    if (!worker) return;

    return new Promise((resolve) => {
      // Mark worker as disconnecting
      const workerInfo = this.workers.get(workerId);
      if (workerInfo) {
        workerInfo.status = 'disconnecting';
        this.workers.set(workerId, workerInfo);
      }

      // Send shutdown message
      worker.send({ type: 'shutdown' });
      
      // Wait for graceful shutdown
      const timeout = setTimeout(() => {
        logger.warn(`Forcefully killing worker ${worker.process.pid}`);
        worker.kill('SIGKILL');
        resolve();
      }, 30000); // 30 seconds timeout

      worker.on('disconnect', () => {
        clearTimeout(timeout);
        logger.info(`Worker ${worker.process.pid} disconnected gracefully`);
        resolve();
      });

      worker.disconnect();
    });
  }

  /**
   * Wait for workers to be ready
   */
  async waitForWorkersReady(timeout = 30000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkReady = () => {
        const readyWorkers = Array.from(this.workers.values())
          .filter(w => w.status === 'ready').length;
        const totalWorkers = this.workers.size;
        
        if (readyWorkers === totalWorkers || Date.now() - startTime > timeout) {
          resolve(readyWorkers);
        } else {
          setTimeout(checkReady, 1000);
        }
      };
      
      checkReady();
    });
  }

  /**
   * Get average response time
   */
  getAverageResponseTime() {
    // This would be calculated from actual request metrics
    // For now, return a placeholder
    return Math.random() * 1000 + 200; // 200-1200ms
  }

  /**
   * Log scaling event
   */
  logScalingEvent(decision) {
    const event = {
      timestamp: new Date(),
      action: decision.action,
      reason: decision.reason,
      beforeWorkers: decision.currentWorkers,
      afterWorkers: decision.targetWorkers,
      metrics: decision.metrics
    };

    logger.info('Scaling event:', event);
    
    // Could also store in database for analysis
    this.storeScalingEvent(event);
  }

  /**
   * Store scaling event for analysis
   */
  async storeScalingEvent(event) {
    try {
      // In a real implementation, store in database
      // For now, just log
      logger.debug('Scaling event stored:', event);
    } catch (error) {
      logger.error('Error storing scaling event:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    logger.info('Initiating graceful shutdown of auto-scaling service');
    
    this.stopMonitoring();
    
    if (cluster.isMaster) {
      // Shutdown all workers
      const workers = Object.values(cluster.workers);
      
      for (const worker of workers) {
        if (worker) {
          await this.gracefullyRemoveWorker(worker.id);
        }
      }
    }
    
    logger.info('Auto-scaling service shutdown complete');
    process.exit(0);
  }

  /**
   * Graceful worker shutdown
   */
  gracefulWorkerShutdown() {
    logger.info(`Worker ${process.pid} shutting down gracefully`);
    
    // Close server connections gracefully
    // Stop accepting new requests
    // Wait for existing requests to complete
    
    setTimeout(() => {
      process.exit(0);
    }, 5000); // Give 5 seconds for cleanup
  }

  /**
   * Send worker health status
   */
  sendWorkerHealth() {
    const health = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: this.getActiveConnections(),
      status: 'healthy'
    };

    if (process.send) {
      process.send({
        type: 'health',
        data: health
      });
    }
  }

  /**
   * Get scaling status
   */
  getScalingStatus() {
    const workers = Array.from(this.workers.values());
    const recentMetrics = this.getRecentMetrics();
    
    return {
      workers: {
        total: workers.length,
        ready: workers.filter(w => w.status === 'ready').length,
        starting: workers.filter(w => w.status === 'starting').length,
        disconnecting: workers.filter(w => w.status === 'disconnecting').length
      },
      limits: {
        min: this.config.minWorkers,
        max: this.config.maxWorkers
      },
      metrics: recentMetrics,
      lastScaleEvent: this.lastScaleEvent,
      cooldownRemaining: Math.max(0, this.config.cooldownPeriod - (Date.now() - this.lastScaleEvent)),
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics() {
    const result = {};
    
    Object.keys(this.metrics).forEach(key => {
      const values = this.metrics[key];
      if (values.length > 0) {
        result[key] = {
          current: values[values.length - 1],
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          trend: values.length > 1 ? 
            (values[values.length - 1] - values[0]) / values.length : 0
        };
      }
    });
    
    return result;
  }
}

/**
 * Load Balancer for distributing requests across workers
 */
class LoadBalancer {
  constructor() {
    this.algorithm = 'round_robin'; // round_robin, least_connections, least_response_time
    this.currentWorkerIndex = 0;
  }

  /**
   * Select worker based on load balancing algorithm
   */
  selectWorker(workers, request = null) {
    const availableWorkers = workers.filter(w => w.status === 'ready');
    
    if (availableWorkers.length === 0) {
      return null;
    }

    switch (this.algorithm) {
      case 'round_robin':
        return this.roundRobinSelection(availableWorkers);
      case 'least_connections':
        return this.leastConnectionsSelection(availableWorkers);
      case 'least_response_time':
        return this.leastResponseTimeSelection(availableWorkers);
      default:
        return availableWorkers[0];
    }
  }

  /**
   * Round robin worker selection
   */
  roundRobinSelection(workers) {
    const worker = workers[this.currentWorkerIndex % workers.length];
    this.currentWorkerIndex++;
    return worker;
  }

  /**
   * Least connections worker selection
   */
  leastConnectionsSelection(workers) {
    return workers.reduce((prev, current) => {
      return (current.connections < prev.connections) ? current : prev;
    });
  }

  /**
   * Least response time worker selection
   */
  leastResponseTimeSelection(workers) {
    return workers.reduce((prev, current) => {
      const prevResponseTime = prev.responseTime || 0;
      const currentResponseTime = current.responseTime || 0;
      return (currentResponseTime < prevResponseTime) ? current : prev;
    });
  }
}

module.exports = new AutoScalingService();