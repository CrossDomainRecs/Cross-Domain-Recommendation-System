const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  username: {
    type: String,
    required: true
  },
  useremail: {
    type: String,
    required: true
  },
  movie_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Movie' 
  },
  book_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Book' 
  },
  bookname: {
    type: String,
    required: true
  },
  music_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Music' 
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5 
  },
  action: {
    type: String,
    enum: ['view', 'like', 'rate', 'bookmark', 'completed'],
    default: 'view'
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('History', historySchema);
