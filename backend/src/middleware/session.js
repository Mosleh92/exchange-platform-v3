const session = require("express-session");
const RedisStore = require("connect-redis").default;
const Redis = require("ioredis");
const logger = require("../utils/logger");

// Initialize Redis client only if not in test environment
let redisClient;
let sessionConfig;

if (process.env.NODE_ENV === "test") {
  // Use memory store for tests
  sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: "sessionId", // Change default connect.sid
  };
} else {
  // Use Redis store for production/development
  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

  redisClient.on("error", (err) => {
    if (logger && logger.error) {
      logger.error("Redis connection error:", err);
    } else {
      console.error("Redis connection error:", err);
    }
  });

  sessionConfig = {
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: "sessionId", // Change default connect.sid
  };
}

// Session middleware
const sessionMiddleware = session(sessionConfig);

// Session error handler
const sessionErrorHandler = (err, req, res, next) => {
  if (logger && logger.error) {
    logger.error("Session error:", err);
  } else {
    console.error("Session error:", err);
  }

  if (err.code === "ECONNREFUSED") {
    return res.status(500).json({
      success: false,
      message: "خطا در اتصال به سرور",
      code: "SESSION_ERROR",
    });
  }

  next(err);
};

// Session cleanup on logout
const cleanupSession = (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        if (logger && logger.error) {
          logger.error("Session cleanup error:", err);
        } else {
          console.error("Session cleanup error:", err);
        }
      }
      res.clearCookie("sessionId");
      next();
    });
  } else {
    next();
  }
};

module.exports = {
  sessionMiddleware,
  sessionErrorHandler,
  cleanupSession,
};
