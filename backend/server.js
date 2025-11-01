const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========================================================================
// 🔧 DEPLOYMENT MODE TOGGLE - CHANGE THIS ONE LINE!
// ========================================================================
// Set to 'local' for local development or 'production' for deployment
const DEPLOYMENT_MODE = 'local'; // Change to 'production' when deploying
// ========================================================================

const isLocal = DEPLOYMENT_MODE === 'local';
const isProduction = DEPLOYMENT_MODE === 'production';

console.log(`\n${'='.repeat(60)}`);
console.log(`🚀 Running in ${DEPLOYMENT_MODE.toUpperCase()} mode`);
console.log(`${'='.repeat(60)}\n`);

// ========================
// Proxy Settings
// ========================
if (isProduction) {
    app.set('trust proxy', 1);
    console.log('✅ Proxy trusted (Production mode)');
}

// ========================
// Uploads directory
// ========================
const uploadsDir = path.join(__dirname, 'uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads/profiles directory');
}

// ========================
// Flask API URL
// ========================
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5001';

// ========================
// Security middleware with CSP
// ========================
console.log('🔒 Configuring security headers...');

if (isLocal) {
    // 🏠 LOCAL DEVELOPMENT - NO CSP restrictions
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: false,
        })
    );
    console.log('✅ Security: All CSP disabled for local development');
} else {
    // 🌐 PRODUCTION - Strict security with CSP
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: "cross-origin" },
            contentSecurityPolicy: {
                useDefaults: false,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    connectSrc: ["'self'", FLASK_API_URL],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "blob:",
                        "https:",
                        "http:",
                    ],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    fontSrc: ["'self'", "data:"],
                    frameSrc: ["'self'"],
                    workerSrc: ["'self'", "blob:"],
                    mediaSrc: ["'self'", "data:", "https:", "http:", "blob:"],
                },
            },
        })
    );
    console.log('✅ Security: CSP enabled (production)');
}

// ========================
// CORS Configuration
// ========================
const allowedOrigins = isLocal
    ? [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
      ]
    : [
          process.env.FRONTEND_URL,
          process.env.BACKEND_URL,
      ].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1 || isLocal) {
                callback(null, true);
            } else {
                console.warn('⚠️  Blocked by CORS:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

console.log(`✅ CORS allowed origins: ${allowedOrigins.join(', ')}`);

// ========================
// Rate limiting
// ========================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isLocal ? 1000 : 100,
});
app.use('/api/', limiter);

// ========================
// Body parsing
// ========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================
// Serve uploaded files
// ========================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// MongoDB connection
// ========================
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ========================
// API Routes
// ========================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/users', require('./routes/users'));

// ========================
// Health check
// ========================
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'RecLab Node.js Backend API',
        timestamp: new Date().toISOString(),
        environment: DEPLOYMENT_MODE,
    });
});

// ========================
// Serve frontend build
// ========================
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log('✅ Serving frontend from backend');
    app.use((req, res, next) => {
        if (
            req.path.startsWith('/api') ||
            req.path.startsWith('/uploads') ||
            req.path.startsWith('/health')
        ) {
            return next();
        }
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
        res.status(404).send('Frontend not found');
    });
} else {
    console.log('⚠️  Frontend build not found. Run: cd frontend && npm run build');
}

// ========================
// Error handling middleware
// ========================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: isLocal ? err.message : 'Internal server error',
        },
        timestamp: new Date().toISOString(),
    });
});

// ========================
// Start server
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 RecLab Backend Server running on port ${PORT}`);
    console.log(`   Mode: ${DEPLOYMENT_MODE.toUpperCase()}`);
    console.log(`   Flask ML API: ${FLASK_API_URL}`);
    console.log(`   MongoDB: ${process.env.MONGODB_URI?.includes('localhost') ? 'Local' : 'Cloud'}`);
    console.log(`   CORS: ${allowedOrigins.join(', ')}`);
    console.log(`   Rate limit: ${isLocal ? '1000' : '100'} requests per 15min`);
    console.log(`   CSP: ${isLocal ? 'DISABLED (local dev)' : 'ENABLED (production)'}`);
    console.log(`   Uploads directory: ${uploadsDir}`);
    console.log(`   Frontend build: ${fs.existsSync(frontendPath) ? '✅ Found' : '⚠️  Not found'}`);
    console.log('='.repeat(60));
});

module.exports = app;