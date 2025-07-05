const redis = require('redis');

let client;

// Only create Redis client if not in test environment
if (process.env.NODE_ENV !== 'test') {
  client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.connect().catch(console.error);
}

module.exports = {
  async get(key) {
    if (!client) return null;
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      return null;
    }
  },
  async set(key, value, ttl = 60) {
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (err) {}
  }
}; 