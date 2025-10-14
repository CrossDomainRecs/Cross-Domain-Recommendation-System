const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize APIs
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * External API Service for Layer 2 Integration
 * Handles: Gemini (spelling), TMDB (movies), Google Books (books), Spotify (music)
 */
class ExternalAPIService {

  // ===========================
  // GEMINI API - Spelling Correction & Validation
  // ===========================
  
  async correctSpelling(query, type) {
    try {
      if (!geminiClient) {
        console.log('⚠️  Gemini API key not configured, skipping spelling correction');
        return { corrected: query, confidence: 0, suggestions: [] };
      }

      const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `You are a helpful assistant that corrects spelling and provides suggestions for ${type} searches.
      
User searched for: "${query}"
Type: ${type}

Task:
1. If the query has spelling mistakes, provide the corrected version
2. If it's correct, return the same query
3. Provide up to 3 alternative suggestions if applicable
4. Rate your confidence (0-1)

Respond ONLY with a valid JSON object in this exact format:
{
  "corrected": "corrected query",
  "confidence": 0.95,
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ Gemini spelling correction: "${query}" → "${parsed.corrected}" (confidence: ${parsed.confidence})`);
        return parsed;
      }
      
      throw new Error('Invalid response format from Gemini');

    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      return { corrected: query, confidence: 0, suggestions: [] };
    }
  }

  // ===========================
  // TMDB API - Movie Search
  // ===========================
  
  async searchMovie(query) {
    try {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        console.log('⚠️  TMDB API key not configured');
        return { found: false, results: [] };
      }

      const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
        params: {
          api_key: apiKey,
          query: query,
          language: 'en-US',
          page: 1,
          include_adult: false
        },
        timeout: 5000
      });

      const results = response.data.results.slice(0, 5).map(movie => ({
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        description: movie.overview,
        rating: movie.vote_average,
        popularity: movie.popularity,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        genres: movie.genre_ids || [],
        tmdb_id: movie.id,
        source: 'tmdb'
      }));

      console.log(`✅ TMDB found ${results.length} movies for "${query}"`);
      return { found: results.length > 0, results };

    } catch (error) {
      console.error('❌ TMDB API error:', error.message);
      return { found: false, results: [], error: error.message };
    }
  }

  async getMovieDetails(tmdbId) {
    try {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) return null;

      const response = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
        params: {
          api_key: apiKey,
          language: 'en-US'
        },
        timeout: 5000
      });

      const movie = response.data;
      return {
        title: movie.title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        description: movie.overview,
        rating: movie.vote_average,
        popularity: movie.popularity,
        runtime: movie.runtime,
        genres: movie.genres.map(g => g.name),
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
        tmdb_id: movie.id,
        source: 'tmdb'
      };

    } catch (error) {
      console.error('❌ TMDB details error:', error.message);
      return null;
    }
  }

  // ===========================
  // GOOGLE BOOKS API - Book Search
  // ===========================
  
  async searchBook(query) {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY || '';
      
      const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
        params: {
          q: query,
          key: apiKey,
          maxResults: 5,
          printType: 'books',
          langRestrict: 'en'
        },
        timeout: 5000
      });

      if (!response.data.items) {
        console.log('⚠️  No books found from Google Books');
        return { found: false, results: [] };
      }

      const results = response.data.items.map(book => ({
        title: book.volumeInfo.title,
        authors: book.volumeInfo.authors || [],
        description: book.volumeInfo.description || '',
        publisher: book.volumeInfo.publisher,
        publishedDate: book.volumeInfo.publishedDate,
        pageCount: book.volumeInfo.pageCount,
        categories: book.volumeInfo.categories || [],
        rating: book.volumeInfo.averageRating,
        thumbnail: book.volumeInfo.imageLinks?.thumbnail || book.volumeInfo.imageLinks?.smallThumbnail,
        isbn: book.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier,
        google_books_id: book.id,
        source: 'google_books'
      }));

      console.log(`✅ Google Books found ${results.length} books for "${query}"`);
      return { found: results.length > 0, results };

    } catch (error) {
      console.error('❌ Google Books API error:', error.message);
      return { found: false, results: [], error: error.message };
    }
  }

  // ===========================
  // SPOTIFY API - Music/Track Search
  // ===========================
  
  async getSpotifyToken() {
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.log('⚠️  Spotify credentials not configured');
        return null;
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 5000
        }
      );

      return response.data.access_token;

    } catch (error) {
      console.error('❌ Spotify token error:', error.message);
      return null;
    }
  }

  async searchMusic(query) {
    try {
      const token = await this.getSpotifyToken();
      if (!token) {
        return { found: false, results: [] };
      }

      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit: 5
        },
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });

      const results = response.data.tracks.items.map(track => ({
        title: track.name,
        artists: track.artists.map(a => a.name),
        album: track.album.name,
        releaseDate: track.album.release_date,
        duration: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        albumArt: track.album.images[0]?.url,
        spotify_id: track.id,
        source: 'spotify'
      }));

      console.log(`✅ Spotify found ${results.length} tracks for "${query}"`);
      return { found: results.length > 0, results };

    } catch (error) {
      console.error('❌ Spotify API error:', error.message);
      return { found: false, results: [], error: error.message };
    }
  }

  // ===========================
  // UNIFIED SEARCH - Combines all APIs
  // ===========================
  
  async enrichSearch(query, type) {
    try {
      console.log(`🔍 External API enrichment for "${query}" (type: ${type})`);
      
      // Step 1: Spelling correction with Gemini
      const correctionResult = await this.correctSpelling(query, type);
      const correctedQuery = correctionResult.corrected;
      
      // Step 2: Search external APIs based on type
      let externalResults = { found: false, results: [] };
      
      switch (type.toLowerCase()) {
        case 'movie':
          externalResults = await this.searchMovie(correctedQuery);
          break;
        case 'book':
          externalResults = await this.searchBook(correctedQuery);
          break;
        case 'music':
          externalResults = await this.searchMusic(correctedQuery);
          break;
        default:
          console.log(`⚠️  Unknown type: ${type}`);
      }

      return {
        success: true,
        corrected_query: correctedQuery,
        original_query: query,
        spelling_confidence: correctionResult.confidence,
        suggestions: correctionResult.suggestions,
        external_results: externalResults.results,
        found: externalResults.found,
        source: externalResults.results[0]?.source || 'unknown'
      };

    } catch (error) {
      console.error('❌ External API enrichment error:', error.message);
      return {
        success: false,
        error: error.message,
        corrected_query: query,
        original_query: query,
        external_results: [],
        found: false
      };
    }
  }
}

module.exports = new ExternalAPIService();
