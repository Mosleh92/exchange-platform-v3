const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const EnvironmentValidationService = require('../services/environmentValidationService');

// Validate environment on startup
const envValidator = new EnvironmentValidationService();
const isValidConfig = envValidator.logValidationResults();

if (!isValidConfig && process.env.NODE_ENV === 'production') {
    console.error('❌ Critical JWT configuration errors in production environment');
    process.exit(1);
}

const securityConfig = (app) => {
    // Rate limiting
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 دقیقه
        max: 100, // حداکثر 100 درخواست
        message: {
            success: false,
            message: 'تعداد درخواست‌های شما از حد مجاز گذشته است، لطفاً بعداً تلاش کنید'
        },
        standardHeaders: true,
        legacyHeaders: false
    }));

    // امنیت Headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        crossOriginEmbedderPolicy: false
    }));

    // جلوگیری از NoSQL Injection
    app.use(mongoSanitize());

    // CORS
    app.use((req, res, next) => {
        const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
        const origin = req.headers.origin;
        
        if (allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // Security headers
    app.use((req, res, next) => {
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
};

// Export both new and existing configurations for backward compatibility
const configureCors = () => {
    const cors = require('cors');
    // Parse and validate allowed origins
    const rawOrigins = process.env.ALLOWED_ORIGINS;
    let allowedOrigins = [];

    if (rawOrigins) {
        allowedOrigins = rawOrigins
            .split(',')
            .map(origin => origin.trim())
            .filter(origin => {
                // Remove empty strings and validate URLs
                if (!origin || origin === '*') return false;
                
                try {
                    new URL(origin);
                    return true;
                } catch {
                    console.warn(`Invalid origin in ALLOWED_ORIGINS: ${origin}`);
                    return false;
                }
            });
    }

    // Default to localhost for development
    if (allowedOrigins.length === 0) {
        allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
    }

    return cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            
            // Log and deny unauthorized origins
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Tenant-ID',
            'X-CSRF-Token'
        ],
        exposedHeaders: ['X-Total-Count'],
        maxAge: 86400 // 24 hours
    });
};

// **اصلاح شده**: Secure Content Security Policy
const configureCSP = () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                
                // Scripts
                scriptSrc: [
                    "'self'",
                    ...(isDevelopment ? ["'unsafe-eval'"] : []),
                    // Add specific CDN domains if needed
                    "https://cdn.jsdelivr.net",
                    "https://unpkg.com"
                ],
                
                // Styles - **اصلاح شده**: حذف unsafe-inline
                styleSrc: [
                    "'self'",
                    // Use nonce or hash for inline styles
                    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // empty style hash
                    "https://fonts.googleapis.com",
                    "https://cdn.jsdelivr.net"
                ],
                
                // Images
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https:"
                ],
                
                // Fonts
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "https://cdn.jsdelivr.net"
                ],
                
                // Connect (API calls)
                connectSrc: [
                    "'self'",
                    "ws://localhost:*",
                    "wss://localhost:*",
                    ...(isDevelopment ? ["http://localhost:*"] : [])
                ],
                
                // Object and embed
                objectSrc: ["'none'"],
                embedSrc: ["'none'"],
                
                // Media
                mediaSrc: ["'self'"],
                
                // Workers
                workerSrc: ["'self'", "blob:"],
                
                // Child frames
                childSrc: ["'none'"],
                frameSrc: ["'none'"],
                
                // Ancestors (prevent clickjacking)
                frameAncestors: ["'none'"],
                
                // Base URI
                baseUri: ["'self'"],
                
                // Form action
                formAction: ["'self'"],
                
                // Upgrade insecure requests in production
                ...(isDevelopment ? {} : { upgradeInsecureRequests: [] })
            },
            reportOnly: false
        },
        
        // **اصلاح شده**: Additional security headers
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        
        // Referrer Policy
        referrerPolicy: {
            policy: ['same-origin']
        },
        
        // Permissions Policy
        permissionsPolicy: {
            camera: [],
            microphone: [],
            geolocation: [],
            fullscreen: ['self']
        }
    });
};

// **جدید**: Rate limiting configuration
const configureRateLimit = () => {
    const rateLimit = require('express-rate-limit');
    
    return {
        // Global rate limit
        global: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs
            message: {
                success: false,
                message: 'تعداد درخواست‌ها از حد مجاز تجاوز کرده است'
            },
            standardHeaders: true,
            legacyHeaders: false,
            // Skip successful requests
            skipSuccessfulRequests: true
        }),
        
        // Auth endpoints rate limit
        auth: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // limit each IP to 10 requests per windowMs
            message: {
                success: false,
                message: 'تعداد تلاش‌های ورود از حد مجاز تجاوز کرده است'
            },
            standardHeaders: true,
            legacyHeaders: false
        }),
        
        // API endpoints rate limit
        api: rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500, // limit each IP to 500 requests per windowMs
            message: {
                success: false,
                message: 'تعداد درخواست‌های API از حد مجاز تجاوز کرده است'
            },
            standardHeaders: true,
            legacyHeaders: false
        })
    };
};

// **جدید**: Input validation middleware
const configureInputValidation = () => {
    const mongoSanitize = require('express-mongo-sanitize');
    
    return {
        // Sanitize MongoDB queries
        mongoSanitize: mongoSanitize({
            replaceWith: '_'
        })
        // XSS protection will be handled by xss-clean middleware in server.js
    };
};

// Helper function to sanitize objects - REMOVED as xss-clean will be used as middleware
/*
const sanitizeObject = (obj) => {
    // ... (previous implementation) ...
};
*/

module.exports = {
    securityConfig, // New main function
    configureCors,
    configureCSP,
    configureRateLimit,
    configureInputValidation
};
