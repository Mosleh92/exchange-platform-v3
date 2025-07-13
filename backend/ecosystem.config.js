module.exports = {
  apps: [
    {
      name: 'exchange-platform-backend',
      script: 'src/app.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=400'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=400',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Fly.io specific optimizations
      increment_var: 'PORT',
      combine_logs: true,
      merge_logs: true,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_max_memory: 400,
      
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Environment specific settings
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      }
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: 'exchange-platform-backend.fly.dev',
      ref: 'origin/main',
      repo: 'https://github.com/Mosleh92/exchange-platform-v3.git',
      path: '/app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'post-setup': 'npm install && npm run migrate',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'root',
      host: 'exchange-platform-backend-staging.fly.dev',
      ref: 'origin/develop',
      repo: 'https://github.com/Mosleh92/exchange-platform-v3.git',
      path: '/app',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};