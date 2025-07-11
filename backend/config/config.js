module.exports = {
  "development": {
    "username": process.env.DB_USER || "postgres",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME || "exchange_platform",
    "host": process.env.DB_HOST || "localhost",
    "port": process.env.DB_PORT || 5432,
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": false
    },
    "pool": {
      "max": 20,
      "min": 5,
      "acquire": 30000,
      "idle": 10000
    }
  },
  "test": {
    "username": process.env.DB_USER || "postgres",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME_TEST || "exchange_platform_test",
    "host": process.env.DB_HOST || "localhost",
    "port": process.env.DB_PORT || 5432,
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": false
    }
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    },
    "pool": {
      "max": 30,
      "min": 10,
      "acquire": 60000,
      "idle": 20000
    }
  }
}