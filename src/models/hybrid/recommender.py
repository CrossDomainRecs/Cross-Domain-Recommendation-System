"""
Hybrid Recommendation Engine
Combines content-based (Weaviate) + collaborative (GNN) recommendations
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config
from src.models.hybrid.content_based import ContentBasedRecommender
from src.models.hybrid.collaborative import CollaborativeRecommender

class HybridRecommender:
    """
    Hybrid recommendation system combining multiple approaches
    
    Methods:
    1. Content-based (Weaviate semantic search)
    2. Collaborative (GNN-based predictions)
    3. Hybrid scoring (weighted combination)
    """
    
    def __init__(
        self,
        content_weight: float = 0.4,
        collaborative_weight: float = 0.6
    ):
        """
        Initialize hybrid recommender
        
        Args:
            content_weight: Weight for content-based scores (0-1)
            collaborative_weight: Weight for collaborative scores (0-1)
        """
        self.config = get_config()
        
        # Initialize components
        print("🔧 Initializing hybrid recommender...")
        self.content_recommender = ContentBasedRecommender()
        self.collaborative_recommender = CollaborativeRecommender()
        
        # Weights
        self.content_weight = content_weight
        self.collaborative_weight = collaborative_weight
        
        # Normalize weights
        total = self.content_weight + self.collaborative_weight
        self.content_weight /= total
        self.collaborative_weight /= total
        
        # MongoDB for metadata
        mongo_uri = self.config.get_secret('MONGODB_URI')
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client['reclab']
        
        print(f"✅ Hybrid recommender ready!")
        print(f"   Content weight: {self.content_weight:.1%}")
        print(f"   Collaborative weight: {self.collaborative_weight:.1%}")
    
    def recommend_for_new_user(
        self,
        user_profile: Dict,
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Generate recommendations for new user (cold-start)
        
        Args:
            user_profile: User profile with preferences
            limit: Number of recommendations
            domain_filter: Optional domain filter
        
        Returns:
            List of recommended items with hybrid scores
        """
        
        print(f"\n🎯 Generating recommendations for new user...")
        
        # 1. Content-based recommendations
        print("  📊 Content-based scoring...")
        content_recs = self.content_recommender.recommend_by_profile(
            user_profile,
            limit=limit * 2,
            domain_filter=domain_filter
        )
        
        # 2. Collaborative recommendations (if user has liked items)
        collab_recs = []
        if user_profile.get('liked_items'):
            print("  🤝 Collaborative scoring...")
            liked_asins = [item['asin'] for item in user_profile['liked_items'] if item.get('asin')]
            if liked_asins:
                collab_recs = self.collaborative_recommender.get_top_items_for_new_user(
                    liked_asins,
                    top_k=limit * 2
                )
        
        # 3. Combine scores
        print("  ⚖️  Combining scores...")
        hybrid_recs = self._combine_recommendations(
            content_recs,
            collab_recs,
            limit=limit
        )
        
        # 4. Enrich with metadata
        print("  📝 Enriching with metadata...")
        enriched = self._enrich_with_metadata(hybrid_recs)
        
        print(f"✅ Generated {len(enriched)} recommendations")
        
        return enriched
    
    def recommend_for_user(
        self,
        user_id: str,
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """Generate recommendations for existing user"""
        
        print(f"\n🎯 Generating recommendations for user {user_id}...")
        
        user_profile = self._get_user_profile(user_id)
        
        if not user_profile:
            print(f"⚠️  User {user_id} not found, treating as new user")
            return self.recommend_for_new_user({}, limit, domain_filter)
        
        candidate_items = self._get_candidate_items(user_id, limit * 3)
        
        print("  📊 Content-based scoring...")
        content_recs = self.content_recommender.recommend_by_profile(
            user_profile,
            limit=limit * 2,
            domain_filter=domain_filter
        )
        
        print("  🤝 Collaborative scoring...")
        candidate_asins = [item['asin'] for item in candidate_items]
        collab_recs = self.collaborative_recommender.predict_for_user(
            user_id,
            candidate_asins,
            top_k=limit * 2
        )
        
        print("  ⚖️  Combining scores...")
        hybrid_recs = self._combine_recommendations(
            content_recs,
            collab_recs,
            limit=limit
        )
        
        print("  📝 Enriching with metadata...")
        enriched = self._enrich_with_metadata(hybrid_recs)
        
        print(f"✅ Generated {len(enriched)} recommendations")
        
        return enriched
    
    def recommend_similar_items(
        self,
        item_id: str,
        limit: int = 20,
        domain_filter: Optional[str] = None
    ) -> List[Dict]:
        """Recommend items similar to given item"""
        
        print(f"\n🎯 Finding items similar to {item_id}...")
        
        collab_recs = self.collaborative_recommender.get_similar_items(
            item_id,
            top_k=limit * 2
        )
        
        content_recs = []
        try:
            content_recs = self.content_recommender.recommend_by_item(
                item_id,
                limit=limit * 2,
                domain_filter=domain_filter
            )
        except Exception as e:
            print(f"  ⚠️  Content-based failed: {e}")
        
        hybrid_recs = self._combine_recommendations(
            content_recs,
            collab_recs,
            limit=limit
        )
        
        enriched = self._enrich_with_metadata(hybrid_recs)
        
        return enriched
    
    def _combine_recommendations(
        self,
        content_recs: List[Dict],
        collab_recs: List[Dict],
        limit: int
    ) -> List[Dict]:
        """Combine content-based and collaborative recommendations"""
        
        content_scores = {rec['asin']: rec.get('score', 1.0) for rec in content_recs}
        collab_scores = {rec['asin']: rec.get('score', 0.0) for rec in collab_recs}
        
        content_scores = self._normalize_scores(content_scores)
        collab_scores = self._normalize_scores(collab_scores)
        
        all_asins = set(content_scores.keys()) | set(collab_scores.keys())
        
        hybrid_scores = {}
        for asin in all_asins:
            content_score = content_scores.get(asin, 0.0)
            collab_score = collab_scores.get(asin, 0.0)
            
            hybrid_score = (
                self.content_weight * content_score +
                self.collaborative_weight * collab_score
            )
            
            hybrid_scores[asin] = hybrid_score
        
        sorted_items = sorted(
            hybrid_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {
                'asin': asin,
                'score': score,
                'content_score': content_scores.get(asin, 0.0),
                'collab_score': collab_scores.get(asin, 0.0),
                'source': 'hybrid'
            }
            for asin, score in sorted_items[:limit]
        ]
    
    def _normalize_scores(self, scores: Dict[str, float]) -> Dict[str, float]:
        """Normalize scores to 0-1 range"""
        if not scores:
            return {}
        
        values = list(scores.values())
        min_val = min(values)
        max_val = max(values)
        
        if max_val == min_val:
            return {k: 1.0 for k in scores.keys()}
        
        return {
            k: (v - min_val) / (max_val - min_val)
            for k, v in scores.items()
        }
    
    def _enrich_with_metadata(self, recommendations: List[Dict]) -> List[Dict]:
        """Add metadata from MongoDB - COMPLETELY FIXED"""
        enriched = []
        
        for rec in recommendations:
            metadata = self.db['product_metadata'].find_one({
                'parent_asin': rec['asin']
            })
            
            if metadata:
                # Safely get description
                description = metadata.get('description')
                if description is None:
                    description = ''
                elif isinstance(description, list):
                    description = ' '.join(str(d) for d in description if d)[:200]
                else:
                    description = str(description)[:200]
                
                # Safely get categories
                categories = metadata.get('categories', [])
                if not isinstance(categories, list):
                    categories = []
                
                # ✅ FIXED: Get image URL - handle ALL formats
                images = metadata.get('images', [])
                image_url = ''
                
                if images and isinstance(images, list) and len(images) > 0:
                    first_image = images[0]
                    if isinstance(first_image, dict):
                        # Try books format: {large: 'url', hi_res: 'url'}
                        image_url = first_image.get('large') or first_image.get('hi_res', '')
                        
                        # Try movies/music format: {'720w': 'url', '1080w': 'url'}
                        if not image_url:
                            for key in ['1920w', '1440w', '1080w', '720w', '480w', '360w']:
                                if key in first_image:
                                    image_url = first_image[key]
                                    break
                
                enriched.append({
                    **rec,
                    'title': metadata.get('title', 'Unknown'),
                    'domain': metadata.get('domain', ''),
                    'genres': categories[:5],
                    'rating': metadata.get('average_rating', 0),
                    'description': description,
                    'image': image_url,
                })
            else:
                print(f"  ⚠️  No metadata for {rec['asin']}")
        
        return enriched
    
    def _get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile from database"""
        return None
    
    def _get_candidate_items(self, user_id: str, limit: int) -> List[Dict]:
        """Get candidate items for user"""
        return []
    
    def close(self):
        """Close all connections"""
        self.content_recommender.close()
        self.collaborative_recommender.close()
        self.mongo_client.close()
        print("👋 Closed all connections")