"""Quick test to verify Weaviate is working"""
import weaviate
from sentence_transformers import SentenceTransformer

# Connect
client = weaviate.connect_to_local(host="localhost", port=8080, grpc_port=50051)
collection = client.collections.get("Product")

# Check count
total = collection.aggregate.over_all(total_count=True).total_count
print(f"📊 Total products: {total:,}")

# Test search
model = SentenceTransformer('all-MiniLM-L6-v2')

queries = [
    "science fiction space adventure",
    "romantic comedy love story",
    "thriller suspense mystery"
]

for query in queries:
    print(f"\n🔍 Search: '{query}'")
    vector = model.encode(query).tolist()
    results = collection.query.near_vector(near_vector=vector, limit=3)
    
    for i, obj in enumerate(results.objects, 1):
        print(f"  {i}. [{obj.properties['domain']}] {obj.properties['title']}")
        print(f"     Rating: {obj.properties['rating']}")

client.close()
print("\n✅ All tests passed!")
