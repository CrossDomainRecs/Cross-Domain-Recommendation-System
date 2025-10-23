"""Redis cache utility"""
import redis
from typing import Optional
from src.utils.config import get_config


class RedisCache:
    def __init__(self):
        """Initialize Redis cache"""
        self.config = get_config()
        redis_url = self.config.get('REDIS_URL', 'redis://localhost:6379/0')
        
        try:
            self.client = redis.from_url(redis_url, decode_responses=True)
            self.client.ping()
            self.enabled = True
        except Exception as e:
            print(f"⚠️ Redis not available: {e}")
            self.enabled = False
            self.client = None
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if not self.enabled:
            return None
        try:
            return self.client.get(key)
        except Exception:
            return None
    
    def set(self, key: str, value: str, ttl: int = 3600):
        """Set value in cache with TTL (seconds)"""
        if not self.enabled:
            return
        try:
            self.client.setex(key, ttl, value)
        except Exception:
            pass


_cache = None

def get_cache() -> RedisCache:
    """Get Redis cache instance"""
    global _cache
    if _cache is None:
        _cache = RedisCache()
    return _cache
