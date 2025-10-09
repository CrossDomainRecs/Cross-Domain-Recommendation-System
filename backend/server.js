const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const config = require('./config');

const app = express();

// Middleware
// app.use(cors());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.29.92:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Import routes
const mediaRoutes = require('./routes/media');
const recommendationRoutes = require('./routes/recommendations');
const authRoutes = require('./routes/auth');
const favouritesRoutes = require('./routes/favourites');
const userPreferencesRoutes = require('./routes/userPreferences');
const userHistoryRoutes = require('./routes/userHistory');

// Use routes
app.use('/api', mediaRoutes);
app.use('/api', recommendationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', favouritesRoutes);
app.use('/api', userPreferencesRoutes);
app.use('/api', userHistoryRoutes);

// Test endpoints
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '🚀 Cross-Domain Recommender Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Status endpoint (fixed - removed duplicate)
app.get('/api/status', (req, res) => {
  res.json({
    status: '🚀 Cross-Domain Recommender API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (register, login)',
      movies: '/api/movies (GET all, GET by ID)',
      books: '/api/books (GET all, GET by ID)', 
      music: '/api/music (GET all, GET by ID)',
      recommendations: '/api/recommendations (POST generate, GET history)',
      test: '/api/test',
      status: '/api/status'
    },
    database: mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌',
    mlService: 'Flask ML service on port 8000 📡'
  });
});

// Database connection
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log(`✅ MongoDB connected successfully to ${config.MONGODB_URI}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  });
});

// Server startup
app.listen(config.PORT, '0.0.0.0',() => {
  console.log(`🎯 Backend server running on http://localhost:${config.PORT}`);
  console.log(`📊 Test endpoint: http://localhost:${config.PORT}/api/test`);
  console.log(`Frontend client URL: ${config.CLIENT_URL}`);
  console.log(`📋 Status endpoint: http://localhost:${config.PORT}/api/status`);
  console.log(`JWT Secret: ${config.JWT_SECRET ? 'Loaded' : 'Missing'}`);
  console.log(`🎬 Recommendations: http://localhost:${config.PORT}/api/recommendations`);
});
