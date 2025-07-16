/**
 * Production Configuration
 * Optimized settings for high-performance production environment
 */
module.exports = {
  // Database Configuration
  database: {
    url: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
      readPreference: 'secondaryPreferred',
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000
      },
      // Connection pool settings
      poolSize: 20,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      // SSL settings
      ssl: process.env.NODE_ENV === 'production',
      sslValidate: true,
      // Replica set settings
      replicaSet: process.env.MONGODB_REPLICA_SET,
      readPreference: 'secondaryPreferred'
    }
  },

  // Security Configuration
  security: {
    // JWT Settings
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
      refreshExpiresIn: '7d',
      issuer: 'exchange-platform',
      audience: 'exchange-platform-users'
    },
    
    // Rate Limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'RATE_LIMIT_ERROR',
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      // Stricter limits for sensitive endpoints
      auth: {
        windowMs: 15 * 60 * 1000,
        max: 5
      },
      api: {
        windowMs: 15 * 60 * 1000,
        max: 1000
      }
    },

    // CORS Settings
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'https://exchangeplatform.com',
        'https://www.exchangeplatform.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-Request-ID',
        'X-Client-Version'
      ]
    },

    // Helmet Security Settings
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      frameguard: {
        action: 'deny'
      }
    }
  },

  // Performance Configuration
  performance: {
    // Compression
    compression: {
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    },

    // Caching
    cache: {
      // Redis configuration
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
      },
      
      // Memory cache settings
      memory: {
        max: 100,
        ttl: 60000, // 1 minute
        updateAgeOnGet: true
      }
    },

    // Connection Pool
    connectionPool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transports: [
      {
        type: 'file',
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      },
      {
        type: 'file',
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }
    ],
    
    // Request logging
    morgan: {
      format: 'combined',
      options: {
        skip: (req, res) => res.statusCode < 400
      }
    }
  },

  // Monitoring Configuration
  monitoring: {
    // Health check settings
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      threshold: 3
    },

    // Metrics collection
    metrics: {
      enabled: true,
      interval: 60000, // 1 minute
      endpoints: {
        memory: true,
        cpu: true,
        database: true,
        requests: true
      }
    },

    // Alerting
    alerts: {
      enabled: true,
      thresholds: {
        memory: 80, // 80% memory usage
        cpu: 70, // 70% CPU usage
        responseTime: 2000, // 2 seconds
        errorRate: 5 // 5% error rate
      }
    }
  },

  // SSL/TLS Configuration
  ssl: {
    enabled: process.env.NODE_ENV === 'production',
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH,
    ca: process.env.SSL_CA_PATH,
    options: {
      secureProtocol: 'TLSv1_2_method',
      ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256'
      ].join(':'),
      honorCipherOrder: true,
      requestCert: false,
      rejectUnauthorized: false
    }
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    },
    store: {
      type: 'mongo',
      url: process.env.MONGODB_URI,
      collection: 'sessions',
      ttl: 24 * 60 * 60 // 24 hours
    }
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@exchangeplatform.com',
    templates: {
      path: './templates/email',
      defaultLanguage: 'en'
    }
  },

  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_FROM_NUMBER
    }
  },

  // File Upload Configuration
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    }
  },

  // API Configuration
  api: {
    version: '3.0.0',
    baseUrl: process.env.API_BASE_URL || 'https://api.exchangeplatform.com',
    docs: {
      enabled: true,
      path: '/api-docs'
    },
    pagination: {
      defaultLimit: 20,
      maxLimit: 100
    }
  },

  // Background Jobs Configuration
  jobs: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  },

  // WebSocket Configuration
  websocket: {
    cors: {
      origin: process.env.WS_ALLOWED_ORIGINS?.split(',') || [
        'https://exchangeplatform.com'
      ],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
  },

  // Feature Flags
  features: {
    p2p: true,
    remittance: true,
    multiCurrency: true,
    advancedOrders: true,
    apiAccess: true,
    whiteLabel: false,
    twoFactorAuth: true,
    auditLogging: true,
    realTimeNotifications: true
  }
}; 