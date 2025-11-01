import { mlApi } from './api';
import api from './api';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'https://reclab-api.onrender.com';

export const recommendationService = {
  // ✅ FIXED: Get recommendations with user profile
  getRecommendations: async (params = {}) => {
    try {
      const { domain, limit = 20, userProfile } = params;
      
      // If user profile provided, use Python ML API for cold-start
      if (userProfile && (userProfile.liked_items?.length > 0 || userProfile.favorite_genres?.length > 0)) {
        console.log('🎯 Using cold-start recommendations with user profile');
        
        const response = await mlApi.post('/api/recommendations/for-new-user', {
          user_profile: userProfile,
          limit,
          domain_filter: domain
        });
        
        if (response.data.success) {
          return response.data.recommendations || [];
        }
      }
      
      // Fallback to Node.js backend (shouldn't reach here for new users)
      console.log('⚠️ Falling back to backend recommendations');
      const response = await api.post('/api/recommendations/get', {
        domain,
        limit
      });
      
      if (response.data.success) {
        return response.data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  },

  getDRLRecommendations: async (userProfile, options = {}) => {
    try {
      const { limit = 20, domain_filter = null, recent_interactions = [] } = options;

      const response = await mlApi.post('/api/drl/recommend', {
        user_profile: userProfile,
        limit,
        domain_filter,
        recent_interactions
      });

      if (response.data.success) {
        return response.data.recommendations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching DRL recommendations:', error);
      throw error;
    }
  },

  getColdStartRecommendations: async (userPreferences) => {
    try {
      const response = await mlApi.post('/api/cold-start/recommend', userPreferences);
      
      if (response.data.success) {
        return response.data.recommendations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching cold-start recommendations:', error);
      throw error;
    }
  },

  processColdStart: async (userInput, domain) => {
    try {
      const response = await mlApi.post('/api/cold-start/process-input', {
        user_input: userInput,
        domain: domain
      });
      
      if (response.data.success && response.data.matched_item) {
        return {
          success: true,
          item: response.data.matched_item,
          source: response.data.source
        };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Error processing cold-start input:', error);
      throw error;
    }
  },

  generateExplanation: async (userProfile, recommendedItem) => {
    try {
      const response = await mlApi.post('/api/explanations/generate', {
        user_profile: userProfile,
        recommended_item: recommendedItem,
        recommendation_source: 'hybrid'
      });
      
      if (response.data.success) {
        return response.data.explanation || 'No explanation available.';
      }
      
      return 'No explanation available.';
    } catch (error) {
      console.error('Error generating explanation:', error);
      return 'Could not generate explanation.';
    }
  },

  recordFeedback: async (itemId, feedback) => {
    try {
      const response = await api.post('/api/recommendations/feedback', {
        item_id: itemId,
        feedback: feedback
      });
      
      return response.data;
    } catch (error) {
      console.error('Error recording feedback:', error);
      throw error;
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get('/api/recommendations/history');
      
      if (response.data.success) {
        return response.data.data?.history || response.data.history || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }
};

export default recommendationService;