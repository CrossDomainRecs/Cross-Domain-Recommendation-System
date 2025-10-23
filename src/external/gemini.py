"""Google Gemini API wrapper with rate limiting and caching"""
import os
import time
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from typing import Dict, Optional
import json
from src.utils.config import get_config
from src.utils.cache import get_cache


class GeminiClient:
    def __init__(self):
        """Initialize Gemini client"""
        self.config = get_config()
        api_key = self.config.get_secret('GOOGLE_GEMINI_API_KEY')
        
        print(f"🔍 DEBUG: API key exists: {api_key is not None}")
        print(f"🔍 DEBUG: API key length: {len(api_key) if api_key else 0}")
        print(f"🔍 DEBUG: API key starts with: {api_key[:10] if api_key else 'NONE'}...")
        
        if not api_key:
            raise ValueError("GOOGLE_GEMINI_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Rate limiting (15 requests per minute for free tier)
        self.request_times = []
        self.max_requests_per_minute = 14  # Stay under 15
        self.cache = get_cache()
        
        print("✅ Gemini client initialized with model: models/gemini-2.5-flash")
        print(f"   Rate limit: {self.max_requests_per_minute} requests/min")
    

    def _wait_if_rate_limited(self):
        """Wait if we're hitting rate limits"""
        now = time.time()
        
        # Remove requests older than 1 minute
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        # If we've hit the limit, wait
        if len(self.request_times) >= self.max_requests_per_minute:
            wait_time = 60 - (now - self.request_times[0])
            if wait_time > 0:
                print(f"⏳ Rate limit reached, waiting {wait_time:.1f}s...")
                time.sleep(wait_time + 0.5)  # Add buffer
                self.request_times = []
        
        # Record this request
        self.request_times.append(now)
    

    def _get_cache_key(self, prompt: str) -> str:
        """Generate cache key for prompt"""
        import hashlib
        return f"gemini:explanation:{hashlib.md5(prompt.encode()).hexdigest()}"
    

    def validate_and_extract(self, user_input: str, domain: str) -> Dict:
        """Validate user input and extract structured info."""
        prompt = f"""Analyze: "{user_input}" ({domain}). 
Return valid JSON with structure:
{{
    "is_valid": true/false,
    "corrected_title": "",
    "confidence": 0.0-1.0,
    "genres": [],
    "themes": [],
    "similar_items": []
}}"""
        try:
            self._wait_if_rate_limited()
            response = self.model.generate_content(prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"⚠️ Gemini validate_and_extract error: {e}")
            return {"is_valid": False}
    

    def generate_explanation(
        self,
        user_profile: Dict,
        recommended_item: Dict,
        recommendation_source: str = 'hybrid',
        max_retries: int = 2
    ) -> str:
        """Generate explanation with rate limiting, caching, and retry logic"""

        # Build prompt
        user_genres = user_profile.get('favorite_genres', [])
        item_title = recommended_item.get('title', 'this item')
        item_genres = recommended_item.get('genres', [])
        item_rating = recommended_item.get('rating', 0)
        item_domain = recommended_item.get('domain', 'product')
        
        # Clean description
        item_desc = recommended_item.get('description', '')
        if item_desc:
            import re
            item_desc = re.sub(r'[^a-zA-Z0-9\s\.,!?\'-]', '', item_desc)[:150]

        # Domain-specific prompt
        domain_map = {
            'movies': 'movie',
            'music': 'music',
            'books': 'book',
        }
        domain_name = domain_map.get(item_domain, 'product')
        
        prompt = f"""Explain in 2 sentences why this recommendation matches the user's interests.

User likes: {', '.join(user_genres[:3]) if user_genres else f'{domain_name}s'}
Recommended {domain_name}: {item_title}
{f"Categories: {', '.join(item_genres[:2])}" if item_genres else ""}
{f"Rating: {item_rating}/5" if item_rating else ""}

Write a brief, friendly explanation."""

        # Check cache first
        cache_key = self._get_cache_key(prompt)
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                print(f"✅ Cache hit for: {item_title[:50]}...")
                return cached

        # Try Gemini with retry logic
        for attempt in range(max_retries + 1):
            try:
                # Rate limiting
                self._wait_if_rate_limited()
                
                print(f"🔍 Calling Gemini for: {item_title[:50]}... (attempt {attempt + 1}/{max_retries + 1})")

                # Call Gemini
                response = self.model.generate_content(
                    prompt,
                    safety_settings={
                        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                    },
                    generation_config={
                        'temperature': 0.7,
                        'max_output_tokens': 250,
                    }
                )

                # Extract text safely
                if response and hasattr(response, 'text'):
                    text = response.text.strip()
                    if text and len(text) > 15:  # Ensure meaningful response
                        print(f"✅ Gemini success: {text[:60]}...")
                        
                        # Cache successful response
                        if self.cache:
                            self.cache.set(cache_key, text, 3600)  # Cache 1 hour
                        
                        return text
                
                # Try alternative extraction
                if response and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts') and candidate.content.parts:
                            text = candidate.content.parts[0].text.strip()
                            if text and len(text) > 15:
                                print(f"✅ Gemini success (alt): {text[:60]}...")
                                if self.cache:
                                    self.cache.set(cache_key, text, 3600)
                                return text

                print(f"⚠️ Attempt {attempt + 1}: Empty or short response")
                
                # Wait before retry
                if attempt < max_retries:
                    time.sleep(1.5)

            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1} error: {str(e)[:100]}")
                if attempt < max_retries:
                    time.sleep(2)

        # Fallback after all retries
        print(f"⚠️ All Gemini attempts failed, using fallback for {item_title[:50]}...")
        import random
        
        user_interest = user_genres[0] if user_genres else f'{domain_name}s'
        item_genre_text = ', '.join(item_genres[:2]) if item_genres else f'{domain_name}'
        rating_text = f" with {item_rating}/5 stars" if item_rating else ""
        
        fallback_templates = [
            f"Since you enjoy {user_interest}, '{item_title}' is a perfect match! This {item_genre_text} {domain_name}{rating_text} aligns with your tastes.",
            f"You'll love '{item_title}'! As a {user_interest} fan, this {item_genre_text} {domain_name}{rating_text} is right up your alley.",
            f"Great recommendation! '{item_title}' combines {item_genre_text} excellence that {user_interest} enthusiasts adore{rating_text}.",
            f"Perfect for you! '{item_title}' delivers outstanding {item_genre_text} content{rating_text} for {user_interest} lovers."
        ]
        
        fallback = random.choice(fallback_templates)
        
        # Cache fallback (shorter TTL)
        if self.cache:
            self.cache.set(cache_key, fallback, 300)  # 5 minutes
        
        return fallback


def get_gemini_client():
    """Factory method for GeminiClient"""
    return GeminiClient()