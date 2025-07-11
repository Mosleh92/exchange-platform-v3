// backend/src/services/caching/CachingService.js
const Redis = require('redis');
const logger = require('../../utils/logger');

/**
 * Advanced Caching Service with Multi-level Caching Strategy
 * Supports Redis, in-memory, and distributed caching with intelligent invalidation
 */
class CachingService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0
    };
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true
      },
      memory: {
        maxSize: parseInt(process.env.MEMORY_CACHE_SIZE) || 1000,
        ttl: parseInt(process.env.MEMORY_CACHE_TTL) || 300000, // 5 minutes
        checkPeriod: 60000 // 1 minute cleanup interval
      },
      strategies: {
        user_profile: { level: 'memory', ttl: 900000 }, // 15 minutes
        exchange_rates: { level: 'redis', ttl: 30000 }, // 30 seconds
        tenant_config: { level: 'memory', ttl: 3600000 }, // 1 hour
        market_data: { level: 'redis', ttl: 5000 }, // 5 seconds
        session_data: { level: 'redis', ttl: 1800000 }, // 30 minutes
        analytics: { level: 'redis', ttl: 300000 }, // 5 minutes
        api_responses: { level: 'memory', ttl: 60000 } // 1 minute
      }
    };
    this.isInitialized = false;
  }

  /**
   * Initialize caching service
   */
  async initialize() {
    try {
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Start memory cache cleanup
      this.startMemoryCacheCleanup();
      
      // Setup cache monitoring
      this.setupCacheMonitoring();
      
      this.isInitialized = true;
      logger.info('Caching service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize caching service:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient(this.config.redis);
      
      this.redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });
      
      this.redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });
      
      this.redisClient.on('error', (error) => {
        logger.error('Redis client error:', error);
      });
      
      this.redisClient.on('end', () => {
        logger.warn('Redis client connection ended');
      });
      
      await this.redisClient.connect();
      
      // Test Redis connection
      await this.redisClient.ping();
      logger.info('Redis connection established');
      
    } catch (error) {
      logger.warn('Redis not available, using memory cache only:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Get cached value
   */
  async get(key, strategy = null) {
    try {
      const cacheStrategy = strategy || this.getCacheStrategy(key);
      let value = null;
      let cacheLevel = '';

      // Try memory cache first for memory strategy or as L1 cache
      if (cacheStrategy.level === 'memory' || !this.redisClient) {
        value = this.getFromMemory(key);
        cacheLevel = 'memory';
      }

      // Try Redis if memory cache miss and Redis is available
      if (!value && this.redisClient && cacheStrategy.level === 'redis') {
        value = await this.getFromRedis(key);
        cacheLevel = 'redis';
        
        // Store in memory cache for faster subsequent access
        if (value && cacheStrategy.level === 'redis') {
          this.setInMemory(key, value, Math.min(cacheStrategy.ttl, this.config.memory.ttl));
        }
      }

      if (value) {
        this.cacheStats.hits++;
        logger.debug(`Cache hit: ${key} (${cacheLevel})`);
        return this.deserializeValue(value);
      } else {
        this.cacheStats.misses++;
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key, value, ttl = null, strategy = null) {
    try {
      const cacheStrategy = strategy || this.getCacheStrategy(key);
      const cacheTtl = ttl || cacheStrategy.ttl;
      const serializedValue = this.serializeValue(value);

      // Set in appropriate cache level
      if (cacheStrategy.level === 'memory' || !this.redisClient) {
        this.setInMemory(key, serializedValue, cacheTtl);
      }

      if (this.redisClient && cacheStrategy.level === 'redis') {
        await this.setInRedis(key, serializedValue, cacheTtl);
        
        // Also set in memory for L1 cache
        this.setInMemory(key, serializedValue, Math.min(cacheTtl, this.config.memory.ttl));
      }

      this.cacheStats.writes++;
      logger.debug(`Cache set: ${key} (TTL: ${cacheTtl}ms)`);
      
      return true;

    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key) {
    try {
      let deleted = false;

      // Delete from memory cache
      if (this.memoryCache.has(key)) {
        this.memoryCache.delete(key);
        deleted = true;
      }

      // Delete from Redis
      if (this.redisClient) {
        const redisResult = await this.redisClient.del(key);
        if (redisResult > 0) deleted = true;
      }

      if (deleted) {
        logger.debug(`Cache deleted: ${key}`);
      }

      return deleted;

    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key) {
    try {
      // Check memory cache
      if (this.memoryCache.has(key)) {
        const item = this.memoryCache.get(key);
        if (!this.isExpired(item)) {
          return true;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check Redis
      if (this.redisClient) {
        const exists = await this.redisClient.exists(key);
        return exists === 1;
      }

      return false;

    } catch (error) {
      logger.error(`Error checking cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet(key, fetchFunction, ttl = null, strategy = null) {
    try {
      // Try to get from cache first
      let value = await this.get(key, strategy);
      
      if (value !== null) {
        return value;
      }

      // Cache miss - fetch data
      logger.debug(`Cache miss for ${key}, fetching data`);
      value = await fetchFunction();
      
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl, strategy);
      }

      return value;

    } catch (error) {
      logger.error(`Error in getOrSet for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      let deletedCount = 0;

      // Invalidate memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      const memoryMatches = memoryKeys.filter(key => this.matchesPattern(key, pattern));
      
      memoryMatches.forEach(key => {
        this.memoryCache.delete(key);
        deletedCount++;
      });

      // Invalidate Redis cache
      if (this.redisClient) {
        const redisKeys = await this.redisClient.keys(pattern);
        if (redisKeys.length > 0) {
          const redisResult = await this.redisClient.del(redisKeys);
          deletedCount += redisResult;
        }
      }

      logger.info(`Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`);
      return deletedCount;

    } catch (error) {
      logger.error(`Error invalidating cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags) {
    try {
      if (!Array.isArray(tags)) {
        tags = [tags];
      }

      let deletedCount = 0;

      for (const tag of tags) {
        const pattern = `*:tag:${tag}:*`;
        deletedCount += await this.invalidatePattern(pattern);
      }

      logger.info(`Invalidated ${deletedCount} cache entries by tags: ${tags.join(', ')}`);
      return deletedCount;

    } catch (error) {
      logger.error(`Error invalidating cache by tags ${tags}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0;

    return {
      ...this.cacheStats,
      hitRate: hitRate.toFixed(2),
      memorySize: this.memoryCache.size,
      redisConnected: this.redisClient ? this.redisClient.isReady : false,
      timestamp: new Date()
    };
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis cache
      if (this.redisClient) {
        await this.redisClient.flushDb();
      }

      // Reset stats
      this.cacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        writes: 0
      };

      logger.info('All cache cleared');
      return true;

    } catch (error) {
      logger.error('Error clearing all cache:', error);
      return false;
    }
  }

  /**
   * Warm up cache with critical data
   */
  async warmUp(warmUpFunctions) {
    try {
      logger.info('Starting cache warm-up');
      
      const warmUpPromises = Object.entries(warmUpFunctions).map(async ([key, fetchFunction]) => {
        try {
          const value = await fetchFunction();
          await this.set(key, value);
          logger.debug(`Warmed up cache key: ${key}`);
        } catch (error) {
          logger.error(`Error warming up cache key ${key}:`, error);
        }
      });

      await Promise.allSettled(warmUpPromises);
      logger.info('Cache warm-up completed');

    } catch (error) {
      logger.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Get from memory cache
   */
  getFromMemory(key) {
    const item = this.memoryCache.get(key);
    
    if (!item) return null;
    
    if (this.isExpired(item)) {
      this.memoryCache.delete(key);
      this.cacheStats.evictions++;
      return null;
    }
    
    return item.value;
  }

  /**
   * Set in memory cache
   */
  setInMemory(key, value, ttl) {
    // Check memory cache size limit
    if (this.memoryCache.size >= this.config.memory.maxSize) {
      this.evictOldestMemoryEntry();
    }

    const item = {
      value,
      timestamp: Date.now(),
      ttl
    };

    this.memoryCache.set(key, item);
  }

  /**
   * Get from Redis
   */
  async getFromRedis(key) {
    if (!this.redisClient) return null;
    
    try {
      const value = await this.redisClient.get(key);
      return value;
    } catch (error) {
      logger.error(`Error getting from Redis: ${key}`, error);
      return null;
    }
  }

  /**
   * Set in Redis
   */
  async setInRedis(key, value, ttl) {
    if (!this.redisClient) return false;
    
    try {
      if (ttl > 0) {
        await this.redisClient.setEx(key, Math.ceil(ttl / 1000), value);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting in Redis: ${key}`, error);
      return false;
    }
  }

  /**
   * Check if cache item is expired
   */
  isExpired(item) {
    if (!item.ttl || item.ttl <= 0) return false;
    return (Date.now() - item.timestamp) > item.ttl;
  }

  /**
   * Evict oldest memory cache entry
   */
  evictOldestMemoryEntry() {
    const entries = Array.from(this.memoryCache.entries());
    
    if (entries.length === 0) return;
    
    // Find oldest entry
    let oldestKey = entries[0][0];
    let oldestTimestamp = entries[0][1].timestamp;
    
    for (const [key, item] of entries) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    this.memoryCache.delete(oldestKey);
    this.cacheStats.evictions++;
    logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
  }

  /**
   * Get cache strategy for key
   */
  getCacheStrategy(key) {
    // Determine strategy based on key prefix
    for (const [prefix, strategy] of Object.entries(this.config.strategies)) {
      if (key.startsWith(prefix)) {
        return strategy;
      }
    }
    
    // Default strategy
    return { level: 'memory', ttl: this.config.memory.ttl };
  }

  /**
   * Serialize value for storage
   */
  serializeValue(value) {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch (error) {
      logger.error('Error serializing cache value:', error);
      return null;
    }
  }

  /**
   * Deserialize value from storage
   */
  deserializeValue(value) {
    try {
      if (typeof value !== 'string') return value;
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Error deserializing cache value:', error);
      return null;
    }
  }

  /**
   * Check if key matches pattern
   */
  matchesPattern(key, pattern) {
    // Convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Start memory cache cleanup
   */
  startMemoryCacheCleanup() {
    setInterval(() => {
      this.cleanupMemoryCache();
    }, this.config.memory.checkPeriod);
    
    logger.info('Memory cache cleanup started');
  }

  /**
   * Cleanup expired memory cache entries
   */
  cleanupMemoryCache() {
    let evictedCount = 0;
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
        evictedCount++;
      }
    }
    
    if (evictedCount > 0) {
      this.cacheStats.evictions += evictedCount;
      logger.debug(`Cleaned up ${evictedCount} expired cache entries`);
    }
  }

  /**
   * Setup cache monitoring
   */
  setupCacheMonitoring() {
    // Monitor cache performance every minute
    setInterval(() => {
      const stats = this.getCacheStats();
      
      if (parseFloat(stats.hitRate) < 50) {
        logger.warn(`Low cache hit rate: ${stats.hitRate}%`);
      }
      
      if (this.memoryCache.size > this.config.memory.maxSize * 0.9) {
        logger.warn(`Memory cache near capacity: ${this.memoryCache.size}/${this.config.memory.maxSize}`);
      }
      
    }, 60000);
    
    logger.info('Cache monitoring started');
  }

  /**
   * Create cache key with tenant isolation
   */
  createTenantKey(tenantId, key) {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Create cache key with tags
   */
  createTaggedKey(key, tags) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    return `${key}:tag:${tags.join(':')}`;
  }

  /**
   * Batch get operation
   */
  async mget(keys) {
    try {
      const results = {};
      
      // Try memory cache first
      const memoryResults = {};
      const remainingKeys = [];
      
      for (const key of keys) {
        const value = this.getFromMemory(key);
        if (value !== null) {
          memoryResults[key] = this.deserializeValue(value);
        } else {
          remainingKeys.push(key);
        }
      }
      
      Object.assign(results, memoryResults);
      
      // Get remaining from Redis
      if (remainingKeys.length > 0 && this.redisClient) {
        const redisValues = await this.redisClient.mGet(remainingKeys);
        
        remainingKeys.forEach((key, index) => {
          if (redisValues[index] !== null) {
            results[key] = this.deserializeValue(redisValues[index]);
            
            // Cache in memory for next time
            this.setInMemory(key, redisValues[index], this.config.memory.ttl);
          }
        });
      }
      
      return results;
      
    } catch (error) {
      logger.error('Error in batch get operation:', error);
      return {};
    }
  }

  /**
   * Batch set operation
   */
  async mset(keyValuePairs, ttl = null) {
    try {
      const operations = [];
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        operations.push(this.set(key, value, ttl));
      }
      
      await Promise.all(operations);
      return true;
      
    } catch (error) {
      logger.error('Error in batch set operation:', error);
      return false;
    }
  }

  /**
   * Close cache connections
   */
  async close() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      }
      
      this.memoryCache.clear();
      logger.info('Memory cache cleared');
      
      logger.info('Caching service closed');
      
    } catch (error) {
      logger.error('Error closing caching service:', error);
    }
  }
}

module.exports = new CachingService();