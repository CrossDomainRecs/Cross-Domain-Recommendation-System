require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const Movie = require('../models/Movie');

async function diagnosePreferences() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check User model
    console.log('📋 Test 1: Checking User model...');
    const sampleUser = await User.findOne();
    if (sampleUser) {
      console.log('✅ Found user:', sampleUser.username);
      console.log('   ID:', sampleUser._id);
      console.log('   Has preferences:', sampleUser.preferences ? 'YES' : 'NO');
      if (sampleUser.preferences) {
        console.log('   Genres:', sampleUser.preferences.genres);
        console.log('   Domains:', sampleUser.preferences.domains);
      }
    } else {
      console.log('❌ No users found in database!');
    }

    // Test 2: Check UserPreference model
    console.log('\n📋 Test 2: Checking UserPreference model...');
    const samplePref = await UserPreference.findOne();
    if (samplePref) {
      console.log('✅ Found UserPreference');
      console.log('   User ID:', samplePref.user_id);
      console.log('   Favourite movies:', samplePref.favourite_movies?.length || 0);
      console.log('   Favourite books:', samplePref.favourite_books?.length || 0);
    } else {
      console.log('⚠️  No UserPreference documents yet (normal for new users)');
    }

    // Test 3: Try to create a UserPreference
    console.log('\n📋 Test 3: Testing UserPreference creation...');
    if (sampleUser) {
      try {
        const testPref = new UserPreference({
          user_id: sampleUser._id,
          favourite_movies: [],
          favourite_books: [],
          completed_movies: [],
          completed_books: []
        });

        // Validate without saving
        const validationError = testPref.validateSync();
        if (validationError) {
          console.log('❌ Validation error:', validationError.message);
        } else {
          console.log('✅ UserPreference structure is valid');
        }
      } catch (err) {
        console.error('❌ Error creating UserPreference:', err.message);
      }
    }

    // Test 4: Check if a movie exists and can be fetched
    console.log('\n📋 Test 4: Testing Movie fetch by ID...');
    const testMovie = await Movie.findOne();
    if (testMovie) {
      console.log('✅ Found movie:', testMovie.Title || testMovie.title);
      console.log('   ID:', testMovie._id);
      console.log('   Genre (raw):', testMovie.Genre);
      
      // Test genre extraction
      if (testMovie.Genre && typeof testMovie.Genre === 'string') {
        const genres = testMovie.Genre.split(',').map(g => g.trim());
        console.log('   Genre (array):', genres);
      }

      // Try to fetch by ID
      const fetchedById = await Movie.findById(testMovie._id);
      if (fetchedById) {
        console.log('✅ Successfully fetched movie by ID');
      } else {
        console.log('❌ Could not fetch movie by ID!');
      }
    } else {
      console.log('❌ No movies found!');
    }

    // Test 5: Check User update permissions
    console.log('\n📋 Test 5: Testing User model update...');
    if (sampleUser) {
      try {
        await User.findByIdAndUpdate(sampleUser._id, {
          $set: {
            'preferences.genres': ['Test'],
            'preferences.domains': ['movies']
          }
        });
        console.log('✅ User model update works');
        
        // Revert the test update
        await User.findByIdAndUpdate(sampleUser._id, {
          $set: {
            'preferences.genres': sampleUser.preferences?.genres || [],
            'preferences.domains': sampleUser.preferences?.domains || []
          }
        });
      } catch (err) {
        console.error('❌ User update failed:', err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnosis complete!');
    console.log('Check for any ❌ errors above to identify the issue.');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnosePreferences();
