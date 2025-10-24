"""
Flask Microservice for ML Recommendations
Exposes all recommendation functionality via REST API
"""

import sys
import os
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

# Add this import for cache support
from src.api.cache import init_cache, cache, get_cache_stats

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

# Initialize Flask app
app = Flask(__name__)

# ✅ CORS Configuration for Production + Development
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "http://localhost:5174",
            "https://reclab-frontend.onrender.com",  # ✅ Production frontend
            "https://*.onrender.com"                  # ✅ Any Render preview deploys
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


# Initialize cache
cache = init_cache(app)

# Load config
config = get_config()

# Import routes
from src.api.routes import cold_start, recommendations, explanations, health, drl

# Register blueprints
app.register_blueprint(cold_start.bp)
app.register_blueprint(recommendations.bp)
app.register_blueprint(explanations.bp)
app.register_blueprint(health.bp)
from src.api.routes import explore
app.register_blueprint(drl.bp)
app.register_blueprint(explore.bp)

# Cache stats endpoint
@app.route('/api/cache/stats')
def cache_stats():
    """Get cache statistics"""
    stats = get_cache_stats()
    return jsonify({
        'success': True,
        'stats': stats
    })

# Cache clear endpoint
@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear all cache (admin only)"""
    try:
        cache.clear()
        return jsonify({
            'success': True,
            'message': 'Cache cleared successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': str(error)
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error)
    }), 500

# Root endpoint
@app.route('/')
def index():
    return jsonify({
        'success': True,
        'message': 'RecLab ML API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'cold_start': '/api/cold-start/*',
            'recommendations': '/api/recommendations/*',
            'explanations': '/api/explanations/*',
            'cache_stats': '/api/cache/stats',
            'cache_clear': '/api/cache/clear'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', config.get('flask_api', {}).get('port', 5001)))
    debug = config.get('application', {}).get('debug', True)
    
    print("=" * 60)
    print("🚀 RecLab ML API starting...")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        threaded=True
    )
