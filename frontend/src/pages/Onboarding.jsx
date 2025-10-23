import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import Aurora from '../components/ui/Aurora';
import Stepper, { Step } from '../components/ui/Stepper';
import { recommendationService } from '../services/recommendations';
import userService from '../services/user';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [movieInput, setMovieInput] = useState('');
  const [bookInput, setBookInput] = useState('');
  const [musicInput, setMusicInput] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  
  const [hasMovieInput, setHasMovieInput] = useState(false);
  const [hasBookInput, setHasBookInput] = useState(false);
  const [hasMusicInput, setHasMusicInput] = useState(false);

  const genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Sci-Fi', 
    'Horror', 'Romance', 'Thriller', 'Documentary', 
    'Fantasy', 'Mystery', 'Animation'
  ];

  const handleStepChange = (step) => {
    if (step === 2 && movieInput.trim()) {
      setHasMovieInput(true);
    }
    if (step === 3 && bookInput.trim()) {
      setHasBookInput(true);
    }
    if (step === 4 && musicInput.trim()) {
      setHasMusicInput(true);
    }
  };

  const handleComplete = async () => {
    const likedItems = [];
    const allGenres = new Set(selectedGenres);

    // Process movie input
    if (movieInput.trim()) {
      try {
        const result = await recommendationService.processColdStart(movieInput, 'movies');
        if (result.success && result.item) {
          likedItems.push({
            item_id: result.item.asin,
            title: result.item.title,
            domain: 'movies',
            isFavorite: true,
            timestamp: new Date()
          });
          if (result.item.genres) {
            result.item.genres.forEach(g => allGenres.add(g));
          }
          toast.success(`Found: ${result.item.title}`);
        }
      } catch (error) {
        console.error('Movie processing error:', error);
      }
    }

    // Process book input
    if (bookInput.trim()) {
      try {
        const result = await recommendationService.processColdStart(bookInput, 'books');
        if (result.success && result.item) {
          likedItems.push({
            item_id: result.item.asin,
            title: result.item.title,
            domain: 'books',
            isFavorite: true,
            timestamp: new Date()
          });
          if (result.item.genres) {
            result.item.genres.forEach(g => allGenres.add(g));
          }
          toast.success(`Found: ${result.item.title}`);
        }
      } catch (error) {
        console.error('Book processing error:', error);
      }
    }

    // Process music input
    if (musicInput.trim()) {
      try {
        const result = await recommendationService.processColdStart(musicInput, 'music');
        if (result.success && result.item) {
          likedItems.push({
            item_id: result.item.asin,
            title: result.item.title,
            domain: 'music',
            isFavorite: true,
            timestamp: new Date()
          });
          if (result.item.genres) {
            result.item.genres.forEach(g => allGenres.add(g));
          }
          toast.success(`Found: ${result.item.title}`);
        }
      } catch (error) {
        console.error('Music processing error:', error);
      }
    }

    // ✅ SAVE TO BACKEND
    if (likedItems.length > 0 || allGenres.size > 0) {
      try {
        const genresArray = Array.from(allGenres);
        
        const updatedUser = await userService.updateProfile({
          preferences: {
            ...user.preferences,
            favorite_genres: genresArray,
            user_selected_genres: selectedGenres, // User manually selected
            liked_items: likedItems
          }
        });
        
        // Update local auth context
        updateUser(updatedUser);
        
        toast.success(`Saved ${likedItems.length} items and ${allGenres.size} genres!`);
      } catch (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to save preferences');
      }
    } else {
      toast.success('Setup complete!');
    }

    setTimeout(() => navigate('/home'), 1500);
  };

  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const needsGenreStep = !hasMovieInput && !hasBookInput && !hasMusicInput;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <Toaster position="top-right" />
      
      <div className="absolute inset-0">
        <Aurora 
          colorStops={['#5227FF', '#7cff67', '#5227FF']}
          amplitude={1.0}
          blend={0.5}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <Stepper
          initialStep={1}
          onStepChange={handleStepChange}
          onFinalStepCompleted={handleComplete}
          nextButtonText="Continue"
          backButtonText="Back"
        >
          <Step>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">🎬 Movies You Love</h2>
              <p className="text-white/70">Tell us about a movie you recently enjoyed</p>
              <p className="text-white/50 text-sm mt-2">(You can skip if you prefer)</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={movieInput}
                onChange={(e) => setMovieInput(e.target.value)}
                placeholder="e.g., Inception, The Matrix, Interstellar..."
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
          </Step>

          <Step>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">📚 Books You Love</h2>
              <p className="text-white/70">Share a book that left an impression</p>
              <p className="text-white/50 text-sm mt-2">(You can skip if you prefer)</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={bookInput}
                onChange={(e) => setBookInput(e.target.value)}
                placeholder="e.g., Harry Potter, 1984, The Hobbit..."
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
          </Step>

          <Step>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">🎵 Music You Love</h2>
              <p className="text-white/70">What artist or song moves you?</p>
              <p className="text-white/50 text-sm mt-2">(You can skip if you prefer)</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={musicInput}
                onChange={(e) => setMusicInput(e.target.value)}
                placeholder="e.g., Coldplay, Imagine Dragons, Taylor Swift..."
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
          </Step>

          <Step>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">🎯 Choose Your Favorite Genres</h2>
              <p className="text-white/70">
                {needsGenreStep 
                  ? "Help us understand your taste by selecting genres you enjoy"
                  : "Optionally add more genres to refine your recommendations"
                }
              </p>
              <p className="text-white/50 text-sm mt-2">Select at least 3 genres</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? 'bg-purple-600 text-white scale-105 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <p className="text-center text-white/80 mt-4">
                ✨ {selectedGenres.length} genre{selectedGenres.length > 1 ? 's' : ''} selected
              </p>
            )}
          </Step>
        </Stepper>
      </div>
    </div>
  );
};

export default Onboarding;