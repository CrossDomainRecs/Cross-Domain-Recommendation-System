"""
Content-Based Recommender using Weaviate
Uses semantic similarity for recommendations
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional
import weaviate
import weaviate.classes as wvc
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

class ContentBasedRecommender:
    """
    Content-based recommendation using semantic similarity
    """
    
    def __init__(self):
        """Initialize content-based recommender"""
        self.config = get_config()
        
        # Connect to Weaviate
        self.client = weaviate.connect_to_local(
            host="localhost",
            port=8080,
            grpc_port=50051
        )
        self.collection = self.client.collections.get("Product")
        
        # Load embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print("✅ Content-based recommender initialized")
    
    def recommend_by_item(
        self, 
        item_id: str,
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Recommend items similar to a given item
        
        Args:
            item_id: ASIN of the item
            limit: Number of recommendations
            domain_filter: Optional domain filter (books, movies, music)
        
        Returns:
            List of recommended items with scores
        """
        
        # Get the item's vector from Weaviate
        result = self.collection.query.fetch_objects(
            filters=wvc.query.Filter.by_property("asin").equal(item_id),
            limit=1
        )
        
        if not result.objects:
            print(f"⚠️  Item {item_id} not found in Weaviate")
            return []
        
        # Get vector
        source_item = result.objects[0]
        vector = source_item.vector
        
        # Search for similar items
        query_params = {
            'near_vector': vector,
            'limit': limit + 1  # +1 to exclude source item
        }
        
        # Add domain filter if specified
        if domain_filter:
            query_params['filters'] = wvc.query.Filter.by_property("domain").equal(domain_filter)
        
        similar = self.collection.query.near_vector(**query_params)
        
        # Format results and exclude source item
        recommendations = []
        for obj in similar.objects:
            if obj.properties['asin'] != item_id:
                recommendations.append({
                    'asin': obj.properties['asin'],
                    'title': obj.properties['title'],
                    'domain': obj.properties['domain'],
                    'genres': obj.properties.get('categories', []),
                    'rating': obj.properties.get('rating', 0),
                    'score': 1.0,  # Weaviate doesn't return distance by default
                    'source': 'content_based'
                })
        
        return recommendations[:limit]
    
    def recommend_by_profile(
        self,
        user_profile: Dict,
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Recommend items based on user profile
        
        Args:
            user_profile: User profile with preferences
            limit: Number of recommendations
            domain_filter: Optional domain filter
        
        Returns:
            List of recommended items
        """
        
        # Create query from user profile
        query_text = self._build_query_from_profile(user_profile)
        
        # Generate embedding
        query_vector = self.embedding_model.encode(query_text).tolist()
        
        # Search Weaviate
        query_params = {
            'near_vector': query_vector,
            'limit': limit
        }
        
        if domain_filter:
            query_params['filters'] = wvc.query.Filter.by_property("domain").equal(domain_filter)
        
        results = self.collection.query.near_vector(**query_params)
        
        # Format results
        recommendations = []
        for obj in results.objects:
            recommendations.append({
                'asin': obj.properties['asin'],
                'title': obj.properties['title'],
                'domain': obj.properties['domain'],
                'genres': obj.properties.get('categories', []),
                'rating': obj.properties.get('rating', 0),
                'description': obj.properties.get('description', ''),
                'author': obj.properties.get('author', ''),
                'score': 1.0,
                'source': 'content_based'
            })
        
        return recommendations
    
    def recommend_by_genres(
        self,
        genres: List[str],
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Recommend items by genres
        
        Args:
            genres: List of genre preferences
            limit: Number of recommendations
            domain_filter: Optional domain filter
        
        Returns:
            List of recommended items
        """
        
        # Create query from genres
        query_text = ' '.join(genres)
        query_vector = self.embedding_model.encode(query_text).tolist()
        
        # Search
        query_params = {
            'near_vector': query_vector,
            'limit': limit
        }
        
        if domain_filter:
            query_params['filters'] = wvc.query.Filter.by_property("domain").equal(domain_filter)
        
        results = self.collection.query.near_vector(**query_params)
        
        # Format results
        recommendations = []
        for obj in results.objects:
            recommendations.append({
                'asin': obj.properties['asin'],
                'title': obj.properties['title'],
                'domain': obj.properties['domain'],
                'genres': obj.properties.get('categories', []),
                'rating': obj.properties.get('rating', 0),
                'score': 1.0,
                'source': 'content_based'
            })
        
        return recommendations
    
    def _build_query_from_profile(self, profile: Dict) -> str:
        """Build search query from user profile"""
        parts = []
        
        # Add favorite genres
        if profile.get('favorite_genres'):
            parts.extend(profile['favorite_genres'][:5])
        
        # Add liked items
        if profile.get('liked_items'):
            parts.extend([item['title'] for item in profile['liked_items'][:3]])
        
        # Add themes/keywords
        if profile.get('themes'):
            parts.extend(profile['themes'][:3])
        
        return ' '.join(parts)
    
    def close(self):
        """Close Weaviate connection"""
        try:
            self.client.close()
            print("👋 Closed Weaviate connection")
        except:
            pass


if __name__ == '__main__':
    # Test content-based recommender
    recommender = ContentBasedRecommender()
    
    print("="*60)
    print("CONTENT-BASED RECOMMENDER TEST")
    print("="*60)
    
    # Test 1: Recommend by genres
    print("\n🎬 TEST 1: Recommend movies by genres (Sci-Fi, Thriller)")
    print("-"*60)
    results = recommender.recommend_by_genres(
        genres=['Science Fiction', 'Thriller', 'Action'],
        limit=5,
        domain_filter='movies'
    )
    
    for i, item in enumerate(results, 1):
        print(f"{i}. {item['title']}")
        print(f"   Genres: {item['genres'][:3]}")
        print(f"   Rating: {item['rating']}")
    
    # Test 2: Recommend by user profile
    print("\n👤 TEST 2: Recommend by user profile")
    print("-"*60)
    user_profile = {
        'favorite_genres': ['Sci-Fi', 'Thriller', 'Mystery'],
        'liked_items': [
            {'title': 'Inception', 'domain': 'movies'},
            {'title': 'The Matrix', 'domain': 'movies'}
        ]
    }
    
    results = recommender.recommend_by_profile(user_profile, limit=5)
    
    for i, item in enumerate(results, 1):
        print(f"{i}. [{item['domain']}] {item['title']}")
        print(f"   Rating: {item['rating']}")
    # Test 3: Recommend music
    print("\n🎵 TEST 3: Recommend music (Pop, R&B)")
    print("-"*60)
    results = recommender.recommend_by_genres(
        genres=['Pop', 'R&B', 'Soul'],
        limit=5,
        domain_filter='music'
    )
    
    if results:
        for i, item in enumerate(results, 1):
            print(f"{i}. {item['title']}")
            print(f"   Artist: {item.get('author', 'Unknown')}")
            print(f"   Rating: {item['rating']}")
    else:
        print("⚠️  No music recommendations found (dataset is small)")
    
    # Test 4: Cross-domain recommendations (no filter)
    print("\n🌐 TEST 4: Cross-domain recommendations")
    print("-"*60)
    user_profile = {
        'favorite_genres': ['Sci-Fi', 'Thriller', 'Mystery'],
        'liked_items': [
            {'title': 'Inception', 'domain': 'movies'},
            {'title': 'The Matrix', 'domain': 'movies'}
        ]
    }
    
    results = recommender.recommend_by_profile(user_profile, limit=10)
    
    # Group by domain
    by_domain = {}
    for item in results:
        domain = item['domain']
        if domain not in by_domain:
            by_domain[domain] = []
        by_domain[domain].append(item)
    
    for domain, items in by_domain.items():
        print(f"\n  {domain.upper()}: {len(items)} items")
        for item in items[:3]:
            print(f"    - {item['title']}")
    
    print("\n✅ Content-based tests complete!")
    recommender.close()
