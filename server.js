render-deploy-config
# 1. بررسی وضعیت git
git status
git log --oneline -5

# 2. اطمینان از وجود server.js جدید
cat server.js | head -10

# 3. اگر فایل server.js درست نیست، دوباره ایجاد کنید:
cat > server.js << 'EOF'
// server.js - Working version without syntax errors
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Mock currencies
app.get('/api/currencies', (req, res) => {
  const currencies = [
    { id: '1', symbol: 'BTC', name: 'Bitcoin', active: true, price: 45500.00 },
    { id: '2', symbol: 'ETH', name: 'Ethereum', active: true, price: 3200.00 },
    { id: '3', symbol: 'USDT', name: 'Tether USD', active: true, price: 1.00 },
    { id: '4', symbol: 'BNB', name: 'Binance Coin', active: true, price: 320.00 }
  ];
  res.json(currencies);
});

// Mock auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  res.json({
    message: 'Login successful (demo)',
    user: { id: 'demo-123', email, username: 'demo', balance: 50000 },
    token: 'demo-token-' + Date.now()
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  res.status(201).json({
    message: 'User registered (demo)',
    user: { id: 'new-' + Date.now(), email, username, balance: 10000 },
    token: 'demo-token-' + Date.now()
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Debug endpoint
app.get('/api/debug', (req, res) => {
  const frontendPath = path.join(__dirname, 'frontend/dist');
  const exists = fs.existsSync(frontendPath);
  let files = [];
  
  if (exists) {
    try {
      files = fs.readdirSync(frontendPath);
    } catch (e) {
      files = ['error: ' + e.message];
    }
  }
  
  res.json({
    frontendPath,
    exists,
    files,
    __dirname,
    timestamp: new Date().toISOString()
  });
});

// Catch all
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, 'frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ 
        error: 'Frontend not found',
        path: indexPath
      });
    }
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Static files: ${path.join(__dirname, 'frontend/dist')}`);
  console.log(`📡 API endpoints: /api/health, /api/currencies, /api/auth/*`);
});
EOF

# 4. Force add و commit
git add -A
git status

# 5. Commit با timestamp
git commit -m "fix: Working server.js without syntax errors - $(date)"

# 6. Push to main
git push origin main --force-with-lease

# 7. بررسی آخرین commit
git log --oneline -2

# 8. اختیاری: اگر مشکل push دارید
# git pull origin main
# git push origin main
=======
// server.js - Minimal working version
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============ API ROUTES (inline - no external files) ============

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    version: '1.0.0'
  });
});

// Basic API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Exchange Platform API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/currencies',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ],
    timestamp: new Date().toISOString()
  });
});

// Mock currencies endpoint
app.get('/api/currencies', (req, res) => {
  const mockCurrencies = [
    { id: '1', symbol: 'BTC', name: 'Bitcoin', active: true },
    { id: '2', symbol: 'ETH', name: 'Ethereum', active: true },
    { id: '3', symbol: 'USDT', name: 'Tether USD', active: true },
    { id: '4', symbol: 'BNB', name: 'Binance Coin', active: true }
  ];
  res.json(mockCurrencies);
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;
  
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Mock successful registration
  res.status(201).json({
    message: 'User registered successfully (demo mode)',
    user: {
      id: 'demo-user-' + Date.now(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      balance: 10000.00
    },
    token: 'demo-jwt-token-' + Date.now()
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Mock successful login
  res.json({
    message: 'Login successful (demo mode)',
    user: {
      id: 'demo-user-123',
      email: email.toLowerCase(),
      username: 'demo-user',
      balance: 50000.00
    },
    token: 'demo-jwt-token-' + Date.now()
  });
});

// Mock market data
app.get('/api/market/:pair', (req, res) => {
  const { pair } = req.params;
  
  res.json({
    pair,
    lastPrice: 45500.00,
    change24h: 2.5,
    volume: 1250.75,
    high24h: 46000.00,
    low24h: 44500.00,
    timestamp: new Date().toISOString(),
    status: 'demo-mode'
  });
});

// ============ STATIC FILES SERVING ============

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
  maxAge: '1d',
  etag: true,
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Debug endpoint to check static files
app.get('/api/debug/static', (req, res) => {
  const fs = await import('fs');
  const frontendPath = path.join(__dirname, 'frontend/dist');
  
  try {
    const exists = fs.existsSync(frontendPath);
    let files = [];
    
    if (exists) {
      files = fs.readdirSync(frontendPath, { withFileTypes: true }).map(dirent => ({
        name: dirent.name,
        isFile: dirent.isFile(),
        isDirectory: dirent.isDirectory()
      }));
    }
    
    res.json({
      frontendPath,
      exists,
      files,
      currentDir: __dirname,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      frontendPath,
      currentDir: __dirname
    });
  }
});

// ============ CATCH-ALL ROUTE ============

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: ['/api/health', '/api/currencies', '/api/auth/login']
    });
  }
  
  const indexPath = path.join(__dirname, 'frontend/dist/index.html');
  
  // Try to serve index.html
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err.message);
      res.status(404).json({ 
        error: 'Frontend application not found',
        indexPath,
        suggestion: 'Make sure the frontend build completed successfully',
        buildCommand: 'npm run build'
      });
    }
  });
});

// ============ ERROR HANDLING ============

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// ============ SERVER START ============

app.listen(PORT, () => {
  console.log(`🚀 Exchange Platform Server Started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Static files: ${path.join(__dirname, 'frontend/dist')}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/currencies`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/market/:pair`);
  console.log(`\n🌐 Frontend: All other routes serve React app`);
});
 main
