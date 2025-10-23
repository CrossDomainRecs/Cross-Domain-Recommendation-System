const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Register new user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please provide username, email, and password'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS',
                    message: 'User with this email or username already exists'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Create user
        const user = await User.create({
            username,
            email,
            password
        });
        
        // Generate token
        const token = generateToken(user._id, user.username);
        
        res.status(201).json({
            success: true,
            data: {
                user: user.toJSON(),
                token
            },
            message: 'User registered successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'REGISTRATION_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please provide email and password'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Find user (include password)
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
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
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCOUNT_INACTIVE',
                    message: `Account is ${user.status}. Please contact support.`
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Generate token
        const token = generateToken(user._id, user.username);
        
        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                token
            },
            message: 'Login successful',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'LOGIN_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Get current user profile
exports.getProfile = async (req, res) => {
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
        
        res.json({
            success: true,
            data: user.toJSON(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'PROFILE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ['username', 'preferences'];
        const updates = {};
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });
        
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true, runValidators: true }
        );
        
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
        
        res.json({
            success: true,
            data: user.toJSON(),
            message: 'Profile updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Google OAuth login/signup
exports.googleAuth = async (req, res) => {
    try {
        const { email, username, googleId, photoURL } = req.body;
        
        if (!email || !googleId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Email and Google ID are required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Check if user exists
        let user = await User.findOne({ email });
        
        if (!user) {
            // Create new user with Google data
            user = await User.create({
                username: username || email.split('@')[0],
                email,
                password: Math.random().toString(36).slice(-8) + 'Aa1!', // Random password
                googleId,
                photoURL
            });
        }
        
        // Generate token
        const token = generateToken(user._id, user.username);
        
        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                token
            },
            message: 'Google authentication successful',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'GOOGLE_AUTH_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};
