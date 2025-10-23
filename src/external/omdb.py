"""OMDB API wrapper"""
import os
import requests
from typing import Dict, Optional

class OMDBClient:
    BASE_URL = "http://www.omdbapi.com/"
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('OMDB_API_KEY')
    
    def search_by_title(self, title: str) -> Optional[Dict]:
        params = {'apikey': self.api_key, 't': title}
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=5)
            data = response.json()
            if data.get('Response') == 'True':
                return {'title': data.get('Title'), 'year': data.get('Year'), 'genre': data.get('Genre', '').split(', '), 'director': data.get('Director'), 'plot': data.get('Plot'), 'rating': data.get('imdbRating')}
        except:
            pass
        return None
