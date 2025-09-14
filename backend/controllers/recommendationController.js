const axios = require('axios');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Book = require('../models/Book');
const Music = require('../models/Music');
const History = require('../models/History');

class RecommendationController {
    
    async getRecommendations(req, res) {
        try {
            // ✅ Use authenticated user from JWT token (more secure)
            const userId = req.user.userId;
            const userPreferences = req.user.preferences;
            const { domain = 'movies', count = 5, inputItem } = req.body;
            
            console.log(`🎯 Getting recommendations for authenticated user: ${req.user.username} (${userId}), domain: ${domain}`);
            
            // Validate count parameter
            const validatedCount = Math.min(Math.max(parseInt(count) || 5, 1), 50);
            
            // Get fresh user data (in case preferences were updated)
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User account not found'
                    },
                    timestamp: new Date().toISOString()
                });
            }
            
            // Use most recent preferences (either from JWT or database)
            const currentPreferences = user.preferences || userPreferences || { genres: [], domains: ['movies'] };
            
            // Handle cold start users (no preferences set)
            if (!currentPreferences || currentPreferences.genres.length === 0) {
                console.log(`❄️ Cold start user: ${user.username}`);
                return await this.handleColdStartRecommendations(res, domain, validatedCount, user);
            }
            
            // Try ML-powered recommendations first
            try {
                console.log(`🤖 Calling ML service for ${user.username}`);
                const recommendations = await this.getMLRecommendations(
                    userId, 
                    inputItem, 
                    domain, 
                    validatedCount, 
                    currentPreferences
                );
                
                // Track successful recommendation generation
                await this.trackRecommendationGenerated(userId, domain, recommendations.length, 'ml_powered');
                
                return res.json({
                    success: true,
                    data: {
                        type: 'personalized',
                        message: 'ML-powered personalized recommendations',
                        recommendations: recommendations,
                        user: user.username,
                        domain: domain,
                        total_count: recommendations.length,
                        source: 'ml_service'
                    },
                    timestamp: new Date().toISOString()
                });
                
            } catch (mlError) {
                console.log(`⚠️ ML service unavailable for ${user.username}, falling back to content-based`);
                console.error('ML Error:', mlError.message);
                
                // Fallback to content-based recommendations
                const fallbackRecommendations = await this.getContentBasedRecommendations(
                    currentPreferences, 
                    domain, 
                    validatedCount,
                    userId
                );
                
                // Track fallback recommendation generation
                await this.trackRecommendationGenerated(userId, domain, fallbackRecommendations.length, 'content_based');
                
                return res.json({
                    success: true,
                    data: {
                        type: 'fallback',
                        message: 'Content-based recommendations (ML service unavailable)',
                        recommendations: fallbackRecommendations,
                        user: user.username,
                        domain: domain,
                        total_count: fallbackRecommendations.length,
                        source: 'content_based',
                        fallback_reason: 'ml_service_error'
                    },
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('❌ Error getting recommendations:', error.message);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'RECOMMENDATION_ERROR',
                    message: 'Failed to get recommendations',
                    user: req.user?.username || 'unknown'
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    
    async getRecommendationHistory(req, res) {
        try {
            const { userId } = req.params;
            const requestingUser = req.user;
            
            console.log(`📚 Getting recommendation history for user: ${userId}, requested by: ${requestingUser.username}`);
            
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
            
            // Get user's interaction history from History model
            const userHistory = await History.find({ user_id: userId })
                .sort({ timestamp: -1 })
                .limit(100)
                .populate('movie_id', 'title genre avgrating')
                .populate('book_id', 'title author genre avgrating') 
                .populate('music_id', 'title singers genre avgrating');
            
            // Aggregate history stats
            const historyStats = await this.getUserHistoryStats(userId);
            
            res.json({
                success: true,
                data: {
                    message: `Recommendation history for ${user.username}`,
                    user: {
                        id: user._id,
                        username: user.username,
                        preferences: user.preferences
                    },
                    history: userHistory,
                    stats: historyStats,
                    total_interactions: userHistory.length
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error getting recommendation history:', error.message);
            res.status(500).json({
                success: false,
                error: {
                    code: 'HISTORY_ERROR',
                    message: 'Failed to get recommendation history'
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Helper method: Handle cold start users
    async handleColdStartRecommendations(res, domain, count, user) {
        try {
            let popularItems;
            
            switch (domain.toLowerCase()) {
                case 'movies':
                    popularItems = await Movie.find()
                        .sort({ avgrating: -1, likedpercent: -1 })
                        .limit(count);
                    break;
                case 'books':
                    popularItems = await Book.find()
                        .sort({ avgrating: -1, likedpercent: -1 })
                        .limit(count);
                    break;
                case 'music':
                    popularItems = await Music.find()
                        .sort({ avgrating: -1, likedpercent: -1 })
                        .limit(count);
                    break;
                default:
                    throw new Error(`Unsupported domain: ${domain}`);
            }
            
            // Track cold start recommendation
            await this.trackRecommendationGenerated(user._id, domain, popularItems.length, 'cold_start');
            
            return res.json({
                success: true,
                data: {
                    type: 'cold_start',
                    message: 'Popular recommendations for new user',
                    recommendations: popularItems,
                    user: user.username,
                    domain: domain,
                    total_count: popularItems.length,
                    source: 'popularity_based'
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Cold start recommendations failed: ${error.message}`);
        }
    }
    
    // Helper method: Call ML service
    async getMLRecommendations(userId, inputItem, domain, count, preferences) {
        const mlResponse = await axios.post('http://localhost:8000/ml/recommend', {
            userId,
            inputItem,
            domain,
            count,
            userPreferences: preferences
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return mlResponse.data;
    }
    
    // Helper method: Content-based fallback recommendations  
    async getContentBasedRecommendations(preferences, domain, count, userId) {
        try {
            let recommendations;
            const userGenres = preferences.genres || [];
            
            if (userGenres.length === 0) {
                // If no genre preferences, fall back to popular items
                return await this.getPopularRecommendations(domain, count);
            }
            
            switch (domain.toLowerCase()) {
                case 'movies':
                    recommendations = await Movie.find({
                        genre: { $in: userGenres }
                    })
                    .sort({ avgrating: -1, likedpercent: -1 })
                    .limit(count);
                    break;
                    
                case 'books':
                    recommendations = await Book.find({
                        genre: { $in: userGenres }
                    })
                    .sort({ avgrating: -1, likedpercent: -1 })
                    .limit(count);
                    break;
                    
                case 'music':
                    recommendations = await Music.find({
                        genre: { $in: userGenres }
                    })
                    .sort({ avgrating: -1, likedpercent: -1 })
                    .limit(count);
                    break;
                    
                default:
                    throw new Error(`Unsupported domain: ${domain}`);
            }
            
            // If not enough genre-based results, supplement with popular items
            if (recommendations.length < count) {
                const additionalCount = count - recommendations.length;
                const popularItems = await this.getPopularRecommendations(domain, additionalCount);
                
                // Combine and remove duplicates
                const existingIds = recommendations.map(item => item._id.toString());
                const newItems = popularItems.filter(item => 
                    !existingIds.includes(item._id.toString())
                );
                
                recommendations = [...recommendations, ...newItems.slice(0, additionalCount)];
            }
            
            return recommendations;
            
        } catch (error) {
            console.error('Content-based recommendation error:', error);
            // Final fallback to popular items
            return await this.getPopularRecommendations(domain, count);
        }
    }
    
    // Helper method: Popular items fallback
    async getPopularRecommendations(domain, count) {
        let Model;
        switch (domain.toLowerCase()) {
            case 'movies': Model = Movie; break;
            case 'books': Model = Book; break;
            case 'music': Model = Music; break;
            default: Model = Movie; // Default to movies
        }
        
        return await Model.find()
            .sort({ avgrating: -1, likedpercent: -1 })
            .limit(count);
    }
    
    // Helper method: Track recommendation generation
    async trackRecommendationGenerated(userId, domain, count, type) {
        try {
            const historyRecord = new History({
                user_id: userId,
                action: 'recommendation_generated',
                metadata: {
                    domain: domain,
                    count: count,
                    type: type,
                    timestamp: new Date()
                }
            });
            
            await historyRecord.save();
            console.log(`📝 Tracked recommendation: ${type} for user ${userId}`);
            
        } catch (error) {
            console.error('❌ Failed to track recommendation:', error.message);
            // Don't fail the main request if tracking fails
        }
    }
    
    // Helper method: Get user history statistics
    async getUserHistoryStats(userId) {
        try {
            const stats = await History.aggregate([
                { $match: { user_id: mongoose.Types.ObjectId(userId) } },
                { $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }},
                { $group: {
                    _id: null,
                    actions: { $push: { action: '$_id', count: '$count' } },
                    totalInteractions: { $sum: '$count' }
                }}
            ]);
            
            const domainStats = await History.aggregate([
                { $match: { user_id: mongoose.Types.ObjectId(userId) } },
                { $project: {
                    domain: {
                        $cond: [
                            { $ne: ['$movie_id', null] }, 'movies',
                            { $cond: [
                                { $ne: ['$book_id', null] }, 'books',
                                { $cond: [
                                    { $ne: ['$music_id', null] }, 'music',
                                    'unknown'
                                ]}
                            ]}
                        ]
                    }
                }},
                { $group: {
                    _id: '$domain',
                    count: { $sum: 1 }
                }}
            ]);
            
            return {
                actions: stats[0]?.actions || [],
                totalInteractions: stats[0]?.totalInteractions || 0,
                domainBreakdown: domainStats
            };
            
        } catch (error) {
            console.error('❌ Error getting user stats:', error);
            return {
                actions: [],
                totalInteractions: 0,
                domainBreakdown: []
            };
        }
    }
    
    // New method: Track user interactions (for improving recommendations)
    async trackInteraction(req, res) {
        try {
            const userId = req.user.userId;
            const { itemId, itemType, action, rating } = req.body;
            
            console.log(`👆 Tracking interaction: ${req.user.username} ${action} ${itemType} ${itemId}`);
            
            // Validate action type
            const validActions = ['view', 'like', 'rate', 'bookmark'];
            if (!validActions.includes(action)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ACTION',
                        message: `Action must be one of: ${validActions.join(', ')}`
                    },
                    timestamp: new Date().toISOString()
                });
            }
            
            // Validate rating if provided
            if (action === 'rate' && (!rating || rating < 1 || rating > 5)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_RATING',
                        message: 'Rating must be between 1 and 5'
                    },
                    timestamp: new Date().toISOString()
                });
            }
            
            // Create history record
            const historyData = {
                user_id: userId,
                action: action,
                timestamp: new Date()
            };
            
            // Add the appropriate item reference
            switch (itemType.toLowerCase()) {
                case 'movie':
                    historyData.movie_id = itemId;
                    break;
                case 'book':
                    historyData.book_id = itemId;
                    break;
                case 'music':
                    historyData.music_id = itemId;
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'INVALID_ITEM_TYPE',
                            message: 'itemType must be movie, book, or music'
                        },
                        timestamp: new Date().toISOString()
                    });
            }
            
            // Add rating if provided
            if (action === 'rate') {
                historyData.rating = rating;
            }
            
            const historyRecord = new History(historyData);
            await historyRecord.save();
            
            // Update item analytics asynchronously (don't wait for this)
            this.updateItemAnalytics(itemId, itemType, action, rating).catch(error => {
                console.error('❌ Failed to update item analytics:', error.message);
            });
            
            res.json({
                success: true,
                data: {
                    message: 'Interaction tracked successfully',
                    interaction: {
                        action: action,
                        itemType: itemType,
                        itemId: itemId,
                        rating: rating || null,
                        timestamp: historyRecord.timestamp
                    }
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error tracking interaction:', error.message);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'TRACKING_ERROR',
                    message: 'Failed to track interaction'
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Helper method: Update item analytics (avgrating, likedpercent)
    async updateItemAnalytics(itemId, itemType, action, rating) {
        try {
            let Model;
            switch (itemType.toLowerCase()) {
                case 'movie': Model = Movie; break;
                case 'book': Model = Book; break;
                case 'music': Model = Music; break;
                default: return;
            }
            
            // Update average rating if this was a rating action
            if (action === 'rate' && rating) {
                const ratingStats = await History.aggregate([
                    { 
                        $match: { 
                            [`${itemType.toLowerCase()}_id`]: mongoose.Types.ObjectId(itemId),
                            rating: { $exists: true }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            avgRating: { $avg: '$rating' },
                            totalRatings: { $sum: 1 }
                        }
                    }
                ]);
                
                if (ratingStats.length > 0) {
                    await Model.updateOne(
                        { _id: itemId },
                        { avgrating: Math.round(ratingStats[0].avgRating * 10) / 10 }
                    );
                }
            }
            
            // Update liked percentage
            const interactionStats = await History.aggregate([
                { 
                    $match: { 
                        [`${itemType.toLowerCase()}_id`]: mongoose.Types.ObjectId(itemId)
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalInteractions: { $sum: 1 },
                        likes: { 
                            $sum: { 
                                $cond: [
                                    { $in: ['$action', ['like', 'bookmark']] },
                                    1, 
                                    0
                                ]
                            }
                        },
                        highRatings: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$rating', 4] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);
            
            if (interactionStats.length > 0) {
                const stats = interactionStats[0];
                const likedPercent = Math.round(
                    ((stats.likes + stats.highRatings) / stats.totalInteractions) * 100
                );
                
                await Model.updateOne(
                    { _id: itemId },
                    { likedpercent: likedPercent }
                );
            }
            
        } catch (error) {
            console.error('❌ Error updating item analytics:', error.message);
        }
    }
    
    // Helper method: Get user history statistics
    async getUserHistoryStats(userId) {
        try {
            const mongoose = require('mongoose');
            
            const stats = await History.aggregate([
                { $match: { user_id: mongoose.Types.ObjectId(userId) } },
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 },
                        avgRating: { $avg: '$rating' }
                    }
                }
            ]);
            
            const domainStats = await History.aggregate([
                { $match: { user_id: mongoose.Types.ObjectId(userId) } },
                {
                    $project: {
                        domain: {
                            $cond: [
                                { $ne: ['$movie_id', null] }, 'movies',
                                { $cond: [
                                    { $ne: ['$book_id', null] }, 'books', 
                                    'music'
                                ]}
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: '$domain',
                        count: { $sum: 1 }
                    }
                }
            ]);
            
            return {
                actionBreakdown: stats,
                domainBreakdown: domainStats,
                totalInteractions: stats.reduce((sum, stat) => sum + stat.count, 0)
            };
            
        } catch (error) {
            console.error('❌ Error calculating user stats:', error);
            return { actionBreakdown: [], domainBreakdown: [], totalInteractions: 0 };
        }
    }
}

module.exports = new RecommendationController();