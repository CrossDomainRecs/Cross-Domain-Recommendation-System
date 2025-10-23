const axios = require('axios');

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5001';

// Helper function to call Flask ML API
const callFlaskAPI = async (endpoint, method = 'POST', data = null) => {
    try {
        const response = await axios({
            method,
            url: `${FLASK_API_URL}${endpoint}`,
            data,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
        return response.data;
    } catch (error) {
        console.error(`Flask API error (${endpoint}):`, error.message);
        throw new Error(`ML service error: ${error.response?.data?.error || error.message}`);
    }
};

// Get recommendations for user
exports.getRecommendations = async (req, res) => {
    try {
        const { domain, limit = 20 } = req.body;
        const userId = req.user.userId;
        
        // Build user profile from database
        const User = require('../models/User');
        const user = await User.findById(userId);
        
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
        
        // Prepare user profile for ML API
        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };
        
        // Call Flask ML API
        const recommendations = await callFlaskAPI('/api/drl/recommend', 'POST', {
            user_profile: userProfile,
            limit,
            domain_filter: domain || null
        });
        
        res.json({
            success: true,
            data: recommendations.recommendations,
            count: recommendations.count,
            method: recommendations.method,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'RECOMMENDATION_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Record user feedback (like/dislike/favorite)
exports.recordFeedback = async (req, res) => {
    try {
        const { item_id, feedback } = req.body;
        const { action, time_spent = 0 } = feedback || {};
        const userId = req.user.userId;
        
        // Validation
        if (!item_id || !action) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'item_id and action are required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Get user
        const User = require('../models/User');
        const user = await User.findById(userId);
        
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
        
        // Get item details (title, domain) from the recommendation
        // For now, we'll accept it from the request, but you could fetch from DB
        const itemTitle = feedback.title || 'Unknown Item';
        const itemDomain = feedback.domain || 'unknown';
        
        // Update user preferences based on action
        let updated = false;
        
        if (action === 'like' || action === 'favorite') {
            // Check if item already exists in liked_items
            const existingIndex = user.preferences.liked_items.findIndex(
                item => item.item_id === item_id
            );
            
            if (existingIndex === -1) {
                // Add new liked item
                user.preferences.liked_items.push({
                    item_id: item_id,
                    title: itemTitle,
                    domain: itemDomain,
                    isFavorite: action === 'favorite',
                    timestamp: new Date()
                });
                updated = true;
            } else if (action === 'favorite') {
                // Update existing item to favorite
                user.preferences.liked_items[existingIndex].isFavorite = true;
                updated = true;
            }
        } else if (action === 'dislike') {
            // Check if item already exists in disliked_items
            const existingIndex = user.preferences.disliked_items.findIndex(
                item => item.item_id === item_id
            );
            
            if (existingIndex === -1) {
                // Add new disliked item
                user.preferences.disliked_items.push({
                    item_id: item_id,
                    title: itemTitle,
                    domain: itemDomain,
                    timestamp: new Date()
                });
                updated = true;
            }
            
            // Remove from liked_items if it was there
            user.preferences.liked_items = user.preferences.liked_items.filter(
                item => item.item_id !== item_id
            );
        }
        
        // Save user preferences
        if (updated) {
            await user.save();
        }
        
        // Build user profile for DRL
        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items.map(item => ({
                item_id: item.item_id,
                domain: item.domain
            }))
        };
        
        // Send feedback to DRL agent (for learning)
        try {
            const result = await callFlaskAPI('/api/drl/feedback', 'POST', {
                user_profile: userProfile,
                recommended_item: item_id,
                feedback: {
                    action,
                    time_spent
                }
            });
            
            res.json({
                success: true,
                data: {
                    reward: result.reward || 0,
                    message: 'Feedback recorded successfully',
                    updated: updated
                },
                timestamp: new Date().toISOString()
            });
        } catch (drlError) {
            // Even if DRL fails, feedback was saved to DB
            console.error('DRL feedback error:', drlError);
            res.json({
                success: true,
                data: {
                    message: 'Feedback recorded (DRL unavailable)',
                    updated: updated
                },
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Record feedback error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FEEDBACK_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Get similar items
exports.getSimilarItems = async (req, res) => {
    try {
        const { item_id, limit = 10 } = req.body;
        
        if (!item_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'item_id is required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await callFlaskAPI('/api/recommendations/similar', 'POST', {
            item_id,
            limit
        });
        
        res.json({
            success: true,
            data: result.recommendations,
            count: result.count,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Get similar items error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SIMILAR_ITEMS_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Process cold-start input
exports.processColdStart = async (req, res) => {
    try {
        const { user_input, domain } = req.body;
        
        if (!user_input || !domain) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'user_input and domain are required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        const result = await callFlaskAPI('/api/cold-start/process-input', 'POST', {
            user_input,
            domain
        });
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Process cold-start error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'COLD_START_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Generate explanation for recommendation
exports.generateExplanation = async (req, res) => {
    try {
        const { item, user_genres } = req.body;
        const userId = req.user.userId;
        
        // Validation
        if (!item) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'item is required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Get user profile
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user_genres || user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };
        
        // Call Flask ML API for explanation
        const result = await callFlaskAPI('/api/explanations/generate', 'POST', {
            user_profile: userProfile,
            recommended_item: {
                title: item.title,
                genres: item.genres || [],
                domain: item.domain,
                rating: item.rating,
                description: item.description
            },
            recommendation_source: item.source || 'hybrid'
        });
        
        res.json({
            success: true,
            data: {
                explanation: result.explanation,
                item: item.title
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Generate explanation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'EXPLANATION_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};

// Batch generate explanations for multiple items
exports.batchExplanations = async (req, res) => {
    try {
        const { items, user_genres } = req.body;
        const userId = req.user.userId;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'items array is required'
                },
                timestamp: new Date().toISOString()
            });
        }
        
        // Get user profile
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user_genres || user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };
        
        // Prepare recommendations for batch processing
        const recommendations = items.map(item => ({
            title: item.title,
            genres: item.genres || [],
            domain: item.domain,
            rating: item.rating,
            description: item.description
        }));
        
        // Call Flask ML API for batch explanations
        const result = await callFlaskAPI('/api/explanations/batch', 'POST', {
            user_profile: userProfile,
            recommendations: recommendations
        });
        
        res.json({
            success: true,
            data: {
                explanations: result.explanations,
                count: result.count
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Batch explanations error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'BATCH_EXPLANATION_ERROR',
                message: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
};
