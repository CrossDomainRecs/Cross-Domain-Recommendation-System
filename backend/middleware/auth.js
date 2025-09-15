const jwt = require('jsonwebtoken');
const User = require('../models/User');


// Basic JWT Authentication (enhanced version with debug logging)
const authenticateToken = async (req, res, next) => {
    // DEBUG LOGGING - Add these lines
    console.log('🔍 authenticateToken middleware called');
    console.log('📋 Authorization header:', req.headers.authorization);
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🌐 Request URL:', req.originalUrl);
    console.log('📝 Request method:', req.method);
    
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        console.log('🎯 Auth header extracted:', authHeader);
        
        const token = authHeader && authHeader.split(' ')[1];
        console.log('🎫 Token extracted:', token ? 'Token present' : 'No token');
        
        if (!token) {
            console.log('❌ No token found, returning AUTH_REQUIRED');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Access token is required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('🔓 Attempting to verify token...');
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified successfully, user:', decoded.username);
        
        // Get fresh user data from database
        console.log('🔍 Looking up user in database...');
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User account not found'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('✅ User found in database:', user.username);
        
        // Check if user account is active
        if (user.status !== 'active') {
            console.log('❌ User account not active:', user.status);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCOUNT_INACTIVE',
                    message: `Account is ${user.status}. Please contact support.`
                },
                timestamp: new Date().toISOString()
            });
        }
        
        console.log('✅ User account is active');
        
        // Add complete user object to request
        req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            permissions: user.permissions,
            preferences: user.preferences,
            subscription: user.subscription,
            // Keep your existing structure for backward compatibility
            ...decoded
        };
        
        console.log('✅ Authentication successful for user:', user.username, 'with role:', user.role);
        next();
        
    } catch (error) {
        console.log('❌ Authentication error:', error.name, error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Access token has expired'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid access token'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        return res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed'
            },
            timestamp: new Date().toISOString()
        });
    }
};


// Role-based Authorization Middleware
const requireRole = (...roles) => {
    return (req, res, next) => {
        console.log('🔍 requireRole middleware called for roles:', roles);
        console.log('👤 Current user role:', req.user?.role);
        
        if (!req.user) {
            console.log('❌ No user in request object');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Please authenticate first'
                },
                timestamp: new Date().toISOString()
            });
        }

        if (!roles.includes(req.user.role)) {
            console.log('❌ Role check failed. Required:', roles, 'User has:', req.user.role);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `Access denied. Required roles: ${roles.join(', ')}, but you have: ${req.user.role}`
                },
                timestamp: new Date().toISOString()
            });
        }

        console.log('✅ Role check passed for user:', req.user.username);
        next();
    };
};


// Permission-based Authorization
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Please authenticate first'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Get fresh user data to check current permissions
        const user = await User.findById(req.user.userId);
        if (!user || !user.hasPermission(permission)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: `Access denied. Required permission: ${permission}`
                },
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
};


// Domain Access Control (for your cross-domain recommendation system)
const requireDomainAccess = (domain) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Please authenticate first'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Get fresh user data
        const user = await User.findById(req.user.userId);
        if (!user || !user.canAccessDomain(domain)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'DOMAIN_ACCESS_DENIED',
                    message: `Access denied for domain: ${domain}. Available domains: ${user?.preferences?.domains?.join(', ') || 'none'}`
                },
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
};


// Premium Feature Access
const requirePremium = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Please authenticate first'
            },
            timestamp: new Date().toISOString()
        });
    }

    // Get fresh user data
    const user = await User.findById(req.user.userId);
    
    // Check if user has premium access
    if (user.role === 'admin' || 
        user.role === 'premium' || 
        user.subscription.type === 'premium' || 
        user.hasPermission('premium_features')) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required for this feature'
        },
        timestamp: new Date().toISOString()
    });
};


// Resource Ownership Check (user can only access their own data)
const requireOwnership = (resourceIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Please authenticate first'
                },
                timestamp: new Date().toISOString()
            });
        }

        // Admin can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        const resourceUserId = req.params[resourceIdParam] || req.body.userId || req.query.userId;
        
        if (resourceUserId !== req.user.userId.toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'OWNERSHIP_REQUIRED',
                    message: 'You can only access your own resources'
                },
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
};


// Optional Authentication (for public endpoints with optional user context)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.status === 'active') {
            req.user = {
                userId: user._id,
                username: user.username,
                role: user.role,
                permissions: user.permissions,
                preferences: user.preferences,
                subscription: user.subscription
            };
        } else {
            req.user = null;
        }
        
        next();
    } catch (err) {
        // Don't fail for optional auth, just set user as null
        req.user = null;
        next();
    }
};


// Admin-only middleware (legacy support - keeping your existing pattern)
const requireAdmin = requireRole('admin');


// Logging middleware for audit trails
const logAccess = (req, res, next) => {
    if (req.user) {
        console.log(`🔍 Access: ${req.user.username} (${req.user.role}) -> ${req.method} ${req.originalUrl}`);
    }
    next();
};


module.exports = {
    authenticateToken,
    requireRole,
    requirePermission,
    requireDomainAccess,
    requirePremium,
    requireOwnership,
    requireAdmin, // Keep for backward compatibility
    optionalAuth,
    logAccess
};
