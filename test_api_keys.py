#!/usr/bin/env python3
"""Test all API keys"""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

def test_api_keys():
    """Test that all required API keys are set"""
    
    config = get_config()
    
    print("="*60)
    print("API KEYS VERIFICATION")
    print("="*60)
    
    # Required APIs
    required_keys = [
        ('GEMINI_API_KEY', 'Google Gemini', True),
        ('GOOGLE_BOOKS_API_KEY', 'Google Books', True),
        ('OMDB_API_KEY', 'OMDB (Movies)', True),
        ('SPOTIFY_CLIENT_ID', 'Spotify Client ID', True),  # Now required!
        ('SPOTIFY_CLIENT_SECRET', 'Spotify Secret', True),  # Now required!
    ]
    
    # Optional APIs
    optional_keys = [
        ('TMDB_API_KEY', 'TMDB (Movies)', False),
        ('LASTFM_API_KEY', 'Last.fm (Music)', False),
    ]
    
    all_required = True
    
    print("\n📌 REQUIRED APIs:")
    for env_var, service_name, required in required_keys:
        key = config.get_secret(env_var)
        
        if key and len(key) > 3:
            # Mask the key for security
            if len(key) > 15:
                masked = f"{key[:10]}...{key[-5:]}"
            else:
                masked = f"{key[:5]}...{key[-3:]}"
            print(f"  ✅ {service_name:25} : {masked}")
        else:
            print(f"  ❌ {service_name:25} : NOT SET")
            if required:
                all_required = False
    
    print("\n🔧 OPTIONAL APIs:")
    for env_var, service_name, required in optional_keys:
        key = config.get_secret(env_var)
        if key and len(key) > 3:
            print(f"  ✅ {service_name:25} : Configured")
        else:
            print(f"  ⚪ {service_name:25} : Not configured (optional)")
    
    print("\n" + "="*60)
    
    if all_required:
        print("✅ All required API keys are configured!")
        print("\n💡 You're ready to start building!")
    else:
        print("❌ Some required API keys are missing!")
        print("\n📝 Get your keys from:")
        print("  - Gemini: https://makersuite.google.com/app/apikey")
        print("  - Google Books: https://console.cloud.google.com/")
        print("  - OMDB: http://www.omdbapi.com/apikey.aspx")
        print("  - Spotify: https://developer.spotify.com/dashboard")
    
    return all_required

if __name__ == '__main__':
    success = test_api_keys()
    sys.exit(0 if success else 1)

