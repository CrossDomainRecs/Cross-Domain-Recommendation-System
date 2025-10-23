"""
DRL-Enhanced Recommendation System
Integrates DRL agent with hybrid recommender
"""

import sys
from pathlib import Path
from typing import Dict, List, Tuple
import torch

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.models.drl.agent import DRLAgent
from src.models.drl.environment import RecommendationEnvironment
from src.models.hybrid.recommender import HybridRecommender

class DRLRecommender:
    """
    Adaptive recommendation system with DRL
    
    Flow:
    1. Hybrid recommender generates candidate items
    2. DRL agent ranks/selects items based on learned policy
    3. User feedback trains the agent
    """
    
    def __init__(
        self,
        hybrid_recommender: HybridRecommender = None,
        drl_agent: DRLAgent = None,
        environment: RecommendationEnvironment = None,
        use_drl: bool = True
    ):
        """
        Initialize DRL-enhanced recommender
        
        Args:
            hybrid_recommender: Hybrid recommender instance
            drl_agent: DRL agent instance
            environment: Recommendation environment
            use_drl: Whether to use DRL (can disable for testing)
        """
        # Initialize components
        self.hybrid_recommender = hybrid_recommender or HybridRecommender()
        self.environment = environment or RecommendationEnvironment()
        self.drl_agent = drl_agent or DRLAgent(
            state_dim=self.environment.state_dim,
            action_dim=1000  # Top candidate items
        )
        
        self.use_drl = use_drl
        
        print(f"✅ DRL Recommender initialized (DRL {'enabled' if use_drl else 'disabled'})")
    
    def recommend(
        self,
        user_profile: Dict,
        limit: int = 20,
        domain_filter: str = None,
        recent_interactions: List[Dict] = None
    ) -> List[Dict]:
        """
        Generate recommendations using DRL-enhanced approach
        
        Args:
            user_profile: User profile
            limit: Number of recommendations
            domain_filter: Optional domain filter
            recent_interactions: Recent user interactions
        
        Returns:
            List of recommended items
        """
        
        # Step 1: Generate candidate items using hybrid recommender
        candidates = self.hybrid_recommender.recommend_for_new_user(
            user_profile=user_profile,
            limit=limit * 5,  # Get more candidates for DRL to choose from
            domain_filter=domain_filter
        )
        
        if not self.use_drl or not candidates:
            # Fallback to hybrid recommendations
            return candidates[:limit]
        
        # Step 2: Create state
        state = self.environment.create_state(
            user_profile=user_profile,
            recent_interactions=recent_interactions
        )
        
        # Step 3: Use DRL agent to rank candidates
        state_tensor = self.environment.state_to_tensor(state)
        candidate_asins = [item['asin'] for item in candidates]
        
        # Get Q-values for all candidates
        with torch.no_grad():
            q_values = self.drl_agent.policy_net(
                state_tensor.to(self.drl_agent.device)
            )
            q_values = q_values.squeeze()[:len(candidates)]
        
        # Rank by Q-value
        ranked_indices = torch.argsort(q_values, descending=True).cpu().tolist()
        
        # Return top items
        return [candidates[i] for i in ranked_indices[:limit]]
    
    def record_feedback(
        self,
        user_profile: Dict,
        recommended_item: str,
        feedback: Dict,
        recent_interactions: List[Dict] = None
    ):
        """
        Record user feedback and train agent
        
        Args:
            user_profile: User profile
            recommended_item: Recommended item ASIN
            feedback: User feedback
            recent_interactions: Recent interactions
        """
        if not self.use_drl:
            return
        
        # Create current state
        state = self.environment.create_state(
            user_profile=user_profile,
            recent_interactions=recent_interactions or []
        )
        
        # Get next state and reward
        next_state, reward, done = self.environment.step(
            state=state,
            action=recommended_item,
            feedback=feedback
        )
        
        # Store transition
        self.drl_agent.store_transition(
            state=state,
            action=recommended_item,
            reward=reward,
            next_state=next_state,
            done=done
        )
        
        # Train agent
        if len(self.drl_agent.replay_buffer) >= self.drl_agent.batch_size:
            loss = self.drl_agent.train()
            return {'loss': loss, 'reward': reward}
        
        return {'reward': reward}
    
    def save(self, model_dir: str = 'models/drl'):
        """Save DRL agent"""
        Path(model_dir).mkdir(parents=True, exist_ok=True)
        self.drl_agent.save(f'{model_dir}/drl_agent.pth')
        self.drl_agent.replay_buffer.save(f'{model_dir}/replay_buffer.pkl')
    
    def load(self, model_dir: str = 'models/drl'):
        """Load DRL agent"""
        self.drl_agent.load(f'{model_dir}/drl_agent.pth')
        self.drl_agent.replay_buffer.load(f'{model_dir}/replay_buffer.pkl')


if __name__ == '__main__':
    # Test DRL recommender
    print("="*60)
    print("DRL RECOMMENDER TEST")
    print("="*60)
    
    recommender = DRLRecommender()
    
    # Test recommendation
    user_profile = {
        'user_id': 'user123',
        'favorite_genres': ['Sci-Fi', 'Thriller'],
        'liked_items': [
            {'asin': 'B001', 'title': 'Inception', 'domain': 'movies'}
        ]
    }
    
    print("\n📍 Generating recommendations...")
    recommendations = recommender.recommend(user_profile, limit=5)
    
    print(f"✅ Generated {len(recommendations)} recommendations")
    for i, rec in enumerate(recommendations, 1):
        print(f"   {i}. {rec.get('title', 'Unknown')}")
    
    # Test feedback recording
    print("\n📍 Recording user feedback...")
    feedback = {
        'action': 'favorite',
        'time_spent': 120
    }
    
    result = recommender.record_feedback(
        user_profile=user_profile,
        recommended_item=recommendations[0]['asin'],
        feedback=feedback
    )
    
    print(f"✅ Feedback recorded")
    print(f"   Reward: {result.get('reward', 0):+.1f}")
    
    print("\n✅ DRL recommender test passed!")
