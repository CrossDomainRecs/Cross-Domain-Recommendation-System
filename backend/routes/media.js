const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Book = require('../models/Book');
const Music = require('../models/Music');

// Get all movies
router.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.find().limit(100);
    res.json({
      message: '🎬 Movies retrieved successfully',
      count: movies.length,
      data: movies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a movie by ID
router.get('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all books
router.get('/books', async (req, res) => {
  try {
    const books = await Book.find().limit(100);
    res.json({
      message: '📚 Books retrieved successfully',
      count: books.length,
      data: books
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a book by ID
router.get('/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all music
router.get('/music', async (req, res) => {
  try {
    const music = await Music.find().limit(100);
    res.json({
      message: '🎵 Music retrieved successfully',
      count: music.length,
      data: music
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a music item by ID
router.get('/music/:id', async (req, res) => {
  try {
    const musicItem = await Music.findById(req.params.id);
    if (!musicItem) return res.status(404).json({ error: 'Music not found' });
    res.json(musicItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
