import api from './api';

// ML API base URL (Flask server on port 5001)
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001';

export const recommendationService = {
  /**
   * Get recommendations for authenticated user
   */
  getRecommendations: async (params = {}) => {
    try {
      const { domain, limit = 20 } = params;
      
      // ✅ POST request (as per backend route)
      const response = await api.post('/api/recommendations/get', {
        domain,
        limit
      });
      
      // ✅ Backend returns: { success: true, data: [...], count, method }
      if (response.data.success) {
        // Data is directly the recommendations array
        return response.data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recommendations from backend:', error);
      throw error;
    }
  },

  /**
   * Get DRL-enhanced recommendations (from Flask ML API)
   */
  getDRLRecommendations: async (userProfile, options = {}) => {
    try {
      const {
        limit = 20,
        domain_filter = null,
        recent_interactions = []
      } = options;

      const response = await fetch(`${ML_API_URL}/api/drl/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          limit,
          domain_filter,
          recent_interactions
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.recommendations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching DRL recommendations:', error);
      throw error;
    }
  },

  /**
   * Get cold-start recommendations for new users (from Flask ML API)
   */
  getColdStartRecommendations: async (userPreferences) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/cold-start/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPreferences)
      });

      const data = await response.json();
      
      if (data.success) {
        return data.recommendations || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching cold-start recommendations:', error);
      throw error;
    }
  },

  /**
   * Process user input during onboarding (from Flask ML API)
   */
  processColdStart: async (userInput, domain) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/cold-start/process-input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_input: userInput,
          domain: domain
        })
      });

      const data = await response.json();
      
      if (data.success && data.matched_item) {
        // Store the matched item for building user profile
        return {
          success: true,
          item: data.matched_item,
          source: data.source
        };
      }
      
      return { success: false, error: data.error };
    } catch (error) {
      console.error('Error processing cold-start input:', error);
      throw error;
    }
  },

  /**
   * Generate explanation for a recommendation (from Flask ML API)
   */
  generateExplanation: async (userProfile, recommendedItem) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/explanations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          recommended_item: recommendedItem,
          recommendation_source: 'hybrid'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.explanation || 'No explanation available.';
      }
      
      return 'No explanation available.';
    } catch (error) {
      console.error('Error generating explanation:', error);
      return 'Could not generate explanation.';
    }
  },

  /**
   * Record user feedback (like/dislike)
   */
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

  /**
   * Get user's interaction history
   */
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