"""
Recommendations endpoints
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.models.hybrid.recommender import HybridRecommender
from src.api.cache import cached_recommendation, cache  # ✅ Added import for caching

bp = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')

# Lazy loading
_recommender = None

def get_recommender():
    global _recommender
    if _recommender is None:
        _recommender = HybridRecommender()
    return _recommender


@bp.route('/for-new-user', methods=['POST'])
@cached_recommendation(timeout=1800)  # ✅ Cache for 30 minutes
def recommend_for_new_user():
    """
    Get recommendations for new user
    
    Request:
    {
        "user_profile": {
            "favorite_genres": ["Sci-Fi", "Thriller"],
            "liked_items": [{"asin": "B001", "title": "Inception", "domain": "movies"}]
        },
        "limit": 20,
        "domain_filter": null
    }
    """
    try:
        data = request.json
        user_profile = data.get('user_profile', {})
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        recommender = get_recommender()
        recommendations = recommender.recommend_for_new_user(
            user_profile=user_profile,
            limit=limit,
            domain_filter=domain_filter
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/for-user', methods=['POST'])
def recommend_for_user():
    """
    Get recommendations for existing user
    
    Request:
    {
        "user_id": "user123",
        "limit": 20,
        "domain_filter": null
    }
    """
    try:
        data = request.json
        user_id = data.get('user_id')
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400
        
        recommender = get_recommender()
        recommendations = recommender.recommend_for_user(
            user_id=user_id,
            limit=limit,
            domain_filter=domain_filter
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/similar', methods=['POST'])
@cached_recommendation(timeout=3600)  # ✅ Cache for 1 hour
def recommend_similar():
    """
    Get items similar to given item
    
    Request:
    {
        "item_id": "B001",
        "limit": 20,
        "domain_filter": null
    }
    """
    try:
        data = request.json
        item_id = data.get('item_id')
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not item_id:
            return jsonify({
                'success': False,
                'error': 'item_id is required'
            }), 400
        
        recommender = get_recommender()
        
        # Try collaborative first (faster and usually works better)
        recommendations = recommender.collaborative_recommender.get_similar_items(
            item_id=item_id,
            top_k=limit
        )
        
        # If collaborative didn't work, try content-based
        if not recommendations:
            try:
                recommendations = recommender.content_recommender.recommend_by_item(
                    item_id=item_id,
                    limit=limit,
                    domain_filter=domain_filter
                )
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'Item not found in system: {item_id}',
                    'message': str(e)
                }), 404
        
        # Enrich with metadata
        enriched = recommender._enrich_with_metadata(recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': enriched,
            'count': len(enriched)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/by-genres', methods=['POST'])
@cached_recommendation(timeout=7200)  # ✅ Cache for 2 hours
def recommend_by_genres():
    """
    Get recommendations by genres
    
    Request:
    {
        "genres": ["Sci-Fi", "Thriller"],
        "limit": 20,
        "domain_filter": "movies"
    }
    """
    try:
        data = request.json
        genres = data.get('genres', [])
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not genres:
            return jsonify({
                'success': False,
                'error': 'genres array is required'
            }), 400
        
        recommender = get_recommender()
        recommendations = recommender.content_recommender.recommend_by_genres(
            genres=genres,
            limit=limit,
            domain_filter=domain_filter
        )
        
        # Enrich with metadata
        enriched = recommender._enrich_with_metadata(recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': enriched,
            'count': len(enriched)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
