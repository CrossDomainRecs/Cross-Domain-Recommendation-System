"""
Experience Replay Buffer for DRL Agent
Stores and samples past interactions for training
"""

import random
import numpy as np
from collections import deque
from typing import Dict, List, Tuple

class ReplayBuffer:
    """
    Experience replay buffer for DQN
    Stores (state, action, reward, next_state, done) tuples
    """
    
    def __init__(self, capacity: int = 10000):
        """
        Initialize replay buffer
        
        Args:
            capacity: Maximum number of experiences to store
        """
        self.buffer = deque(maxlen=capacity)
        self.capacity = capacity
    
    def push(
        self,
        state: Dict,
        action: str,  # Item ASIN
        reward: float,
        next_state: Dict,
        done: bool
    ):
        """
        Add experience to buffer
        
        Args:
            state: Current state (user profile)
            action: Action taken (recommended item ASIN)
            reward: Reward received
            next_state: Next state after action
            done: Whether episode is done
        """
        experience = {
            'state': state,
            'action': action,
            'reward': reward,
            'next_state': next_state,
            'done': done
        }
        self.buffer.append(experience)
    
    def sample(self, batch_size: int) -> List[Dict]:
        """
        Sample random batch of experiences
        
        Args:
            batch_size: Number of experiences to sample
        
        Returns:
            List of sampled experiences
        """
        batch_size = min(batch_size, len(self.buffer))
        return random.sample(self.buffer, batch_size)
    
    def __len__(self) -> int:
        """Get current buffer size"""
        return len(self.buffer)
    
    def clear(self):
        """Clear the buffer"""
        self.buffer.clear()
    
    def save(self, filepath: str):
        """Save buffer to file"""
        import pickle
        with open(filepath, 'wb') as f:
            pickle.dump(list(self.buffer), f)
    
    def load(self, filepath: str):
        """Load buffer from file"""
        import pickle
        with open(filepath, 'rb') as f:
            experiences = pickle.load(f)
            self.buffer.extend(experiences[-self.capacity:])


if __name__ == '__main__':
    # Test replay buffer
    buffer = ReplayBuffer(capacity=100)
    
    # Add some experiences
    for i in range(10):
        buffer.push(
            state={'user_id': 'user1', 'embedding': [0.1] * 64},
            action=f'item_{i}',
            reward=i * 0.5,
            next_state={'user_id': 'user1', 'embedding': [0.2] * 64},
            done=(i == 9)
        )
    
    print(f"Buffer size: {len(buffer)}")
    
    # Sample batch
    batch = buffer.sample(batch_size=5)
    print(f"Sampled batch size: {len(batch)}")
    print(f"First experience reward: {batch[0]['reward']}")
    
    print("✅ Replay buffer test passed!")
