const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { validateRecommendationRequest, validateUserId } = require('../middleware/validation');

// Import authentication middleware from auth routes
const { authenticateToken, requireAdmin } = require('./auth');

// Rate limiting for recommendation endpoints (protect expensive ML calls)
const recommendationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20, // limit each IP to 20 recommendation requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many recommendation requests. Please wait before requesting more recommendations.'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests, IP for others
    return req.user?.userId || rateLimit.ipKeyGenerator(req, true);
  }
});

// Rate limiting for history endpoints (less restrictive)
const historyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // 60 requests per minute for browsing history
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many history requests. Please wait.'
    },
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req) => {
    return req.user?.userId || rateLimit.ipKeyGenerator(req, true);
  }
});

// Middleware to ensure user can only access their own data
const validateUserAccess = (req, res, next) => {
  const requestedUserId = req.params.userId || req.body.userId;
  const authenticatedUserId = req.user.userId;
  
  // Admin can access any user's data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Regular users can only access their own data
  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You can only access your own recommendation data'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Logging middleware for recommendation tracking
const logRecommendationRequest = (req, res, next) => {
  const { userId, domain, count } = req.body;
  console.log(`🎯 Recommendation request: User ${req.user.username} (${userId}) requesting ${count || 5} ${domain || 'movies'} recommendations`);
  next();
};

// Logging middleware for history access
const logHistoryAccess = (req, res, next) => {
  const { userId } = req.params;
  console.log(`📚 History access: User ${req.user.username} accessing history for user ${userId}`);
  next();
};

// Generate personalized recommendations
router.post('/recommendations', 
  authenticateToken,           // ← Require authentication
  recommendationLimiter,       // ← Apply rate limiting  
  validateRecommendationRequest, // ← Validate request data
  validateUserAccess,          // ← Ensure user can only get their own recommendations
  logRecommendationRequest,    // ← Log the request
  recommendationController.getRecommendations
);

// Get user's recommendation history
router.get('/recommendations/:userId', 
  authenticateToken,           // ← Require authentication
  historyLimiter,             // ← Apply rate limiting (less restrictive)
  validateUserId,             // ← Validate userId parameter
  logHistoryAccess,           // ← Log the access
  recommendationController.getRecommendationHistory
);

// Admin-only endpoint: Get all users' recommendation analytics
  router.get('/recommendations/admin/analytics', 
    authenticateToken,           // ← Require authentication
    requireAdmin,               // ← Admin only
    async (req, res) => {
      try {
        const User = require('../models/User');
        
        // Get user count
        const totalUsers = await User.countDocuments();
        
        // History-based analytics disabled; provide minimal analytics without touching histories
        const recommendationStats = [{ totalRecommendations: 0, uniqueUsers: 0 }];
        
        res.json({
          success: true,
          data: {
            message: 'System analytics retrieved',
            analytics: {
              totalUsers,
              totalRecommendations: recommendationStats[0]?.totalRecommendations || 0,
              activeUsers: recommendationStats[0]?.uniqueUsers || 0,
              systemHealth: {
                database: 'connected',
                mlService: 'checking...' // Could add ML service health check
              }
            }
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to retrieve analytics'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  );

// Health check for recommendation service
router.get('/recommendations/health', async (req, res) => {
  try {
    const axios = require('axios');
    // Check database connection
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check ML service
    let mlStatus = 'disconnected';
    try {
      await axios.get('http://localhost:8000/health', { timeout: 5000 });
      mlStatus = 'connected';
    } catch (error) {
      console.log('ML service health check failed:', error.message);
    }
    
    const overallStatus = dbStatus === 'connected' && mlStatus === 'connected' 
      ? 'healthy' 
      : 'degraded';
    
    res.json({
      success: true,
      data: {
        status: overallStatus,
        services: {
          database: dbStatus,
          mlService: mlStatus,
          api: 'connected'
        },
        capabilities: {
          personalizedRecommendations: mlStatus === 'connected',
          fallbackRecommendations: dbStatus === 'connected',
          userHistory: dbStatus === 'connected'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;