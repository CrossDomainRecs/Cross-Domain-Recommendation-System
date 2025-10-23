"""
Redis caching for Flask API
Provides fast caching for expensive operations
"""

from flask_caching import Cache
import redis
import json
from functools import wraps
from flask import request
import hashlib

# Cache configuration
cache_config = {
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_HOST': 'localhost',
    'CACHE_REDIS_PORT': 6379,
    'CACHE_REDIS_DB': 0,
    'CACHE_DEFAULT_TIMEOUT': 3600,  # 1 hour default
    'CACHE_KEY_PREFIX': 'reclab:'
}

cache = Cache()

def init_cache(app):
    """Initialize cache with Flask app"""
    cache.init_app(app, config=cache_config)
    print("✅ Redis cache initialized")
    print(f"   Host: {cache_config['CACHE_REDIS_HOST']}")
    print(f"   Port: {cache_config['CACHE_REDIS_PORT']}")
    return cache

def make_cache_key(*args, **kwargs):
    """Generate cache key from request data"""
    # Get request data
    if request.method == 'POST':
        data = request.get_json() or {}
    else:
        data = request.args.to_dict()
    
    # Create deterministic key
    key_data = json.dumps(data, sort_keys=True)
    key_hash = hashlib.md5(key_data.encode()).hexdigest()
    
    return f"{request.path}:{key_hash}"

def cached_recommendation(timeout=3600):
    """
    Decorator for caching recommendation results
    
    Usage:
        @cached_recommendation(timeout=1800)
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate cache key
            cache_key = make_cache_key()
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                print(f"🎯 Cache HIT for {cache_key}")
                # Add cache indicator to response
                if isinstance(cached_result, dict):
                    cached_result['cached'] = True
                    cached_result['cache_key'] = cache_key[:16] + '...'
                return cached_result
            
            # Cache miss - call function
            print(f"❌ Cache MISS for {cache_key}")
            result = f(*args, **kwargs)
            
            # Store in cache
            cache.set(cache_key, result, timeout=timeout)
            
            # Add cache indicator
            if isinstance(result, dict):
                result['cached'] = False
            
            return result
        
        return decorated_function
    return decorator

def invalidate_user_cache(user_id):
    """Invalidate all cache entries for a user"""
    pattern = f"reclab:*{user_id}*"
    try:
        r = redis.Redis(
            host=cache_config['CACHE_REDIS_HOST'],
            port=cache_config['CACHE_REDIS_PORT'],
            db=cache_config['CACHE_REDIS_DB']
        )
        keys = r.keys(pattern)
        if keys:
            r.delete(*keys)
            print(f"🗑️  Invalidated {len(keys)} cache entries for user {user_id}")
    except Exception as e:
        print(f"⚠️  Cache invalidation error: {e}")

def get_cache_stats():
    """Get cache statistics"""
    try:
        r = redis.Redis(
            host=cache_config['CACHE_REDIS_HOST'],
            port=cache_config['CACHE_REDIS_PORT'],
            db=cache_config['CACHE_REDIS_DB']
        )
        info = r.info('stats')
        return {
            'total_keys': r.dbsize(),
            'hits': info.get('keyspace_hits', 0),
            'misses': info.get('keyspace_misses', 0),
            'hit_rate': info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
        }
    except Exception as e:
        return {'error': str(e)}
