import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Search as SearchIcon,
  User,
  Settings,
  ArrowLeft,
  Filter,
  ThumbsDown,
  ThumbsUp,
  HelpCircle,
  Star,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendationContext } from '../contexts/RecommendationContext';
import exploreService from '../services/exploreService';
import interactionService from '../services/interactionService';
import recommendationService from '../services/recommendations';
import toast, { Toaster } from 'react-hot-toast';
import Aurora from '../components/ui/Aurora';
import Dock from '../components/ui/Dock';
import TargetCursor from '../components/ui/TargetCursor';
import { CardContainer, CardBody, CardItem } from '../components/ui/3DCard';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundGradient } from '../components/ui/BackgroundGradient';
import useDebounce from '../hooks/useDebounce';
import useFuzzySearch from '../hooks/useFuzzySearch';

// ✅ FIXED: Side-by-side animation
const RotatingTextIntro = ({ texts = ['Movies', 'Books', 'Music'], interval = 800 }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <div className="flex items-center justify-center gap-4">
      <motion.span
        initial={{ opacity: 1, y: 0 }}
        className="text-6xl font-bold text-white"
      >
        Choose
      </motion.span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 min-w-[200px] text-center"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const ExploreItemCard = ({
  item,
  onLike,
  onPass,
  onFavorite,
  onExplain,
  onGetRecommendation,
  isLiked,
  isFavorite,
  isLoading,
  currentDomain
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [imageError, setImageError] = useState(false);
  const [showRecMenu, setShowRecMenu] = useState(false);
  const [loadingRec, setLoadingRec] = useState(null);

  const handleExplain = async () => {
    if (!explanation) {
      try {
        const result = await onExplain?.(item);
        setExplanation(result || 'Could not generate explanation.');
      } catch (error) {
        setExplanation('Failed to generate explanation.');
      }
    }
    setShowExplanation(!showExplanation);
  };

  const handleGetRecommendation = async (targetDomain) => {
    setLoadingRec(targetDomain);
    try {
      await onGetRecommendation?.(item, targetDomain);
    } finally {
      setLoadingRec(null);
      setShowRecMenu(false);
    }
  };

  // ✅ FIXED: Dynamic recommendation options based on current domain
  const recommendationOptions = [
    { domain: 'movies', label: 'Movie Recommendations', emoji: '🎬', enabled: true },
    { domain: 'books', label: 'Book Recommendations', emoji: '📚', enabled: true },
    { domain: 'music', label: 'Music Recommendations', emoji: '🎵', enabled: true },
    { domain: 'cross', label: 'Cross-Domain Magic', emoji: '🌟', enabled: true }
  ];

  const itemId = item.parent_asin || item.asin || item._id;

  return (
    <BackgroundGradient className="rounded-3xl p-1 h-full">
      <div className="bg-gray-900 rounded-3xl overflow-hidden h-full flex flex-col">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
          {item.image && !imageError ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-blue-900/80 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl">
                {item.domain === 'movies' ? '🎬' :
                  item.domain === 'books' ? '📚' :
                    item.domain === 'music' ? '🎵' : '🎁'}
              </span>
            </div>
          )}

          <button
            onClick={() => onFavorite?.(item)}
            className={`absolute top-2 right-2 p-2 backdrop-blur-sm rounded-full transition-all ${
              isFavorite ? 'bg-yellow-500/50 hover:bg-yellow-500/70' : 'bg-black/50 hover:bg-black/70'
            }`}
          >
            <Star size={20} className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'} />
          </button>

          <button
            onClick={handleExplain}
            className="absolute bottom-2 right-2 p-2 bg-purple-600/80 backdrop-blur-sm rounded-full hover:bg-purple-600 transition-all"
          >
            <HelpCircle size={18} className="text-white" />
          </button>
        </div>

        <div className="p-4 flex-grow flex flex-col">
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{item.title}</h3>

          <div className="flex items-center gap-2 mb-3">
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-white font-semibold text-sm">{parseFloat(item.rating).toFixed(1)}</span>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-purple-900/50 rounded-lg border border-purple-500/50"
              >
                <p className="text-sm text-white/90">{explanation || 'Loading...'}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onLike?.(item)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 rounded-lg transition-all border border-green-500/30"
            >
              <ThumbsUp size={16} className="text-green-400" />
              <span className="text-green-400 font-medium text-sm">Like</span>
            </button>
            <button
              onClick={() => onPass?.(item)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 rounded-lg transition-all border border-red-500/30"
            >
              <ThumbsDown size={16} className="text-red-400" />
              <span className="text-red-400 font-medium text-sm">Pass</span>
            </button>
          </div>

          <div className="relative mt-auto">
            <button
              onClick={() => setShowRecMenu(!showRecMenu)}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all flex items-center justify-between"
            >
              <span>Get Recommendations</span>
              <ChevronDown size={18} className={`transition-transform ${showRecMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showRecMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 w-full bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-lg overflow-hidden shadow-2xl z-50"
                >
                  {recommendationOptions.map((option) => (
                    <button
                      key={option.domain}
                      onClick={() => handleGetRecommendation(option.domain)}
                      disabled={loadingRec === option.domain || !option.enabled}
                      className="w-full px-4 py-3 text-left hover:bg-purple-600/30 transition-colors border-b border-purple-500/10 last:border-b-0 disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-white font-medium">{option.label}</span>
                      {loadingRec === option.domain && <span className="ml-auto text-xs text-purple-400">Loading...</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCrossdomainRecommendations } = useRecommendationContext();
  
  const [stage, setStage] = useState('loading');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [likedItems, setLikedItems] = useState(new Set());
  const [favoriteItems, setFavoriteItems] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  
  // ✅ FIXED: Better filtering logic
  const filteredItems = useFuzzySearch(
    selectedGenre 
      ? allItems.filter(item => item.genres?.includes(selectedGenre)) 
      : allItems,
    debouncedSearchQuery,
    0.3,
    ['title']
  );

  const domains = [
    { id: 'movies', name: 'Movies', emoji: '🎬' },
    { id: 'books', name: 'Books', emoji: '📚' },
    { id: 'music', name: 'Music', emoji: '🎵' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setStage('selectDomain'), 3000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ FIXED: Load data with proper search handling
  const loadDomainData = async (domain, genreFilter = null, searchTerm = null) => {
    try {
      setLoading(true);
      
      let items = [];
      
      // Search mode
      if (searchTerm && searchTerm.length > 0) {
        items = await exploreService.searchItems(domain, searchTerm, 50);
      }
      // Genre filter mode
      else if (genreFilter) {
        items = await exploreService.getItemsByGenre(domain, genreFilter, 50);
      }
      // Default: popular items
      else {
        items = await exploreService.getPopularItems(domain, 50);
      }
      
      setAllItems(items || []);
      
      // Load genres if not loaded
      if (genres.length === 0) {
        const genresRes = await exploreService.getGenres(domain);
        setGenres(genresRes || []);
      }
    } catch (error) {
      console.error('Error loading domain data:', error);
      toast.error(`Failed to load ${domain}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Reload on search/filter change
  useEffect(() => {
    if (selectedDomain && stage === 'browsing') {
      loadDomainData(selectedDomain, selectedGenre, debouncedSearchQuery);
    }
  }, [selectedDomain, selectedGenre, debouncedSearchQuery]);

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setStage('browsing');
    setSearchQuery('');
    setSelectedGenre(null);
    setGenres([]);
    loadDomainData(domain);
  };

  const handleLike = async (item) => {
    try {
      const itemId = item.parent_asin || item.asin;
      setActionLoading(itemId);
      await interactionService.recordLike(user._id, itemId, item.domain);
      setLikedItems(prev => new Set([...prev, itemId]));
      toast.success('Liked! ❤️');
    } catch (error) {
      console.error('Like error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePass = async (item) => {
    try {
      const itemId = item.parent_asin || item.asin;
      setActionLoading(itemId);
      await interactionService.recordPass(user._id, itemId, item.domain);
      toast.success('Noted! 👋');
    } catch (error) {
      console.error('Pass error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFavorite = async (item) => {
    try {
      const itemId = item.parent_asin || item.asin;
      setActionLoading(itemId);
      await interactionService.recordFavorite(user._id, itemId, item.domain);
      setFavoriteItems(prev => new Set([...prev, itemId]));
      toast.success('Added to favorites! ⭐');
    } catch (error) {
      console.error('Favorite error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ FIXED: Complete recommendation logic for ALL domains
  const handleGetRecommendation = async (item, targetDomain) => {
    try {
      const itemId = item.parent_asin || item.asin;
      setActionLoading(itemId);

      let recommendations = [];
      let explanation = '';

      console.log(`🎯 Getting ${targetDomain} recommendations for ${selectedDomain} item: ${item.title}`);

      if (targetDomain === 'cross') {
        // Cross-domain: Get recommendations from a different domain
        const targetDomainMap = {
          'movies': 'books',
          'books': 'music',
          'music': 'movies'
        };
        const actualTarget = targetDomainMap[selectedDomain];
        
        const result = await exploreService.getCrossDomainRecommendations(
          itemId,
          selectedDomain,
          actualTarget,
          20
        );
        recommendations = result.recommendations;
        explanation = result.explanation || `Because you enjoyed "${item.title}" in ${selectedDomain}, you might like these ${actualTarget}!`;
      } 
      else if (targetDomain === selectedDomain) {
        // Same domain: Get similar items
        recommendations = await exploreService.getSimilarItems(itemId, 20, targetDomain);
        explanation = `Similar ${targetDomain} to "${item.title}"`;
      } 
      else {
        // Different domain: Cross-domain recommendations
        const result = await exploreService.getCrossDomainRecommendations(
          itemId,
          selectedDomain,
          targetDomain,
          20
        );
        recommendations = result.recommendations;
        explanation = result.explanation || `Because you enjoyed "${item.title}" (${selectedDomain}), try these ${targetDomain}!`;
      }

      if (recommendations && recommendations.length > 0) {
        setCrossdomainRecommendations(recommendations, item, targetDomain, explanation);
        toast.success(`🎯 ${recommendations.length} recommendations loaded!`);
        setTimeout(() => navigate('/home'), 800);
      } else {
        toast.error('No recommendations found');
      }
    } catch (error) {
      console.error('Recommendation error:', error);
      toast.error('Failed to get recommendations');
    } finally {
      setActionLoading(null);
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
      return 'Unable to generate explanation.';
    }
  };

  const dockItems = [
    { icon: <Home size={24} />, label: 'Home', onClick: () => navigate('/home') },
    { icon: <SearchIcon size={24} />, label: 'Explore', className: 'dock-item-active' },
    { icon: <User size={24} />, label: 'Profile', onClick: () => navigate('/profile') },
    { icon: <Settings size={24} />, label: 'Settings', onClick: () => navigate('/settings') }
  ];

  if (stage === 'loading') {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Aurora colorStops={['#5227FF', '#7cff67', '#5227FF']} amplitude={1.5} blend={0.6} />
        </div>
        <div className="relative z-10 flex items-center justify-center h-screen">
          <RotatingTextIntro texts={['Movies', 'Books', 'Music']} interval={1000} />
        </div>
      </div>
    );
  }

  if (stage === 'selectDomain') {
    return (
      <div className="relative min-h-screen bg-black text-white overflow-hidden pb-24">
        <Toaster position="top-right" />
        <TargetCursor />
        <div className="absolute inset-0 z-0">
          <Aurora colorStops={['#5227FF', '#7cff67', '#5227FF']} amplitude={1.5} blend={0.6} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-6xl font-bold mb-16 text-center">
            Select a Domain
          </motion.h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
            {domains.map((domain) => (
              <CardContainer key={domain.id}>
                <CardBody className="bg-gradient-to-br from-purple-700/30 to-blue-700/30 w-full h-80 rounded-3xl p-8 border border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-all">
                  <motion.div initial={{ scale: 1 }} whileHover={{ scale: 1.1 }} className="text-7xl mb-6">
                    {domain.emoji}
                  </motion.div>
                  <h3 className="text-3xl font-bold mb-6 text-center">{domain.name}</h3>
                  <CardItem as="button" onClick={() => handleDomainSelect(domain.id)} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all">
                    Explore {domain.name}
                  </CardItem>
                </CardBody>
              </CardContainer>
            ))}
          </div>
        </div>
        <Dock items={dockItems} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white pb-32">
      <Toaster position="top-right" />
      <div className="absolute inset-0 z-0">
        <Aurora colorStops={['#5227FF', '#7cff67', '#5227FF']} amplitude={1.5} blend={0.6} />
      </div>
      <div className="relative z-10">
        <div className="p-6 bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => {
                  setStage('selectDomain');
                  setSearchQuery('');
                  setSelectedGenre(null);
                }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <ArrowLeft size={22} />
                </button>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {domains.find(d => d.id === selectedDomain)?.emoji} {domains.find(d => d.id === selectedDomain)?.name}
                </h1>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={`Search ${selectedDomain}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500/50 transition"
                />
                <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={18} />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowGenreFilter(!showGenreFilter)}
                  className={`px-4 py-3 backdrop-blur-sm border rounded-lg text-white hover:bg-white/20 transition flex items-center gap-2 ${
                    selectedGenre ? 'bg-purple-600/40 border-purple-500' : 'bg-white/10 border-white/20'
                  }`}
                >
                  <Filter size={18} />
                  <span className="text-sm">{selectedGenre || 'Filter'}</span>
                </button>

                <AnimatePresence>
                  {showGenreFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
                    >
                      <button
                        onClick={() => { 
                          setSelectedGenre(null); 
                          setShowGenreFilter(false); 
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-white/10 transition border-b border-white/10 text-white font-medium"
                      >
                        All Genres
                      </button>
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => {
                            setSelectedGenre(selectedGenre === genre ? null : genre);
                            setShowGenreFilter(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-white/10 transition border-b border-white/10 ${
                            selectedGenre === genre ? 'bg-purple-600/40 text-purple-200' : 'text-white'
                          }`}
                        >
                          {genre} {selectedGenre === genre && <span className="ml-2">✓</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4" />
                <p className="text-white/70">Loading {selectedDomain}...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <p className="text-white text-xl mb-2">
                  {searchQuery ? `No results for "${searchQuery}"` : 
                   selectedGenre ? `No ${selectedGenre} items found` : 
                   'No items found'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre(null);
                  }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const itemId = item.parent_asin || item.asin;
                return (
                  <ExploreItemCard
                    key={itemId}
                    item={item}
                    onLike={handleLike}
                    onPass={handlePass}
                    onFavorite={handleFavorite}
                    onExplain={handleExplain}
                    onGetRecommendation={handleGetRecommendation}
                    isLiked={likedItems.has(itemId)}
                    isFavorite={favoriteItems.has(itemId)}
                    isLoading={actionLoading === itemId}
                    currentDomain={selectedDomain}
                  />
                );
              })}
            </div>
          )}
        </div>

        <motion.button
          onClick={() => {
            setStage('selectDomain');
            setSearchQuery('');
            setSelectedGenre(null);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 right-6 px-6 py-3 bg-purple-600/30 backdrop-blur-md hover:bg-purple-600/50 border border-purple-500/50 rounded-full text-white font-semibold transition-all flex items-center gap-2 z-40"
        >
          <span>Switch Domain</span>
          <ChevronDown size={18} className="rotate-90" />
        </motion.button>

        <Dock items={dockItems} />
      </div>
    </div>
  );
};

export default Explore;