const express = require('express');
const { HealthMonitor } = require('../utils/monitoring');
const { catchAsync } = require('../middleware/errorHandler');
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Comprehensive system health check
 *     description: Returns detailed health status of all system components
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', catchAsync(async (req, res) => {
    const monitor = new HealthMonitor();
    const health = await monitor.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
}));

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe for Kubernetes
 *     description: Checks if the application is ready to serve requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/health/ready', catchAsync(async (req, res) => {
    const monitor = new HealthMonitor();
    const health = await monitor.getBasicStatus();
    
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
}));

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe for Kubernetes
 *     description: Simple check to verify the application is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/health/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime())
    });
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Application metrics for monitoring
 *     description: Returns detailed performance metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics data
 */
router.get('/metrics', catchAsync(async (req, res) => {
    const monitor = new HealthMonitor();
    const metrics = await monitor.getMetrics();
    
    res.json(metrics);
}));

/**
 * @swagger
 * /metrics/prometheus:
 *   get:
 *     summary: Prometheus-formatted metrics
 *     description: Returns metrics in Prometheus exposition format
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics/prometheus', catchAsync(async (req, res) => {
    const monitor = new HealthMonitor();
    const metrics = await monitor.getMetrics();
    const memory = metrics.performance.memoryUsage;
    const cpu = metrics.performance.cpuUsage;
    
    const prometheusMetrics = `
# HELP nodejs_memory_heap_used_bytes Node.js heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memory.heapUsed}

# HELP nodejs_memory_heap_total_bytes Node.js heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memory.heapTotal}

# HELP nodejs_memory_external_bytes Node.js external memory
# TYPE nodejs_memory_external_bytes gauge
nodejs_memory_external_bytes ${memory.external}

# HELP nodejs_memory_rss_bytes Node.js RSS memory
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memory.rss}

# HELP nodejs_process_uptime_seconds Node.js process uptime
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${metrics.performance.uptime}

# HELP nodejs_cpu_user_seconds Node.js CPU user time
# TYPE nodejs_cpu_user_seconds counter
nodejs_cpu_user_seconds ${cpu.user / 1000000}

# HELP nodejs_cpu_system_seconds Node.js CPU system time
# TYPE nodejs_cpu_system_seconds counter
nodejs_cpu_system_seconds ${cpu.system / 1000000}

# HELP database_response_time_ms Database response time in milliseconds
# TYPE database_response_time_ms gauge
database_response_time_ms ${metrics.performance.databaseResponseTime}

# HELP mongodb_connection_status MongoDB connection status (1=connected, 0=disconnected)
# TYPE mongodb_connection_status gauge
mongodb_connection_status ${metrics.connections.mongodb === 'connected' ? 1 : 0}
`;

    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics.trim());
}));

/**
 * @swagger
 * /health/alerts:
 *   get:
 *     summary: System alerts
 *     description: Returns current system alerts and warnings
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Current alerts
 */
router.get('/health/alerts', catchAsync(async (req, res) => {
    const monitor = new HealthMonitor();
    const alerts = await monitor.checkForAlerts();
    
    res.json({
        timestamp: new Date().toISOString(),
        alertCount: alerts.length,
        alerts
    });
}));

module.exports = router;
