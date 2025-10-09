const express = require('express');
const router = express.Router();
const UserPreference = require('../models/UserPreference');
const User = require('../models/User');

// GET /api/user-preferences/:email - Get user's preferences
router.get('/user-preferences/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      // Create empty preferences for new user
      userPreference = new UserPreference({
        user_id: user._id,
        username: user.username,
        useremail: user.email,
        completed_books: [],
        completed_movies: [],
        favourite_books: [],
        favourite_movies: []
      });
      await userPreference.save();
    }

    // Populate the response with book and movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user preferences.'
    });
  }
});

// POST /api/user-preferences/:email/completed-books - Add completed book
router.post('/user-preferences/:email/completed-books', async (req, res) => {
  try {
    const { email } = req.params;
    const { book_id, rating } = req.body;

    if (!email || !book_id) {
      return res.status(400).json({
        success: false,
        message: 'Email and book_id are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      userPreference = new UserPreference({
        user_id: user._id,
        username: user.username,
        useremail: user.email,
        completed_books: [],
        completed_movies: [],
        favourite_books: [],
        favourite_movies: []
      });
    }

    // Check if book already exists in completed list
    const existingBook = userPreference.completed_books.find(cb => cb.book_id.toString() === book_id);

    if (existingBook) {
      // Update rating if provided
      if (rating !== undefined) {
        existingBook.rating = rating;
      }
      existingBook.completed_at = new Date();
    } else {
      // Add new completed book
      userPreference.completed_books.push({
        book_id,
        rating: rating || null,
        completed_at: new Date()
      });
    }

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Completed book saved successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error saving completed book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving completed book.'
    });
  }
});

// POST /api/user-preferences/:email/completed-movies - Add completed movie
router.post('/user-preferences/:email/completed-movies', async (req, res) => {
  try {
    const { email } = req.params;
    const { movie_id, rating } = req.body;

    if (!email || !movie_id) {
      return res.status(400).json({
        success: false,
        message: 'Email and movie_id are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      userPreference = new UserPreference({
        user_id: user._id,
        username: user.username,
        useremail: user.email,
        completed_books: [],
        completed_movies: [],
        favourite_books: [],
        favourite_movies: []
      });
    }

    // Check if movie already exists in completed list
    const existingMovie = userPreference.completed_movies.find(cm => cm.movie_id.toString() === movie_id);

    if (existingMovie) {
      // Update rating if provided
      if (rating !== undefined) {
        existingMovie.rating = rating;
      }
      existingMovie.completed_at = new Date();
    } else {
      // Add new completed movie
      userPreference.completed_movies.push({
        movie_id,
        rating: rating || null,
        completed_at: new Date()
      });
    }

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Completed movie saved successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error saving completed movie:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving completed movie.'
    });
  }
});

// POST /api/user-preferences/:email/favourite-books - Add favourite book
router.post('/user-preferences/:email/favourite-books', async (req, res) => {
  try {
    const { email } = req.params;
    const { book_id } = req.body;

    if (!email || !book_id) {
      return res.status(400).json({
        success: false,
        message: 'Email and book_id are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      userPreference = new UserPreference({
        user_id: user._id,
        username: user.username,
        useremail: user.email,
        completed_books: [],
        completed_movies: [],
        favourite_books: [],
        favourite_movies: []
      });
    }

    // Check if book already exists in favourites
    const existingBook = userPreference.favourite_books.find(fb => fb.book_id.toString() === book_id);

    if (existingBook) {
      return res.status(409).json({
        success: false,
        message: 'Book already exists in favourites.'
      });
    }

    // Add new favourite book
    userPreference.favourite_books.push({
      book_id,
      added_at: new Date()
    });

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Favourite book saved successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error saving favourite book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving favourite book.'
    });
  }
});

// POST /api/user-preferences/:email/favourite-movies - Add favourite movie
router.post('/user-preferences/:email/favourite-movies', async (req, res) => {
  try {
    const { email } = req.params;
    const { movie_id } = req.body;

    if (!email || !movie_id) {
      return res.status(400).json({
        success: false,
        message: 'Email and movie_id are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    let userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      userPreference = new UserPreference({
        user_id: user._id,
        username: user.username,
        useremail: user.email,
        completed_books: [],
        completed_movies: [],
        favourite_books: [],
        favourite_movies: []
      });
    }

    // Check if movie already exists in favourites
    const existingMovie = userPreference.favourite_movies.find(fm => fm.movie_id.toString() === movie_id);

    if (existingMovie) {
      return res.status(409).json({
        success: false,
        message: 'Movie already exists in favourites.'
      });
    }

    // Add new favourite movie
    userPreference.favourite_movies.push({
      movie_id,
      added_at: new Date()
    });

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Favourite movie saved successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error saving favourite movie:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving favourite movie.'
    });
  }
});

// DELETE /api/user-preferences/:email/completed-books/:book_id - Remove completed book
router.delete('/user-preferences/:email/completed-books/:book_id', async (req, res) => {
  try {
    const { email, book_id } = req.params;

    const userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found.'
      });
    }

    userPreference.completed_books = userPreference.completed_books.filter(
      cb => cb.book_id.toString() !== book_id
    );

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book and movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Completed book removed successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error removing completed book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing completed book.'
    });
  }
});

// DELETE /api/user-preferences/:email/completed-movies/:movie_id - Remove completed movie
router.delete('/user-preferences/:email/completed-movies/:movie_id', async (req, res) => {
  try {
    const { email, movie_id } = req.params;

    const userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found.'
      });
    }

    userPreference.completed_movies = userPreference.completed_movies.filter(
      cm => cm.movie_id.toString() !== movie_id
    );

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book and movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Completed movie removed successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error removing completed movie:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing completed movie.'
    });
  }
});

// DELETE /api/user-preferences/:email/favourite-books/:book_id - Remove favourite book
router.delete('/user-preferences/:email/favourite-books/:book_id', async (req, res) => {
  try {
    const { email, book_id } = req.params;

    const userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found.'
      });
    }

    userPreference.favourite_books = userPreference.favourite_books.filter(
      fb => fb.book_id.toString() !== book_id
    );

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book and movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Favourite book removed successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error removing favourite book:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing favourite book.'
    });
  }
});

// DELETE /api/user-preferences/:email/favourite-movies/:movie_id - Remove favourite movie
router.delete('/user-preferences/:email/favourite-movies/:movie_id', async (req, res) => {
  try {
    const { email, movie_id } = req.params;

    const userPreference = await UserPreference.findOne({ useremail: email });

    if (!userPreference) {
      return res.status(404).json({
        success: false,
        message: 'User preferences not found.'
      });
    }

    userPreference.favourite_movies = userPreference.favourite_movies.filter(
      fm => fm.movie_id.toString() !== movie_id
    );

    userPreference.updated_at = new Date();
    await userPreference.save();

    // Populate the response with book and movie details
    await userPreference.populate('completed_books.book_id');
    await userPreference.populate('favourite_books.book_id');
    await userPreference.populate('completed_movies.movie_id');
    await userPreference.populate('favourite_movies.movie_id');

    res.json({
      success: true,
      message: 'Favourite movie removed successfully.',
      preferences: userPreference
    });
  } catch (error) {
    console.error('Error removing favourite movie:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing favourite movie.'
    });
  }
});

module.exports = router;
