"""
Explanation generation endpoints using Gemini AI
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.external.gemini import GeminiClient

bp = Blueprint('explanations', __name__, url_prefix='/api/explanations')

# Lazy loading
_gemini = None

def get_gemini_client():
    global _gemini
    if _gemini is None:
        _gemini = GeminiClient()
    return _gemini

@bp.route('/generate', methods=['POST'])
def generate_explanation():
    """
    Generate explanation for why an item was recommended
    
    Request:
    {
        "user_profile": {
            "favorite_genres": ["Sci-Fi", "Thriller"],
            "liked_items": [{"title": "Inception"}]
        },
        "recommended_item": {
            "title": "Tenet",
            "genres": ["Sci-Fi", "Action"],
            "domain": "movies"
        },
        "recommendation_source": "hybrid"
    }
    
    Response:
    {
        "success": true,
        "explanation": "Based on your love for mind-bending sci-fi..."
    }
    """
    try:
        data = request.json
        
        user_profile = data.get('user_profile', {})
        recommended_item = data.get('recommended_item', {})
        source = data.get('recommendation_source', 'hybrid')
        
        if not recommended_item:
            return jsonify({
                'success': False,
                'error': 'recommended_item is required'
            }), 400
        
        gemini = get_gemini_client()
        explanation = gemini.generate_explanation(
            user_profile=user_profile,
            recommended_item=recommended_item,
            recommendation_source=source
        )
        
        return jsonify({
            'success': True,
            'explanation': explanation
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/batch', methods=['POST'])
def batch_generate_explanations():
    """
    Generate explanations for multiple recommendations
    
    Request:
    {
        "user_profile": {...},
        "recommendations": [
            {"title": "Tenet", "genres": [...], "domain": "movies"},
            {"title": "Dark Matter", "genres": [...], "domain": "books"}
        ]
    }
    """
    try:
        data = request.json
        
        user_profile = data.get('user_profile', {})
        recommendations = data.get('recommendations', [])
        
        if not recommendations:
            return jsonify({
                'success': False,
                'error': 'recommendations array is required'
            }), 400
        
        gemini = get_gemini_client()
        explanations = []
        
        for rec in recommendations:
            try:
                explanation = gemini.generate_explanation(
                    user_profile=user_profile,
                    recommended_item=rec,
                    recommendation_source='hybrid'
                )
                explanations.append({
                    'item': rec.get('title'),
                    'explanation': explanation
                })
            except Exception as e:
                explanations.append({
                    'item': rec.get('title'),
                    'explanation': f"Could not generate explanation: {str(e)}"
                })
        
        return jsonify({
            'success': True,
            'explanations': explanations,
            'count': len(explanations)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

