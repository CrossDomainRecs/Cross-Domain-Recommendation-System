"""
Cold-start onboarding endpoints
Handles new user input processing and initial recommendations
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.models.cold_start.input_processor import ColdStartInputProcessor
from src.models.hybrid.recommender import HybridRecommender

bp = Blueprint('cold_start', __name__, url_prefix='/api/cold-start')

# Initialize services (lazy loading)
_input_processor = None
_recommender = None

def get_input_processor():
    global _input_processor
    if _input_processor is None:
        _input_processor = ColdStartInputProcessor()
    return _input_processor

def get_recommender():
    global _recommender
    if _recommender is None:
        _recommender = HybridRecommender()
    return _recommender

@bp.route('/process-input', methods=['POST'])
def process_input():
    """
    Process and validate user input during onboarding
    
    Request body:
    {
        "user_input": "Inception",
        "domain": "movies"
    }
    
    Response:
    {
        "success": true,
        "matched_item": {...},
        "corrected_input": "Inception",
        "confidence": 0.95,
        "source": "local_exact"
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        user_input = data.get('user_input')
        domain = data.get('domain')
        
        if not user_input or not domain:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: user_input, domain'
            }), 400
        
        # Validate domain
        if domain not in ['books', 'movies', 'music']:
            return jsonify({
                'success': False,
                'error': f'Invalid domain: {domain}. Must be books, movies, or music'
            }), 400
        
        # Process input
        processor = get_input_processor()
        result = processor.process_input(user_input, domain)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@bp.route('/generate-recommendations', methods=['POST'])
def generate_initial_recommendations():
    """
    Generate initial recommendations for new user
    
    Request body:
    {
        "user_profile": {
            "favorite_genres": ["Sci-Fi", "Thriller"],
            "liked_items": [
                {"asin": "B001", "title": "Inception", "domain": "movies"}
            ]
        },
        "limit": 20,
        "domain_filter": null  // optional
    }
    
    Response:
    {
        "success": true,
        "recommendations": [...],
        "count": 20
    }
    """
    try:
        data = request.json
        
        if not data or 'user_profile' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing user_profile in request'
            }), 400
        
        user_profile = data['user_profile']
        limit = data.get('limit', 20)
        domain_filter = data.get('domain_filter')
        
        # Generate recommendations
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
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@bp.route('/batch-process', methods=['POST'])
def batch_process_inputs():
    """
    Process multiple inputs at once (for multi-step onboarding)
    
    Request body:
    {
        "inputs": [
            {"user_input": "Inception", "domain": "movies"},
            {"user_input": "The Alchemist", "domain": "books"},
            {"user_input": "Blinding Lights", "domain": "music"}
        ]
    }
    """
    try:
        data = request.json
        
        if not data or 'inputs' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing inputs array'
            }), 400
        
        processor = get_input_processor()
        results = []
        
        for input_data in data['inputs']:
            user_input = input_data.get('user_input')
            domain = input_data.get('domain')
            
            if user_input and domain:
                result = processor.process_input(user_input, domain)
                results.append({
                    'input': user_input,
                    'domain': domain,
                    **result
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
