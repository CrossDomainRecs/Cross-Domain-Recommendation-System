const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    console.log('🔍 authenticateToken middleware called');
    
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('📋 Authorization header:', authHeader);
    console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('🌐 Request URL:', req.originalUrl);
    console.log('📝 Request method:', req.method);

    if (!authHeader) {
        console.log('❌ No authorization header');
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Access token is required'
            },
            timestamp: new Date().toISOString()
        });
    }

    console.log('🎯 Auth header extracted:', authHeader);

    // ✅ FIXED: Proper token extraction (case-insensitive)
    const trimmedHeader = authHeader.trim();
    const token = trimmedHeader.toLowerCase().startsWith('bearer ')
        ? trimmedHeader.substring(7).trim()  // Remove 'Bearer ' prefix
        : trimmedHeader;

    console.log('🎫 Token extracted:', token ? token.substring(0, 20) + '...' : 'No token');

    if (!token || token.length < 10) {
        console.log('❌ No valid token found, returning AUTH_REQUIRED');
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Access token is required'
            },
            timestamp: new Date().toISOString()
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified successfully, userId:', decoded.userId);

        // Fetch fresh user from DB
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log('❌ User not found in DB');
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User account not found'
                },
                timestamp: new Date().toISOString()
            });
        }

        if (user.status && user.status !== 'active') {
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

        // Attach full user object
        req.user = {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            status: user.status || 'active',
            permissions: user.permissions || [],
            preferences: user.preferences || {},
            subscription: user.subscription || {},
            ...decoded
        };

        console.log('✅ Authentication successful for user:', user.username);
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

// ✅ ADD THIS: Admin check middleware
const requireAdmin = (req, res, next) => {
    console.log('🔍 requireAdmin middleware called');
    console.log('👤 User role:', req.user?.role);
    
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required'
            },
            timestamp: new Date().toISOString()
        });
    }

    if (req.user.role !== 'admin') {
        console.log('❌ User is not admin');
        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required'
            },
            timestamp: new Date().toISOString()
        });
    }

    console.log('✅ Admin access granted');
    next();
};

module.exports = { authenticateToken, requireAdmin };
