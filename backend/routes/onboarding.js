const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Music = require('../models/Music');
const Book = require('../models/Book');
const UserPreference = require('../models/UserPreference');
const { authenticateToken } = require('./auth');
const externalAPI = require('../services/externalAPI');

// Fuzzy matching utility (Layer 1)
function fuzzyMatch(input, items, key, threshold = 0.6) {
  const inputLower = input.toLowerCase();
  const matches = [];

  for (const item of items) {
    // Skip items without the key or with null/undefined values
    if (!item[key] || typeof item[key] !== 'string') {
      console.log(`⚠️  Skipping item without valid ${key}:`, item._id);
      continue;
    }

    const itemValue = item[key].toLowerCase();
    
    // Exact match
    if (itemValue === inputLower) {
      return [{ item, score: 1.0, matchType: 'exact' }];
    }

    // Contains match
    if (itemValue.includes(inputLower) || inputLower.includes(itemValue)) {
      matches.push({ item, score: 0.9, matchType: 'contains' });
      continue;
    }

    // Calculate Levenshtein distance for similarity
    const distance = levenshteinDistance(inputLower, itemValue);
    const maxLength = Math.max(inputLower.length, itemValue.length);
    const similarity = 1 - (distance / maxLength);

    if (similarity >= threshold) {
      matches.push({ item, score: similarity, matchType: 'fuzzy' });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// LAYER 1: Search in local dataset
router.post('/search-item',
  authenticateToken,
  async (req, res) => {
    try {
      const { query, type } = req.body; // type: 'movie', 'book', 'music'

      if (!query || !type) {
        return res.status(400).json({
          success: false,
          error: 'Query and type are required'
        });
      }

      let results = [];
      let Model;
      let searchKey = 'title';

      // Select appropriate model
      switch (type.toLowerCase()) {
        case 'movie':
          Model = Movie;
          break;
        case 'book':
          Model = Book;
          break;
        case 'music':
          Model = Music;
          searchKey = 'title'; // music also has 'title'
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid type. Must be movie, book, or music'
          });
      }

      // Fetch all items (consider pagination for large datasets)
      let items;
      if (type.toLowerCase() === 'movie') {
        // Movies use capitalized field names
        items = await Model.find()
          .select('Title Overview Release_Date Genre Vote_Average Popularity Poster_Url')
          .lean();
        
        console.log(`📊 Fetched ${items.length} movies from database`);
        
        // Normalize to lowercase field names for fuzzy matching
        items = items.map(item => {
          if (!item.Title) {
            console.log('⚠️  Movie without Title:', item._id);
          }
          return {
            ...item,
            title: item.Title || '',  // Ensure title is always a string
            description: item.Overview || '',
            genre: item.Genre ? item.Genre.split(',').map(g => g.trim()) : [],
            avgrating: item.Vote_Average || 0,
            year: item.Release_Date ? new Date(item.Release_Date).getFullYear() : null
          };
        });
        
        // Filter out items without titles
        items = items.filter(item => item.title && item.title.length > 0);
        console.log(`✅ After filtering: ${items.length} movies with valid titles`);
        
      } else {
        // Books and music use lowercase field names
        items = await Model.find()
          .select('title author singers genre year description likedpercent avgrating')
          .lean();
      }

      // Perform fuzzy matching
      const matches = fuzzyMatch(query, items, searchKey);

      // Format results
      results = matches.slice(0, 10).map(match => ({
        id: match.item._id,
        title: match.item.title,
        type: type,
        score: match.score,
        matchType: match.matchType,
        metadata: {
          director: match.item.director,
          author: match.item.author,
          singers: match.item.singers,
          genre: match.item.genre,
          year: match.item.year,
          description: match.item.description,
          likedpercent: match.item.likedpercent,
          avgrating: match.item.avgrating
        }
      }));

      res.json({
        success: true,
        data: {
          found: results.length > 0,
          results: results,
          searchedIn: 'local_dataset'
        }
      });

    } catch (error) {
      console.error('❌ Error searching item:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to search item',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// LAYER 2: External API enrichment (Gemini + TMDB/Google Books/Spotify)
router.post('/enrich-item',
  authenticateToken,
  async (req, res) => {
    try {
      const { query, type } = req.body;

      if (!query || !type) {
        return res.status(400).json({
          success: false,
          error: 'Query and type are required'
        });
      }

      console.log(`🌐 Layer 2: Enriching "${query}" via external APIs (type: ${type})`);

      // Call unified external API service
      const enrichmentResult = await externalAPI.enrichSearch(query, type);

      if (!enrichmentResult.success) {
        return res.status(500).json({
          success: false,
          error: enrichmentResult.error || 'External API enrichment failed',
          data: {
            corrected_query: query,
            original_query: query,
            suggestions: [],
            external_results: []
          }
        });
      }

      res.json({
        success: true,
        data: {
          corrected_query: enrichmentResult.corrected_query,
          original_query: enrichmentResult.original_query,
          spelling_confidence: enrichmentResult.spelling_confidence,
          suggestions: enrichmentResult.suggestions,
          external_results: enrichmentResult.external_results,
          found: enrichmentResult.found,
          source: enrichmentResult.source,
          message: enrichmentResult.found 
            ? `Found ${enrichmentResult.external_results.length} results from ${enrichmentResult.source}`
            : 'No results found from external APIs'
        }
      });

    } catch (error) {
      console.error('❌ Error enriching item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enrich item',
        message: error.message
      });
    }
  }
);

// LAYER 3: Get genre-based suggestions (fallback)
router.get('/genre-suggestions/:type',
  authenticateToken,
  async (req, res) => {
    try {
      const { type } = req.params;
      let Model;

      switch (type.toLowerCase()) {
        case 'movie':
          Model = Movie;
          break;
        case 'book':
          Model = Book;
          break;
        case 'music':
          Model = Music;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid type'
          });
      }

      // Get top-rated items as suggestions
      let suggestions;
      if (type.toLowerCase() === 'movie') {
        // Movies use different field names
        suggestions = await Model.find()
          .select('Title Overview Release_Date Genre Vote_Average Popularity')
          .sort({ Vote_Average: -1, Popularity: -1 })
          .limit(20)
          .lean();
        
        // Normalize to common format
        suggestions = suggestions.map(item => ({
          id: item._id,
          title: item.Title,
          type: type,
          metadata: {
            genre: item.Genre ? item.Genre.split(',').map(g => g.trim()) : [],
            year: item.Release_Date ? new Date(item.Release_Date).getFullYear() : null,
            description: item.Overview,
            avgrating: item.Vote_Average,
            popularity: item.Popularity
          }
        }));
      } else {
        // Books and music use lowercase fields
        suggestions = await Model.find()
          .select('title author singers genre year description likedpercent avgrating')
          .sort({ avgrating: -1, likedpercent: -1 })
          .limit(20)
          .lean();
        
        suggestions = suggestions.map(item => ({
          id: item._id,
          title: item.title,
          type: type,
          metadata: {
            author: item.author,
            singers: item.singers,
            genre: item.genre,
            year: item.year,
            description: item.description,
            likedpercent: item.likedpercent,
            avgrating: item.avgrating
          }
        }));
      }

      res.json({
        success: true,
        data: {
          suggestions: suggestions
        }
      });

    } catch (error) {
      console.error('❌ Error fetching suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch suggestions'
      });
    }
  }
);

// Save user's initial preferences (profile building)
router.post('/save-initial-preferences',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { preferences } = req.body; // { movies: [], books: [], music: [] }

      console.log('💾 Saving preferences for user:', userId);
      console.log('📦 Received preferences:', JSON.stringify(preferences));

      if (!preferences) {
        return res.status(400).json({
          success: false,
          error: 'Preferences are required'
        });
      }

      // Extract genres from selected items
      const genresSet = new Set();
      const domains = new Set();

      // Process movies
      if (preferences.movies && preferences.movies.length > 0) {
        console.log(`🎬 Processing ${preferences.movies.length} movies...`);
        domains.add('movies');
        for (const movieId of preferences.movies) {
          try {
            const movie = await Movie.findById(movieId);
            if (movie) {
              console.log(`  ✅ Found movie: ${movie.Title || movie.title || movieId}`);
              // Handle both Genre (string) and genre (array) formats
              if (movie.Genre && typeof movie.Genre === 'string') {
                const movieGenres = movie.Genre.split(',').map(g => g.trim());
                movieGenres.forEach(g => genresSet.add(g));
                console.log(`    Genres: ${movieGenres.join(', ')}`);
              } else if (movie.genre && Array.isArray(movie.genre)) {
                movie.genre.forEach(g => genresSet.add(g));
                console.log(`    Genres: ${movie.genre.join(', ')}`);
              } else {
                console.log(`    ⚠️  No genres found for movie ${movieId}`);
              }
            } else {
              console.log(`  ❌ Movie not found: ${movieId}`);
            }
          } catch (err) {
            console.error(`  ❌ Error processing movie ${movieId}:`, err.message);
          }
        }
      }

      // Process books
      if (preferences.books && preferences.books.length > 0) {
        domains.add('books');
        for (const bookId of preferences.books) {
          const book = await Book.findById(bookId);
          if (book && book.genre) {
            book.genre.forEach(g => genresSet.add(g));
          }
        }
      }

      // Process music
      if (preferences.music && preferences.music.length > 0) {
        domains.add('music');
        for (const musicId of preferences.music) {
          const music = await Music.findById(musicId);
          if (music && music.genre) {
            music.genre.forEach(g => genresSet.add(g));
          }
        }
      }

      // Get user info for username and email
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Create or update UserPreference (check by both user_id and email)
      let userPref = await UserPreference.findOne({ 
        $or: [
          { user_id: userId },
          { useremail: user.email }
        ]
      });

      if (!userPref) {
        console.log('📝 Creating new UserPreference document...');
        // Create new UserPreference with proper structure
        userPref = new UserPreference({
          user_id: userId,
          username: user.username,
          useremail: user.email,
          favourite_movies: (preferences.movies || []).map(id => ({ movie_id: id })),
          favourite_books: (preferences.books || []).map(id => ({ book_id: id })),
          completed_movies: (preferences.movies || []).map(id => ({ movie_id: id })),
          completed_books: (preferences.books || []).map(id => ({ book_id: id }))
        });
      } else {
        console.log('📝 Updating existing UserPreference document...');
        
        // Update user_id, username if needed (in case found by email only)
        if (userPref.user_id.toString() !== userId.toString()) {
          console.log('⚠️  Updating user_id in existing preference');
          userPref.user_id = userId;
        }
        if (userPref.username !== user.username) {
          userPref.username = user.username;
        }
        
        // Append to existing preferences
        if (preferences.movies && preferences.movies.length > 0) {
          const existingMovieIds = userPref.favourite_movies.map(m => m.movie_id.toString());
          const newMovies = preferences.movies
            .filter(id => !existingMovieIds.includes(id))
            .map(id => ({ movie_id: id }));
          
          if (newMovies.length > 0) {
            userPref.favourite_movies = [...userPref.favourite_movies, ...newMovies];
            console.log(`  Added ${newMovies.length} new favourite movies`);
          }
          
          const existingCompletedIds = userPref.completed_movies.map(m => m.movie_id.toString());
          const newCompleted = preferences.movies
            .filter(id => !existingCompletedIds.includes(id))
            .map(id => ({ movie_id: id }));
          
          if (newCompleted.length > 0) {
            userPref.completed_movies = [...userPref.completed_movies, ...newCompleted];
            console.log(`  Added ${newCompleted.length} new completed movies`);
          }
        }
        
        if (preferences.books && preferences.books.length > 0) {
          const existingBookIds = userPref.favourite_books.map(b => b.book_id.toString());
          const newBooks = preferences.books
            .filter(id => !existingBookIds.includes(id))
            .map(id => ({ book_id: id }));
          
          if (newBooks.length > 0) {
            userPref.favourite_books = [...userPref.favourite_books, ...newBooks];
            console.log(`  Added ${newBooks.length} new favourite books`);
          }
          
          const existingCompletedBookIds = userPref.completed_books.map(b => b.book_id.toString());
          const newCompletedBooks = preferences.books
            .filter(id => !existingCompletedBookIds.includes(id))
            .map(id => ({ book_id: id }));
          
          if (newCompletedBooks.length > 0) {
            userPref.completed_books = [...userPref.completed_books, ...newCompletedBooks];
            console.log(`  Added ${newCompletedBooks.length} new completed books`);
          }
        }
        
        userPref.updated_at = new Date();
      }

      console.log('💾 Saving UserPreference document...');
      await userPref.save();
      console.log('✅ UserPreference saved');

      // Update User model with extracted genres and domains
      console.log('👤 Updating User model...');
      const extractedGenres = Array.from(genresSet);
      const extractedDomains = Array.from(domains);
      
      console.log('📊 Extracted genres:', extractedGenres);
      console.log('🌐 Extracted domains:', extractedDomains);
      
      await User.findByIdAndUpdate(userId, {
        $set: {
          'preferences.genres': extractedGenres,
          'preferences.domains': extractedDomains
        }
      });
      console.log('✅ User model updated');

      res.json({
        success: true,
        data: {
          message: 'Initial preferences saved successfully',
          extractedGenres: extractedGenres,
          domains: extractedDomains
        }
      });

    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to save preferences',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;
