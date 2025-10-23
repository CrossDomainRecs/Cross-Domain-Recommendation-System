from pymongo import MongoClient
import os
from src.services.spotify_service import get_spotify_service

class HybridMusicRecommender:
    """
    Hybrid music recommender that combines:
    1. Local music data (1,195 items)
    2. Spotify API (when needed)
    3. Caches Spotify results for future use
    """
    
    def __init__(self):
        # MongoDB connection
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client['reclab']
        self.collection = self.db['product_metadata']
        
        # Spotify service (lazy initialization)
        self._spotify_service = None
        
        print("✅ Hybrid music recommender initialized")
    
    @property
    def spotify_service(self):
        """Lazy initialization of Spotify service"""
        if self._spotify_service is None:
            try:
                self._spotify_service = get_spotify_service()
            except Exception as e:
                print(f"⚠️  Spotify service unavailable: {str(e)}")
                self._spotify_service = None
        return self._spotify_service
    
    def recommend(self, user_profile=None, n=20, seed_items=None):
        """
        Get music recommendations with hybrid approach:
        1. Try local recommendations first
        2. If < 5 results, supplement with Spotify
        3. Cache Spotify results
        """
        recommendations = []
        
        # Step 1: Get local recommendations
        print(f"🎵 Fetching local music recommendations...")
        local_recs = self._get_local_recommendations(user_profile, n, seed_items)
        recommendations.extend(local_recs)
        print(f"  Found {len(local_recs)} local recommendations")
        
        # Step 2: If insufficient results, supplement with Spotify
        if len(recommendations) < 5 and self.spotify_service:
            print(f"🎵 Supplementing with Spotify (need {5 - len(recommendations)} more)...")
            spotify_recs = self._get_spotify_recommendations(
                user_profile, 
                n - len(recommendations),
                seed_items
            )
            
            # Cache Spotify results
            if spotify_recs:
                print(f"  💾 Caching {len(spotify_recs)} Spotify tracks...")
                cached = self.spotify_service.cache_tracks_batch(spotify_recs)
                recommendations.extend(cached)
                print(f"  ✅ Added {len(spotify_recs)} Spotify recommendations")
        
        # Step 3: Return top N
        return recommendations[:n]
    
    def _get_local_recommendations(self, user_profile, n, seed_items):
        """Get recommendations from local music database"""
        try:
            # Build query
            query = {'domain': 'music'}
            
            # If seed items provided, try to find similar
            if seed_items:
                # Get genres/artists from seed items
                seed_docs = list(self.collection.find({
                    'parent_asin': {'$in': seed_items},
                    'domain': 'music'
                }))
                
                if seed_docs:
                    # Extract categories/genres
                    categories = []
                    artists = []
                    for doc in seed_docs:
                        if doc.get('categories'):
                            categories.extend(doc['categories'])
                        if doc.get('artists'):
                            artists.extend(doc['artists'])
                    
                    # Find similar items
                    if categories or artists:
                        or_conditions = []
                        if categories:
                            or_conditions.append({'categories': {'$in': categories}})
                        if artists:
                            or_conditions.append({'artists': {'$in': artists}})
                        
                        query['$or'] = or_conditions
            
            # Sort by popularity/rating
            results = list(self.collection.find(query).sort([
                ('average_rating', -1),
                ('popularity', -1)
            ]).limit(n))
            
            return results
            
        except Exception as e:
            print(f"❌ Error getting local recommendations: {str(e)}")
            return []
    
    def _get_spotify_recommendations(self, user_profile, n, seed_items):
        """Get recommendations from Spotify API"""
        try:
            if not self.spotify_service:
                return []
            
            recommendations = []
            
            # Strategy 1: Use seed items if available
            if seed_items:
                # Get local seed items details
                seed_docs = list(self.collection.find({
                    'parent_asin': {'$in': seed_items},
                    'domain': 'music'
                }))
                
                if seed_docs:
                    # Extract Spotify IDs if available
                    spotify_ids = []
                    artists = []
                    genres = []
                    
                    for doc in seed_docs:
                        if doc.get('spotify_id'):
                            spotify_ids.append(doc['spotify_id'])
                        if doc.get('artists'):
                            artists.extend(doc['artists'][:2])  # Top 2 artists
                        if doc.get('categories'):
                            genres.extend(doc['categories'][:2])  # Top 2 genres
                    
                    # Use Spotify recommendations API
                    if spotify_ids or genres:
                        spotify_recs = self.spotify_service.get_recommendations(
                            seed_tracks=spotify_ids[:2] if spotify_ids else None,
                            seed_genres=genres[:2] if genres else None,
                            limit=n
                        )
                        recommendations.extend(spotify_recs)
            
            # Strategy 2: Use user profile genres/preferences
            if len(recommendations) < n and user_profile:
                preferred_genres = user_profile.get('preferred_genres', [])
                if preferred_genres:
                    for genre in preferred_genres[:2]:
                        genre_recs = self.spotify_service.search_by_genre(
                            genre, 
                            limit=max(5, (n - len(recommendations)) // 2)
                        )
                        recommendations.extend(genre_recs)
            
            # Strategy 3: Fallback - popular tracks by genre
            if len(recommendations) < n:
                popular_genres = ['pop', 'rock', 'hip-hop', 'electronic']
                for genre in popular_genres:
                    if len(recommendations) >= n:
                        break
                    genre_recs = self.spotify_service.search_by_genre(
                        genre,
                        limit=max(5, n - len(recommendations))
                    )
                    recommendations.extend(genre_recs)
            
            # Remove duplicates
            seen = set()
            unique_recs = []
            for rec in recommendations:
                if rec['parent_asin'] not in seen:
                    seen.add(rec['parent_asin'])
                    unique_recs.append(rec)
            
            return unique_recs[:n]
            
        except Exception as e:
            print(f"❌ Error getting Spotify recommendations: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
    
    def search(self, query, limit=10):
        """
        Search for music tracks (local + Spotify)
        """
        results = []
        
        # Search local first
        local_results = list(self.collection.find({
            'domain': 'music',
            '$or': [
                {'title': {'$regex': query, '$options': 'i'}},
                {'artists': {'$regex': query, '$options': 'i'}},
                {'album': {'$regex': query, '$options': 'i'}}
            ]
        }).limit(limit))
        
        results.extend(local_results)
        
        # If insufficient, search Spotify
        if len(results) < 5 and self.spotify_service:
            spotify_results = self.spotify_service.search_tracks(query, limit - len(results))
            if spotify_results:
                # Cache results
                cached = self.spotify_service.cache_tracks_batch(spotify_results)
                results.extend(cached)
        
        return results[:limit]

# Global instance
_music_recommender = None

def get_music_recommender():
    """Get or create music recommender singleton"""
    global _music_recommender
    if _music_recommender is None:
        _music_recommender = HybridMusicRecommender()
    return _music_recommender
