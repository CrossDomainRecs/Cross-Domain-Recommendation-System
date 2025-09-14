const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
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
    enum: ['view', 'like', 'rate', 'bookmark'],
    default: 'view'
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('History', historySchema);
