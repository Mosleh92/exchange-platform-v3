// backend/src/services/rateLimiterService.js
const Redis = require('redis');
const { getRealIP } = require('../middleware/ipWhitelistMiddleware');

class RateLimiterService {
    constructor() {
        this.redis = Redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.redis.connect();
        
        // Default rate limit rules
        this.defaultRules = {
            global: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 per hour
            auth: { requests: 5, window: 15 * 60 * 1000 }, // 5 per 15 minutes
            api: { requests: 100, window: 60 * 1000 }, // 100 per minute
            sensitive: { requests: 3, window: 60 * 1000 }, // 3 per minute
            upload: { requests: 10, window: 60 * 1000 }, // 10 per minute
        };
    }

    /**
     * Check rate limit for a key
     */
    async checkLimit(key, rule = 'global', customLimits = null) {
        try {
            const limits = customLimits || this.defaultRules[rule] || this.defaultRules.global;
            const { requests: maxRequests, window } = limits;
            
            const now = Date.now();
            const windowStart = now - window;
            
            // Use Redis sorted set to track requests
            const multi = this.redis.multi();
            
            // Remove old entries
            multi.zremrangebyscore(key, '-inf', windowStart);
            
            // Count current requests
            multi.zcard(key);
            
            // Add current request
            multi.zadd(key, now, `${now}-${Math.random()}`);
            
            // Set expiration
            multi.expire(key, Math.ceil(window / 1000));
            
            const results = await multi.exec();
            const currentRequests = results[1];
            
            const remaining = Math.max(0, maxRequests - currentRequests);
            const resetTime = now + window;
            
            return {
                allowed: currentRequests < maxRequests,
                limit: maxRequests,
                remaining: remaining,
                resetTime: resetTime,
                retryAfter: currentRequests >= maxRequests ? Math.ceil(window / 1000) : null
            };
        } catch (error) {
            console.error('خطا در بررسی rate limit:', error);
            // Allow request if Redis is down
            return { allowed: true, limit: 0, remaining: 0, resetTime: 0 };
        }
    }

    /**
     * Create rate limiting middleware
     */
    createMiddleware(options = {}) {
        const {
            rule = 'global',
            keyGenerator = (req) => getRealIP(req),
            customLimits = null,
            skipSuccessfulRequests = false,
            skipFailedRequests = false,
            onLimitReached = null
        } = options;

        return async (req, res, next) => {
            try {
                const key = `rate_limit:${rule}:${keyGenerator(req)}`;
                const result = await this.checkLimit(key, rule, customLimits);
                
                // Set rate limit headers
                res.set({
                    'X-RateLimit-Limit': result.limit,
                    'X-RateLimit-Remaining': result.remaining,
                    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
                });
                
                if (!result.allowed) {
                    if (result.retryAfter) {
                        res.set('Retry-After', result.retryAfter);
                    }
                    
                    if (onLimitReached) {
                        await onLimitReached(req, res);
                    }
                    
                    return res.status(429).json({
                        success: false,
                        message: 'تعداد درخواست‌ها از حد مجاز تجاوز کرده است',
                        code: 'RATE_LIMIT_EXCEEDED',
                        data: {
                            limit: result.limit,
                            remaining: result.remaining,
                            resetTime: result.resetTime,
                            retryAfter: result.retryAfter
                        }
                    });
                }
                
                // Skip counting if configured
                if (skipSuccessfulRequests || skipFailedRequests) {
                    const originalSend = res.send;
                    res.send = function(data) {
                        const shouldSkip = (
                            (skipSuccessfulRequests && res.statusCode < 400) ||
                            (skipFailedRequests && res.statusCode >= 400)
                        );
                        
                        if (shouldSkip) {
                            // Remove the request we just added
                            this.redis.zrem(key, `${Date.now()}-${Math.random()}`);
                        }
                        
                        originalSend.call(this, data);
                    }.bind(this);
                }
                
                next();
            } catch (error) {
                console.error('خطا در middleware rate limiting:', error);
                next();
            }
        };
    }

    /**
     * Dynamic rate limiting based on user role
     */
    createDynamicMiddleware(options = {}) {
        const {
            baseRule = 'api',
            roleMultipliers = {
                'super_admin': 10,
                'tenant_admin': 5,
                'manager': 3,
                'staff': 2,
                'customer': 1
            }
        } = options;

        return async (req, res, next) => {
            try {
                const userRole = req.user?.role || 'customer';
                const multiplier = roleMultipliers[userRole] || 1;
                
                const baseLimit = this.defaultRules[baseRule];
                const customLimits = {
                    requests: baseLimit.requests * multiplier,
                    window: baseLimit.window
                };
                
                const key = `rate_limit:${baseRule}:${req.user?.id || getRealIP(req)}`;
                const result = await this.checkLimit(key, baseRule, customLimits);
                
                res.set({
                    'X-RateLimit-Limit': result.limit,
                    'X-RateLimit-Remaining': result.remaining,
                    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
                });
                
                if (!result.allowed) {
                    return res.status(429).json({
                        success: false,
                        message: 'تعداد درخواست‌ها از حد مجاز تجاوز کرده است',
                        code: 'RATE_LIMIT_EXCEEDED',
                        data: {
                            limit: result.limit,
                            remaining: result.remaining,
                            resetTime: result.resetTime
                        }
                    });
                }
                
                next();
            } catch (error) {
                console.error('خطا در dynamic rate limiting:', error);
                next();
            }
        };
    }

