import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Search, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendationContext } from '../contexts/RecommendationContext';
import recommendationService from '../services/recommendations';
import interactionService from '../services/interactionService';
import toast, { Toaster } from 'react-hot-toast';
import Dock from '../components/ui/Dock';
import RecommendationCard from '../components/recommendation/RecommendationCard';
import Aurora from '../components/ui/Aurora';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recommendations: exploreRecs, explanation, clearRecommendations } = useRecommendationContext();
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedItems, setLikedItems] = useState(new Set());
  const [dislikedItems, setDislikedItems] = useState(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // ✅ Pass user profile to recommendation service
      const userProfile = user?.preferences ? {
        favorite_genres: user.preferences.favorite_genres || [],
        user_selected_genres: user.preferences.user_selected_genres || [],
        liked_items: user.preferences.liked_items || []
      } : null;

      console.log('📊 Loading recommendations with profile:', userProfile);

      const data = await recommendationService.getRecommendations({ 
        limit: 20,
        userProfile
      });

      if (Array.isArray(data)) {
        console.log(`✅ Loaded ${data.length} recommendations`);
        setRecommendations(data);
      } else {
        console.warn('Unexpected recommendations format:', data);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Record feedback to BOTH Node.js + Python ML API
  const handleFavorite = async (item) => {
    try {
      // 1. Save to Node.js backend (updates user profile)
      await recommendationService.recordFeedback(item.asin, {
        action: 'favorite',
        time_spent: 0,
        title: item.title,
        domain: item.domain
      });

      // 2. Train DRL agent via Python ML API
      const drlResult = await interactionService.recordFavorite(
        user._id,
        item.asin,
        item.domain
      );

      console.log('🤖 DRL Training:', drlResult);

      toast.success('Added to favorites! 🌟');
    } catch (error) {
      console.error('Favorite error:', error);
      toast.error('Failed to add to favorites');
    }
  };

  // ✅ FIXED: Like with DRL training
  const handleLike = async (item) => {
    try {
      // 1. Save to Node.js backend
      await recommendationService.recordFeedback(item.asin, {
        action: 'like',
        time_spent: 0,
        title: item.title,
        domain: item.domain
      });

      // 2. Train DRL agent
      const drlResult = await interactionService.recordLike(
        user._id,
        item.asin,
        item.domain
      );

      console.log('🤖 DRL Training:', drlResult);

      setLikedItems(prev => new Set([...prev, item.asin]));
      toast.success('Thanks for the feedback! 👍');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to record feedback');
    }
  };

  // ✅ FIXED: Dislike with DRL training (pass/skip)
  const handleDislike = async (item) => {
    try {
      // 1. Save to Node.js backend
      await recommendationService.recordFeedback(item.asin, {
        action: 'dislike',
        time_spent: 0,
        title: item.title,
        domain: item.domain
      });

      // 2. Train DRL agent (using 'skip' action)
      const drlResult = await interactionService.recordPass(
        user._id,
        item.asin,
        item.domain
      );

      console.log('🤖 DRL Training:', drlResult);

      setDislikedItems(prev => new Set([...prev, item.asin]));
      setRecommendations(prev => prev.filter(i => i.asin !== item.asin));
      toast.success('We will show you less like this 👎');
    } catch (error) {
      console.error('Dislike error:', error);
      toast.error('Failed to record feedback');
    }
  };

  const handleExplain = async (item) => {
    try {
      const userProfile = {
        favorite_genres: user?.preferences?.favorite_genres || [],
        liked_items: user?.preferences?.liked_items || []
      };
      const explanation = await recommendationService.generateExplanation(userProfile, {
        title: item.title,
        genres: item.genres || [],
        domain: item.domain,
        rating: item.rating,
        description: item.description
      });
      return explanation;
    } catch (error) {
      console.error('Explanation error:', error);
      return 'Unable to generate explanation at this time.';
    }
  };

  const dockItems = [
    { icon: <HomeIcon size={24} />, label: 'Home', onClick: () => navigate('/home'), className: 'dock-item-active' },
    { icon: <Search size={24} />, label: 'Explore', onClick: () => navigate('/explore') },
    { icon: <User size={24} />, label: 'Profile', onClick: () => navigate('/profile') },
    { icon: <Settings size={24} />, label: 'Settings', onClick: () => navigate('/settings') }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-32">
      <Toaster position="top-right" />
      <div className="absolute inset-0 z-0">
        <Aurora colorStops={['#5227FF', '#7cff67', '#5227FF']} amplitude={1.5} blend={0.6} speed={1.2} />
      </div>

      <div className="relative z-10">
        <div className="p-6 bg-black/30 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {user?.username}! 👋</h1>
            <p className="text-white/70">Here are your personalized recommendations</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <div className="text-white text-xl">Loading your recommendations...</div>
              </div>
            </div>
          ) : recommendations.length === 0 && exploreRecs.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-white text-xl mb-4">No recommendations yet</p>
                <p className="text-white/60 mb-6">Complete your onboarding or explore to get started!</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-all"
                  >
                    Complete Onboarding
                  </button>
                  <button
                    onClick={loadRecommendations}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-all"
                  >
                    Retry Loading
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* COLD-START RECOMMENDATIONS */}
              {recommendations.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6">🎯 Personalized For You</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recommendations.map((item) => (
                      <RecommendationCard
                        key={item.asin}
                        item={item}
                        onFavorite={handleFavorite}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        onExplain={handleExplain}
                        isLiked={likedItems.has(item.asin)}
                        isDisliked={dislikedItems.has(item.asin)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* EXPLORE RECOMMENDATIONS APPENDED */}
              {exploreRecs.length > 0 && (
                <div className="mt-16 pt-12 border-t border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">✨ From Explore</h2>
                      {explanation && <p className="text-white/70 text-sm">{explanation}</p>}
                    </div>
                    <button
                      onClick={clearRecommendations}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {exploreRecs.map((item) => (
                      <RecommendationCard
                        key={item.asin || item.id}
                        item={item}
                        onFavorite={handleFavorite}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        onExplain={handleExplain}
                        isLiked={likedItems.has(item.asin)}
                        isDisliked={dislikedItems.has(item.asin)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Dock items={dockItems} />
      </div>
    </div>
  );
};

export default Home;