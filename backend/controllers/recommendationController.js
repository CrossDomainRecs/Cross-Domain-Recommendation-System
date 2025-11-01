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
            timeout: 30000 // 30-second timeout
        });
        return response.data;
    } catch (error) {
        console.error(`Flask API error (${endpoint}):`, error.message);
        throw new Error(`ML service error: ${error.response?.data?.error || error.message}`);
    }
};

// ✅ FIXED: Added domain_filter (for Explore page)
exports.getRecommendations = async (req, res) => {
    try {
        const { domain, limit = 20, domain_filter } = req.body;
        const userId = req.user.userId;

        const finalDomain = domain_filter || domain;

        // Build user profile
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

        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };

        // ✅ FIXED: Use finalDomain instead of domain
        const recommendations = await callFlaskAPI('/api/drl/recommend', 'POST', {
            user_profile: userProfile,
            limit,
            domain_filter: finalDomain || null
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

        if (!item_id || !action) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'item_id and action are required' },
                timestamp: new Date().toISOString()
            });
        }

        const User = require('../models/User');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' },
                timestamp: new Date().toISOString()
            });
        }

        const itemTitle = feedback.title || 'Unknown Item';
        const itemDomain = feedback.domain || 'unknown';
        let updated = false;

        if (action === 'like' || action === 'favorite') {
            const existingIndex = user.preferences.liked_items.findIndex(
                (item) => item.item_id === item_id
            );

            if (existingIndex === -1) {
                user.preferences.liked_items.push({
                    item_id,
                    title: itemTitle,
                    domain: itemDomain,
                    isFavorite: action === 'favorite',
                    timestamp: new Date()
                });
                updated = true;
            } else if (action === 'favorite') {
                user.preferences.liked_items[existingIndex].isFavorite = true;
                updated = true;
            }
        } else if (action === 'dislike') {
            const existingIndex = user.preferences.disliked_items.findIndex(
                (item) => item.item_id === item_id
            );

            if (existingIndex === -1) {
                user.preferences.disliked_items.push({
                    item_id,
                    title: itemTitle,
                    domain: itemDomain,
                    timestamp: new Date()
                });
                updated = true;
            }

            user.preferences.liked_items = user.preferences.liked_items.filter(
                (item) => item.item_id !== item_id
            );
        }

        if (updated) await user.save();

        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items.map((item) => ({
                item_id: item.item_id,
                domain: item.domain
            }))
        };

        try {
            const result = await callFlaskAPI('/api/drl/feedback', 'POST', {
                user_profile: userProfile,
                recommended_item: item_id,
                feedback: { action, time_spent }
            });

            res.json({
                success: true,
                data: {
                    reward: result.reward || 0,
                    message: 'Feedback recorded successfully',
                    updated
                },
                timestamp: new Date().toISOString()
            });
        } catch (drlError) {
            console.error('DRL feedback error:', drlError);
            res.json({
                success: true,
                data: { message: 'Feedback recorded (DRL unavailable)', updated },
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Record feedback error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FEEDBACK_ERROR', message: error.message },
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
                error: { code: 'VALIDATION_ERROR', message: 'item_id is required' },
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
            error: { code: 'SIMILAR_ITEMS_ERROR', message: error.message },
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
                error: { code: 'VALIDATION_ERROR', message: 'user_input and domain are required' },
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
            error: { code: 'COLD_START_ERROR', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

// Generate explanation for a single item
exports.generateExplanation = async (req, res) => {
    try {
        const { item, user_genres } = req.body;
        const userId = req.user.userId;

        if (!item) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'item is required' },
                timestamp: new Date().toISOString()
            });
        }

        const User = require('../models/User');
        const user = await User.findById(userId);

        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user_genres || user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };

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
            data: { explanation: result.explanation, item: item.title },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Generate explanation error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'EXPLANATION_ERROR', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};

// Batch generate explanations
exports.batchExplanations = async (req, res) => {
    try {
        const { items, user_genres } = req.body;
        const userId = req.user.userId;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'items array is required' },
                timestamp: new Date().toISOString()
            });
        }

        const User = require('../models/User');
        const user = await User.findById(userId);

        const userProfile = {
            user_id: userId.toString(),
            favorite_genres: user_genres || user.preferences.favorite_genres || [],
            liked_items: user.preferences.liked_items || []
        };

        const recommendations = items.map((item) => ({
            title: item.title,
            genres: item.genres || [],
            domain: item.domain,
            rating: item.rating,
            description: item.description
        }));

        const result = await callFlaskAPI('/api/explanations/batch', 'POST', {
            user_profile: userProfile,
            recommendations
        });

        res.json({
            success: true,
            data: { explanations: result.explanations, count: result.count },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Batch explanations error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'BATCH_EXPLANATION_ERROR', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
};
