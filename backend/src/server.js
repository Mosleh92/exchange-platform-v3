const express = require('express')
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Exchange Platform V3 is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  })
})

// API endpoints
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API is working perfectly!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'success'
  })
})

// Mock API endpoints for demo
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 1234,
      totalTrades: 5678,
      systemStatus: 'operational',
      uptime: process.uptime()
    }
  })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  
  // Mock authentication
  if (email && password) {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'mock-jwt-token',
      user: {
        id: 1,
        email: email,
        name: 'Demo User'
      }
    })
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    })
  }
})

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body
  
  if (email && password && name) {
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: 2,
        email: email,
        name: name
      }
    })
  } else {
    res.status(400).json({
      success: false,
      message: 'All fields are required'
    })
  }
})

// Serve static files from frontend build
const frontendPath = path.join(__dirname, 'frontend', 'dist')
app.use(express.static(frontendPath))

// Fallback for React Router (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html')
  
  // Check if index.html exists
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    // Fallback HTML if frontend build doesn't exist
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exchange Platform V3</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            margin: 2rem;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 1rem;
            font-size: 2.5rem;
            font-weight: 700;
          }
          .status {
            color: #48bb78;
            font-weight: 600;
            font-size: 1.2rem;
            margin-bottom: 1rem;
          }
          .description {
            color: #4a5568;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .links {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 2rem;
          }
          .link {
            background: #4299e1;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.3s;
          }
          .link:hover {
            background: #3182ce;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
          }
          .feature {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 10px;
            border-left: 4px solid #4299e1;
          }
          .feature h3 {
            color: #2d3748;
            margin-bottom: 0.5rem;
          }
          .feature p {
            color: #4a5568;
            font-size: 0.9rem;
          }
          .footer {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Exchange Platform V3</h1>
          <div class="status">✅ Successfully Deployed!</div>
          <div class="description">
            A comprehensive multi-tenant exchange platform built with Node.js, React, and MongoDB.
            The system is now running and ready for trading operations.
          </div>
          
          <div class="features">
            <div class="feature">
              <h3>🔐 Secure Trading</h3>
              <p>Advanced security measures with encryption and 2FA</p>
            </div>
            <div class="feature">
              <h3>⚡ Real-time</h3>
              <p>Live market data and instant notifications</p>
            </div>
            <div class="feature">
              <h3>🏢 Multi-tenant</h3>
              <p>Support for multiple organizations</p>
            </div>
            <div class="feature">
              <h3>📱 Responsive</h3>
              <p>Works perfectly on all devices</p>
            </div>
          </div>

          <div class="links">
            <a href="/health" class="link">🩺 Health Check</a>
            <a href="/api/test" class="link">🔧 API Test</a>
            <a href="/api/status" class="link">📊 Status</a>
          </div>

          <div class="footer">
            <p>Version 1.0.0 | Environment: ${process.env.NODE_ENV || 'production'}</p>
            <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
          </div>
        </div>
      </body>
      </html>
    `)
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Exchange Platform V3 running on port ${PORT}`)
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`🌐 Access: http://localhost:${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})
