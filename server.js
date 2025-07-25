const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


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

 feature/exchange-api
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Serve static files
=======
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

// Serve static files from frontend build
 main
const frontendPath = path.join(__dirname, 'frontend', 'dist')
app.use(express.static(frontendPath))

// Fallback for React Router (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html')
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
 feature/exchange-api
    res.status(404).send('Not Found');
=======
    res.send('Frontend build not found.')
 main
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Exchange Platform V3 running on port ${PORT}`)
})
