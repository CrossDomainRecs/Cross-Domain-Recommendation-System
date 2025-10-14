const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  Title: { type: String, required: true },
  Overview: String,
  Release_Date: Date,
  Popularity: Number,
  Vote_Count: Number,
  Vote_Average: Number,
  Original_Language: String,
  Genre: String, // Note: This is a comma-separated string, not an array
  Poster_Url: String,
  // Legacy fields for backward compatibility
  title: String,
  director: String,
  actors: [String],
  genre: [String],
  likedpercent: Number,
  avgrating: Number,
  year: Number,
  description: String,
  embeddings: {
    content_vector: [Number],
    semantic_vector: [Number],
    hybrid_vector: [Number]
  },
  created_at: { type: Date, default: Date.now }
}, { strict: false }); // Allow additional fields

// Virtual property to normalize title
movieSchema.virtual('displayTitle').get(function() {
  return this.Title || this.title;
});

// Virtual property to normalize genre as array
movieSchema.virtual('genreArray').get(function() {
  if (this.genre && Array.isArray(this.genre)) {
    return this.genre;
  }
  if (this.Genre && typeof this.Genre === 'string') {
    return this.Genre.split(',').map(g => g.trim());
  }
  return [];
});

module.exports = mongoose.model('Movie', movieSchema);
