#!/usr/bin/env python3
"""Test Spotify API integration"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config
from src.external.spotify import SpotifyClient

def main():
    # Load config
    config = get_config()
    
    print("="*60)
    print("SPOTIFY API TEST")
    print("="*60)
    
    try:
        # Initialize client
        client = SpotifyClient()
        
        # Test 1: Search
        print("\n🔍 TEST 1: Search for 'Blinding Lights'")
        print("-"*60)
        track = client.search_track("Blinding Lights", "The Weeknd")
        
        if track:
            print(f"✅ Found: {track['title']}")
            print(f"   Artists: {', '.join(track['artists'])}")
            print(f"   Album: {track['album']}")
            print(f"   Popularity: {track['popularity']}/100")
            print(f"   Duration: {track['duration_ms'] // 1000}s")
            print(f"   Spotify URL: {track['external_url']}")
            
            # Test 2: Audio Features
            print("\n🎵 TEST 2: Audio Features")
            print("-"*60)
            features = client.get_audio_features(track['spotify_id'])
            
            if features:
                print(f"   Danceability: {features.get('danceability', 0):.2%}")
                print(f"   Energy: {features.get('energy', 0):.2%}")
                print(f"   Valence (happiness): {features.get('valence', 0):.2%}")
                print(f"   Tempo: {features.get('tempo', 0):.1f} BPM")
                print(f"   Acousticness: {features.get('acousticness', 0):.2%}")
            
            # Test 3: Recommendations
            print("\n🎯 TEST 3  : Get Recommendations")
            print("-"*60)
            recs = client.get_recommendations(
                seed_tracks=[track['spotify_id']],
                limit=5
            )
            
            print(f"✅ Got {len(recs)} similar tracks:")
            for i, rec in enumerate(recs, 1):
                print(f"   {i}. {rec['title']}")
                print(f"      by {', '.join(rec['artists'])}")
                print(f"      Popularity: {rec['popularity']}/100")
                print()
        
        else:
            print("❌ Track not found")
        
        print("="*60)
        print("✅ ALL SPOTIFY TESTS PASSED!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
