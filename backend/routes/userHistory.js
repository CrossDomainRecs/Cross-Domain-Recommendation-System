const express = require('express');
const router = express.Router();
const UserHistory = require('../models/UserHistory');
const User = require('../models/User');

// GET /api/user-history/:email - Get user's history
router.get('/user-history/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    let userHistory = await UserHistory.findOne({ useremail: email });

    if (!userHistory) {
      // Return empty structure if no history exists
      return res.json({
        success: true,
        history: {
          useremail: email,
          username: '',
          books: [],
          movies: []
        }
      });
    }

    res.json({
      success: true,
      history: userHistory
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user history.'
    });
  }
});

// POST /api/user-history/:email/books - Add completed book to user's history
router.post('/user-history/:email/books', async (req, res) => {
  try {
    const { email } = req.params;
    const { name, rating } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and book name are required.'
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

    let userHistory = await UserHistory.findOne({ useremail: email });

    if (!userHistory) {
      // Create new history document
      userHistory = new UserHistory({
        useremail: user.email,
        username: user.username,
        books: [],
        movies: []
      });
    }

    // Check if book already exists in history
    const existingBook = userHistory.books.find(book => book.name === name);

    if (existingBook) {
      // Update existing entry
      existingBook.completed_at = new Date();
      existingBook.rating = rating || existingBook.rating;
    } else {
      // Add new book to history
      userHistory.books.push({
        name: name,
        rating: rating || null,
        completed_at: new Date()
      });
    }

    userHistory.updated_at = new Date();
    await userHistory.save();

    res.json({
      success: true,
      message: 'Book added to history successfully.',
      history: userHistory
    });
  } catch (error) {
    console.error('Error adding book to history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding book to history.'
    });
  }
});

// POST /api/user-history/:email/movies - Add completed movie to user's history
router.post('/user-history/:email/movies', async (req, res) => {
  try {
    const { email } = req.params;
    const { name, rating } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and movie name are required.'
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

    let userHistory = await UserHistory.findOne({ useremail: email });

    if (!userHistory) {
      // Create new history document
      userHistory = new UserHistory({
        useremail: user.email,
        username: user.username,
        books: [],
        movies: []
      });
    }

    // Check if movie already exists in history
    const existingMovie = userHistory.movies.find(movie => movie.name === name);

    if (existingMovie) {
      // Update existing entry
      existingMovie.completed_at = new Date();
      existingMovie.rating = rating || existingMovie.rating;
    } else {
      // Add new movie to history
      userHistory.movies.push({
        name: name,
        rating: rating || null,
        completed_at: new Date()
      });
    }

    userHistory.updated_at = new Date();
    await userHistory.save();

    res.json({
      success: true,
      message: 'Movie added to history successfully.',
      history: userHistory
    });
  } catch (error) {
    console.error('Error adding movie to history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding movie to history.'
    });
  }
});

// DELETE /api/user-history/:email/books/:bookName - Remove book from user's history
router.delete('/user-history/:email/books/:bookName', async (req, res) => {
  try {
    const { email, bookName } = req.params;

    const userHistory = await UserHistory.findOne({ useremail: email });

    if (!userHistory) {
      return res.status(404).json({
        success: false,
        message: 'User history not found.'
      });
    }

    // Remove book from history
    userHistory.books = userHistory.books.filter(book => book.name !== bookName);
    userHistory.updated_at = new Date();
    await userHistory.save();

    res.json({
      success: true,
      message: 'Book removed from history successfully.',
      history: userHistory
    });
  } catch (error) {
    console.error('Error removing book from history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing book from history.'
    });
  }
});

// DELETE /api/user-history/:email/movies/:movieName - Remove movie from user's history
router.delete('/user-history/:email/movies/:movieName', async (req, res) => {
  try {
    const { email, movieName } = req.params;

    const userHistory = await UserHistory.findOne({ useremail: email });

    if (!userHistory) {
      return res.status(404).json({
        success: false,
        message: 'User history not found.'
      });
    }

    // Remove movie from history
    userHistory.movies = userHistory.movies.filter(movie => movie.name !== movieName);
    userHistory.updated_at = new Date();
    await userHistory.save();

    res.json({
      success: true,
      message: 'Movie removed from history successfully.',
      history: userHistory
    });
  } catch (error) {
    console.error('Error removing movie from history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing movie from history.'
    });
  }
});

module.exports = router;
