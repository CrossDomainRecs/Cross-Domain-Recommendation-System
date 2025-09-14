const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  director: String,
  actors: [String],
  genre: [String],
  likedpercent: { type: Number, default: 0 },
  avgrating: { type: Number, default: 0 },
  year: Number,
  description: String,
  embeddings: {
    content_vector: [Number],
    semantic_vector: [Number],
    hybrid_vector: [Number]
  },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Movie', movieSchema);
