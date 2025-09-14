const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: String,
  genre: [String],
  likedpercent: { type: Number, default: 0 },
  avgrating: { type: Number, default: 0 },
  description: String,
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
