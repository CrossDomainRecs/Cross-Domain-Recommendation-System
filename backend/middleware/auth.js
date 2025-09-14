const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; 
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Access token is required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database (optional - for fresh user data)
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Add user to request object
        req.user = {
            userId: user._id,
            username: user.username,
            role: user.role
        };
        
        next();
        
    } catch (error) {
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

module.exports = { authenticateToken };
