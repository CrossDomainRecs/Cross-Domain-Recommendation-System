"""
Explore endpoints - Browse and discover items
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
import os

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

bp = Blueprint('explore', __name__, url_prefix='/api/explore')

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI') or os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
mongo_client = MongoClient(mongo_uri)
db = mongo_client['reclab']

def extract_image_url(images):
    """Extract the best available image URL from images array"""
    if not images or not isinstance(images, list) or len(images) == 0:
        return ''
    
    first_image = images[0]
    if not isinstance(first_image, dict):
        return ''
    
    # Priority order: large, hi_res, 1080w, 720w, 480w, thumb
    for key in ['large', 'hi_res', '1920w', '1440w', '1080w', '720w', '480w', '360w', 'thumb']:
        if key in first_image and first_image[key]:
            return first_image[key]
    
    return ''

@bp.route('/popular/<domain>', methods=['GET'])
def get_popular_items(domain):
    """Get popular items for a domain"""
    try:
        limit = int(request.args.get('limit', 50))
        
        # Get items, sort by rating if available
        items = list(db['product_metadata'].aggregate([
            {'$match': {'domain': domain}},
            {'$addFields': {
                'rating_numeric': {
                    '$cond': [
                        {'$or': [
                            {'$eq': ['$average_rating', None]},
                            {'$eq': [{'$type': '$average_rating'}, 'missing']}
                        ]},
                        0,
                        {'$toDouble': '$average_rating'}
                    ]
                }
            }},
            {'$sort': {'rating_numeric': -1}},
            {'$limit': limit},
            {'$project': {
                '_id': 0,
                'parent_asin': 1,
                'title': 1,
                'description': 1,
                'domain': 1,
                'categories': 1,
                'average_rating': 1,
                'images': 1
            }}
        ]))
        
        # Format items
        for item in items:
            item['image'] = extract_image_url(item.get('images', []))
            item['asin'] = item.get('parent_asin', '')
            item['rating'] = item.get('average_rating')
            item['genres'] = item.get('categories', [])
        
        return jsonify({
            'success': True,
            'items': items,
            'count': len(items)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_popular_items: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/search/<domain>', methods=['GET'])
def search_items(domain):
    """Search items within a domain"""
    try:
        query = request.args.get('q', '')
        limit = int(request.args.get('limit', 50))
        
        if not query:
            return jsonify({
                'success': True,
                'items': []
            }), 200
        
        print(f"🔍 Searching {domain} for: {query}")
        
        # Search using regex (case-insensitive)
        items = list(db['product_metadata'].find(
            {
                'domain': domain,
                'title': {'$regex': query, '$options': 'i'}
            },
            {
                '_id': 0,
                'parent_asin': 1,
                'title': 1,
                'description': 1,
                'domain': 1,
                'categories': 1,
                'average_rating': 1,
                'images': 1
            }
        ).limit(limit))
        
        # Format items
        for item in items:
            item['image'] = extract_image_url(item.get('images', []))
            item['asin'] = item.get('parent_asin', '')
            item['rating'] = item.get('average_rating')
            item['genres'] = item.get('categories', [])
        
        print(f"✅ Found {len(items)} results")
        
        return jsonify({
            'success': True,
            'items': items,
            'count': len(items)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in search_items: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/genres/<domain>', methods=['GET'])
def get_genres(domain):
    """Get all unique categories/genres for a domain"""
    try:
        # Get distinct categories
        categories = db['product_metadata'].distinct('categories', {'domain': domain})
        
        # Flatten if nested and remove empty
        flat_genres = set()
        for category in categories:
            if isinstance(category, list):
                flat_genres.update(category)
            elif category:
                flat_genres.add(category)
        
        sorted_genres = sorted(list(flat_genres))
        
        return jsonify({
            'success': True,
            'genres': sorted_genres,
            'count': len(sorted_genres)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_genres: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/genre/<domain>/<genre>', methods=['GET'])
def get_items_by_genre(domain, genre):
    """Get items filtered by category/genre"""
    try:
        limit = int(request.args.get('limit', 50))
        
        print(f"🎯 Getting {domain} items for genre: {genre}")
        
        # Find items with this category
        items = list(db['product_metadata'].aggregate([
            {'$match': {
                'domain': domain,
                'categories': genre
            }},
            {'$addFields': {
                'rating_numeric': {
                    '$cond': [
                        {'$or': [
                            {'$eq': ['$average_rating', None]},
                            {'$eq': [{'$type': '$average_rating'}, 'missing']}
                        ]},
                        0,
                        {'$toDouble': '$average_rating'}
                    ]
                }
            }},
            {'$sort': {'rating_numeric': -1}},
            {'$limit': limit},
            {'$project': {
                '_id': 0,
                'parent_asin': 1,
                'title': 1,
                'description': 1,
                'domain': 1,
                'categories': 1,
                'average_rating': 1,
                'images': 1
            }}
        ]))
        
        # Format items
        for item in items:
            item['image'] = extract_image_url(item.get('images', []))
            item['asin'] = item.get('parent_asin', '')
            item['rating'] = item.get('average_rating')
            item['genres'] = item.get('categories', [])
        
        print(f"✅ Found {len(items)} items")
        
        return jsonify({
            'success': True,
            'items': items,
            'count': len(items)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_items_by_genre: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500