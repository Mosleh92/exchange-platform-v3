// Serverless API entry point for Vercel deployment
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Set production environment for serverless
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

let app;

try {
  // Try to import the full backend application
  const backendPath = path.join(__dirname, '..', 'backend', 'src', 'app.js');
  
  if (fs.existsSync(backendPath)) {
    console.log('Loading full backend application...');
    const { app: backendApp } = require(backendPath);
    app = backendApp;
  } else {
    console.log('Backend not found, creating minimal API...');
    throw new Error('Backend app not found');
  }
} catch (error) {
  console.warn('Failed to load backend app, creating minimal fallback:', error.message);
  
  // Fallback minimal Express app if backend is not available
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  
  app = express();
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  
  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  }));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Exchange Platform V3 API is running (minimal mode)!',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      mode: 'minimal'
    });
  });
  
  // Health check without /api prefix for Vercel
  app.get('/health', (req, res) => {
    res.redirect('/api/health');
  });
  
  // Basic API test endpoint
  app.get('/api/test', (req, res) => {
    res.json({
      message: 'Minimal API is working!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'success',
      mode: 'minimal'
    });
  });
  
  // Basic status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      data: {
        systemStatus: 'operational',
        uptime: process.uptime(),
        mode: 'minimal'
      }
    });
  });
  
  // Basic auth endpoints
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email && password) {
      res.json({
        success: true,
        message: 'Login successful (demo mode)',
        token: 'demo-jwt-token',
        user: {
          id: 1,
          email: email,
          name: 'Demo User'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }
  });
  
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    
    if (email && password && name) {
      res.json({
        success: true,
        message: 'Registration successful (demo mode)',
        user: {
          id: 2,
          email: email,
          name: name
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
  });
  
  // Error handling
  app.use((err, req, res, next) => {
    console.error('API Error:', err.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Something went wrong!',
      mode: 'minimal'
    });
  });
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      mode: 'minimal'
    });
  });
}

// Add serverless-specific configuration
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  // Ensure graceful handling in serverless environment
  app.use((req, res, next) => {
    // Set response timeout for serverless
    res.timeout = 25000; // 25 seconds (Vercel timeout is 30s)
    next();
  });
}

// Export for serverless deployment
module.exports = app;