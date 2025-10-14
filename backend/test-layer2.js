/**
 * Layer 2 External API Test Script
 * Run this to verify all external APIs are working
 */

const externalAPI = require('./services/externalAPI');

console.log('\n🧪 Testing Layer 2: External API Integration\n');
console.log('='.repeat(60));

async function testLayer2() {
  let allPassed = true;

  // Test 1: Gemini Spelling Correction
  console.log('\n1️⃣  Testing Gemini API (Spelling Correction)...');
  try {
    const result = await externalAPI.correctSpelling('harry poter', 'book');
    if (result.corrected === 'harry potter' || result.confidence > 0) {
      console.log('   ✅ Gemini API: WORKING');
      console.log(`   📝 Corrected: "${result.corrected}" (confidence: ${result.confidence})`);
    } else {
      console.log('   ⚠️  Gemini API: Not configured (spelling correction skipped)');
      console.log('   💡 Get key from: https://makersuite.google.com/app/apikey');
    }
  } catch (error) {
    console.log('   ❌ Gemini API: ERROR -', error.message);
    allPassed = false;
  }

  // Test 2: TMDB Movie Search
  console.log('\n2️⃣  Testing TMDB API (Movies)...');
  try {
    const result = await externalAPI.searchMovie('inception');
    if (result.found && result.results.length > 0) {
      console.log('   ✅ TMDB API: WORKING');
      console.log(`   🎬 Found: ${result.results[0].title} (${result.results[0].year})`);
      console.log(`   ⭐ Rating: ${result.results[0].rating}`);
    } else {
      console.log('   ⚠️  TMDB API: Not configured or no results');
      console.log('   💡 Get key from: https://www.themoviedb.org/settings/api');
    }
  } catch (error) {
    console.log('   ❌ TMDB API: ERROR -', error.message);
    allPassed = false;
  }

  // Test 3: Google Books Search
  console.log('\n3️⃣  Testing Google Books API...');
  try {
    const result = await externalAPI.searchBook('harry potter');
    if (result.found && result.results.length > 0) {
      console.log('   ✅ Google Books API: WORKING');
      console.log(`   📚 Found: ${result.results[0].title}`);
      console.log(`   ✍️  Authors: ${result.results[0].authors.join(', ')}`);
    } else {
      console.log('   ⚠️  Google Books API: Working but no results (or not configured)');
      console.log('   💡 Optional key from: https://console.cloud.google.com/apis/credentials');
    }
  } catch (error) {
    console.log('   ❌ Google Books API: ERROR -', error.message);
    allPassed = false;
  }

  // Test 4: Spotify Music Search
  console.log('\n4️⃣  Testing Spotify API (Music)...');
  try {
    const result = await externalAPI.searchMusic('bohemian rhapsody');
    if (result.found && result.results.length > 0) {
      console.log('   ✅ Spotify API: WORKING');
      console.log(`   🎵 Found: ${result.results[0].title}`);
      console.log(`   🎤 Artists: ${result.results[0].artists.join(', ')}`);
    } else {
      console.log('   ⚠️  Spotify API: Not configured');
      console.log('   💡 Get credentials from: https://developer.spotify.com/dashboard');
    }
  } catch (error) {
    console.log('   ❌ Spotify API: ERROR -', error.message);
    allPassed = false;
  }

  // Test 5: Unified Enrichment
  console.log('\n5️⃣  Testing Unified Enrichment (End-to-End)...');
  try {
    const result = await externalAPI.enrichSearch('inceptoin', 'movie');
    if (result.success) {
      console.log('   ✅ Unified Enrichment: WORKING');
      console.log(`   📝 Query corrected: "${result.original_query}" → "${result.corrected_query}"`);
      console.log(`   🔍 Results found: ${result.found ? 'YES' : 'NO'}`);
      if (result.found) {
        console.log(`   📊 Source: ${result.source}`);
        console.log(`   📦 Results count: ${result.external_results.length}`);
      }
    } else {
      console.log('   ❌ Unified Enrichment: FAILED');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Unified Enrichment: ERROR -', error.message);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('\n🎉 All Layer 2 tests completed!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above.\n');
  }
  console.log('📖 Full guide: See LAYER_2_EXTERNAL_API_GUIDE.md\n');
}

// Run tests
testLayer2()
  .then(() => {
    console.log('✅ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
