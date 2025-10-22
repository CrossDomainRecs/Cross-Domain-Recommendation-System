import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search as SearchIcon, User, Settings, X, Filter, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Aurora from '../components/ui/Aurora';
import Dock from '../components/ui/Dock';
import TargetCursor from '../components/ui/TargetCursor';
import { CardContainer, CardBody, CardItem } from '../components/ui/3DCard';

const FLASK_API = 'http://localhost:5001';

// Simple rotating text component
const SimpleRotatingText = ({ texts, interval = 1000 }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span className="inline-block min-w-[150px] text-center">
      {texts[index]}
    </span>
  );
};

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // States
  const [stage, setStage] = useState('loading'); // loading, selectDomain, browsing
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  // Domain data
  const domains = [
    { 
      id: 'movies', 
      name: 'Movies', 
      emoji: '🎬',
      gradient: 'from-purple-500/30 to-pink-500/30'
    },
    { 
      id: 'books', 
      name: 'Books', 
      emoji: '📚',
      gradient: 'from-blue-500/30 to-cyan-500/30'
    },
    { 
      id: 'music', 
      name: 'Music', 
      emoji: '🎵',
      gradient: 'from-green-500/30 to-emerald-500/30'
    }
  ];

  // Loading animation (2-3 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage('selectDomain');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch genres when domain selected
  useEffect(() => {
    if (selectedDomain) {
      fetchGenres();
    }
  }, [selectedDomain]);

  const fetchGenres = async () => {
    try {
      const response = await axios.get(`${FLASK_API}/api/explore/genres/${selectedDomain}`);
      if (response.data.success) {
        setGenres(response.data.genres);
      }
    } catch (error) {
      console.error('Failed to fetch genres:', error);
    }
  };

  const fetchPopularItems = async (domain) => {
    try {
      setLoading(true);
      const response = await axios.get(`${FLASK_API}/api/explore/popular/${domain}?limit=20`);
      if (response.data.success) {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsByGenre = async (domain, genre) => {
    try {
      setLoading(true);
      const response = await axios.get(`${FLASK_API}/api/explore/genre/${domain}/${encodeURIComponent(genre)}?limit=20`);
      if (response.data.success) {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch items by genre:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setStage('browsing');
    fetchPopularItems(domain);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    try {
      const response = await axios.get(`${FLASK_API}/api/explore/search/${selectedDomain}?q=${encodeURIComponent(query)}&limit=10`);
      if (response.data.success) {
        setSearchResults(response.data.items);
        setShowSearchDropdown(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSearchResultSelect = (item) => {
    setItems([item]);
    setSearchQuery(item.title);
    setShowSearchDropdown(false);
  };

  const handleGenreSelect = (genre) => {
    setSelectedGenre(genre);
    setShowGenreDropdown(false);
    fetchItemsByGenre(selectedDomain, genre);
  };

  const clearFilters = () => {
    setSelectedGenre(null);
    setSearchQuery('');
    fetchPopularItems(selectedDomain);
  };

  const handleSwitchDomain = () => {
    setStage('selectDomain');
    setSelectedDomain(null);
    setItems([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedGenre(null);
  };

  const handleGetRecommendations = async (item, recType) => {
  try {
    setLoading(true);
    
    // Map dropdown option to domain filter
    const domainMap = {
      'movies': 'movies',
      'books': 'books',
      'music': 'music',
      'cross': null  // null = cross-domain
    };
    
    const domainFilter = domainMap[recType];
    
    toast.loading(`Getting ${recType} recommendations...`);
    
    // Call the API
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `http://localhost:5000/api/recommendations/get`,
      {
        domain: domainFilter,
        limit: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    toast.dismiss();
    
    if (response.data.success) {
      toast.success(`Found ${response.data.count} recommendations!`);
      
      // Store in localStorage for home page
      localStorage.setItem('exploreRecommendations', JSON.stringify({
        recommendations: response.data.data,
        basedOn: item.title,
        domain: domainFilter || 'cross-domain'
      }));
      
      setTimeout(() => navigate('/home'), 500);
    }
    
  } catch (error) {
    toast.dismiss();
    console.error('Failed:', error);
    toast.error('Failed to get recommendations');
  } finally {
    setLoading(false);
  }
};

  const dockItems = [
    {
      icon: <Home size={24} />,
      label: 'Home',
      onClick: () => navigate('/home')
    },
    {
      icon: <SearchIcon size={24} />,
      label: 'Explore',
      onClick: () => navigate('/explore'),
      className: 'dock-item-active'
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

  // RENDER STAGES

  // Stage 1: Loading Animation with working rotating text
  if (stage === 'loading') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <Aurora 
          colorStops={['#5227FF', '#7cff67', '#5227FF']}
          amplitude={1.5}
          blend={0.6}
          speed={1.2}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl font-bold text-white flex items-center justify-center gap-4">
              <span>Explore</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-pulse">
                <SimpleRotatingText texts={['Movies', 'Books', 'Music']} interval={800} />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stage 2: Domain Selection with transparent cards
  if (stage === 'selectDomain') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <TargetCursor targetSelector=".cursor-target" />
        <Aurora 
          colorStops={['#5227FF', '#7cff67', '#5227FF']}
          amplitude={1.5}
          blend={0.6}
          speed={1.2}
        />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
          <h1 className="text-5xl font-bold text-white mb-12">Select a Domain</h1>
          <div className="flex gap-8 flex-wrap justify-center">
            {domains.map((domain) => (
              <CardContainer key={domain.id} className="inter-var cursor-target">
                <CardBody className={`bg-gradient-to-br ${domain.gradient} backdrop-blur-md relative group/card hover:shadow-2xl hover:shadow-emerald-500/[0.1] w-80 h-96 rounded-xl p-6 border border-white/30`}>
                  <CardItem
                    translateZ="50"
                    className="text-6xl mb-8 text-center w-full"
                  >
                    {domain.emoji}
                  </CardItem>
                  <CardItem
                    translateZ="60"
                    className="text-3xl font-bold text-white text-center w-full mb-8"
                  >
                    {domain.name}
                  </CardItem>
                  <CardItem
                    translateZ={20}
                    as="button"
                    onClick={() => handleDomainSelect(domain.id)}
                    className="w-full px-8 py-4 rounded-xl bg-white/90 backdrop-blur-sm text-black text-xl font-bold hover:bg-white transition-all"
                  >
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

  // Stage 3: Browsing Items
  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-32">
      <Toaster position="top-right" />
      <Aurora 
        colorStops={['#5227FF', '#7cff67', '#5227FF']}
        amplitude={1.5}
        blend={0.6}
        speed={1.2}
      />
      
      <div className="relative z-10">
        {/* Header with Search and Filter */}
        <div className="p-6 bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                {domains.find(d => d.id === selectedDomain)?.emoji}
                {domains.find(d => d.id === selectedDomain)?.name}
              </h1>
              {selectedGenre && (
                <span className="px-3 py-1 bg-purple-500/30 text-white rounded-full text-sm flex items-center gap-2">
                  {selectedGenre}
                  <X size={14} className="cursor-pointer" onClick={clearFilters} />
                </span>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                />
                
                {/* Search Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-30 max-h-96 overflow-y-auto">
                    {searchResults.map((item) => (
                      <div
                        key={item.asin}
                        onClick={() => handleSearchResultSelect(item)}
                        className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-0"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center text-2xl">
                            {domains.find(d => d.id === selectedDomain)?.emoji}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{item.title}</p>
                          <p className="text-white/50 text-sm">★ {item.rating || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  <Filter size={20} />
                  Filter
                </button>
                
                {/* Genre Dropdown */}
                {showGenreDropdown && genres.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-black/90 backdrop-blur-md border border-white/20 rounded-lg z-30">
                    {genres.map((genre, index) => (
                      <div
                        key={index}
                        onClick={() => handleGenreSelect(genre)}
                        className="px-4 py-3 text-white hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-0"
                      >
                        {genre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Clear Filters */}
              {(selectedGenre || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-white hover:bg-red-500/30 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-white text-xl">Loading...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-white text-xl mb-4">No items found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ExploreCard
                  key={item.asin}
                  item={item}
                  onGetRecommendations={handleGetRecommendations}
                  domainEmoji={domains.find(d => d.id === selectedDomain)?.emoji}
                />
              ))}
            </div>
          )}
        </div>

        {/* Switch Domain Button */}
        <button
          onClick={handleSwitchDomain}
          className="fixed bottom-24 right-8 z-30 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all flex items-center gap-2 shadow-lg"
        >
          <ArrowLeft size={20} />
          Switch Domain
        </button>

        <Dock items={dockItems} />
      </div>
    </div>
  );
};

// Explore Card Component
const ExploreCard = ({ item, onGetRecommendations, domainEmoji }) => {
  const [showRecDropdown, setShowRecDropdown] = useState(false);

  const recTypes = [
    { id: 'movies', label: 'Movie Recommendations', emoji: '🎬' },
    { id: 'books', label: 'Book Recommendations', emoji: '📚' },
    { id: 'music', label: 'Music Recommendations', emoji: '🎵' },
    { id: 'cross', label: 'Cross-Domain', emoji: '🌟' }
  ];

  // Handle description - could be string or array
  const getDescription = () => {
    if (!item.description) return '';
    if (Array.isArray(item.description)) {
      return item.description[0] || '';
    }
    return item.description;
  };

  return (
    <div className="relative group">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all">
        {/* Image */}
        <div className="relative h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-6xl">${domainEmoji}</div>`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {domainEmoji}
            </div>
          )}
          
          {/* Star Favorite (top right) */}
          <button className="absolute top-2 right-2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all">
            ⭐
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{item.title}</h3>
          
          {/* Rating */}
          {item.rating && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-yellow-400">⭐</span>
              <span className="text-white font-semibold">{item.rating}</span>
            </div>
          )}

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.genres.slice(0, 3).map((genre, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {getDescription() && (
            <p className="text-white/70 text-sm mb-4 line-clamp-2">{getDescription()}</p>
          )}

          {/* Get Recommendations Button */}
          <div className="relative">
            <button
              onClick={() => setShowRecDropdown(!showRecDropdown)}
              className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all"
            >
              Get Recommendations
            </button>

            {/* Recommendations Dropdown */}
            {showRecDropdown && (
              <div className="absolute bottom-full mb-2 w-full bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-10">
                {recTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => {
                      onGetRecommendations(item, type.id);
                      setShowRecDropdown(false);
                    }}
                    className="px-4 py-3 text-white hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-0 flex items-center gap-2"
                  >
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
