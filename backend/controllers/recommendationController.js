const axios = require('axios');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Book = require('../models/Book');
const Music = require('../models/Music');
const History = require('../models/History');

class RecommendationController {
    
    async getRecommendations(req, res) {
        try {
            // ✅ Use authenticated user from JWT token
            const userId = req.user.userId;
            const userPreferences = req.user.preferences;
            const { domain = 'movies', count = 5 } = req.body;
            
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
            
            // Mock recommendations for Week-VI demo (replacing ML/database calls)
            const mockRecommendations = {
                movies: [
                    {
                        id: "movie_1",
                        title: "The Shawshank Redemption",
                        genre: ["Drama"],
                        avgrating: 9.3,
                        reason: "Highly rated drama film",
                        score: 0.95
                    },
                    {
                        id: "movie_2", 
                        title: "The Godfather",
                        genre: ["Crime", "Drama"],
                        avgrating: 9.2,
                        reason: "Classic crime masterpiece",
                        score: 0.92
                    },
                    {
                        id: "movie_3",
                        title: "The Dark Knight", 
                        genre: ["Action", "Crime"],
                        avgrating: 9.0,
                        reason: "Popular superhero film",
                        score: 0.90
                    },
                    {
                        id: "movie_4",
                        title: "Pulp Fiction",
                        genre: ["Crime", "Drama"], 
                        avgrating: 8.9,
                        reason: "Cult classic",
                        score: 0.89
                    },
                    {
                        id: "movie_5",
                        title: "Forrest Gump",
                        genre: ["Drama", "Romance"],
                        avgrating: 8.8,
                        reason: "Heartwarming story",
                        score: 0.88
                    }
                ],
                books: [
                    {
                        id: "book_1",
                        title: "To Kill a Mockingbird",
                        author: "Harper Lee",
                        genre: ["Fiction", "Drama"],
                        avgrating: 4.3,
                        reason: "Classic American literature",
                        score: 0.93
                    },
                    {
                        id: "book_2",
                        title: "1984", 
                        author: "George Orwell",
                        genre: ["Dystopian", "Fiction"],
                        avgrating: 4.2,
                        reason: "Dystopian masterpiece",
                        score: 0.92
                    },
                    {
                        id: "book_3",
                        title: "Pride and Prejudice",
                        author: "Jane Austen", 
                        genre: ["Romance", "Fiction"],
                        avgrating: 4.1,
                        reason: "Timeless romance classic",
                        score: 0.91
                    }
                ],
                music: [
                    {
                        id: "music_1",
                        title: "Bohemian Rhapsody",
                        artist: "Queen",
                        genre: ["Rock"],
                        avgrating: 4.8,
                        reason: "Iconic rock anthem", 
                        score: 0.98
                    },
                    {
                        id: "music_2",
                        title: "Hotel California",
                        artist: "Eagles",
                        genre: ["Rock"],
                        avgrating: 4.7,
                        reason: "Classic rock hit",
                        score: 0.97
                    },
                    {
                        id: "music_3", 
                        title: "Imagine",
                        artist: "John Lennon",
                        genre: ["Pop", "Folk"],
                        avgrating: 4.6,
                        reason: "Timeless peace anthem",
                        score: 0.96
                    }
                ]
            };

            // Get recommendations for the requested domain
            const availableRecs = mockRecommendations[domain.toLowerCase()] || mockRecommendations.movies;
            const recommendations = availableRecs.slice(0, validatedCount);

            // Track recommendation generation (optional for demo)
            try {
                await this.trackRecommendationGenerated(userId, domain, recommendations.length, 'demo_data');
            } catch (trackError) {
                console.log('⚠️ Tracking failed, but continuing with recommendations');
            }

            // Return successful response
            return res.json({
                success: true,
                data: {
                    type: 'demo_recommendations',
                    message: `Sample ${domain} recommendations for Week-VI milestone demonstration`,
                    recommendations: recommendations,
                    user: user.username,
                    domain: domain,
                    total_count: recommendations.length,
                    source: 'mock_data_for_week6_demo',
                    authentication: {
                        user_id: userId,
                        user_role: req.user.role,
                        authenticated: true
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error getting recommendations:', error.message);
            console.error('❌ Stack trace:', error.stack);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'RECOMMENDATION_ERROR',
                    message: 'Failed to get recommendations',
                    user: req.user?.username || 'unknown',
                    details: error.message
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
            
            // Mock history data for demo
            const mockHistory = [
                {
                    _id: "hist_1",
                    action: "recommendation_generated",
                    timestamp: new Date(),
                    metadata: { domain: "movies", count: 5, type: "demo_data" }
                }
            ];

            const mockStats = {
                actionBreakdown: [
                    { _id: "recommendation_generated", count: 1 }
                ],
                domainBreakdown: [
                    { _id: "movies", count: 1 }
                ],
                totalInteractions: 1
            };

            res.json({
                success: true,
                data: {
                    message: `Recommendation history for ${user.username}`,
                    user: {
                        id: user._id,
                        username: user.username,
                        preferences: user.preferences
                    },
                    history: mockHistory,
                    stats: mockStats,
                    total_interactions: mockHistory.length
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
    
    // Helper method: Handle cold start users (simplified for demo)
    async handleColdStartRecommendations(res, domain, count, user) {
        try {
            // Return mock popular items instead of database query
            const mockPopularItems = [
                { id: "popular_1", title: `Popular ${domain} 1`, avgrating: 8.5 },
                { id: "popular_2", title: `Popular ${domain} 2`, avgrating: 8.3 },
                { id: "popular_3", title: `Popular ${domain} 3`, avgrating: 8.1 }
            ].slice(0, count);

            return res.json({
                success: true,
                data: {
                    type: 'cold_start',
                    message: 'Popular recommendations for new user',
                    recommendations: mockPopularItems,
                    user: user.username,
                    domain: domain,
                    total_count: mockPopularItems.length,
                    source: 'popularity_based_demo'
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            throw new Error(`Cold start recommendations failed: ${error.message}`);
        }
    }
    
    // Helper method: Call ML service (disabled for demo)
    async getMLRecommendations(userId, inputItem, domain, count, preferences) {
        // For demo, always throw error to trigger fallback
        throw new Error('ML service not available in demo mode');
    }
    
    // Helper method: Content-based fallback recommendations (simplified)
    async getContentBasedRecommendations(preferences, domain, count, userId) {
        try {
            // Return mock content-based recommendations
            const mockContentRecs = [
                { id: "content_1", title: `${domain} matching your preferences`, score: 0.85 },
                { id: "content_2", title: `Similar ${domain} content`, score: 0.80 }
            ].slice(0, count);

            return mockContentRecs;
            
        } catch (error) {
            console.error('Content-based recommendation error:', error);
            return await this.getPopularRecommendations(domain, count);
        }
    }
    
    // Helper method: Popular items fallback (simplified)
    async getPopularRecommendations(domain, count) {
        return [
            { id: "fallback_1", title: `Fallback ${domain} 1`, avgrating: 8.0 },
            { id: "fallback_2", title: `Fallback ${domain} 2`, avgrating: 7.8 }
        ].slice(0, count);
    }
    
    // Helper method: Track recommendation generation (simplified)
    async trackRecommendationGenerated(userId, domain, count, type) {
        try {
            console.log(`📝 Tracked recommendation: ${type} for user ${userId} (${count} ${domain})`);
            // In real implementation, this would save to History model
            // For demo, just log it
        } catch (error) {
            console.error('❌ Failed to track recommendation:', error.message);
            // Don't fail the main request if tracking fails
        }
    }
    
    // Helper method: Get user history statistics (simplified)
    async getUserHistoryStats(userId) {
        try {
            // Return mock stats for demo
            return {
                actionBreakdown: [
                    { _id: "recommendation_generated", count: 5, avgRating: null },
                    { _id: "view", count: 3, avgRating: null }
                ],
                domainBreakdown: [
                    { _id: "movies", count: 4 },
                    { _id: "books", count: 4 }
                ],
                totalInteractions: 8
            };
            
        } catch (error) {
            console.error('❌ Error calculating user stats:', error);
            return { actionBreakdown: [], domainBreakdown: [], totalInteractions: 0 };
        }
    }
    
    // New method: Track user interactions (simplified for demo)
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

            // For demo, just return success without database operations
            res.json({
                success: true,
                data: {
                    message: 'Interaction tracked successfully (demo mode)',
                    interaction: {
                        action: action,
                        itemType: itemType,
                        itemId: itemId,
                        rating: rating || null,
                        timestamp: new Date()
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
    
    // Helper method: Update item analytics (simplified for demo)
    async updateItemAnalytics(itemId, itemType, action, rating) {
        try {
            console.log(`📊 Would update analytics for ${itemType} ${itemId} (demo mode)`);
            // In real implementation, this would update database
        } catch (error) {
            console.error('❌ Error updating item analytics:', error.message);
        }
    }
}

module.exports = new RecommendationController();
