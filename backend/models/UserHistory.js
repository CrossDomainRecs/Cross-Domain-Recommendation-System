const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
  useremail: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  books: [{
    name: {
      type: String,
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
  movies: [{
    name: {
      type: String,
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
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserHistory', userHistorySchema);