    /**
     * Sliding window rate limiter
     */
    async checkSlidingWindow(key, maxRequests, windowMs, subWindows = 10) {
        try {
            const now = Date.now();
            const windowSize = Math.floor(windowMs / subWindows);
            const currentWindow = Math.floor(now / windowSize);
            
            const multi = this.redis.multi();
            const promises = [];
            
            // Get counts for all sub-windows in the sliding window
            for (let i = 0; i < subWindows; i++) {
                const windowKey = `${key}:${currentWindow - i}`;
                promises.push(multi.get(windowKey));
            }
            
            const results = await multi.exec();
            const totalRequests = results.reduce((sum, count) => sum + (parseInt(count) || 0), 0);
            
            if (totalRequests >= maxRequests) {
                return {
                    allowed: false,
                    limit: maxRequests,
                    remaining: 0,
                    resetTime: (currentWindow + 1) * windowSize
                };
            }
            
            // Increment current window
            const currentWindowKey = `${key}:${currentWindow}`;
            await this.redis.multi()
                .incr(currentWindowKey)
                .expire(currentWindowKey, Math.ceil(windowMs / 1000))
                .exec();
            
            return {
                allowed: true,
                limit: maxRequests,
                remaining: maxRequests - totalRequests - 1,
                resetTime: (currentWindow + 1) * windowSize
            };
        } catch (error) {
            console.error('خطا در sliding window rate limiter:', error);
            return { allowed: true, limit: 0, remaining: 0, resetTime: 0 };
        }
    }

    /**
     * Token bucket rate limiter
     */
    async checkTokenBucket(key, capacity, refillRate, tokensRequested = 1) {
        try {
            const now = Date.now();
            const bucketKey = `bucket:${key}`;
            
            // Get current bucket state
            const bucketData = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
            let tokens = parseInt(bucketData[0]) || capacity;
            let lastRefill = parseInt(bucketData[1]) || now;
            
            // Calculate tokens to add based on time passed
            const timePassed = now - lastRefill;
            const tokensToAdd = Math.floor(timePassed * refillRate / 1000);
            tokens = Math.min(capacity, tokens + tokensToAdd);
            
            if (tokens < tokensRequested) {
                return {
                    allowed: false,
                    tokens: tokens,
                    capacity: capacity,
                    retryAfter: Math.ceil((tokensRequested - tokens) / refillRate)
                };
            }
            
            // Consume tokens
            tokens -= tokensRequested;
            
            // Update bucket
            await this.redis.hmset(bucketKey, {
                tokens: tokens,
                lastRefill: now
            });
            await this.redis.expire(bucketKey, 3600); // 1 hour expiry
            
            return {
                allowed: true,
                tokens: tokens,
                capacity: capacity
            };
        } catch (error) {
            console.error('خطا در token bucket rate limiter:', error);
            return { allowed: true, tokens: 0, capacity: 0 };
        }
    }

    /**
     * Get rate limit statistics
     */
    async getStatistics(pattern = 'rate_limit:*') {
        try {
            const keys = await this.redis.keys(pattern);
            const stats = {};
            
            for (const key of keys) {
                const count = await this.redis.zcard(key);
                const ttl = await this.redis.ttl(key);
                
                stats[key] = {
                    count: count,
                    ttl: ttl
                };
            }
            
            return stats;
        } catch (error) {
            console.error('خطا در دریافت آمار rate limit:', error);
            return {};
        }
    }

    /**
     * Reset rate limit for a key
     */
    async resetLimit(key) {
        try {
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('خطا در reset rate limit:', error);
            return false;
        }
    }

    /**
     * Whitelist IP from rate limiting
     */
    async addToWhitelist(ip, expiry = 3600) {
        try {
            const key = `rate_limit:whitelist:${ip}`;
            await this.redis.set(key, '1', 'EX', expiry);
            return true;
        } catch (error) {
            console.error('خطا در اضافه کردن به whitelist:', error);
            return false;
        }
    }

    /**
     * Check if IP is whitelisted
     */
    async isWhitelisted(ip) {
        try {
            const key = `rate_limit:whitelist:${ip}`;
            const result = await this.redis.get(key);
            return !!result;
        } catch (error) {
            console.error('خطا در بررسی whitelist:', error);
            return false;
        }
    }

    /**
     * Blacklist IP (block all requests)
     */
    async addToBlacklist(ip, expiry = 3600) {
        try {
            const key = `rate_limit:blacklist:${ip}`;
            await this.redis.set(key, '1', 'EX', expiry);
            return true;
        } catch (error) {
            console.error('خطا در اضافه کردن به blacklist:', error);
            return false;
        }
    }

    /**
     * Check if IP is blacklisted
     */
    async isBlacklisted(ip) {
        try {
            const key = `rate_limit:blacklist:${ip}`;
            const result = await this.redis.get(key);
            return !!result;
        } catch (error) {
            console.error('خطا در بررسی blacklist:', error);
            return false;
        }
    }

    /**
     * Enhanced middleware with whitelist/blacklist support
     */
    createEnhancedMiddleware(options = {}) {
        const baseMiddleware = this.createMiddleware(options);
        
        return async (req, res, next) => {
            try {
                const ip = getRealIP(req);
                
                // Check blacklist first
                if (await this.isBlacklisted(ip)) {
                    return res.status(403).json({
                        success: false,
                        message: 'دسترسی شما مسدود شده است',
                        code: 'IP_BLACKLISTED'
                    });
                }
                
                // Check whitelist
                if (await this.isWhitelisted(ip)) {
                    return next();
                }
                
                // Apply normal rate limiting
                return baseMiddleware(req, res, next);
            } catch (error) {
                console.error('خطا در enhanced rate limiting:', error);
                next();
            }
        };
    }
}

module.exports = new RateLimiterService();
