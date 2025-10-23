const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/auth');
const { validateRecommendationRequest } = require('../middleware/validation');

// All recommendation routes require authentication
router.use(authenticateToken);

// Get personalized recommendations
router.post('/get', 
    validateRecommendationRequest,
    recommendationController.getRecommendations
);

// Record user feedback
router.post('/feedback', 
    recommendationController.recordFeedback
);

// Get similar items
router.post('/similar', 
    recommendationController.getSimilarItems
);

// Cold-start input processing
router.post('/cold-start', 
    recommendationController.processColdStart
);

// Generate explanation for single item
router.post('/explain', 
    recommendationController.generateExplanation
);

// Generate explanations for multiple items (batch)
router.post('/explain/batch', 
    recommendationController.batchExplanations
);

module.exports = router;
