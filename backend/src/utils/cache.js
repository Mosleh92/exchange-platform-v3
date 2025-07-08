const redis = require('redis');
const { logger } = require('./logger');

let client;
let memoryCache = new Map(); // Fallback memory cache

// Only create Redis client if not in test environment
if (process.env.NODE_ENV !== 'test') {
  client = redis.createClient({ 
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with a individual error
        logger.error('Redis connection refused');
        return new Error('Redis connection refused');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error
        return new Error('Redis retry time exhausted');
      }
      if (options.times_connected > 10) {
        // End reconnecting with built in error
        return undefined;
      }
      // Reconnect after
      return Math.min(options.attempt * 100, 3000);
    }
  });
  
  client.connect().catch(err => {
    logger.error('Redis connection error:', err);
    client = null; // Fall back to memory cache
  });

  client.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  client.on('connect', () => {
    logger.info('Redis connected successfully');
  });
}

const cache = {
  async get(key) {
    try {
      if (client && client.isOpen) {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to memory cache
        const cached = memoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
          return cached.value;
        } else {
          memoryCache.delete(key);
          return null;
        }
      }
    } catch (err) {
      logger.error('Cache get error:', err);
      return null;
    }
  },

  async set(key, value, ttl = 60) {
    try {
      if (client && client.isOpen) {
        await client.set(key, JSON.stringify(value), { EX: ttl });
      } else {
        // Fallback to memory cache
        memoryCache.set(key, {
          value,
          expiry: Date.now() + (ttl * 1000)
        });
        
        // Cleanup expired entries periodically
        if (memoryCache.size > 1000) {
          this.cleanupMemoryCache();
        }
      }
    } catch (err) {
      logger.error('Cache set error:', err);
    }
  },

  async del(key) {
    try {
      if (client && client.isOpen) {
        await client.del(key);
      } else {
        memoryCache.delete(key);
      }
    } catch (err) {
      logger.error('Cache delete error:', err);
    }
  },

  async exists(key) {
    try {
      if (client && client.isOpen) {
        return await client.exists(key);
      } else {
        const cached = memoryCache.get(key);
        return cached && cached.expiry > Date.now();
      }
    } catch (err) {
      logger.error('Cache exists error:', err);
      return false;
    }
  },

  async flush() {
    try {
      if (client && client.isOpen) {
        await client.flushAll();
      } else {
        memoryCache.clear();
      }
    } catch (err) {
      logger.error('Cache flush error:', err);
    }
  },

  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expiry <= now) {
        memoryCache.delete(key);
      }
    }
  },

  // Cache wrapper function for easy use
  async wrap(key, fn, ttl = 60) {
    let cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
};

// Cleanup memory cache every 5 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cache.cleanupMemoryCache();
  }, 5 * 60 * 1000);
}

module.exports = cache; 
