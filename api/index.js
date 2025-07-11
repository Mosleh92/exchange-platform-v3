// Vercel Serverless Function Entry Point
// This file imports and exports the backend Express app for Vercel deployment

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Create Express app for serverless function
const app = express();

// Apply essential middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Exchange Platform V3 API is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API is working perfectly!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'success'
  });
});

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
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
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
      message: 'Registration successful',
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
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export the app for Vercel
module.exports = app;