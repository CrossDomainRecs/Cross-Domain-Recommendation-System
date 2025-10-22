import { useState } from 'react';
import { Star, Heart, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { BackgroundGradient } from '../ui/BackgroundGradient';
import { motion, AnimatePresence } from 'motion/react';

const RecommendationCard = ({ item, onFavorite, onLike, onDislike, onExplain }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onFavorite?.(item);
  };

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

  return (
    <BackgroundGradient className="rounded-3xl p-1">
      <div className="bg-gray-900 rounded-3xl overflow-hidden">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
          {item.image && !imageError ? (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            // ✅ IMPROVED: Fallback UI for missing/broken images
            <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-blue-900/80 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl">
                {item.domain === 'movies' ? '🎬' : 
                 item.domain === 'books' ? '📚' : 
                 item.domain === 'music' ? '🎵' : '🎁'}
              </span>
              <span className="text-white/60 text-xs font-medium px-3 py-1 bg-black/30 rounded-full">
                {item.domain || 'media'}
              </span>
            </div>
          )}
          
          {/* Favorite Star */}
          <button
            onClick={handleFavorite}
            className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
          >
            <Star
              size={20}
              className={isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'}
            />
          </button>

          {/* Explain Button */}
          <button
            onClick={handleExplain}
            className="absolute bottom-2 right-2 p-2 bg-purple-600/80 backdrop-blur-sm rounded-full hover:bg-purple-600 transition-all"
          >
            <HelpCircle size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
            {item.title}
          </h3>

          {/* Rating & Genre */}
          <div className="flex items-center gap-3 mb-3">
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-white font-semibold">{item.rating.toFixed(1)}</span>
              </div>
            )}
            {item.genres && item.genres.length > 0 && (
              <span className="text-gray-400 text-sm">
                {item.genres.slice(0, 2).join(', ')}
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-gray-400 text-sm line-clamp-2 mb-4">
              {item.description}
            </p>
          )}

          {/* Explanation Tooltip */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-purple-900/50 rounded-lg border border-purple-500/50"
              >
                <p className="text-sm text-white/90">
                  {explanation || 'Loading explanation...'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onLike?.(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600/20 hover:bg-green-600/40 rounded-lg transition-all border border-green-500/30"
            >
              <ThumbsUp size={18} className="text-green-400" />
              <span className="text-green-400 font-medium">Like</span>
            </button>
            <button
              onClick={() => onDislike?.(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-all border border-red-500/30"
            >
              <ThumbsDown size={18} className="text-red-400" />
              <span className="text-red-400 font-medium">Pass</span>
            </button>
          </div>
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default RecommendationCard;