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
import os

cache = Cache()

def init_cache(app):
    """Initialize cache with fallback to simple cache"""
    try:
        redis_url = os.getenv('REDIS_URL', None)
        if redis_url and redis_url not in ['placeholder', 'localhost', None]:
            cache.init_app(app, config={
                'CACHE_TYPE': 'redis',
                'CACHE_REDIS_URL': redis_url,
                'CACHE_DEFAULT_TIMEOUT': 3600,
                'CACHE_KEY_PREFIX': 'reclab:'
            })
            print("✅ Redis cache initialized")
        else:
            cache.init_app(app, config={'CACHE_TYPE': 'simple'})
            print("⚠️ Using in-memory cache (Redis not available)")
    except Exception as e:
        print(f"❌ Cache failed, using simple cache: {e}")
        cache.init_app(app, config={'CACHE_TYPE': 'simple'})
    return cache


def make_cache_key(*args, **kwargs):
    """Generate cache key from request data"""
    if request.method == 'POST':
        data = request.get_json() or {}
    else:
        data = request.args.to_dict()
    
    key_data = json.dumps(data, sort_keys=True)
    key_hash = hashlib.md5(key_data.encode()).hexdigest()
    return f"{request.path}:{key_hash}"


def cached_recommendation(timeout=3600):
    """Decorator for caching recommendation results"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = make_cache_key()
            cached_result = cache.get(cache_key)

            if cached_result is not None:
                print(f"🎯 Cache HIT for {cache_key}")
                if isinstance(cached_result, dict):
                    cached_result['cached'] = True
                    cached_result['cache_key'] = cache_key[:16] + '...'
                return cached_result

            print(f"❌ Cache MISS for {cache_key}")
            result = f(*args, **kwargs)
            cache.set(cache_key, result, timeout=timeout)
            if isinstance(result, dict):
                result['cached'] = False
            return result

        return decorated_function
    return decorator


def invalidate_user_cache(user_id):
    """Invalidate all cache entries for a user"""
    pattern = f"reclab:*{user_id}*"
    try:
        redis_url = os.getenv('REDIS_URL', None)
        if redis_url:
            r = redis.from_url(redis_url)
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
                print(f"🗑️  Invalidated {len(keys)} cache entries for user {user_id}")
    except Exception as e:
        print(f"⚠️  Cache invalidation error: {e}")


def get_cache_stats():
    """Get cache statistics"""
    try:
        redis_url = os.getenv('REDIS_URL', None)
        if not redis_url:
            return {'info': 'In-memory cache active, no Redis stats'}

        r = redis.from_url(redis_url)
        info = r.info('stats')
        return {
            'total_keys': r.dbsize(),
            'hits': info.get('keyspace_hits', 0),
            'misses': info.get('keyspace_misses', 0),
            'hit_rate': info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
        }
    except Exception as e:
        return {'error': str(e)}
