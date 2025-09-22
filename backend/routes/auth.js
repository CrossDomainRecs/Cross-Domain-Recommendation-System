const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Rate limiting for auth endpoints (prevent brute force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => {
    return rateLimit.ipKeyGenerator(request, true);
  }
});

// Input validation middleware
const validateRegister = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email must be less than 100 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('preferences.genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array'),
  body('preferences.domains')
    .optional()
    .isArray()
    .withMessage('Domains must be an array')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .trim()
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Register new user
router.post('/register', 
  authLimiter,
  validateRegister,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, preferences } = req.body;

      // Check if user already exists (with detailed logging)
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });
      
      if (existingUser) {
        const conflictField = existingUser.email === email ? 'email' : 'username';
        console.log(`🚫 Registration failed: ${conflictField} already exists`);
        
        return res.status(409).json({ 
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: `User already exists with this ${conflictField}`,
            field: conflictField
          },
          timestamp: new Date().toISOString()
        });
      }

      // Hash password with higher salt rounds for production
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user with validated preferences
      const user = new User({
        username: username.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        preferences: preferences || { 
          genres: [], 
          domains: ['movies'] 
        }
      });

      await user.save();
      console.log(`✅ New user registered: ${user.username} (${user.email})`);

      // Create JWT token with role information
      const token = jwt.sign(
        { 
          userId: user._id,
          username: user.username,
          role: user.role
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          message: 'User registered successfully',
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            created_at: user.created_at
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Registration error:', error.message);
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_KEY',
            message: `${field} already exists`,
            field: field
          },
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Registration failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Login user
router.post('/login', 
  authLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user with case-insensitive email
      const user = await User.findOne({ 
        email: email.toLowerCase() 
      }).select('+password'); // Explicitly include password
      
      if (!user) {
        console.log(`🚫 Login failed: User not found for email ${email}`);
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log(`🚫 Login failed: Invalid password for ${user.username}`);
        return res.status(401).json({ 
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Update last login timestamp (optional enhancement)
      user.last_login = new Date();
      await user.save();

      console.log(`✅ Login successful: ${user.username} (${user.email})`);

      // Create JWT token with enhanced payload
      const token = jwt.sign(
        { 
          userId: user._id,
          username: user.username,
          role: user.role,
          preferences: user.preferences
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          message: 'Login successful',
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            preferences: user.preferences,
            last_login: user.last_login
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Login error:', error.message);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Login failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// JWT Verification middleware (export this for other routes)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required'
      },
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('🚫 Token verification failed:', err.message);
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    req.user = decoded;
    next();
  });
};

// Optional: Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin access required'
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Token refresh endpoint (optional but recommended)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const newToken = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role,
        preferences: user.preferences
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        message: 'Token refreshed successfully',
        token: newToken
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'Failed to refresh token'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Logout endpoint (optional - mainly for logging)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    console.log(`📤 User logged out: ${req.user.username}`);
    
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Logout failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Export middleware for use in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.requireAdmin = requireAdmin;