from flask import Blueprint, request, jsonify
from src.models.drl.recommender_agent import DRLRecommender
import time
import threading

bp = Blueprint('drl', __name__, url_prefix='/api/drl')

_drl_recommender = None
_initialization_lock = threading.Lock()
_is_initializing = False

def get_drl_recommender():
    global _drl_recommender, _is_initializing
    if _drl_recommender is not None:
        return _drl_recommender
    with _initialization_lock:
        if _drl_recommender is not None:
            return _drl_recommender
        print("🔧 Initializing DRL recommender...")
        _is_initializing = True
        try:
            _drl_recommender = DRLRecommender(use_drl=True)
            print("✅ DRL recommender ready!")
            return _drl_recommender
        finally:
            _is_initializing = False

@bp.route('/recommend', methods=['POST'])
def drl_recommend():
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
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/feedback', methods=['POST'])
def drl_feedback():
    try:
        data = request.json
        user_profile = data.get('user_profile', {})
        recommended_item = data.get('recommended_item')
        feedback = data.get('feedback', {})
        
        if not user_profile or not recommended_item:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        action = feedback.get('action')
        reward_map = {'like': 1.0, 'favorite': 2.0, 'dislike': -1.0, 'skip': -0.5, 'click': 0.5}
        reward = reward_map.get(action, 0.0)
        
        recommender = get_drl_recommender()
        print(f"FEEDBACK: {user_profile.get('user_id')} {action} {reward}")
        
        return jsonify({'success': True, 'reward': reward, 'action': action}), 200
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/health', methods=['GET'])
def drl_health():
    return jsonify({'success': True, 'drl_ready': _drl_recommender is not None}), 200

@bp.route('/stats', methods=['GET'])
def drl_stats():
    return jsonify({'success': True, 'agent_initialized': True}), 200
