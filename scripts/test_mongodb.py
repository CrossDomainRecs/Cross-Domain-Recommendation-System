"""
Quick test to verify MongoDB data
"""
from pymongo import MongoClient
from src.utils.config import get_config

config = get_config()
client = MongoClient(config.get_secret('MONGODB_URI'))
db = client['reclab']

print("="*60)
print("MongoDB Data Verification")
print("="*60)

# Test 1: Count documents
print("\n📊 Collection Counts:")
for collection_name in ['reviews', 'product_metadata']:
    count = db[collection_name].count_documents({})
    print(f"  {collection_name}: {count:,}")

# Test 2: Sample data
print("\n📚 Sample Book Metadata:")
book = db.product_metadata.find_one({'domain': 'books'})
if book:
    print(f"  Title: {book.get('title', 'N/A')}")
    print(f"  ASIN: {book.get('parent_asin', 'N/A')}")
    print(f"  Categories: {book.get('categories', [])[:3]}")

print("\n📝 Sample Review:")
review = db.reviews.find_one({'domain': 'books'})
if review:
    print(f"  User ID: {review.get('user_id', 'N/A')}")
    print(f"  Rating: {review.get('rating', 'N/A')}")
    print(f"  Text: {review.get('text', 'N/A')[:100]}...")

# Test 3: Query test
print("\n🔍 Query Test - Find books by category:")
cursor = db.product_metadata.find(
    {'domain': 'books', 'categories': {'$exists': True}},
    {'title': 1, 'categories': 1}
).limit(3)

for doc in cursor:
    print(f"  - {doc.get('title', 'N/A')}")
    print(f"    Categories: {doc.get('categories', [])[:2]}")

print("\n✅ MongoDB is working correctly!")
