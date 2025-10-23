"""Google Books API wrapper"""
import os
import requests
from typing import Dict, Optional

class GoogleBooksClient:
    BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('GOOGLE_BOOKS_API_KEY')
    
    def search_by_title(self, title: str, author: str = None) -> Optional[Dict]:
        query = f'intitle:{title}'
        params = {'q': query, 'key': self.api_key, 'maxResults': 1}
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=5)
            data = response.json()
            if data.get('totalItems', 0) > 0:
                vol = data['items'][0]['volumeInfo']
                return {'title': vol.get('title'), 'authors': vol.get('authors', []), 'categories': vol.get('categories', []), 'rating': vol.get('averageRating')}
        except:
            pass
        return None
