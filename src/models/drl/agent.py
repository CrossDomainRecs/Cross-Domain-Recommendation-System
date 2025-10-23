"""
Deep Q-Network (DQN) Agent for Adaptive Recommendations
"""

import sys
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.models.drl.replay_buffer import ReplayBuffer

class DQN(nn.Module):
    """
    Deep Q-Network architecture
    Maps state to Q-values for all actions
    """
    
    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        hidden_dims: List[int] = [256, 128, 64]
    ):
        """
        Initialize DQN
        
        Args:
            state_dim: State dimension (user embedding size)
            action_dim: Number of possible actions (candidate items)
            hidden_dims: Hidden layer dimensions
        """
        super(DQN, self).__init__()
        
        layers = []
        input_dim = state_dim
        
        # Build hidden layers
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.2)
            ])
            input_dim = hidden_dim
        
        # Output layer
        layers.append(nn.Linear(input_dim, action_dim))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, state):
        """Forward pass"""
        return self.network(state)


class DRLAgent:
    """
    DRL Agent for adaptive recommendations
    Uses DQN with experience replay and target network
    """
    
    def __init__(
        self,
        state_dim: int = 384,  # Sentence transformer embedding size
        action_dim: int = 1000,  # Top candidate items to consider
        learning_rate: float = 0.001,
        gamma: float = 0.99,  # Discount factor
        epsilon: float = 1.0,  # Exploration rate
        epsilon_min: float = 0.1,
        epsilon_decay: float = 0.995,
        buffer_capacity: int = 10000,
        batch_size: int = 64,
        target_update_freq: int = 10
    ):
        """
        Initialize DRL agent
        
        Args:
            state_dim: State dimension
            action_dim: Action space dimension
            learning_rate: Learning rate
            gamma: Discount factor
            epsilon: Initial exploration rate
            epsilon_min: Minimum exploration rate
            epsilon_decay: Exploration decay rate
            buffer_capacity: Replay buffer capacity
            batch_size: Training batch size
            target_update_freq: Update target network every N steps
        """
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update_freq = target_update_freq
        self.train_step = 0
        
        # Device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Networks
        self.policy_net = DQN(state_dim, action_dim).to(self.device)
        self.target_net = DQN(state_dim, action_dim).to(self.device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()
        
        # Optimizer and loss
        self.optimizer = optim.Adam(self.policy_net.parameters(), lr=learning_rate)
        self.criterion = nn.MSELoss()
        
        # Replay buffer
        self.replay_buffer = ReplayBuffer(capacity=buffer_capacity)
        
        print(f"✅ DRL Agent initialized")
        print(f"   State dim: {state_dim}")
        print(f"   Action dim: {action_dim}")
        print(f"   Device: {self.device}")
    
    def select_action(
        self,
        state: torch.Tensor,
        candidate_items: List[str],
        epsilon: float = None
    ) -> Tuple[str, int]:
        """
        Select action using epsilon-greedy policy
        
        Args:
            state: Current state (user embedding)
            candidate_items: List of candidate item ASINs
            epsilon: Override exploration rate
        
        Returns:
            (selected_item_asin, action_index)
        """
        if epsilon is None:
            epsilon = self.epsilon
        
        # Epsilon-greedy
        if np.random.random() < epsilon:
            # Explore: random action
            action_idx = np.random.randint(0, len(candidate_items))
        else:
            # Exploit: best action
            with torch.no_grad():
                state = state.to(self.device)
                q_values = self.policy_net(state)
                # Only consider available candidates
                q_values = q_values[:len(candidate_items)]
                action_idx = q_values.argmax().item()
        
        return candidate_items[action_idx], action_idx
    
    def store_transition(
        self,
        state: Dict,
        action: str,
        reward: float,
        next_state: Dict,
        done: bool
    ):
        """Store transition in replay buffer"""
        self.replay_buffer.push(state, action, reward, next_state, done)
    
    def train(self) -> float:
        """
        Train the agent using experience replay
        
        Returns:
            Loss value
        """
        if len(self.replay_buffer) < self.batch_size:
            return 0.0
        
        # Sample batch
        batch = self.replay_buffer.sample(self.batch_size)
        
        # Extract batch components
        states = torch.FloatTensor([
            exp['state']['embedding'] for exp in batch
        ]).to(self.device)
        
        actions = torch.LongTensor([
            exp['action_idx'] for exp in batch
        ]).to(self.device)
        
        rewards = torch.FloatTensor([
            exp['reward'] for exp in batch
        ]).to(self.device)
        
        next_states = torch.FloatTensor([
            exp['next_state']['embedding'] for exp in batch
        ]).to(self.device)
        
        dones = torch.FloatTensor([
            exp['done'] for exp in batch
        ]).to(self.device)
        
        # Compute current Q-values
        current_q_values = self.policy_net(states).gather(1, actions.unsqueeze(1))
        
        # Compute target Q-values
        with torch.no_grad():
            next_q_values = self.target_net(next_states).max(1)[0]
            target_q_values = rewards + (1 - dones) * self.gamma * next_q_values
        
        # Compute loss
        loss = self.criterion(current_q_values.squeeze(), target_q_values)
        
        # Optimize
        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), 1.0)
        self.optimizer.step()
        
        # Update target network
        self.train_step += 1
        if self.train_step % self.target_update_freq == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())
        
        # Decay epsilon
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        
        return loss.item()
    
    def save(self, filepath: str):
        """Save agent state"""
        torch.save({
            'policy_net': self.policy_net.state_dict(),
            'target_net': self.target_net.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'train_step': self.train_step
        }, filepath)
        print(f"✅ Agent saved to {filepath}")
    
    def load(self, filepath: str):
        """Load agent state"""
        checkpoint = torch.load(filepath, map_location=self.device)
        self.policy_net.load_state_dict(checkpoint['policy_net'])
        self.target_net.load_state_dict(checkpoint['target_net'])
        self.optimizer.load_state_dict(checkpoint['optimizer'])
        self.epsilon = checkpoint['epsilon']
        self.train_step = checkpoint['train_step']
        print(f"✅ Agent loaded from {filepath}")


if __name__ == '__main__':
    # Test DRL agent
    agent = DRLAgent(state_dim=384, action_dim=100)
    
    # Test action selection
    state = torch.randn(1, 384)
    candidates = [f'item_{i}' for i in range(100)]
    
    selected_item, action_idx = agent.select_action(state, candidates)
    print(f"Selected item: {selected_item} (index: {action_idx})")
    
    # Test storing transition
    agent.store_transition(
        state={'embedding': state.squeeze().tolist()},
        action=selected_item,
        reward=1.0,
        next_state={'embedding': torch.randn(384).tolist()},
        done=False
    )
    
    print(f"Replay buffer size: {len(agent.replay_buffer)}")
    
    print("✅ DRL agent test passed!")
