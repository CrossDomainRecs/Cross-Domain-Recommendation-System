"""
Script to export Weaviate data for cloud migration (v4 client)
Run this BEFORE deploying to preserve your embeddings
"""
import weaviate
from weaviate.classes.init import Auth
import json
from pathlib import Path

def export_weaviate_data():
    """Export all data from Weaviate"""
    
    # Create backup directory
    backup_dir = Path("weaviate_backup")
    backup_dir.mkdir(exist_ok=True)
    
    print("🔍 Connecting to local Weaviate...")
    
    try:
        # Connect to local Weaviate (v4 client)
        client = weaviate.connect_to_local(
            host="localhost",
            port=8080
        )
        
        print("✅ Connected to Weaviate")
        
        # Get all collections (classes)
        collections = client.collections.list_all()
        
        if not collections:
            print("⚠️  No collections found in Weaviate!")
            client.close()
            return
        
        print(f"📦 Found {len(collections)} collections")
        
        # Export metadata about collections
        collection_info = {}
        for collection_name in collections:
            collection = client.collections.get(collection_name)
            config = collection.config.get()
            collection_info[collection_name] = {
                'name': collection_name,
                'vectorizer': str(config.vectorizer_config) if config.vectorizer_config else None,
                'properties': []
            }
            
            # Get properties
            if config.properties:
                for prop in config.properties:
                    collection_info[collection_name]['properties'].append({
                        'name': prop.name,
                        'data_type': str(prop.data_type)
                    })
        
        # Save collection info (schema)
        with open(backup_dir / "schema.json", "w") as f:
            json.dump(collection_info, f, indent=2)
        print(f"✅ Schema saved: {len(collections)} collections")
        
        # Export data for each collection
        total_objects = 0
        for collection_name in collections:
            print(f"\n📦 Exporting {collection_name}...")
            
            collection = client.collections.get(collection_name)
            
            # Query all objects
            all_objects = []
            
            try:
                # Fetch objects in batches
                for item in collection.iterator():
                    obj_data = {
                        'uuid': str(item.uuid),
                        'properties': item.properties,
                        'vector': item.vector if hasattr(item, 'vector') else None
                    }
                    all_objects.append(obj_data)
                
                # Save to file
                if all_objects:
                    output_file = backup_dir / f"{collection_name}.json"
                    with open(output_file, "w") as f:
                        json.dump(all_objects, f, indent=2)
                    
                    print(f"   ✅ Exported {len(all_objects)} objects")
                    total_objects += len(all_objects)
                else:
                    print(f"   ⚠️  No objects found in {collection_name}")
                    
            except Exception as e:
                print(f"   ❌ Error exporting {collection_name}: {str(e)}")
                continue
        
        print("\n" + "="*60)
        print("✅ Weaviate backup completed!")
        print(f"📁 Backup location: {backup_dir.absolute()}")
        print(f"📊 Total objects exported: {total_objects}")
        print(f"📦 Total collections: {len(collections)}")
        print("="*60)
        
        # Close connection
        client.close()
        
        return {
            'success': True,
            'backup_dir': str(backup_dir.absolute()),
            'collections': len(collections),
            'total_objects': total_objects
        }
        
    except Exception as e:
        print(f"\n❌ Error exporting Weaviate data: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    print("="*60)
    print("🚀 Weaviate Data Export Tool (v4)")
    print("="*60)
    export_weaviate_data()
