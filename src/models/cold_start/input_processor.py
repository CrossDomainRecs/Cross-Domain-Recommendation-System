"""
Cold-Start Input Processor
Handles user input validation, correction, and enrichment during onboarding
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from fuzzywuzzy import fuzz
from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config
from src.external.gemini import GeminiClient
from src.external.omdb import OMDBClient
from src.external.google_books import GoogleBooksClient
from src.external.spotify import SpotifyClient

class ColdStartInputProcessor:
    """
    Processes user input during cold-start onboarding
    
    Multi-layered approach:
    1. Local dataset fuzzy matching (fast)
    2. External API validation (Gemini + domain APIs)
    3. Fallback to genre-based suggestions
    """
    
    def __init__(self):
        """Initialize processor with all required clients"""
        self.config = get_config()
        
        # Database
        mongo_uri = self.config.get_secret('MONGODB_URI')
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client['reclab']
        
        # External API clients
        self.gemini = GeminiClient()
        self.omdb = OMDBClient()
        self.google_books = GoogleBooksClient()
        self.spotify = SpotifyClient()
        
        # Fuzzy matching threshold
        self.fuzzy_threshold = 80  # 80% similarity
    
    def process_input(
        self, 
        user_input: str, 
        domain: str,
        use_external_apis: bool = True
    ) -> Dict:
        """
        Main processing pipeline
        
        Args:
            user_input: User's input (e.g., "inceptoin")
            domain: Domain (books, movies, music)
            use_external_apis: Whether to use external APIs
        
        Returns:
            {
                "success": True/False,
                "matched_item": {...},  # If found
                "corrected_input": "Inception",
                "confidence": 0.95,
                "source": "local_exact|local_fuzzy|external_api|gemini",
                "suggestions": [...],  # If not found
                "error": "..."  # If failed
            }
        """
        
        print(f"\n🔍 Processing input: '{user_input}' (domain: {domain})")
        
        # LAYER 1: Local dataset search
        result = self._search_local_dataset(user_input, domain)
        
        if result['success']:
            print(f"✅ Found in local dataset: {result['matched_item']['title']}")
            return result
        
        # LAYER 2: External API validation (if enabled)
        if use_external_apis:
            print("⏳ Searching external APIs...")
            result = self._search_external_apis(user_input, domain)
            
            if result['success']:
                print(f"✅ Found via external API: {result['matched_item']['title']}")
                # Cache in MongoDB for future use
                self._cache_external_item(result['matched_item'], domain)
                return result
        
        # LAYER 3: Gemini validation & correction
        print("🤖 Using Gemini for validation...")
        result = self._validate_with_gemini(user_input, domain)
        
        if result['success']:
            return result
        
        # LAYER 4: Fallback to suggestions
        print("⚠️  No match found, generating suggestions...")
        return self._generate_fallback_suggestions(user_input, domain)
    
    def _search_local_dataset(self, query: str, domain: str) -> Dict:
        """
        Search in local MongoDB dataset with fuzzy matching
        
        Args:
            query: Search query
            domain: Domain to search
        
        Returns:
            Result dict with matched item if found
        """
        
        collection = self.db['product_metadata']
        
        # Try exact match first (case-insensitive)
        exact_match = collection.find_one({
            'domain': domain,
            'title': {'$regex': f'^{query}$', '$options': 'i'}
        })
        
        if exact_match:
            return {
                'success': True,
                'matched_item': self._format_item(exact_match, domain),
                'corrected_input': exact_match['title'],
                'confidence': 1.0,
                'source': 'local_exact'
            }
        
        # Try fuzzy matching
        cursor = collection.find({
            'domain': domain
        }).limit(1000)  # Limit for performance
        
        best_match = None
        best_score = 0
        
        for item in cursor:
            title = item.get('title', '')
            score = fuzz.ratio(query.lower(), title.lower())
            
            if score > best_score:
                best_score = score
                best_match = item
        
        if best_match and best_score >= self.fuzzy_threshold:
            return {
                'success': True,
                'matched_item': self._format_item(best_match, domain),
                'corrected_input': best_match['title'],
                'confidence': best_score / 100.0,
                'source': 'local_fuzzy'
            }
        
        return {'success': False}
    
    def _search_external_apis(self, query: str, domain: str) -> Dict:
        """
        Search external APIs based on domain
        
        Args:
            query: Search query
            domain: Domain (books, movies, music)
        
        Returns:
            Result dict with matched item if found
        """
        
        try:
            if domain == 'movies':
                result = self.omdb.search_by_title(query)
                if result:
                    return {
                        'success': True,
                        'matched_item': self._format_external_movie(result),
                        'corrected_input': result['title'],
                        'confidence': 0.9,
                        'source': 'external_api_omdb'
                    }
            
            elif domain == 'books':
                result = self.google_books.search_by_title(query)
                if result:
                    return {
                        'success': True,
                        'matched_item': self._format_external_book(result),
                        'corrected_input': result['title'],
                        'confidence': 0.9,
                        'source': 'external_api_google_books'
                    }
            
            elif domain == 'music':
                result = self.spotify.search_track(query)
                if result:
                    # Enrich with genres
                    result = self.spotify.enrich_with_artist_genres(result)
                    return {
                        'success': True,
                        'matched_item': self._format_external_music(result),
                        'corrected_input': result['title'],
                        'confidence': 0.9,
                        'source': 'external_api_spotify'
                    }
        
        except Exception as e:
            print(f"External API error: {e}")
        
        return {'success': False}
    
    def _validate_with_gemini(self, query: str, domain: str) -> Dict:
        """
        Use Gemini AI to validate and correct input
        
        Args:
            query: User input
            domain: Domain
        
        Returns:
            Result dict with validation results
        """
        
        try:
            result = self.gemini.validate_and_extract(query, domain)
            
            if result.get('is_valid'):
                # Try to find the corrected title in our dataset or external APIs
                corrected = result.get('corrected_title')
                
                # Search again with corrected title
                local_result = self._search_local_dataset(corrected, domain)
                if local_result['success']:
                    return {
                        **local_result,
                        'source': 'gemini_corrected_local',
                        'original_input': query
                    }
                
                # Try external APIs with corrected title
                external_result = self._search_external_apis(corrected, domain)
                if external_result['success']:
                    return {
                        **external_result,
                        'source': 'gemini_corrected_external',
                        'original_input': query
                    }
                
                # If still not found, return Gemini's extracted data
                return {
                    'success': True,
                    'matched_item': {
                        'title': result.get('corrected_title'),
                        'genres': result.get('genres', []),
                        'themes': result.get('themes', []),
                        'domain': domain,
                        'source': 'gemini_ai'
                    },
                    'corrected_input': result.get('corrected_title'),
                    'confidence': result.get('confidence', 0.7),
                    'source': 'gemini_ai',
                    'suggestions': result.get('similar_items', [])
                }
        
        except Exception as e:
            print(f"Gemini validation error: {e}")
        
        return {'success': False}
    
    def _generate_fallback_suggestions(self, query: str, domain: str) -> Dict:
        """
        Generate fallback suggestions when no match found
        
        Args:
            query: Original query
            domain: Domain
        
        Returns:
            Result with genre-based suggestions
        """
        
        # Get popular items from this domain
        collection = self.db['product_metadata']
        
        popular_items = list(collection.find({
            'domain': domain,
            'average_rating': {'$gte': 4.0}
        }).sort('rating_number', -1).limit(10))
        
        suggestions = [self._format_item(item, domain) for item in popular_items]
        
        return {
            'success': False,
            'error': f"Could not find '{query}' in {domain}",
            'suggestions': suggestions,
            'message': f"We couldn't find '{query}'. Here are some popular {domain} you might enjoy:"
        }
    
    def _cache_external_item(self, item: Dict, domain: str):
        """Cache externally found item in MongoDB for future use"""
        try:
            cache_collection = self.db['external_items_cache']
            cache_collection.update_one(
                {'title': item['title'], 'domain': domain},
                {'$set': {**item, 'cached_at': 'timestamp'}},
                upsert=True
            )
            print(f"✅ Cached {item['title']} for future use")
        except Exception as e:
            print(f"Cache error: {e}")
    
    def _format_item(self, item: Dict, domain: str) -> Dict:
        """Format MongoDB item to standard structure - FIXED VERSION"""
        # Safely handle categories (can be None)
        categories = item.get('categories')
        if categories is None:
            categories = []
        
        # Safely handle images
        images = item.get('images')
        image = ''
        if images and isinstance(images, list) and len(images) > 0:
            if isinstance(images[0], dict):
                image = images[0].get('large', '')
        
        # Safely handle description
        description = item.get('description')
        if description is None:
            description = ''
        elif isinstance(description, list):
            description = ' '.join(description)[:200]
        else:
            description = str(description)[:200]
        
        return {
            'title': item.get('title', ''),
            'genres': categories[:5] if isinstance(categories, list) else [],
            'rating': item.get('average_rating', 0),
            'domain': domain,
            'asin': item.get('parent_asin', ''),
            'image': image,
            'description': description,
            'source': 'local_dataset'
        }
    
    def _format_external_movie(self, movie: Dict) -> Dict:
        """Format OMDB movie data"""
        return {
            'title': movie.get('title'),
            'genres': movie.get('genre', []),
            'rating': float(movie.get('rating', 0)) if movie.get('rating') and movie.get('rating') != 'N/A' else 0,
            'domain': 'movies',
            'year': movie.get('year'),
            'director': movie.get('director'),
            'plot': movie.get('plot', ''),
            'source': 'omdb'
        }
    
    def _format_external_book(self, book: Dict) -> Dict:
        """Format Google Books data"""
        return {
            'title': book.get('title'),
            'genres': book.get('categories', []),
            'rating': book.get('rating', 0),
            'domain': 'books',
            'authors': book.get('authors', []),
            'publisher': book.get('publisher'),
            'description': book.get('description', ''),
            'source': 'google_books'
        }
    
    def _format_external_music(self, track: Dict) -> Dict:
        """Format Spotify track data"""
        return {
            'title': track.get('title'),
            'genres': track.get('genres', []),
            'rating': track.get('popularity', 0) / 20.0,  # Convert 0-100 to 0-5
            'domain': 'music',
            'artists': track.get('artists', []),
            'album': track.get('album'),
            'spotify_url': track.get('external_url'),
            'image': track.get('image'),
            'source': 'spotify'
        }


if __name__ == '__main__':
    # Test the processor
    processor = ColdStartInputProcessor()
    
    print("="*60)
    print("COLD-START INPUT PROCESSOR TEST")
    print("="*60)
    
    # Test cases
    test_cases = [
        ("Inception", "movies"),  # Try correct spelling first
        ("The Alchemist", "books"),  # Exact match
        ("Blinding Lights", "music"),  # Music
    ]
    
    for query, domain in test_cases:
        print(f"\n{'='*60}")
        print(f"TEST: '{query}' in {domain}")
        print(f"{'='*60}")
        
        result = processor.process_input(query, domain)
        
        if result['success']:
            item = result['matched_item']
            print(f"✅ SUCCESS")
            print(f"   Title: {item['title']}")
            print(f"   Genres: {item.get('genres', [])}")
            print(f"   Source: {result['source']}")
            print(f"   Confidence: {result.get('confidence', 0):.2%}")
        else:
            print(f"❌ NOT FOUND")
            print(f"   Error: {result.get('error', 'Unknown')}")
            print(f"   Suggestions: {len(result.get('suggestions', []))} items")
