const redis = require('redis');
const jwt = require('jsonwebtoken');

class TokenBlacklistService {
    constructor() {
        this.redis = null;
        this.memoryBlacklist = new Set(); // Fallback to memory if Redis unavailable
        this.useRedis = false;
        this.initRedis();
    }

    async initRedis() {
        try {
            if (process.env.REDIS_URL) {
                this.redis = redis.createClient({
                    url: process.env.REDIS_URL
                });
                
                this.redis.on('error', (err) => {
                    console.warn('Redis connection error for blacklist service:', err.message);
                    this.useRedis = false;
                });

                await this.redis.connect();
                this.useRedis = true;
                console.log('Token blacklist service connected to Redis');
            }
        } catch (error) {
            console.warn('Redis unavailable, using memory blacklist:', error.message);
            this.useRedis = false;
        }
    }

    /**
     * Add token to blacklist
     * @param {string} token - JWT token to blacklist
     * @param {number} expirationTime - Token expiration time in seconds (optional)
     */
    async blacklistToken(token, expirationTime = null) {
        try {
            // Extract expiration time from token if not provided
            if (!expirationTime) {
                const decoded = jwt.decode(token);
                if (decoded && decoded.exp) {
                    expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
                } else {
                    // Default to 24 hours if can't decode
                    expirationTime = 24 * 60 * 60;
                }
            }

            if (this.useRedis && this.redis) {
                // Store in Redis with expiration
                await this.redis.setEx(`blacklist:${token}`, expirationTime, 'true');
            } else {
                // Store in memory with cleanup
                this.memoryBlacklist.add(token);
                
                // Clean up expired tokens from memory
                if (expirationTime > 0) {
                    setTimeout(() => {
                        this.memoryBlacklist.delete(token);
                    }, expirationTime * 1000);
                }
            }
        } catch (error) {
            console.error('Error blacklisting token:', error);
            // Fallback to memory storage
            this.memoryBlacklist.add(token);
        }
    }

    /**
     * Check if token is blacklisted
     * @param {string} token - JWT token to check
     * @returns {boolean} - True if blacklisted
     */
    async isTokenBlacklisted(token) {
        try {
            if (this.useRedis && this.redis) {
                const result = await this.redis.get(`blacklist:${token}`);
                return result === 'true';
            } else {
                return this.memoryBlacklist.has(token);
            }
        } catch (error) {
            console.error('Error checking token blacklist:', error);
            // Fallback to memory check
            return this.memoryBlacklist.has(token);
        }
    }

    /**
     * Remove token from blacklist (if needed for admin operations)
     * @param {string} token - JWT token to remove from blacklist
     */
    async removeTokenFromBlacklist(token) {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.del(`blacklist:${token}`);
            } else {
                this.memoryBlacklist.delete(token);
            }
        } catch (error) {
            console.error('Error removing token from blacklist:', error);
        }
    }

    /**
     * Blacklist all tokens for a specific user (useful for security incidents)
     * @param {string} userId - User ID to blacklist all tokens for
     * @param {number} beforeTimestamp - Blacklist tokens issued before this timestamp
     */
    async blacklistUserTokens(userId, beforeTimestamp = null) {
        try {
            const timestamp = beforeTimestamp || Math.floor(Date.now() / 1000);
            const key = `user_blacklist:${userId}`;
            
            if (this.useRedis && this.redis) {
                // Store user blacklist timestamp - tokens issued before this time are invalid
                await this.redis.setEx(key, 24 * 60 * 60, timestamp.toString()); // 24 hour expiration
            } else {
                // For memory implementation, we'll store in a separate Set
                if (!this.userBlacklist) {
                    this.userBlacklist = new Map();
                }
                this.userBlacklist.set(userId, timestamp);
            }
        } catch (error) {
            console.error('Error blacklisting user tokens:', error);
        }
    }

    /**
     * Check if user tokens are blacklisted before a certain time
     * @param {string} userId - User ID to check
     * @param {number} tokenIssuedAt - When the token was issued (iat claim)
     * @returns {boolean} - True if token should be considered invalid
     */
    async isUserTokenBlacklisted(userId, tokenIssuedAt) {
        try {
            if (this.useRedis && this.redis) {
                const blacklistTime = await this.redis.get(`user_blacklist:${userId}`);
                if (blacklistTime) {
                    return tokenIssuedAt < parseInt(blacklistTime);
                }
            } else {
                if (this.userBlacklist && this.userBlacklist.has(userId)) {
                    const blacklistTime = this.userBlacklist.get(userId);
                    return tokenIssuedAt < blacklistTime;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking user token blacklist:', error);
            return false;
        }
    }

    /**
     * Clean up expired entries (for memory implementation)
     */
    cleanup() {
        // This is mainly for memory implementation
        // Redis handles expiration automatically
        if (!this.useRedis) {
            // For a production system, you might want to implement 
            // a more sophisticated cleanup mechanism for memory storage
            console.log('Blacklist cleanup - memory implementation has automatic cleanup via setTimeout');
        }
    }

    /**
     * Get blacklist statistics (for monitoring)
     */
    async getStats() {
        try {
            if (this.useRedis && this.redis) {
                // Count keys with blacklist prefix
                const keys = await this.redis.keys('blacklist:*');
                const userKeys = await this.redis.keys('user_blacklist:*');
                return {
                    blacklistedTokens: keys.length,
                    blacklistedUsers: userKeys.length,
                    storage: 'redis'
                };
            } else {
                return {
                    blacklistedTokens: this.memoryBlacklist.size,
                    blacklistedUsers: this.userBlacklist ? this.userBlacklist.size : 0,
                    storage: 'memory'
                };
            }
        } catch (error) {
            console.error('Error getting blacklist stats:', error);
            return { error: error.message };
        }
    }
}

// Export singleton instance
const tokenBlacklistService = new TokenBlacklistService();
module.exports = tokenBlacklistService;