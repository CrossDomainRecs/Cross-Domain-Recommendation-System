const axios = require('axios');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Book = require('../models/Book');
const Music = require('../models/Music');

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
            console.log(`📚 Getting recommendation history (stub) for user: ${userId}, requested by: ${requestingUser.username}`);

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ 
                    success: false,
                    error: { code: 'USER_NOT_FOUND', message: 'User not found' },
                    timestamp: new Date().toISOString()
                });
            }

            // Histories collection removed; return empty history and default stats
            const historyStats = { actions: [], totalInteractions: 0, domainBreakdown: [] };

            return res.json({
                success: true,
                data: {
                    message: `Recommendation history unavailable (tracking disabled)`,
                    user: { id: user._id, username: user.username, preferences: user.preferences },
                    history: [],
                    stats: historyStats,
                    total_interactions: 0
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Error getting recommendation history (stub):', error.message);
            return res.status(500).json({
                success: false,
                error: { code: 'HISTORY_ERROR', message: 'Failed to get recommendation history' },
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
        // Tracking via histories is disabled; noop to avoid recreating collection
        console.log(`📝 (tracking disabled) Recommendation ${type} for user ${userId}, domain ${domain}, count ${count}`);
        return;
    }
    
    // Helper method: Get user history statistics
    async getUserHistoryStats(userId) {
        // Histories disabled; return default structure
        return { actionBreakdown: [], domainBreakdown: [], totalInteractions: 0 };
    }
    
    // Helper method: Update item analytics (avgrating, likedpercent)
    async updateItemAnalytics(itemId, itemType, action, rating) {
        // Analytics based on histories is disabled; noop
        return;
    }
    
    // Helper method: Get user history statistics
    async getUserHistoryStats(userId) {
        // Histories disabled; return default structure
        return { actionBreakdown: [], domainBreakdown: [], totalInteractions: 0 };
    }
}

module.exports = new RecommendationController();