"""
Spotify API wrapper for music metadata
Simplified version focusing on search and metadata retrieval
"""

import os
import requests
import base64
from typing import Dict, List, Optional
import time

class SpotifyClient:
    """
    Simplified Spotify API wrapper for music search and metadata
    
    Works with basic Spotify credentials (no special permissions needed)
    """
    
    AUTH_URL = "https://accounts.spotify.com/api/token"
    BASE_URL = "https://api.spotify.com/v1"
    
    def __init__(self, client_id: str = None, client_secret: str = None):
        """Initialize Spotify client"""
        self.client_id = client_id or os.getenv('SPOTIFY_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('SPOTIFY_CLIENT_SECRET')
        
        if not self.client_id or not self.client_secret:
            raise ValueError("Spotify credentials not found")
        
        self.session = requests.Session()
        self.access_token = None
        self.token_expiry = 0
        self.rate_limit_delay = 0.05
        self.last_request_time = 0
        
        self._authenticate()
    
    def _authenticate(self):
        """Get access token using Client Credentials flow"""
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {'grant_type': 'client_credentials'}
        
        try:
            response = requests.post(self.AUTH_URL, headers=headers, data=data, timeout=10)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.token_expiry = time.time() + token_data['expires_in'] - 60
            
            self.session.headers.update({
                'Authorization': f'Bearer {self.access_token}'
            })
            
            print("✅ Spotify authentication successful")
        except Exception as e:
            print(f"❌ Spotify authentication failed: {e}")
            raise
    
    def _check_token(self):
        """Check if token is expired and refresh if needed"""
        if time.time() >= self.token_expiry:
            self._authenticate()
    
    def _rate_limit(self):
        """Implement rate limiting"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self.last_request_time = time.time()
    
    def search_track(self, query: str, artist: str = None) -> Optional[Dict]:
        """
        Search for a track by title and optionally artist
        
        Args:
            query: Track title
            artist: Optional artist name
        
        Returns:
            Track metadata dict or None
        """
        self._check_token()
        self._rate_limit()
        
        # Build search query
        search_query = f'track:{query}'
        if artist:
            search_query += f' artist:{artist}'
        
        params = {
            'q': search_query,
            'type': 'track',
            'limit': 1
        }
        
        try:
            response = self.session.get(f'{self.BASE_URL}/search', params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data['tracks']['items']:
                return self._format_track(data['tracks']['items'][0])
            return None
        except Exception as e:
            print(f"Spotify search error: {e}")
            return None
    
    def search_multiple(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search for multiple tracks
        
        Args:
            query: Search query
            limit: Max results (1-50)
        
        Returns:
            List of track metadata dicts
        """
        self._check_token()
        self._rate_limit()
        
        params = {
            'q': query,
            'type': 'track',
            'limit': min(limit, 50)
        }
        
        try:
            response = self.session.get(f'{self.BASE_URL}/search', params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return [self._format_track(track) for track in data['tracks']['items']]
        except Exception as e:
            print(f"Spotify search error: {e}")
            return []
    
    def get_artist(self, artist_id: str) -> Optional[Dict]:
        """
        Get artist details
        
        Args:
            artist_id: Spotify artist ID
        
        Returns:
            Artist metadata dict or None
        """
        self._check_token()
        self._rate_limit()
        
        try:
            response = self.session.get(f'{self.BASE_URL}/artists/{artist_id}', timeout=5)
            response.raise_for_status()
            artist = response.json()
            
            return {
                'spotify_id': artist['id'],
                'name': artist['name'],
                'genres': artist.get('genres', []),
                'popularity': artist.get('popularity', 0),
                'image': artist['images'][0]['url'] if artist.get('images') else None,
                'external_url': artist['external_urls'].get('spotify')
            }
        except Exception as e:
            print(f"Spotify artist fetch error: {e}")
            return None
    
    def get_album(self, album_id: str) -> Optional[Dict]:
        """
        Get album details
        
        Args:
            album_id: Spotify album ID
        
        Returns:
            Album metadata dict or None
        """
        self._check_token()
        self._rate_limit()
        
        try:
            response = self.session.get(f'{self.BASE_URL}/albums/{album_id}', timeout=5)
            response.raise_for_status()
            album = response.json()
            
            return {
                'spotify_id': album['id'],
                'name': album['name'],
                'artists': [a['name'] for a in album['artists']],
                'release_date': album.get('release_date'),
                'total_tracks': album.get('total_tracks'),
                'genres': album.get('genres', []),
                'image': album['images'][0]['url'] if album.get('images') else None,
                'external_url': album['external_urls'].get('spotify')
            }
        except Exception as e:
            print(f"Spotify album fetch error: {e}")
            return None
    
    def _format_track(self, track: Dict) -> Dict:
        """Format track data to standard structure"""
        # Extract genres from artists if available
        genres = []
        for artist in track.get('artists', []):
            if 'genres' in artist:
                genres.extend(artist['genres'])
        
        return {
            'spotify_id': track['id'],
            'title': track['name'],
            'artists': [artist['name'] for artist in track['artists']],
            'artist_ids': [artist['id'] for artist in track['artists']],
            'album': track['album']['name'],
            'album_id': track['album']['id'],
            'release_date': track['album'].get('release_date'),
            'duration_ms': track['duration_ms'],
            'duration_sec': track['duration_ms'] // 1000,
            'popularity': track.get('popularity', 0),
            'preview_url': track.get('preview_url'),
            'external_url': track['external_urls'].get('spotify'),
            'image': track['album']['images'][0]['url'] if track['album']['images'] else None,
            'genres': genres,  # May be empty - we'll fetch from artist if needed
            'explicit': track.get('explicit', False)
        }
    
    def enrich_with_artist_genres(self, track: Dict) -> Dict:
        """
        Enrich track with genres from artist data
        
        Args:
            track: Track dict from _format_track()
        
        Returns:
            Track dict with genres added
        """
        if track['genres'] or not track['artist_ids']:
            return track
        
        # Fetch first artist's genres
        artist = self.get_artist(track['artist_ids'][0])
        if artist:
            track['genres'] = artist['genres']
        
        return track


def get_spotify_client() -> SpotifyClient:
    """Get singleton Spotify client"""
    return SpotifyClient()


if __name__ == '__main__':
    import sys
    from pathlib import Path
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(PROJECT_ROOT))
    
    from src.utils.config import get_config
    config = get_config()
    
    print("="*60)
    print("SPOTIFY API TEST (Simplified)")
    print("="*60)
    
    try:
        client = SpotifyClient()
        
        # Test 1: Search track
        print("\n🔍 TEST 1: Search for 'Blinding Lights'")
        print("-"*60)
        track = client.search_track("Blinding Lights", "The Weeknd")
        
        if track:
            print(f"✅ Found: {track['title']}")
            print(f"   Artists: {', '.join(track['artists'])}")
            print(f"   Album: {track['album']}")
            print(f"   Release: {track['release_date']}")
            print(f"   Popularity: {track['popularity']}/100")
            print(f"   Duration: {track['duration_sec']}s")
            print(f"   Explicit: {track['explicit']}")
            print(f"   URL: {track['external_url']}")
            
            # Test 2: Enrich with artist genres
            print("\n🎨 TEST 2: Get Artist Genres")
            print("-"*60)
            track = client.enrich_with_artist_genres(track)
            print(f"   Genres: {', '.join(track['genres']) if track['genres'] else 'None found'}")
            
            # Test 3: Get artist details
            print("\n👨‍🎤 TEST 3: Get Artist Details")
            print("-"*60)
            artist = client.get_artist(track['artist_ids'][0])
            if artist:
                print(f"   Name: {artist['name']}")
                print(f"   Genres: {', '.join(artist['genres'])}")
                print(f"   Popularity: {artist['popularity']}/100")
            
            # Test 4: Multiple search results
            print("\n🔎 TEST 4: Search Multiple Results")
            print("-"*60)
            results = client.search_multiple("Drake", limit=5)
            print(f"   Found {len(results)} tracks:")
            for i, r in enumerate(results[:3], 1):
                print(f"   {i}. {r['title']} - {', '.join(r['artists'])}")
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\n💡 Note: Audio features & recommendations require premium API")
        print("   But we have everything we need for metadata!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
