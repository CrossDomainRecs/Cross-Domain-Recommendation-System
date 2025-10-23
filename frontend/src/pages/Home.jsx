import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Search, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import recommendationService from '../services/recommendations';
import toast, { Toaster } from 'react-hot-toast';
import Dock from '../components/ui/Dock';
import RecommendationCard from '../components/recommendation/RecommendationCard';
import Aurora from '../components/ui/Aurora';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedItems, setLikedItems] = useState(new Set());
  const [dislikedItems, setDislikedItems] = useState(new Set());

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // ✅ FIXED: Proper params structure and response handling
      const data = await recommendationService.getRecommendations({ 
        limit: 20 
      });
      
      // ✅ FIXED: Handle array response correctly
      if (Array.isArray(data)) {
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

  const handleFavorite = async (item) => {
  try {
    await recommendationService.recordFeedback(item.asin, {
      action: 'favorite',
      time_spent: 0,
      title: item.title,
      domain: item.domain
    });
    toast.success('Added to favorites!');
  } catch (error) {
    console.error('Favorite error:', error);
    toast.error('Failed to add to favorites');
  }
};

const handleLike = async (item) => {
  try {
    await recommendationService.recordFeedback(item.asin, {
      action: 'like',
      time_spent: 0,
      title: item.title,
      domain: item.domain
    });
    setLikedItems(prev => new Set([...prev, item.asin]));
    toast.success('Thanks for the feedback!');
  } catch (error) {
    console.error('Like error:', error);
    toast.error('Failed to record feedback');
  }
};

const handleDislike = async (item) => {
  try {
    await recommendationService.recordFeedback(item.asin, {
      action: 'dislike',
      time_spent: 0,
      title: item.title,
      domain: item.domain
    });
    setDislikedItems(prev => new Set([...prev, item.asin]));
    toast.success('We will show you less like this');
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
      
      const explanation = await recommendationService.generateExplanation(
        userProfile,
        {
          title: item.title,
          genres: item.genres || [],
          domain: item.domain,
          rating: item.rating,
          description: item.description
        }
      );
      
      return explanation;
    } catch (error) {
      console.error('Explanation error:', error);
      return 'Unable to generate explanation at this time.';
    }
  };

  const dockItems = [
    {
      icon: <HomeIcon size={24} />,
      label: 'Home',
      onClick: () => navigate('/home'),
      className: 'dock-item-active'
    },
    {
      icon: <Search size={24} />,
      label: 'Explore',
      onClick: () => navigate('/explore')
    },
    {
      icon: <User size={24} />,
      label: 'Profile',
      onClick: () => navigate('/profile')
    },
    {
      icon: <Settings size={24} />,
      label: 'Settings',
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-32">
      <Toaster position="top-right" />
      
      {/* Aurora Background */}
      <Aurora 
        colorStops={['#5227FF', '#7cff67', '#5227FF']}
        amplitude={1.5}
        blend={0.6}
        speed={1.2}
      />

      {/* Content - relative positioning puts it above Aurora */}
      <div className="relative z-10">
        {/* Header */}
        <div className="p-6 bg-black/30 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-1">
              Welcome back, {user?.username}! 👋
            </h1>
            <p className="text-white/70">
              Here are your personalized recommendations
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-white text-xl">Loading recommendations...</div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-white text-xl mb-4">No recommendations yet</p>
                <button
                  onClick={loadRecommendations}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition-all"
                >
                  Load Recommendations
                </button>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Dock Navigation */}
        <Dock items={dockItems} />
      </div>
    </div>
  );
};

export default Home;