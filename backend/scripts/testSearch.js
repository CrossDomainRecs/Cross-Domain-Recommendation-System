require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');

async function testSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const query = 'Inception';
    console.log(`🔍 Searching for: "${query}"\n`);

    // Fetch movies with title field
    const movies = await Movie.find()
      .select('title director genre year')
      .limit(10)
      .lean();

    console.log(`Found ${movies.length} movies in database\n`);
    
    if (movies.length > 0) {
      console.log('Sample movies:');
      movies.forEach((movie, i) => {
        console.log(`${i + 1}. ${movie.title || 'NO TITLE'} (${movie.year || 'N/A'})`);
      });

      // Test if title field exists
      const firstMovie = movies[0];
      console.log('\nFirst movie object:', JSON.stringify(firstMovie, null, 2));
      console.log('Has title?', firstMovie.hasOwnProperty('title'));
      console.log('Title value:', firstMovie.title);
      console.log('Title type:', typeof firstMovie.title);

      // Try fuzzy search
      console.log('\n--- Testing Fuzzy Match ---');
      const searchLower = query.toLowerCase();
      const matches = movies.filter(movie => {
        if (!movie.title) {
          console.log('WARNING: Movie without title:', movie._id);
          return false;
        }
        const titleLower = movie.title.toLowerCase();
        return titleLower.includes(searchLower) || searchLower.includes(titleLower);
      });

      console.log(`\nMatches for "${query}": ${matches.length}`);
      matches.forEach(m => console.log(`  - ${m.title}`));

    } else {
      console.log('❌ No movies found in database!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSearch();
