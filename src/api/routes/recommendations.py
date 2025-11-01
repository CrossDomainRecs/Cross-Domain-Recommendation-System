"""
Recommendations endpoints
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.models.hybrid.recommender import HybridRecommender
from src.api.cache import cached_recommendation, cache

bp = Blueprint('recommendations', __name__, url_prefix='/api/recommendations')

_recommender = None

def get_recommender():
    global _recommender
    if _recommender is None:
        _recommender = HybridRecommender()
    return _recommender


@bp.route('/for-new-user', methods=['POST'])
@cached_recommendation(timeout=1800)
def recommend_for_new_user():
    """Get recommendations for new user"""
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
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/for-user', methods=['POST'])
def recommend_for_user():
    """Get recommendations for existing user"""
    try:
        data = request.json
        user_id = data.get('user_id')
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id is required'}), 400
        
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
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/similar', methods=['POST'])
@cached_recommendation(timeout=3600)
def recommend_similar():
    """Get items similar to given item"""
    try:
        data = request.json
        item_id = data.get('item_id')
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not item_id:
            return jsonify({'success': False, 'error': 'item_id is required'}), 400
        
        recommender = get_recommender()
        
        try:
            recommendations = recommender.collaborative_recommender.get_similar_items(
                item_id=item_id,
                top_k=limit
            )
        except:
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
        
        enriched = recommender._enrich_with_metadata(recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': enriched,
            'count': len(enriched)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/by-genres', methods=['POST'])
@cached_recommendation(timeout=7200)
def recommend_by_genres():
    """Get recommendations by genres"""
    try:
        data = request.json
        genres = data.get('genres', [])
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        if not genres:
            return jsonify({'success': False, 'error': 'genres array is required'}), 400
        
        recommender = get_recommender()
        recommendations = recommender.content_recommender.recommend_by_genres(
            genres=genres,
            limit=limit,
            domain_filter=domain_filter
        )
        
        enriched = recommender._enrich_with_metadata(recommendations)
        
        return jsonify({
            'success': True,
            'recommendations': enriched,
            'count': len(enriched)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ✅ ADD THIS NEW ENDPOINT BELOW
@bp.route('/cross-domain', methods=['POST'])
@cached_recommendation(timeout=3600)
def recommend_cross_domain():
    """
    Get cross-domain recommendations
    Example: User likes a movie → Recommend similar books
    """
    try:
        data = request.json
        item_id = data.get('item_id')
        source_domain = data.get('source_domain')
        target_domain = data.get('target_domain')
        limit = data.get('limit', 20)
        
        if not item_id or not source_domain or not target_domain:
            return jsonify({
                'success': False, 
                'error': 'item_id, source_domain, and target_domain are required'
            }), 400
        
        print(f"\n🌟 CROSS-DOMAIN: {source_domain} → {target_domain}")
        print(f"   Source item: {item_id}")
        
        recommender = get_recommender()
        
        # Get source item metadata
        from pymongo import MongoClient
        from src.utils.config import get_config
        config = get_config()
        mongo_uri = config.get_secret('MONGODB_URI')
        mongo_client = MongoClient(mongo_uri)
        db = mongo_client['reclab']
        
        source_item = db['product_metadata'].find_one({'parent_asin': item_id})
        
        if not source_item:
            return jsonify({
                'success': False,
                'error': f'Source item not found: {item_id}'
            }), 404
        
        # Extract genres from source item
        source_genres = source_item.get('categories', [])
        if isinstance(source_genres, list) and len(source_genres) > 0:
            # Use content-based recommendations by genres
            recommendations = recommender.content_recommender.recommend_by_genres(
                genres=source_genres[:5],
                limit=limit * 2,
                domain_filter=target_domain
            )
        else:
            # Fallback: Use collaborative filtering
            recommendations = recommender.collaborative_recommender.get_similar_items(
                item_id=item_id,
                top_k=limit * 2
            )
            recommendations = [
                r for r in recommendations 
                if r.get('domain') == target_domain
            ]
        
        # Enrich with metadata
        enriched = recommender._enrich_with_metadata(recommendations[:limit])
        
        # Generate explanation
        explanation = f"Because you enjoyed '{source_item.get('title', 'this item')}' ({source_domain}), you might like these {target_domain}"
        if source_genres:
            explanation += f" with similar themes: {', '.join(source_genres[:3])}"
        
        print(f"✅ Generated {len(enriched)} cross-domain recommendations")
        
        return jsonify({
            'success': True,
            'recommendations': enriched,
            'source_item': {
                'asin': source_item.get('parent_asin'),
                'title': source_item.get('title'),
                'domain': source_item.get('domain'),
                'genres': source_genres
            },
            'explanation': explanation,
            'count': len(enriched)
        }), 200
        
    except Exception as e:
        print(f"❌ Cross-domain error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
