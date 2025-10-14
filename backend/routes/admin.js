const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const Movie = require('../models/Movie');
const Music = require('../models/Music');
const Book = require('../models/Book');
const { authenticateToken, requireAdmin } = require('./auth');

// Get all users with their preferences
router.get('/users-with-preferences',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await User.find()
        .select('-password')
        .sort({ created_at: -1 });

      // Fetch preferences for each user
      const usersWithPreferences = await Promise.all(
        users.map(async (user) => {
          const preferences = await UserPreference.findOne({ user_id: user._id });
          
          return {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            genres: user.preferences?.genres || [],
            domains: user.preferences?.domains || [],
            completedMovies: preferences?.completed_movies?.length || 0,
            completedBooks: preferences?.completed_books?.length || 0,
            favouriteMovies: preferences?.favourite_movies?.length || 0,
            favouriteBooks: preferences?.favourite_books?.length || 0,
            lastActive: user.last_login || user.created_at,
            status: user.last_login && 
                    (new Date() - new Date(user.last_login)) / (1000 * 60 * 60 * 24) <= 30 
                    ? 'active' : 'inactive'
          };
        })
      );

      res.json({
        success: true,
        data: {
          users: usersWithPreferences,
          count: usersWithPreferences.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching users with preferences:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch users with preferences'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get all movies (without images/embeddings)
router.get('/movies',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const movies = await Movie.find()
        .select('-embeddings')
        .sort({ created_at: -1 });

      res.json({
        success: true,
        data: {
          movies: movies.map(movie => ({
            id: movie._id,
            title: movie.title,
            director: movie.director,
            actors: movie.actors,
            genre: movie.genre,
            year: movie.year,
            likedpercent: movie.likedpercent,
            avgrating: movie.avgrating,
            description: movie.description,
            created_at: movie.created_at
          })),
          count: movies.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching movies:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch movies'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get all music
router.get('/music',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const music = await Music.find()
        .sort({ created_at: -1 });

      res.json({
        success: true,
        data: {
          music: music.map(item => ({
            id: item._id,
            title: item.title,
            singers: item.singers,
            genre: item.genre,
            likedpercent: item.likedpercent,
            avgrating: item.avgrating,
            description: item.description,
            created_at: item.created_at
          })),
          count: music.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching music:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch music'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Get all books
router.get('/books',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const books = await Book.find()
        .sort({ created_at: -1 });

      res.json({
        success: true,
        data: {
          books: books.map(book => ({
            id: book._id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            likedpercent: book.likedpercent,
            avgrating: book.avgrating,
            description: book.description,
            created_at: book.created_at
          })),
          count: books.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching books:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch books'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update movie
router.put('/movies/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating embeddings or _id
      delete updates.embeddings;
      delete updates._id;

      const movie = await Movie.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).select('-embeddings');

      if (!movie) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Movie not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Movie updated successfully',
          movie
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating movie:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update movie'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update music
router.put('/music/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      delete updates._id;

      const music = await Music.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      );

      if (!music) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Music not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Music updated successfully',
          music
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating music:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update music'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Update book
router.put('/books/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      delete updates._id;

      const book = await Book.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      );

      if (!book) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Book not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Book updated successfully',
          book
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error updating book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update book'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Delete movie
router.delete('/movies/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const movie = await Movie.findByIdAndDelete(id);

      if (!movie) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Movie not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Movie deleted successfully',
          id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting movie:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete movie'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Delete music
router.delete('/music/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const music = await Music.findByIdAndDelete(id);

      if (!music) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Music not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Music deleted successfully',
          id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting music:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete music'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Delete book
router.delete('/books/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const book = await Book.findByIdAndDelete(id);

      if (!book) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Book not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Book deleted successfully',
          id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete book'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;
