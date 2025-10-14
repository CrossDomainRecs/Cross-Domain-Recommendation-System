require('dotenv').config();
const mongoose = require('mongoose');

async function checkMovieFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get raw document from movies collection
    const db = mongoose.connection.db;
    const moviesCollection = db.collection('movies');
    
    const sampleMovie = await moviesCollection.findOne();
    
    if (sampleMovie) {
      console.log('📽️  Sample Movie Document:');
      console.log(JSON.stringify(sampleMovie, null, 2));
      
      console.log('\n📋 Available Fields:');
      Object.keys(sampleMovie).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleMovie[key]}`);
      });
    } else {
      console.log('❌ No movies found in collection');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkMovieFields();
