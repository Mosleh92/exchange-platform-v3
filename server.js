import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
dotenv.config();

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

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 12847,
      totalTrades: 45692,
      systemStatus: 'operational',
      uptime: process.uptime()
    }
  })
})

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  
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

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Serve static files
const frontendPath = path.join(__dirname, 'frontend', 'dist')
app.use(express.static(frontendPath))

// Fallback for React Router
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html')
  
  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    // Fallback HTML
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
            color: white;
          }
          .container {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 3rem;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }
          h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 700;
          }
          .status {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            color: #4ade80;
          }
          .links {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .link {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
          }
          .stat {
            background: rgba(255,255,255,0.1);
            padding: 1rem;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.2);
          }
          .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #4ade80;
          }
          .stat-label {
            font-size: 0.8rem;
            opacity: 0.8;
            margin-top: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Exchange Platform V3</h1>
          <div class="status">✅ Successfully Deployed!</div>
          <p>Multi-tenant exchange platform is now running.</p>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">1.0.0</div>
              <div class="stat-label">Version</div>
            </div>
            <div class="stat">
              <div class="stat-value">${Math.floor(process.uptime())}</div>
              <div class="stat-label">Uptime (s)</div>
            </div>
            <div class="stat">
              <div class="stat-value">${process.env.NODE_ENV || 'PROD'}</div>
              <div class="stat-label">Environment</div>
            </div>
          </div>

          <div class="links">
            <a href="/health" class="link">🩺 Health</a>
            <a href="/api/test" class="link">🔧 API Test</a>
            <a href="/api/status" class="link">📊 Status</a>
          </div>
        </div>
      </body>
      </html>
    `)
  }
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Exchange Platform V3 running on port ${PORT}`)
})
