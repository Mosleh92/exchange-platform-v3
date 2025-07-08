const redis = require('redis');
const { logger } = require('./logger');

let client;

// Only create Redis client if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    // Connection pooling and resilience
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      lazyConnect: true
    },
    // Connection limits
    isolationPoolOptions: {
      min: 2,
      max: 10
    },
    // Retry configuration
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  };

  client = redis.createClient(redisConfig);
  
  // Event handlers
  client.on('connect', () => {
    logger.info('Redis connection established');
  });
  
  client.on('ready', () => {
    logger.info('Redis client ready');
  });
  
  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });
  
  client.on('end', () => {
    logger.warn('Redis connection closed');
  });
  
  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });

  // Connect to Redis
  client.connect().catch((err) => {
    logger.error('Failed to connect to Redis', { error: err.message });
  });
}

const cache = {
  async get(key, defaultValue = null) {
    if (!client) return defaultValue;
    try {
      const value = await client.get(key);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (err) {
      logger.warn('Cache get error', { key, error: err.message });
      return defaultValue;
    }
  },

  async set(key, value, ttl = 60) {
    if (!client) return false;
    try {
      await client.set(key, JSON.stringify(value), { EX: ttl });
      return true;
    } catch (err) {
      logger.warn('Cache set error', { key, error: err.message });
      return false;
    }
  },

  async del(key) {
    if (!client) return false;
    try {
      await client.del(key);
      return true;
    } catch (err) {
      logger.warn('Cache delete error', { key, error: err.message });
      return false;
    }
  },

  async exists(key) {
    if (!client) return false;
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (err) {
      logger.warn('Cache exists error', { key, error: err.message });
      return false;
    }
  },

  async setHash(key, field, value, ttl = 60) {
    if (!client) return false;
    try {
      await client.hSet(key, field, JSON.stringify(value));
      if (ttl) {
        await client.expire(key, ttl);
      }
      return true;
    } catch (err) {
      logger.warn('Cache setHash error', { key, field, error: err.message });
      return false;
    }
  },

  async getHash(key, field, defaultValue = null) {
    if (!client) return defaultValue;
    try {
      const value = await client.hGet(key, field);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (err) {
      logger.warn('Cache getHash error', { key, field, error: err.message });
      return defaultValue;
    }
  },

  async getAllHash(key) {
    if (!client) return {};
    try {
      const hash = await client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (err) {
      logger.warn('Cache getAllHash error', { key, error: err.message });
      return {};
    }
  },

  // Tenant-scoped cache methods
  async getTenant(tenantId, key, defaultValue = null) {
    return this.get(`tenant:${tenantId}:${key}`, defaultValue);
  },

  async setTenant(tenantId, key, value, ttl = 60) {
    return this.set(`tenant:${tenantId}:${key}`, value, ttl);
  },

  async delTenant(tenantId, key) {
    return this.del(`tenant:${tenantId}:${key}`);
  },

  // User session cache
  async setUserSession(userId, sessionData, ttl = 3600) {
    return this.set(`session:${userId}`, sessionData, ttl);
  },

  async getUserSession(userId) {
    return this.get(`session:${userId}`);
  },

  async delUserSession(userId) {
    return this.del(`session:${userId}`);
  },

  // Rate limiting support
  async increment(key, ttl = 60) {
    if (!client) return 0;
    try {
      const result = await client.incr(key);
      if (result === 1 && ttl) {
        await client.expire(key, ttl);
      }
      return result;
    } catch (err) {
      logger.warn('Cache increment error', { key, error: err.message });
      return 0;
    }
  },

  // Cleanup and disconnect
  async disconnect() {
    if (client) {
      try {
        await client.quit();
        logger.info('Redis client disconnected');
      } catch (err) {
        logger.error('Error disconnecting Redis client', { error: err.message });
      }
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await cache.disconnect();
});

process.on('SIGTERM', async () => {
  await cache.disconnect();
});

module.exports = cache; 
