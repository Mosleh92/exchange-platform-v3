// server.js - Fixed static file serving
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Static files serving with proper MIME types
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// API Routes
import authRoutes from './routes/auth.js';
import exchangeRoutes from './routes/exchange.js';

app.use('/api/auth', authRoutes);
app.use('/api/exchange', exchangeRoutes);

// Health check with detailed info
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if frontend files exist
    const fs = await import('fs');
    const frontendPath = path.join(__dirname, 'frontend/dist');
    const indexExists = fs.existsSync(path.join(frontendPath, 'index.html'));
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      frontend: indexExists ? 'found' : 'missing',
      uptime: process.uptime(),
      node_env: process.env.NODE_ENV,
      paths: {
        root: __dirname,
        frontend: frontendPath,
        indexFile: path.join(frontendPath, 'index.html')
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Debug route to check files
app.get('/api/debug/files', (req, res) => {
  const fs = require('fs');
  const frontendPath = path.join(__dirname, 'frontend/dist');
  
  try {
    const files = fs.readdirSync(frontendPath, { recursive: true });
    res.json({
      frontendPath,
      files: files.map(file => ({
        name: file,
        path: path.join(frontendPath, file),
        exists: fs.existsSync(path.join(frontendPath, file))
      }))
    });
  } catch (error) {
    res.json({
      error: error.message,
      frontendPath,
      exists: fs.existsSync(frontendPath)
    });
  }
});

// Catch all handler - MUST be last
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const indexPath = path.join(__dirname, 'frontend/dist/index.html');
  console.log('Serving index.html for:', req.path);
  console.log('Index file path:', indexPath);
  
  // Check if file exists
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not found',
      path: indexPath,
      suggestion: 'Run build command to generate frontend files'
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message 
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Exchange Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`📁 Frontend path: ${path.join(__dirname, 'frontend/dist')}`);
});
