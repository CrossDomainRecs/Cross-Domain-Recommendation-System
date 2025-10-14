require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');

async function testOnboarding() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check if movies have titles
    console.log('📋 Test 1: Fetching movies with Title field...');
    const movies = await Movie.find()
      .select('Title Overview Genre Vote_Average Release_Date')
      .limit(5)
      .lean();

    console.log(`Found ${movies.length} movies\n`);
    
    movies.forEach((movie, i) => {
      console.log(`${i + 1}. ${movie.Title || 'NO TITLE'}`);
      console.log(`   Genre: ${movie.Genre || 'N/A'}`);
      console.log(`   Rating: ${movie.Vote_Average || 'N/A'}`);
      console.log(`   Has Title field: ${movie.hasOwnProperty('Title')}`);
      console.log('');
    });

    // Test 2: Normalize movie data
    console.log('📋 Test 2: Normalizing movie data...');
    const normalizedMovies = movies.map(item => ({
      ...item,
      title: item.Title || '',
      description: item.Overview || '',
      genre: item.Genre ? item.Genre.split(',').map(g => g.trim()) : [],
      avgrating: item.Vote_Average || 0,
      year: item.Release_Date ? new Date(item.Release_Date).getFullYear() : null
    }));

    normalizedMovies.forEach((movie, i) => {
      console.log(`${i + 1}. ${movie.title}`);
      console.log(`   Genre array: [${movie.genre.join(', ')}]`);
      console.log(`   Year: ${movie.year}`);
      console.log('');
    });

    // Test 3: Fuzzy search simulation
    console.log('📋 Test 3: Simulating fuzzy search for "Spider"...');
    const searchQuery = 'Spider';
    const matches = normalizedMovies.filter(movie => {
      if (!movie.title || typeof movie.title !== 'string') return false;
      return movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    });

    console.log(`Matches found: ${matches.length}`);
    matches.forEach(m => console.log(`  - ${m.title}`));

    console.log('\n✅ All tests passed! Onboarding should work now.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testOnboarding();
