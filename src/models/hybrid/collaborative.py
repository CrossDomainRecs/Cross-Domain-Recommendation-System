"""
Collaborative Filtering using trained GNN model (LightGCN)
Predicts user ratings for unseen items based on user-item interactions
"""

import sys
from pathlib import Path
from typing import Dict, List, Optional
import torch
import numpy as np
from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

class CollaborativeRecommender:
    """
    Collaborative filtering using trained GNN model
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize collaborative recommender
        
        Args:
            model_path: Path to trained model checkpoint
        """
        self.config = get_config()
        
        # Model path
        if model_path is None:
            model_path = PROJECT_ROOT / 'models' / 'gnn' / 'best_model_enhanced.pth'
        
        self.model_path = Path(model_path)
        
        # Device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load model
        self._load_model()
        
        # Connect to MongoDB for user-item mappings
        mongo_uri = self.config.get_secret('MONGODB_URI')
        self.mongo_client = MongoClient(mongo_uri)
        self.db = self.mongo_client['reclab']
        
        print(f"✅ Collaborative recommender initialized")
        print(f"   Model: {self.model_path.name}")
        print(f"   Device: {self.device}")
    
    def _load_model(self):
        """Load trained GNN model"""
        try:
            # FIXED: Added weights_only=False to suppress warning
            checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
            
            # Extract model state and metadata
            self.model_state = checkpoint.get('model_state_dict')
            self.user_embeddings = checkpoint.get('user_embeddings')
            self.item_embeddings = checkpoint.get('item_embeddings')
            
            # Model configuration
            self.num_users = checkpoint.get('num_users', 0)
            self.num_items = checkpoint.get('num_items', 0)
            self.embedding_dim = checkpoint.get('embedding_dim', 64)
            
            # Mappings (if available)
            self.user_mapping = checkpoint.get('user_mapping', {})
            self.item_mapping = checkpoint.get('item_mapping', {})
            self.reverse_item_mapping = {v: k for k, v in self.item_mapping.items()}
            
            print(f"✅ Model loaded successfully")
            print(f"   Users: {self.num_users:,}")
            print(f"   Items: {self.num_items:,}")
            print(f"   Embedding dim: {self.embedding_dim}")
            
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            print(f"   Path: {self.model_path}")
            raise
    
    def predict_for_user(
        self,
        user_id: str,
        candidate_items: List[str],
        top_k: int = 20
    ) -> List[Dict]:
        """
        Predict ratings for candidate items for a user
        
        Args:
            user_id: User ID
            candidate_items: List of item ASINs to score
            top_k: Number of top recommendations
        
        Returns:
            List of items with predicted scores
        """
        
        # Get user index
        user_idx = self.user_mapping.get(user_id)
        
        if user_idx is None:
            # User not in training data (cold start)
            # Return empty - will be handled by content-based
            print(f"⚠️  User {user_id} not in training data (cold start)")
            return []
        
        # Get user embedding
        user_emb = self.user_embeddings[user_idx]
        
        # Get item embeddings for candidates
        predictions = []
        
        for item_id in candidate_items:
            item_idx = self.item_mapping.get(item_id)
            
            if item_idx is not None:
                # Item in training data
                item_emb = self.item_embeddings[item_idx]
                
                # Predict score (dot product)
                score = float(torch.dot(
                    torch.tensor(user_emb),
                    torch.tensor(item_emb)
                ))
                
                predictions.append({
                    'asin': item_id,
                    'score': score,
                    'source': 'collaborative'
                })
        
        # Sort by score
        predictions.sort(key=lambda x: x['score'], reverse=True)
        
        return predictions[:top_k]
    
    def get_similar_items(
        self,
        item_id: str,
        top_k: int = 20
    ) -> List[Dict]:
        """
        Find items similar to given item (item-item similarity)
        
        Args:
            item_id: Item ASIN
            top_k: Number of similar items
        
        Returns:
            List of similar items with scores
        """
        
        item_idx = self.item_mapping.get(item_id)
        
        if item_idx is None:
            print(f"⚠️  Item {item_id} not in training data")
            return []
        
        # Get item embedding
        item_emb = torch.tensor(self.item_embeddings[item_idx])
        
        # Compute similarity with all items
        all_item_embs = torch.tensor(self.item_embeddings)
        similarities = torch.matmul(all_item_embs, item_emb)
        
        # Get top k (excluding self)
        top_indices = torch.topk(similarities, k=top_k + 1).indices.tolist()
        
        results = []
        for idx in top_indices:
            if idx != item_idx:  # Exclude self
                asin = self.reverse_item_mapping.get(idx)
                if asin:
                    results.append({
                        'asin': asin,
                        'score': float(similarities[idx]),
                        'source': 'collaborative'
                    })
        
        return results[:top_k]
    
    def get_top_items_for_new_user(
        self,
        liked_items: List[str],
        top_k: int = 20
    ) -> List[Dict]:
        """
        Get recommendations for new user based on liked items
        (Used during cold-start after user provides initial preferences)
        
        Args:
            liked_items: List of item ASINs user liked
            top_k: Number of recommendations
        
        Returns:
            List of recommended items
        """
        
        # Get embeddings for liked items
        liked_embeddings = []
        
        for item_id in liked_items:
            item_idx = self.item_mapping.get(item_id)
            if item_idx is not None:
                liked_embeddings.append(self.item_embeddings[item_idx])
        
        if not liked_embeddings:
            print("⚠️  No liked items found in training data")
            return []
        
        # Average liked item embeddings to create pseudo-user embedding
        pseudo_user_emb = torch.tensor(np.mean(liked_embeddings, axis=0))
        
        # Compute scores for all items
        all_item_embs = torch.tensor(self.item_embeddings)
        scores = torch.matmul(all_item_embs, pseudo_user_emb)
        
        # Get top k
        top_indices = torch.topk(scores, k=top_k + len(liked_items)).indices.tolist()
        
        # Format results (exclude already liked items)
        results = []
        liked_set = set(liked_items)
        
        for idx in top_indices:
            asin = self.reverse_item_mapping.get(idx)
            if asin and asin not in liked_set:
                results.append({
                    'asin': asin,
                    'score': float(scores[idx]),
                    'source': 'collaborative'
                })
                
                if len(results) >= top_k:
                    break
        
        return results
    
    def close(self):
        """Close MongoDB connection"""
        try:
            self.mongo_client.close()
            print("👋 Closed MongoDB connection")
        except:
            pass


