// server.js - Fixed syntax errors
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

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

// ============ API ROUTES ============

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
      'POST /api/auth/register',
      'GET /api/market/:pair'
    ],
    timestamp: new Date().toISOString()
  });
});

// Mock currencies endpoint
app.get('/api/currencies', (req, res) => {
  const mockCurrencies = [
    { id: '1', symbol: 'BTC', name: 'Bitcoin', active: true, price: 45500.00 },
    { id: '2', symbol: 'ETH', name: 'Ethereum', active: true, price: 3200.00 },
    { id: '3', symbol: 'USDT', name: 'Tether USD', active: true, price: 1.00 },
    { id: '4', symbol: 'BNB', name: 'Binance Coin', active: true, price: 320.00 },
    { id: '5', symbol: 'ADA', name: 'Cardano', active: true, price: 0.45 },
    { id: '6', symbol: 'DOT', name: 'Polkadot', active: true, price: 6.50 }
  ];
  res.json(mockCurrencies);
});

// Mock trading pairs
app.get('/api/pairs', (req, res) => {
  const mockPairs = [
    { symbol: 'BTC-USDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING' },
    { symbol: 'ETH-USDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING' },
    { symbol: 'BNB-USDT', baseAsset: 'BNB', quoteAsset: 'USDT', status: 'TRADING' },
    { symbol: 'ADA-USDT', baseAsset: 'ADA', quoteAsset: 'USDT', status: 'TRADING' }
  ];
  res.json(mockPairs);
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;
  
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  // Mock successful registration
  res.status(201).json({
    message: 'User registered successfully (demo mode)',
    user: {
      id: 'demo-user-' + Date.now(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      balance: 10000.00,
      createdAt: new Date().toISOString()
    },
    token: 'demo-jwt-token-' + Date.now()
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Demo credentials
  if (email === 'demo@exchange.com' && password === 'demo123') {
    return res.json({
      message: 'Login successful',
      user: {
        id: 'demo-user-123',
        email: 'demo@exchange.com',
        username: 'demo',
        balance: 50000.00,
        role: 'USER'
      },
      token: 'demo-jwt-token-verified'
    });
  }
  
  // Mock successful login for any other credentials
  res.json({
    message: 'Login successful (demo mode)',
    user: {
      id: 'demo-user-' + Date.now(),
      email: email.toLowerCase(),
      username: email.split('@')[0],
      balance: 25000.00,
      role: 'USER'
    },
    token: 'demo-jwt-token-' + Date.now()
  });
});

// Mock market data
app.get('/api/market/:pair', (req, res) => {
  const { pair } = req.params;
  const [base, quote] = pair.split('-');
  
  // Generate mock price based on pair
  const basePrice = {
    'BTC': 45500,
    'ETH': 3200,
    'BNB': 320,
    'ADA': 0.45,
    'DOT': 6.50
  }[base] || 1.00;
  
  // Add some random variation
  const variation = (Math.random() - 0.5) * 0.1; // ±5%
  const currentPrice = basePrice * (1 + variation);
  const change24h = (Math.random() - 0.5) * 10; // ±5%
  
  res.json({
    pair,
    baseAsset: base,
    quoteAsset: quote,
    lastPrice: parseFloat(currentPrice.toFixed(8)),
    change24h: parseFloat(change24h.toFixed(2)),
    volume24h: parseFloat((Math.random() * 10000).toFixed(2)),
    high24h: parseFloat((currentPrice * 1.05).toFixed(8)),
    low24h: parseFloat((currentPrice * 0.95).toFixed(8)),
    timestamp: new Date().toISOString(),
    status: 'demo-mode'
  });
});

// Mock order book
app.get('/api/orderbook/:pair', (req, res) => {
  const { pair } = req.params;
  
  // Generate mock order book
  const bids = [];
  const asks = [];
  const basePrice = 45500; // Mock BTC price
  
  for (let i = 0; i < 10; i++) {
    bids.push([
      basePrice - (i + 1) * 10, // price
      Math.random() * 5 // quantity
    ]);
    asks.push([
      basePrice + (i + 1) * 10, // price  
      Math.random() * 5 // quantity
    ]);
  }
  
  res.json({
    pair,
    bids: bids.map(([price, qty]) => [parseFloat(price.toFixed(2)), parseFloat(qty.toFixed(6))]),
    asks: asks.map(([price, qty]) => [parseFloat(price.toFixed(2)), parseFloat(qty.toFixed(6))]),
    timestamp: new Date().toISOString()
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
  const frontendPath = path.join(__dirname, 'frontend/dist');
  
  try {
    const exists = fs.existsSync(frontendPath);
    let files = [];
    
    if (exists) {
      files = fs.readdirSync(frontendPath, { withFileTypes: true }).map(dirent => ({
        name: dirent.name,
        isFile: dirent.isFile(),
        isDirectory: dirent.isDirectory(),
        size: dirent.isFile() ? fs.statSync(path.join(frontendPath, dirent.name)).size : null
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

// Demo data endpoint
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Exchange Platform Demo Mode',
    features: [
      'Mock authentication',
      'Sample currency data',
      'Simulated market prices',
      'Demo order book',
      'Frontend integration ready'
    ],
    demoCredentials: {
      email: 'demo@exchange.com',
      password: 'demo123'
    },
    timestamp: new Date().toISOString()
  });
});

// ============ CATCH-ALL ROUTE ============

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        '/api/health',
        '/api/currencies', 
        '/api/pairs',
        '/api/auth/login',
        '/api/auth/register',
        '/api/market/:pair',
        '/api/orderbook/:pair',
        '/api/demo'
      ]
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
  console.log(`🚀 Exchange Platform Server Started Successfully`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Static files: ${path.join(__dirname, 'frontend/dist')}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured' : 'Demo Mode'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`\n📡 Available API Endpoints:`);
  console.log(`   GET  /api/health        - Server health check`);
  console.log(`   GET  /api/currencies    - List all currencies`);
  console.log(`   GET  /api/pairs         - Trading pairs`);
  console.log(`   POST /api/auth/login    - User login`);
  console.log(`   POST /api/auth/register - User registration`);
  console.log(`   GET  /api/market/:pair  - Market data`);
  console.log(`   GET  /api/orderbook/:pair - Order book`);
  console.log(`   GET  /api/demo          - Demo info`);
  console.log(`\n🌐 Frontend: All other routes serve React app`);
  console.log(`\n🔑 Demo Credentials: demo@exchange.com / demo123`);
});
