require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const Movie = require('../models/Movie');

async function testSavePreferences() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get a test user
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found. Please register a user first.');
      return;
    }

    console.log('👤 Test user:', user.username);
    console.log('   Email:', user.email);
    console.log('   ID:', user._id);

    // Get a test movie
    const movie = await Movie.findOne();
    if (!movie) {
      console.log('❌ No movies found.');
      return;
    }

    console.log('\n🎬 Test movie:', movie.Title);
    console.log('   ID:', movie._id);
    console.log('   Genre:', movie.Genre);

    // Test creating UserPreference with proper structure
    console.log('\n📋 Testing UserPreference creation...');
    
    const testPref = {
      user_id: user._id,
      username: user.username,
      useremail: user.email,
      favourite_movies: [{ movie_id: movie._id }],
      favourite_books: [],
      completed_movies: [{ movie_id: movie._id }],
      completed_books: []
    };

    console.log('Structure:', JSON.stringify(testPref, null, 2));

    // Try to create and validate
    const userPref = new UserPreference(testPref);
    
    const validationError = userPref.validateSync();
    if (validationError) {
      console.log('❌ Validation failed:', validationError.message);
      Object.keys(validationError.errors).forEach(key => {
        console.log(`   - ${key}: ${validationError.errors[key].message}`);
      });
    } else {
      console.log('✅ Validation passed!');
      console.log('\n✅ The fix should work. UserPreference structure is correct.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSavePreferences();
