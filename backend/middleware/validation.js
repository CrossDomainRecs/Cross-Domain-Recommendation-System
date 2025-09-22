const validateRecommendationRequest = (req, res, next) => {
    const { userId, domain, count } = req.body;
    
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'userId is required and must be a non-empty string'
            },
            timestamp: new Date().toISOString()
        });
    }
    
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


