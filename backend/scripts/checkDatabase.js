require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Book = require('../models/Book');
const Music = require('../models/Music');

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check movies
    const movieCount = await Movie.countDocuments();
    console.log(`📽️  Movies: ${movieCount} items`);
    if (movieCount > 0) {
      const sampleMovie = await Movie.findOne().select('title director genre year').lean();
      console.log('   Sample:', sampleMovie);
    }

    // Check books
    const bookCount = await Book.countDocuments();
    console.log(`\n📚 Books: ${bookCount} items`);
    if (bookCount > 0) {
      const sampleBook = await Book.findOne().select('title author genre').lean();
      console.log('   Sample:', sampleBook);
    }

    // Check music
    const musicCount = await Music.countDocuments();
    console.log(`\n🎵 Music: ${musicCount} items`);
    if (musicCount > 0) {
      const sampleMusic = await Music.findOne().select('title singers genre').lean();
      console.log('   Sample:', sampleMusic);
    }

    console.log('\n' + '='.repeat(50));
    if (movieCount === 0 && bookCount === 0 && musicCount === 0) {
      console.log('⚠️  WARNING: Database is empty!');
      console.log('   Onboarding will not work without data.');
      console.log('   Please populate the database with movies, books, and music.');
    } else {
      console.log('✅ Database has data. Onboarding should work.');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDatabase();
