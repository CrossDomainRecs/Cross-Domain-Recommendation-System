"""
Download GNN models from Google Drive at startup
"""
import os
import gdown
from pathlib import Path

def download_models():
    """Download models from Google Drive if they don't exist"""
    model_dir = Path(__file__).parent.parent.parent / "models" / "gnn"
    model_path = model_dir / "best_model_enhanced.pth"
    
    # Skip if model already exists
    if model_path.exists():
        print(f"✅ Model already exists: {model_path}")
        return True
    
    # Create directory if doesn't exist
    model_dir.mkdir(parents=True, exist_ok=True)
    
    # Google Drive file ID (replace with your file ID)
    file_id = os.getenv('GNN_MODEL_URL', 'YOUR_FILE_ID_HERE')
    
    if file_id == 'YOUR_FILE_ID_HERE':
        print("⚠️ GNN_MODEL_URL not set, skipping model download")
        return False
    
    try:
        print(f"📥 Downloading GNN model from Google Drive...")
        url = f'https://drive.google.com/uc?id={file_id}'
        
        # Download to temp location
        tar_path = model_dir / "models.tar.gz"
        gdown.download(url, str(tar_path), quiet=False)
        
        # Extract
        import tarfile
        print(f"📦 Extracting models...")
        with tarfile.open(tar_path, 'r:gz') as tar:
            tar.extractall(model_dir)
        
        # Cleanup
        tar_path.unlink()
        
        print(f"✅ Models downloaded and extracted successfully")
        return True
        
    except Exception as e:
        print(f"❌ Model download failed: {e}")
        return False

if __name__ == "__main__":
    download_models()