if __name__ == '__main__':
    # Test collaborative recommender
    recommender = CollaborativeRecommender()
    
    print("\n" + "="*60)
    print("COLLABORATIVE RECOMMENDER TEST")
    print("="*60)
    
    # Test 1: Get similar items
    print("\n🎬 TEST 1: Get items similar to a known movie")
    print("-"*60)
    
    # Get a sample item from MongoDB
    metadata_collection = recommender.db['product_metadata']
    sample_movie = metadata_collection.find_one({'domain': 'movies'})
    
    if sample_movie:
        sample_asin = sample_movie['parent_asin']
        print(f"Source item: {sample_movie['title']}")
        print(f"ASIN: {sample_asin}")
        
        similar = recommender.get_similar_items(sample_asin, top_k=5)
        
        if similar:
            print(f"\nFound {len(similar)} similar items:")
            for i, item in enumerate(similar, 1):
                # Get title from MongoDB
                item_data = metadata_collection.find_one({'parent_asin': item['asin']})
                title = item_data['title'] if item_data else item['asin']
                print(f"{i}. {title}")
                print(f"   Similarity score: {item['score']:.4f}")
        else:
            print("⚠️  No similar items found (item not in training data)")
    
    # Test 2: Recommendations for new user based on liked items
    print("\n👤 TEST 2: Recommendations for new user")
    print("-"*60)
    
    # Get a few sample items
    sample_items = list(metadata_collection.find({'domain': 'movies'}).limit(3))
    liked_asins = [item['parent_asin'] for item in sample_items]
    
    print("Liked items:")
    for item in sample_items:
        print(f"  - {item['title']}")
    
    recommendations = recommender.get_top_items_for_new_user(liked_asins, top_k=5)
    
    if recommendations:
        print(f"\nTop {len(recommendations)} recommendations:")
        for i, rec in enumerate(recommendations, 1):
            item_data = metadata_collection.find_one({'parent_asin': rec['asin']})
            title = item_data['title'] if item_data else rec['asin']
            print(f"{i}. {title}")
            print(f"   Score: {rec['score']:.4f}")
    else:
        print("⚠️  No recommendations (items not in training data)")
    
    print("\n✅ Collaborative tests complete!")
    recommender.close()