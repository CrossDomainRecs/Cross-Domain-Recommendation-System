const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const mediaRoutes = require('./routes/media');

const recommendationRoutes = require('./routes/recommendations');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

// Use routes

app.use('/api', mediaRoutes);
app.use('/api', recommendationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/auth', authRoutes);

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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cross-domain-recs';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🎯 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📋 Status endpoint: http://localhost:${PORT}/api/status`);
  console.log(`🎬 Recommendations: http://localhost:${PORT}/api/recommendations`);
});
