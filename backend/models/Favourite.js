const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  useremail: {
    type: String,
    required: true,
    unique: true
  },
  genres: {
    type: [String],
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at timestamp before saving
favouriteSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Favourite', favouriteSchema);
