# 1. ایجاد ساختار فولدرها
mkdir -p lib routes scripts prisma

# 2. ایجاد lib/db.js
cat > lib/db.js << 'EOF'
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
EOF

# 3. ایجاد routes/auth.js
cat > routes/auth.js << 'EOF'
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/db.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        balance: 10000.00
      },
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        createdAt: true
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        balance: user.balance
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

export default router;
EOF

# 4. ایجاد routes/exchange.js
cat > routes/exchange.js << 'EOF'
import express from 'express';
import { prisma } from '../lib/db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Get all currencies
router.get('/currencies', async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      where: { active: true },
      orderBy: { symbol: 'asc' }
    });
    res.json(currencies);
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Health check for exchange
router.get('/health', async (req, res) => {
  try {
    const currencyCount = await prisma.currency.count();
    res.json({
      status: 'OK',
      currencies: currencyCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Basic market data
router.get('/market/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    res.json({
      pair,
      message: 'Market data endpoint - coming soon',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

export default router;
EOF

# 5. تحديث server.js بدون dependency مشکل‌ساز
cat > server.js << 'EOF'
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

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes (با error handling)
try {
  const authRoutes = await import('./routes/auth.js');
  const exchangeRoutes = await import('./routes/exchange.js');
  
  app.use('/api/auth', authRoutes.default);
  app.use('/api/exchange', exchangeRoutes.default);
} catch (error) {
  console.warn('Some API routes failed to load:', error.message);
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Basic health without database for now
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node_env: process.env.NODE_ENV,
      database_url: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message
    });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'frontend/dist'), {
  maxAge: '1d',
  etag: true
}));

// Catch all
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(__dirname, 'frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).json({ 
        error: 'Frontend not found',
        suggestion: 'Check if build completed successfully'
      });
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Exchange Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 Static files: ${path.join(__dirname, 'frontend/dist')}`);
});
EOF

# 6. تحديث package.json
cat > package.json << 'EOF'
{
  "name": "exchange-platform-v3",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm ci && npm run build",
    "build:backend": "cd backend && npm ci"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 7. ایجاد prisma schema (ساده)
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String
  balance   Decimal  @default(0.00) @db.Decimal(20, 8)
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("users")
}

model Currency {
  id        String  @id @default(cuid())
  symbol    String  @unique
  name      String
  decimals  Int     @default(8)
  active    Boolean @default(true)
  createdAt DateTime @default(now())
  
  @@map("currencies")
}

enum UserRole {
  USER
  ADMIN
}
EOF

# 8. Commit همه فایل‌ها
git add .
git commit -m "fix: Add all missing files for deployment"
git push origin main
