require('dotenv').config();

module.exports = {
 copilot/fix-dd7d2c3e-0e1b-4fcd-b4f9-18a95ca70cef
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key'
=======
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
 main
};