const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const router = express.Router();

// Create Redis client for health check
let redisClient;
try {
    redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
} catch (error) {
    console.error('Redis connection error:', error);
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: System health check
 *     description: Returns the health status of all system components
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 components:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                     redis:
 *                       type: object
 *                     memory:
 *                       type: object
 *                     cpu:
 *                       type: object
 *       503:
 *         description: System is unhealthy
 */
router.get('/health', async (req, res) => {
    const startTime = Date.now();
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        components: {}
    };

    let overallStatus = 'healthy';

    try {
        // Database health check
        const dbStart = Date.now();
        try {
            await mongoose.connection.db.admin().ping();
            healthCheck.components.database = {
                status: 'healthy',
                responseTime: Date.now() - dbStart,
                connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                host: mongoose.connection.host,
                name: mongoose.connection.name
            };
        } catch (error) {
            overallStatus = 'unhealthy';
            healthCheck.components.database = {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - dbStart
            };
        }

        // Redis health check
        const redisStart = Date.now();
        try {
            if (redisClient && redisClient.isOpen) {
                await redisClient.ping();
                healthCheck.components.redis = {
                    status: 'healthy',
                    responseTime: Date.now() - redisStart,
                    connection: 'connected'
                };
            } else {
                healthCheck.components.redis = {
                    status: 'degraded',
                    message: 'Redis client not connected',
                    responseTime: Date.now() - redisStart
                };
            }
        } catch (error) {
            overallStatus = 'unhealthy';
            healthCheck.components.redis = {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now() - redisStart
            };
        }

        // Memory health check
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        healthCheck.components.memory = {
            status: memoryUsagePercentage > 90 ? 'unhealthy' : memoryUsagePercentage > 75 ? 'degraded' : 'healthy',
            usage: {
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
            },
            percentage: Math.round(memoryUsagePercentage)
        };

        if (memoryUsagePercentage > 90) {
            overallStatus = 'unhealthy';
        }

        // CPU health check (basic load check)
        const cpuUsage = process.cpuUsage();
        healthCheck.components.cpu = {
            status: 'healthy',
            usage: {
                user: cpuUsage.user,
                system: cpuUsage.system
            }
        };

        // Disk space check (if possible)
        try {
            const fs = require('fs');
            // const stats = fs.statSync('.'); // Unused variable
            fs.statSync('.'); // Call statSync to check disk access without assigning to unused variable
            healthCheck.components.disk = {
                status: 'healthy',
                message: 'Disk access functional'
            };
        } catch (error) {
            healthCheck.components.disk = {
                status: 'degraded',
                error: error.message
            };
        }

        // Response time
        healthCheck.responseTime = Date.now() - startTime;
        healthCheck.status = overallStatus;

        // Send response
        const statusCode = overallStatus === 'healthy' ? 200 : 503;
        res.status(statusCode).json(healthCheck);

    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            responseTime: Date.now() - startTime
        });
    }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Checks if the application is ready to serve requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/health/ready', async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                status: 'not ready',
                reason: 'Database not connected'
            });
        }

        // Check if essential services are available
        await mongoose.connection.db.admin().ping();

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Checks if the application is alive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/health/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Application metrics
 *     description: Returns Prometheus-formatted metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics data
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = `
# HELP nodejs_memory_heap_used_bytes Node.js heap memory used
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP nodejs_memory_heap_total_bytes Node.js heap memory total
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP nodejs_memory_external_bytes Node.js external memory
# TYPE nodejs_memory_external_bytes gauge
nodejs_memory_external_bytes ${memoryUsage.external}

# HELP nodejs_memory_rss_bytes Node.js RSS memory
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memoryUsage.rss}

# HELP nodejs_process_uptime_seconds Node.js process uptime
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}

# HELP nodejs_cpu_user_seconds Node.js CPU user time
# TYPE nodejs_cpu_user_seconds counter
nodejs_cpu_user_seconds ${cpuUsage.user / 1000000}

# HELP nodejs_cpu_system_seconds Node.js CPU system time
# TYPE nodejs_cpu_system_seconds counter
nodejs_cpu_system_seconds ${cpuUsage.system / 1000000}

# HELP mongodb_connection_status MongoDB connection status
# TYPE mongodb_connection_status gauge
mongodb_connection_status ${mongoose.connection.readyState}
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics.trim());
});

module.exports = router;
