const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  useremail: {
    type: String,
    required: true,
    unique: true
  },
  completed_books: [{
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    completed_at: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  completed_movies: [{
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true
    },
    completed_at: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  favourite_books: [{
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    added_at: {
      type: Date,
      default: Date.now
    }
  }],
  favourite_movies: [{
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true
    },
    added_at: {
      type: Date,
      default: Date.now
    }
  }],
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
