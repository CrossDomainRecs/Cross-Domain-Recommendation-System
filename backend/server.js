const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ========================
// Create uploads directory
// ========================
const uploadsDir = path.join(__dirname, 'uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads/profiles directory');
}

// ========================
// Security middleware with CSP
// ========================
const isDevelopment = process.env.NODE_ENV !== 'production';
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5001';

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://www.gstatic.com",
          "https://www.googleapis.com",
          "https://apis.google.com",
          "https://www.googletagmanager.com",
          "https://www.google.com",
        ],
        connectSrc: [
          "'self'",
          FLASK_API_URL,
          "http://localhost:5000",
          "http://localhost:5001",
          "http://localhost:5173",
          "ws://localhost:5173",
          "wss:",
          "https://firestore.googleapis.com",
          "https://firebase.googleapis.com",
          "https://www.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http:",
          "blob:",
          "https://m.media-amazon.com",
          "https://images-na.ssl-images-amazon.com",
          "https://ui-avatars.com",
          "https://api.dicebear.com",
          "https://res.cloudinary.com",
          "https://www.googleusercontent.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        frameSrc: [
          "'self'",
          "https://apis.google.com",
          "https://accounts.google.com",
          "https://reclab-6493d.firebaseapp.com",
          "https://reclab-6493d.web.app",
        ],
        workerSrc: ["'self'", "blob:"],
        mediaSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      },
    },
  })
);



// ========================
// CORS Configuration
// ========================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://reclab-frontend.onrender.com',
    'https://reclab-production.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || origin.includes('onrender.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========================
// Rate limiting
// ========================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
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
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

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
        environment: process.env.NODE_ENV || 'development'
    });
});

// ========================
// Serve frontend production build
// ========================
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
    // Serve static files
    app.use(express.static(frontendPath));
    console.log('✅ Serving frontend from backend');
    
    // SPA Fallback - Must be AFTER API routes
    app.use((req, res, next) => {
        // Skip API and uploads routes
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
            return next();
        }
        
        // Send index.html for all other routes
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
            message: isDevelopment ? err.message : 'Internal server error'
        },
        timestamp: new Date().toISOString()
    });
});

// ========================
// Start server
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 RecLab Backend Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Flask ML API: ${FLASK_API_URL}`);
    console.log(`   MongoDB: ${process.env.MONGODB_URI.includes('localhost') ? 'Local' : 'Cloud'}`);
    console.log(`   CORS allowed: localhost:3000, localhost:5173, localhost:5174, localhost:5000`);
    console.log(`   Uploads directory: ${uploadsDir}`);
    console.log(`   Frontend build: ${fs.existsSync(frontendPath) ? '✅ Found' : '⚠️  Not found'}`);
    console.log('='.repeat(60));
});

module.exports = app;
