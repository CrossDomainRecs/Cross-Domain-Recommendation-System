"""
Demo: Complete user flow from UI to recommendations
Simulates what happens when user interacts with the frontend
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config
from src.models.cold_start.input_processor import ColdStartInputProcessor
from src.models.hybrid.recommender import HybridRecommender

def simulate_user_onboarding():
    """
    Simulate a complete user onboarding flow
    Exactly as it would happen from the React UI
    """
    
    print("="*80)
    print(" SIMULATION: NEW USER ONBOARDING")
    print("="*80)
    
    # Initialize systems
    print("\n🔧 Initializing backend services...")
    input_processor = ColdStartInputProcessor()
    recommender = HybridRecommender()
    
    print("\n" + "="*80)
    print(" STEP 1: USER REGISTRATION")
    print("="*80)
    
    # This would come from React registration form
    user_data = {
        "name": "Yashwanth",
        "email": "yashwanth@example.com",
        "user_id": "user_demo_001"
    }
    
    print(f"\n✅ User registered: {user_data['name']}")
    print(f"   User ID: {user_data['user_id']}")
    
    print("\n" + "="*80)
    print(" STEP 2: ONBOARDING - COLLECT PREFERENCES")
    print("="*80)
    
    # This would come from React onboarding form
    # User types in the input boxes
    user_inputs = {
        "movie": "Inception",     # User types in movie input box
        "book": "The Alchemist",  # User types in book input box
        "music": "Blinding Lights" # User types in music input box
    }
    
    print("\n📝 User provided preferences:")
    print(f"   Favorite Movie: {user_inputs['movie']}")
    print(f"   Favorite Book:  {user_inputs['book']}")
    print(f"   Favorite Music: {user_inputs['music']}")
    
    print("\n" + "="*80)
    print(" STEP 3: PROCESS & VALIDATE USER INPUTS")
    print("="*80)
    
    # Process each input (this is what happens when user clicks "Next")
    processed_items = []
    
    for domain, user_input in [
        ('movies', user_inputs['movie']),
        ('books', user_inputs['book']),
        ('music', user_inputs['music'])
    ]:
        print(f"\n📍 Processing {domain} input: '{user_input}'")
        print("-" * 80)
        
        # THIS IS THE CODE WE BUILT!
        result = input_processor.process_input(user_input, domain)
        
        if result['success']:
            item = result['matched_item']
            print(f"✅ VALIDATED & FOUND!")
            print(f"   Title: {item['title']}")
            print(f"   Genres: {item.get('genres', [])[:3]}")
            print(f"   Source: {result['source']}")
            print(f"   Confidence: {result.get('confidence', 0):.1%}")
            
            processed_items.append(item)
        else:
            print(f"❌ NOT FOUND")
            print(f"   Showing {len(result.get('suggestions', []))} alternatives to user")
    
    print("\n" + "="*80)
    print(" STEP 4: BUILD USER PROFILE")
    print("="*80)
    
    # Build user profile from validated inputs
    user_profile = {
        'user_id': user_data['user_id'],
        'name': user_data['name'],
        'favorite_genres': [],
        'liked_items': []
    }
    
    # Extract genres from processed items
    for item in processed_items:
        genres = item.get('genres', [])
        user_profile['favorite_genres'].extend(genres[:2])
        user_profile['liked_items'].append({
            'asin': item.get('asin', ''),
            'title': item['title'],
            'domain': item['domain']
        })
    
    # Remove duplicates
    user_profile['favorite_genres'] = list(set(user_profile['favorite_genres']))[:5]
    
    print(f"\n✅ User profile created:")
    print(f"   Genres: {user_profile['favorite_genres'][:3]}...")
    print(f"   Liked items: {len(user_profile['liked_items'])}")
    
    print("\n" + "="*80)
    print(" STEP 5: GENERATE INITIAL RECOMMENDATIONS")
    print("="*80)
    
    print("\n🎯 Generating personalized recommendations...")
    print("   (This is what the user sees on their home page)")
    
    # THIS IS THE HYBRID RECOMMENDER WE BUILT!
    recommendations = recommender.recommend_for_new_user(
        user_profile=user_profile,
        limit=10
    )
    
    print("\n" + "="*80)
    print(" STEP 6: DISPLAY RECOMMENDATIONS TO USER")
    print("="*80)
    
    # Group by domain
    by_domain = {'books': [], 'movies': [], 'music': []}
    for rec in recommendations:
        domain = rec.get('domain', 'unknown')
        if domain in by_domain:
            by_domain[domain].append(rec)
    
    # This is what React would display
    for domain, items in by_domain.items():
        if items:
            print(f"\n🎬 {domain.upper()} FOR YOU:")
            print("-" * 80)
            for i, rec in enumerate(items[:3], 1):
                print(f"\n{i}. {rec['title']}")
                print(f"   Genres: {rec.get('genres', [])[:2]}")
                print(f"   Match Score: {rec['score']:.1%}")
                print(f"   Why? Hybrid of content ({rec['content_score']:.1%}) + collaborative ({rec['collab_score']:.1%})")
    
    print("\n" + "="*80)
    print(" STEP 7: USER INTERACTION TRACKING")
    print("="*80)
    
    # Simulate user clicking on a recommendation
    print("\n👆 User clicks on: 'Into the Labyrinth' (movie)")
    
    user_interaction = {
        'user_id': user_data['user_id'],
        'action': 'click',
        'item_asin': recommendations[0]['asin'],
        'item_title': recommendations[0]['title'],
        'timestamp': '2025-10-14T22:55:00Z',
        'context': {
            'page': 'home_recommendations',
            'position': 1,
            'recommendation_source': 'hybrid'
        }
    }
    
    print(f"\n📊 Interaction captured:")
    print(f"   Action: {user_interaction['action']}")
    print(f"   Item: {user_interaction['item_title']}")
    print(f"   Position: {user_interaction['context']['position']}")
    
    print("\n💡 This interaction will:")
    print("   1. Be stored in MongoDB")
    print("   2. Update user profile")
    print("   3. Train DRL agent (reward signal)")
    print("   4. Improve future recommendations")
    
    print("\n" + "="*80)
    print(" ✅ COMPLETE USER FLOW DEMONSTRATED!")
    print("="*80)
    
    print("\n📌 Summary:")
    print(f"   User: {user_data['name']}")
    print(f"   Preferences collected: {len(processed_items)}")
    print(f"   Recommendations generated: {len(recommendations)}")
    print(f"   Interaction tracked: 1")
    
    print("\n🎯 Next steps:")
    print("   - User continues browsing (more interactions)")
    print("   - DRL agent learns from interactions")
    print("   - Recommendations get better over time")
    print("   - User gets personalized cross-domain suggestions")
    
    # Cleanup
    recommender.close()
    
    print("\n" + "="*80)
    print(" END OF SIMULATION")
    print("="*80)

if __name__ == '__main__':
    simulate_user_onboarding()
