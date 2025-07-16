require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '24h'
  },
  db: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10
    }
  },
  redis: {
    url: process.env.REDIS_URL,
    ttl: 3600
  },
  security: {
    bcryptRounds: 10,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  }
};