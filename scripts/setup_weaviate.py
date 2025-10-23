"""
Set up Weaviate vector database with product embeddings (v4 API)
Generates embeddings for semantic search and cold-start recommendations
"""

import json
import sys
from pathlib import Path
from tqdm import tqdm
import weaviate
import weaviate.classes as wvc
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.utils.config import get_config

# Load configuration
config = get_config()

# Configuration
WEAVIATE_URL = config.get_secret('WEAVIATE_URL', 'http://localhost:8080')
MONGODB_URI = config.get_secret('MONGODB_URI')
EMBEDDING_MODEL = config.get('models.embeddings.model_name', 'all-MiniLM-L6-v2')
BATCH_SIZE = 100

print(f"\n🔧 Configuration:")
print(f"  Weaviate URL: {WEAVIATE_URL}")
print(f"  MongoDB URI: {MONGODB_URI[:30]}...")
print(f"  Embedding Model: {EMBEDDING_MODEL}")

# Connect to Weaviate (v4 API)
print(f"\n🔌 Connecting to Weaviate...")
try:
    client = weaviate.connect_to_local(
        host="localhost",
        port=8080,
        grpc_port=50051
    )
    print(f"✅ Connected to Weaviate!")
except Exception as e:
    print(f"❌ Failed to connect to Weaviate: {e}")
    print("\n💡 Make sure Weaviate is running:")
    print("   docker-compose -f docker/docker-compose.weaviate.yml up -d")
    sys.exit(1)

# Connect to MongoDB
print(f"\n🔌 Connecting to MongoDB...")
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client['reclab']
metadata_collection = db['product_metadata']

# Load embedding model
print(f"\n📦 Loading embedding model: {EMBEDDING_MODEL}")
print("   (This may take a minute on first run...)")
embedding_model = SentenceTransformer(EMBEDDING_MODEL)
print(f"✅ Model loaded! Embedding dimension: {embedding_model.get_sentence_embedding_dimension()}")


def create_schema():
    """Create Weaviate schema for products (v4 API)"""
    
    print(f"\n🏗️  Creating Weaviate schema...")
    
    # Delete existing class if exists
    try:
        client.collections.delete("Product")
        print("  🗑️  Deleted existing Product class")
    except:
        pass
    
    # Create collection (v4 API)
    client.collections.create(
        name="Product",
        description="Product items from Books, Movies, Music",
        properties=[
            wvc.config.Property(
                name="asin",
                data_type=wvc.config.DataType.TEXT,
                description="Product ASIN"
            ),
            wvc.config.Property(
                name="title",
                data_type=wvc.config.DataType.TEXT,
                description="Product title"
            ),
            wvc.config.Property(
                name="domain",
                data_type=wvc.config.DataType.TEXT,
                description="Domain: books, movies, or music"
            ),
            wvc.config.Property(
                name="categories",
                data_type=wvc.config.DataType.TEXT_ARRAY,
                description="Product categories"
            ),
            wvc.config.Property(
                name="rating",
                data_type=wvc.config.DataType.NUMBER,
                description="Average rating"
            ),
            wvc.config.Property(
                name="price",
                data_type=wvc.config.DataType.NUMBER,
                description="Price"
            ),
            wvc.config.Property(
                name="description",
                data_type=wvc.config.DataType.TEXT,
                description="Description"
            ),
            wvc.config.Property(
                name="author",
                data_type=wvc.config.DataType.TEXT,
                description="Author/Artist"
            )
        ]
    )
    
    print("✅ Schema created successfully")


def generate_embedding_text(item):
    """Generate text for embedding"""
    text_parts = []
    
    # Add title
    if item.get('title'):
        text_parts.append(str(item['title']))
    
    # Add categories (top 5)
    if isinstance(item.get('categories'), list):
        text_parts.extend(item['categories'][:5])
    
    # Add description (first 200 chars)
    if isinstance(item.get('description'), list) and len(item['description']) > 0:
        desc = ' '.join(item['description'])[:200]
        text_parts.append(desc)
    elif isinstance(item.get('description'), str):
        text_parts.append(item['description'][:200])
    
    # Add author/artist
    if item.get('domain') == 'books' and isinstance(item.get('author'), dict):
        if item['author'].get('name'):
            text_parts.append(f"by {item['author']['name']}")
    elif item.get('store'):
        text_parts.append(item['store'])
    
    return ' '.join(text_parts)


