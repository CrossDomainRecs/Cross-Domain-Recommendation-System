const validateRecommendationRequest = (req, res, next) => {
    const { domain, count } = req.body;
    
    // ✅ REMOVED userId validation - it comes from JWT token via req.user.userId
    
    // Validate domain (optional, but if provided must be valid)
    const validDomains = ['movies', 'books', 'music'];
    if (domain && !validDomains.includes(domain.toLowerCase())) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: `domain must be one of: ${validDomains.join(', ')}`
            },
            timestamp: new Date().toISOString()
        });
    }
    
    // Validate count (optional, but if provided must be valid)
    if (count && (typeof count !== 'number' || count < 1 || count > 50)) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'count must be a number between 1 and 50'
            },
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

// Keep validateUserId as is - it's for URL parameters, not body
const validateUserId = (req, res, next) => {
    const { userId } = req.params;
    
    if (!userId || userId.trim() === '') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'userId parameter is required'
            },
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

module.exports = {
    validateRecommendationRequest,
    validateUserId
};