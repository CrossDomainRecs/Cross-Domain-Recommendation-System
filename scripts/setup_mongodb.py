"""
Load filtered data into MongoDB
Production-ready version using config system
"""

import json
import sys
from pathlib import Path
from pymongo import MongoClient
from tqdm import tqdm

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config, PROJECT_ROOT

# Load configuration
config = get_config()

# Get configuration values
MONGODB_URI = config.get_secret('MONGODB_URI', 'mongodb://localhost:27017/')
DATABASE_NAME = config.get('database.mongodb.database', 'reclab')
COLLECTIONS = config.get('database.mongodb.collections', {})
PROCESSED_DATA_DIR = PROJECT_ROOT / config.get('data.paths.processed_data', 'data/processed')

print(f"\n🔧 Configuration:")
print(f"  Environment: {config.env}")
print(f"  MongoDB URI: {MONGODB_URI[:30]}...")
print(f"  Database: {DATABASE_NAME}")
print(f"  Data directory: {PROCESSED_DATA_DIR}")

# Connect to MongoDB
print("\n🔌 Connecting to MongoDB...")
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✅ Successfully connected!")
except Exception as e:
    print(f"❌ Failed to connect: {e}")
    print("\n💡 Make sure MongoDB is running:")
    print("   - System: sudo systemctl start mongodb")
    print("   - Docker: docker run -d -p 27017:27017 mongo:latest")
    sys.exit(1)

db = client[DATABASE_NAME]

# Collections
reviews_collection = db[COLLECTIONS.get('reviews', 'reviews')]
metadata_collection = db[COLLECTIONS.get('products', 'product_metadata')]
users_collection = db[COLLECTIONS.get('users', 'users')]


def clear_collections():
    """Clear existing data"""
    response = input("\n⚠️  Clear existing data? (yes/no): ")
    if response.lower() == 'yes':
        print("🗑️  Clearing collections...")
        reviews_collection.delete_many({})
        metadata_collection.delete_many({})
        users_collection.delete_many({})
        print("✅ Collections cleared")
    else:
        print("⏭️  Skipping clear")


def load_metadata(domain):
    """Load product metadata for a domain"""
    print(f"\n📚 Loading {domain} metadata...")
    
    metadata_file = PROCESSED_DATA_DIR / f'{domain}_metadata.jsonl'
    
    if not metadata_file.exists():
        print(f"❌ File not found: {metadata_file}")
        return 0
    
    documents = []
    batch_size = 1000
    
    with open(metadata_file, 'r', encoding='utf-8') as f:
        for line in tqdm(f, desc=f"Reading {domain} metadata"):
            try:
                item = json.loads(line.strip())
                item['domain'] = domain
                documents.append(item)
                
                if len(documents) >= batch_size:
                    try:
                        metadata_collection.insert_many(documents, ordered=False)
                    except:
                        pass
                    documents = []
            except:
                continue
    
    if documents:
        try:
            metadata_collection.insert_many(documents, ordered=False)
        except:
            pass
    
    count = metadata_collection.count_documents({'domain': domain})
    print(f"✅ Loaded {count:,} {domain} metadata records")
    return count


def load_reviews(domain):
    """Load filtered reviews"""
    print(f"\n📝 Loading {domain} reviews...")
    
    reviews_file = PROCESSED_DATA_DIR / f'{domain}_reviews_filtered.jsonl'
    
    if not reviews_file.exists():
        print(f"❌ File not found: {reviews_file}")
        return 0
    
    documents = []
    batch_size = 5000
    
    with open(reviews_file, 'r', encoding='utf-8') as f:
        for line in tqdm(f, desc=f"Reading {domain} reviews"):
            try:
                review = json.loads(line.strip())
                review['domain'] = domain
                documents.append(review)
                
                if len(documents) >= batch_size:
                    try:
                        reviews_collection.insert_many(documents, ordered=False)
                    except:
                        pass
                    documents = []
            except:
                continue
    
    if documents:
        try:
            reviews_collection.insert_many(documents, ordered=False)
        except:
            pass
    
    count = reviews_collection.count_documents({'domain': domain})
    print(f"✅ Loaded {count:,} {domain} reviews")
    return count


def create_indexes():
    """Create indexes for fast queries"""
    print("\n🔍 Creating indexes...")
    
    try:
        metadata_collection.create_index('parent_asin')
        metadata_collection.create_index('domain')
        metadata_collection.create_index([('title', 'text')])
        
        reviews_collection.create_index('user_id')
        reviews_collection.create_index('parent_asin')
        reviews_collection.create_index('domain')
        reviews_collection.create_index('timestamp')
        
        users_collection.create_index('user_id', unique=True)
        
        print("✅ Indexes created")
    except Exception as e:
        print(f"⚠️  Warning: {e}")


def print_statistics():
    """Print database statistics"""
    print("\n" + "="*60)
    print("📊 DATABASE STATISTICS")
    print("="*60)
    
    total_reviews = reviews_collection.count_documents({})
    total_metadata = metadata_collection.count_documents({})
    
    print(f"\nTotal Documents:")
    print(f"  Reviews: {total_reviews:,}")
    print(f"  Metadata: {total_metadata:,}")
    
    print(f"\nPer Domain:")
    for domain in config.get('data.domains', ['books', 'movies', 'music']):
        reviews_count = reviews_collection.count_documents({'domain': domain})
        metadata_count = metadata_collection.count_documents({'domain': domain})
        print(f"  {domain.capitalize()}:")
        print(f"    - Reviews: {reviews_count:,}")
        print(f"    - Metadata: {metadata_count:,}")
    
    print("="*60)


def main():
    """Main setup function"""
    print("="*60)
    print("  MONGODB SETUP - RecLab")
    print("="*60)
    
    clear_collections()
    
    print("\n📦 LOADING METADATA")
    print("-"*60)
    for domain in config.get('data.domains', ['books', 'movies', 'music']):
        load_metadata(domain)
    
    print("\n📝 LOADING REVIEWS")
    print("-"*60)
    for domain in config.get('data.domains', ['books', 'movies', 'music']):
        load_reviews(domain)
    
    create_indexes()
    print_statistics()
    
    print("\n✅ MongoDB setup complete!")
    print(f"🔗 Connection string: {MONGODB_URI}")
    print(f"📦 Database: {DATABASE_NAME}")


if __name__ == '__main__':
    main()