def load_products_for_domain(domain):
    """Load products and create embeddings (v4 API)"""
    
    print(f"\n{'='*60}")
    print(f"📚 Processing {domain.upper()} products")
    print(f"{'='*60}")
    
    # Get products from MongoDB
    cursor = metadata_collection.find({'domain': domain})
    products = list(cursor)
    
    print(f"  Found {len(products):,} {domain} products")
    
    if len(products) == 0:
        print(f"  ⚠️  No products found")
        return 0
    
    # Get collection
    collection = client.collections.get("Product")
    
    successful = 0
    failed = 0
    
    # Batch insert (v4 API)
    with collection.batch.dynamic() as batch:
        for item in tqdm(products, desc=f"  Loading {domain}"):
            try:
                # Generate embedding
                text = generate_embedding_text(item)
                vector = embedding_model.encode(text).tolist()
                
                # Extract author/artist
                author = ""
                if item.get('domain') == 'books' and isinstance(item.get('author'), dict):
                    author = item['author'].get('name', '')
                elif item.get('store'):
                    author = item['store']
                
                # Extract description
                description = ""
                if isinstance(item.get('description'), list):
                    description = ' '.join(item['description'])[:500]
                elif isinstance(item.get('description'), str):
                    description = item['description'][:500]
                
                # Add to batch
                batch.add_object(
                    properties={
                        "asin": item.get('parent_asin', ''),
                        "title": item.get('title', ''),
                        "domain": domain,
                        "categories": item.get('categories', [])[:10],
                        "rating": float(item.get('average_rating', 0)),
                        "price": float(item.get('price', 0)) if item.get('price') else 0,
                        "description": description,
                        "author": author
                    },
                    vector=vector
                )
                
                successful += 1
                
            except Exception as e:
                failed += 1
                if failed < 5:
                    print(f"\n  ⚠️  Error: {e}")
                continue
    
    print(f"\n  ✅ Successfully loaded: {successful:,}")
    if failed > 0:
        print(f"  ⚠️  Failed: {failed:,}")
    
    return successful


def verify_data():
    """Verify data (v4 API)"""
    
    print(f"\n{'='*60}")
    print("🔍 VERIFYING DATA")
    print(f"{'='*60}")
    
    collection = client.collections.get("Product")
    
    # Total count
    total = collection.aggregate.over_all(total_count=True).total_count
    print(f"\n📊 Total products: {total:,}")
    
    # Count by domain
    for domain in ['books', 'movies', 'music']:
        result = collection.aggregate.over_all(
            filters=wvc.query.Filter.by_property("domain").equal(domain),
            total_count=True
        )
        print(f"  {domain.capitalize()}: {result.total_count:,}")
    
    # Test semantic search
    print(f"\n🔍 Testing semantic search:")
    print(f"  Query: 'science fiction adventure'")
    
    response = collection.query.near_text(
        query="science fiction adventure",
        limit=3
    )
    
    if response.objects:
        print(f"\n  Top 3 results:")
        for i, obj in enumerate(response.objects, 1):
            print(f"    {i}. [{obj.properties['domain']}] {obj.properties['title']}")
            print(f"       Categories: {obj.properties['categories'][:3]}")
    
    print(f"\n✅ Semantic search is working!")


def print_statistics():
    """Print final statistics"""
    
    print(f"\n{'='*60}")
    print("📊 FINAL STATISTICS")
    print(f"{'='*60}")
    
    collection = client.collections.get("Product")
    total = collection.aggregate.over_all(total_count=True).total_count
    
    print(f"\n✅ Weaviate setup complete!")
    print(f"  Total products indexed: {total:,}")
    print(f"  Embedding model: {EMBEDDING_MODEL}")
    print(f"  Vector dimension: {embedding_model.get_sentence_embedding_dimension()}")
    print(f"  Weaviate URL: {WEAVIATE_URL}")
    
    print(f"\n💡 Ready for:")
    print(f"  - Semantic search")
    print(f"  - Cold-start recommendations")
    print(f"  - Content-based filtering")
    
    print(f"\n{'='*60}")


def main():
    """Main setup function"""
    
    try:
        print("="*60)
        print("  WEAVIATE SETUP - RecLab")
        print("  Generating Embeddings & Loading Data")
        print("="*60)
        
        # Create schema
        create_schema()
        
        # Load products for each domain
        total_loaded = 0
        for domain in config.get('data.domains', ['books', 'movies', 'music']):
            count = load_products_for_domain(domain)
            total_loaded += count
        
        # Verify data
        verify_data()
        
        # Print statistics
        print_statistics()
        
        print(f"\n🎉 All done! Weaviate is ready to use.")
        
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Close connections
        try:
            client.close()
            print("\n👋 Closed Weaviate connection")
        except:
            pass
        
        try:
            mongo_client.close()
            print("👋 Closed MongoDB connection")
        except:
            pass


if __name__ == '__main__':
    main()
