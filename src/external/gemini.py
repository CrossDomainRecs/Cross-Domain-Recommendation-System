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
        
        if not api_key:
            raise ValueError("GOOGLE_GEMINI_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('models/gemini-2.0-flash-exp')
        
        # Rate limiting (15 requests per minute for free tier)
        self.request_times = []
        self.max_requests_per_minute = 14
        self.cache = get_cache()
        
        print("✅ Gemini client initialized with model: models/gemini-2.0-flash-exp")
        print(f"   Rate limit: {self.max_requests_per_minute} requests/min")
    

    def _wait_if_rate_limited(self):
        """Wait if we're hitting rate limits"""
        now = time.time()
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        if len(self.request_times) >= self.max_requests_per_minute:
            wait_time = 60 - (now - self.request_times[0])
            if wait_time > 0:
                print(f"⏳ Rate limit reached, waiting {wait_time:.1f}s...")
                time.sleep(wait_time + 0.5)
                self.request_times = []
        
        self.request_times.append(now)
    

    def _get_cache_key(self, prompt: str) -> str:
        """Generate cache key for prompt"""
        import hashlib
        return f"gemini:explanation:{hashlib.md5(prompt.encode()).hexdigest()}"
    

    def _extract_text_from_response(self, response):
        """Safely extract text from Gemini response with multiple fallback methods"""
        try:
            # Method 1: Direct text access
            if hasattr(response, 'text') and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"   Method 1 failed: {str(e)[:50]}")
        
        try:
            # Method 2: Through candidates
            if hasattr(response, 'candidates') and response.candidates:
                for candidate in response.candidates:
                    if hasattr(candidate, 'content'):
                        content = candidate.content
                        if hasattr(content, 'parts') and content.parts:
                            for part in content.parts:
                                if hasattr(part, 'text') and part.text:
                                    return part.text.strip()
        except Exception as e:
            print(f"   Method 2 failed: {str(e)[:50]}")
        
        try:
            # Method 3: Direct parts access
            if hasattr(response, 'parts') and response.parts:
                for part in response.parts:
                    if hasattr(part, 'text') and part.text:
                        return part.text.strip()
        except Exception as e:
            print(f"   Method 3 failed: {str(e)[:50]}")
        
        return None


    def generate_explanation(
        self,
        user_profile: Dict,
        recommended_item: Dict,
        recommendation_source: str = 'hybrid',
        max_retries: int = 2
    ) -> str:
        """Generate explanation with enhanced error handling"""

        # Build prompt
        user_genres = user_profile.get('favorite_genres', [])
        item_title = recommended_item.get('title', 'this item')
        item_genres = recommended_item.get('genres', [])
        item_rating = recommended_item.get('rating', 0)
        item_domain = recommended_item.get('domain', 'product')
        
        domain_map = {'movies': 'movie', 'music': 'music', 'books': 'book'}
        domain_name = domain_map.get(item_domain, 'product')
        
        prompt = f"""Explain in 2-3 SHORT sentences why this recommendation matches the user.

User likes: {', '.join(user_genres[:3]) if user_genres else f'{domain_name}s'}
Recommended: {item_title}
Genres: {', '.join(item_genres[:2]) if item_genres else 'N/A'}
Rating: {item_rating}/5 stars

Write a brief, friendly explanation. Be concise."""

        # Check cache
        cache_key = self._get_cache_key(prompt)
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                print(f"✅ Cache hit for: {item_title[:50]}")
                return cached

        # Try Gemini with retries
        for attempt in range(max_retries + 1):
            try:
                self._wait_if_rate_limited()
                print(f"🔍 Calling Gemini for: {item_title[:50]} (attempt {attempt + 1})")

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
                        'max_output_tokens': 200,
                    }
                )

                # Extract text using multiple methods
                text = self._extract_text_from_response(response)
                
                if text and len(text) > 15:
                    print(f"✅ Gemini success: {text[:60]}...")
                    if self.cache:
                        self.cache.set(cache_key, text, 3600)
                    return text
                
                print(f"⚠️ Attempt {attempt + 1}: No valid text extracted")
                if attempt < max_retries:
                    time.sleep(1.5)

            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1} error: {str(e)[:100]}")
                if attempt < max_retries:
                    time.sleep(2)

        # Fallback
        print(f"⚠️ Using fallback for {item_title[:50]}")
        import random
        
        user_interest = user_genres[0] if user_genres else domain_name
        item_genre_text = ', '.join(item_genres[:2]) if item_genres else domain_name
        
        fallbacks = [
            f"Perfect match! '{item_title}' combines {item_genre_text} elements that align with your love for {user_interest}.",
            f"You'll enjoy '{item_title}'! As a {user_interest} fan, this {item_genre_text} {domain_name} is exactly your style.",
            f"Great pick! '{item_title}' delivers the {item_genre_text} quality that {user_interest} enthusiasts appreciate.",
        ]
        
        fallback = random.choice(fallbacks)
        if self.cache:
            self.cache.set(cache_key, fallback, 300)
        
        return fallback


    def validate_and_extract(self, user_input: str, domain: str) -> Dict:
        """Validate user input and extract structured info"""
        prompt = f"""Analyze: "{user_input}" ({domain}). 
Return valid JSON:
{{
    "is_valid": true/false,
    "corrected_title": "",
    "confidence": 0.0-1.0,
    "genres": [],
    "themes": []
}}"""
        try:
            self._wait_if_rate_limited()
            response = self.model.generate_content(prompt)
            text = self._extract_text_from_response(response)
            if text:
                return json.loads(text)
            return {"is_valid": False}
        except Exception as e:
            print(f"⚠️ Gemini validate_and_extract error: {e}")
            return {"is_valid": False}


def get_gemini_client():
    """Factory method for GeminiClient"""
    return GeminiClient()
