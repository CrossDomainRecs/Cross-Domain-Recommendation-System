"""
Recommendation Environment for DRL Agent
Defines states, actions, and rewards for recommendation task
"""

import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

class RecommendationEnvironment:
    """
    Environment for recommendation learning
    
    State: User profile + recent interactions
    Action: Recommend an item from candidate set
    Reward: User feedback (click, favorite, time spent, etc.)
    """
    
    def __init__(self, embedding_model: str = 'all-MiniLM-L6-v2'):
        """
        Initialize environment
        
        Args:
            embedding_model: Sentence transformer model name
        """
        self.config = get_config()
        
        # Embedding model for state representation
        self.embedding_model = SentenceTransformer(embedding_model)
        self.state_dim = 384  # MiniLM embedding size
        
        # Reward mapping
        self.reward_mapping = {
            'favorite': 5.0,      # User favorited item
            'click': 1.0,         # User clicked item
            'time_30s': 2.0,      # User spent 30+ seconds
            'time_60s': 3.0,      # User spent 60+ seconds
            'share': 4.0,         # User shared item
            'skip': -0.5,         # User skipped item
            'dismiss': -1.0,      # User dismissed item
            'request_explanation': 0.5,  # User requested explanation
            'cross_domain_click': 2.0,   # Clicked cross-domain recommendation
        }
        
        print("✅ Recommendation environment initialized")
        print(f"   State dimension: {self.state_dim}")
        print(f"   Reward types: {len(self.reward_mapping)}")
    
    def create_state(
        self,
        user_profile: Dict,
        recent_interactions: List[Dict] = None,
        context: Dict = None
    ) -> Dict:
        """
        Create state representation from user data
        
        Args:
            user_profile: User profile
                {
                    'user_id': 'user123',
                    'favorite_genres': ['Sci-Fi', 'Thriller'],
                    'liked_items': [...]
                }
            recent_interactions: Recent user interactions
            context: Contextual information (time, device, etc.)
        
        Returns:
            State dict with embedding
        """
        # Build text representation
        text_parts = []
        
        # Add genres
        if user_profile.get('favorite_genres'):
            text_parts.append(' '.join(user_profile['favorite_genres'][:5]))
        
        # Add liked items
        if user_profile.get('liked_items'):
            titles = [item.get('title', '') for item in user_profile['liked_items'][:3]]
            text_parts.append(' '.join(titles))
        
        # Add recent interactions
        if recent_interactions:
            for interaction in recent_interactions[-5:]:
                if interaction.get('item_title'):
                    text_parts.append(interaction['item_title'])
        
        # Create embedding
        text = ' '.join(text_parts) if text_parts else 'new user'
        embedding = self.embedding_model.encode(text).tolist()
        
        # Create state
        state = {
            'user_id': user_profile.get('user_id', 'unknown'),
            'embedding': embedding,
            'favorite_genres': user_profile.get('favorite_genres', []),
            'interaction_count': len(recent_interactions) if recent_interactions else 0,
            'context': context or {}
        }
        
        return state
    
    def calculate_reward(
        self,
        action: str,
        feedback: Dict
    ) -> float:
        """
        Calculate reward from user feedback
        
        Args:
            action: Recommended item ASIN
            feedback: User feedback
                {
                    'action': 'click',  # or 'favorite', 'skip', etc.
                    'time_spent': 45,   # seconds
                    'cross_domain': False
                }
        
        Returns:
            Reward value
        """
        reward = 0.0
        
        # Base reward from action type
        action_type = feedback.get('action', 'skip')
        reward += self.reward_mapping.get(action_type, 0.0)
        
        # Bonus for time spent
        time_spent = feedback.get('time_spent', 0)
        if time_spent >= 60:
            reward += self.reward_mapping['time_60s']
        elif time_spent >= 30:
            reward += self.reward_mapping['time_30s']
        
        # Bonus for cross-domain engagement
        if feedback.get('cross_domain'):
            reward += self.reward_mapping['cross_domain_click']
        
        # Bonus for requesting explanation (shows interest)
        if feedback.get('requested_explanation'):
            reward += self.reward_mapping['request_explanation']
        
        return reward
    
    def step(
        self,
        state: Dict,
        action: str,
        feedback: Dict
    ) -> Tuple[Dict, float, bool]:
        """
        Environment step
        
        Args:
            state: Current state
            action: Action taken (item ASIN)
            feedback: User feedback
        
        Returns:
            (next_state, reward, done)
        """
        # Calculate reward
        reward = self.calculate_reward(action, feedback)
        
        # Create next state (updated with new interaction)
        next_state = state.copy()
        next_state['interaction_count'] += 1
        
        # Episode is done if user leaves or session ends
        done = feedback.get('session_end', False)
        
        return next_state, reward, done
    
    def reset(self, user_profile: Dict) -> Dict:
        """
        Reset environment for new episode
        
        Args:
            user_profile: User profile
        
        Returns:
            Initial state
        """
        return self.create_state(user_profile)
    
    def state_to_tensor(self, state: Dict) -> torch.Tensor:
        """
        Convert state dict to tensor for neural network
        
        Args:
            state: State dict
        
        Returns:
            State tensor
        """
        embedding = state['embedding']
        return torch.FloatTensor(embedding).unsqueeze(0)


if __name__ == '__main__':
    # Test environment
    env = RecommendationEnvironment()
    
    print("\n" + "="*60)
    print("ENVIRONMENT TEST")
    print("="*60)
    
    # Test 1: Create state
    print("\n📍 TEST 1: Create state from user profile")
    user_profile = {
        'user_id': 'user123',
        'favorite_genres': ['Sci-Fi', 'Thriller', 'Action'],
        'liked_items': [
            {'title': 'Inception', 'domain': 'movies'},
            {'title': 'The Matrix', 'domain': 'movies'}
        ]
    }
    
    state = env.create_state(user_profile)
    print(f"✅ State created")
    print(f"   User ID: {state['user_id']}")
    print(f"   Embedding shape: {len(state['embedding'])}")
    print(f"   Genres: {state['favorite_genres']}")
    
    # Test 2: Calculate rewards
    print("\n📍 TEST 2: Calculate rewards")
    
    test_feedbacks = [
        {'action': 'favorite', 'time_spent': 120},
        {'action': 'click', 'time_spent': 45},
        {'action': 'skip', 'time_spent': 2},
        {'action': 'click', 'cross_domain': True, 'time_spent': 90}
    ]
    
    for feedback in test_feedbacks:
        reward = env.calculate_reward('item_123', feedback)
        print(f"   {feedback['action']:15} → Reward: {reward:+.1f}")
    
    # Test 3: Environment step
    print("\n📍 TEST 3: Environment step")
    feedback = {'action': 'favorite', 'time_spent': 100}
    next_state, reward, done = env.step(state, 'item_123', feedback)
    
    print(f"✅ Step completed")
    print(f"   Reward: {reward:+.1f}")
    print(f"   Done: {done}")
    print(f"   Next interaction count: {next_state['interaction_count']}")
    
    # Test 4: Convert to tensor
    print("\n📍 TEST 4: Convert state to tensor")
    tensor = env.state_to_tensor(state)
    print(f"✅ Tensor shape: {tensor.shape}")
    
    print("\n✅ All environment tests passed!")
