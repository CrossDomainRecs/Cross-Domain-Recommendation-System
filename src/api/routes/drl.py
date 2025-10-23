from flask import Blueprint, request, jsonify
from src.models.drl.recommender_agent import DRLRecommender
from src.api.cache import cached_recommendation
import time
import threading

bp = Blueprint('drl', __name__, url_prefix='/api/drl')

# Global instance (initialized on first use)
_drl_recommender = None
_initialization_lock = threading.Lock()
_is_initializing = False

def get_drl_recommender():
    """Get or create DRL recommender singleton with thread-safe initialization"""
    global _drl_recommender, _is_initializing
    
    # Fast path - already initialized
    if _drl_recommender is not None:
        return _drl_recommender
    
    # Acquire lock for initialization
    with _initialization_lock:
        # Double-check after acquiring lock (another thread might have initialized)
        if _drl_recommender is not None:
            return _drl_recommender
        
        # We're the first thread, initialize now
        print("🔧 Initializing DRL recommender (one-time setup)...")
        _is_initializing = True
        try:
            _drl_recommender = DRLRecommender(use_drl=True)
            print("✅ DRL recommender ready!")
            return _drl_recommender
        finally:
            _is_initializing = False

@bp.route('/recommend', methods=['POST'])
@cached_recommendation(timeout=900)
def drl_recommend():
    """Get DRL-enhanced recommendations"""
    try:
        data = request.json
        user_profile = data.get('user_profile', {})
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        recent_interactions = data.get('recent_interactions', [])
        
        recommender = get_drl_recommender()
        recommendations = recommender.recommend(
            user_profile=user_profile,
            limit=limit,  
            domain_filter=domain_filter,
            recent_interactions=recent_interactions
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations),
            'drl_enabled': True
        }), 200
        
    except Exception as e:
        print(f"❌ DRL recommendation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/feedback', methods=['POST'])
def drl_feedback():
    """Record user feedback for DRL learning"""
    try:
        data = request.json
        
        # Extract feedback data
        user_profile = data.get('user_profile', {})
        recommended_item = data.get('recommended_item')
        feedback = data.get('feedback', {})
        
        # Validate required fields
        if not user_profile or not recommended_item:
            return jsonify({
                'success': False,
                'error': 'user_profile and recommended_item are required'
            }), 400
        
        action = feedback.get('action')
        time_spent = feedback.get('time_spent', 0)
        
        # Calculate reward based on action
        reward_map = {
            'like': 1.0,
            'favorite': 2.0,
            'dislike': -1.0,
            'skip': -0.5,
            'click': 0.5
        }
        
        reward = reward_map.get(action, 0.0)
        
        # Add time spent bonus (if user spent time, it's more valuable)
        if time_spent > 5:  # More than 5 seconds
            reward += 0.5
        elif time_spent > 15:  # More than 15 seconds
            reward += 1.0
        
        # Get DRL recommender
        recommender = get_drl_recommender()
        
        # Train the agent with this feedback
        # Note: Most DRL implementations need state, action, reward, next_state
        # For now, we'll just log it and calculate reward
        # You can extend this to actually train the model if needed
        
        print(f"📊 Feedback recorded:")
        print(f"   User: {user_profile.get('user_id', 'unknown')}")
        print(f"   Item: {recommended_item}")
        print(f"   Action: {action}")
        print(f"   Reward: {reward}")
        
        # Optional: Store feedback for batch training later
        # This could be saved to a database or file for periodic retraining
        
        return jsonify({
            'success': True,
            'reward': reward,
            'message': f'Feedback recorded: {action}',
            'action': action
        }), 200
        
    except Exception as e:
        print(f"❌ DRL feedback error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/health', methods=['GET'])
def drl_health():
    """Check DRL system health"""
    try:
        status = {
            'drl_initialized': _drl_recommender is not None,
            'is_initializing': _is_initializing
        }
        
        if _drl_recommender is not None:
            status['model_loaded'] = True
            status['device'] = str(_drl_recommender.device)
        
        return jsonify({
            'success': True,
            'status': status
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/stats', methods=['GET'])
def drl_stats():
    """Get DRL agent statistics"""
    try:
        recommender = get_drl_recommender()
        
        if recommender is None:
            return jsonify({
                'success': False,
                'error': 'DRL recommender not initialized'
            }), 503
        
        # Get agent statistics if available
        stats = {
            'agent_initialized': True,
            'model_path': 'models/drl/drl_agent.pth',
            'device': str(recommender.device),
            'drl_enabled': True
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"❌ DRL stats error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500