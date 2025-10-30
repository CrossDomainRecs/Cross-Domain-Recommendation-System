"""
Simplified API for Render deployment
"""
import sys
from pathlib import Path
import os

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RecLab API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Check models on startup"""
    logger.info("🚀 Starting RecLab API...")
    
    # Check if models exist
    gnn_path = Path("models/gnn/best_model_enhanced.pth")
    drl_path = Path("models/drl/drl_agent.pth")
    
    if gnn_path.exists():
        size_mb = gnn_path.stat().st_size / (1024 * 1024)
        logger.info(f"✓ GNN model found: {size_mb:.2f} MB")
    else:
        logger.error("❌ GNN model not found!")
    
    if drl_path.exists():
        size_mb = drl_path.stat().st_size / (1024 * 1024)
        logger.info(f"✓ DRL model found: {size_mb:.2f} MB")
    else:
        logger.error("❌ DRL model not found!")
    
    logger.info("✅ RecLab API ready!")

@app.get("/")
async def root():
    return {
        "message": "RecLab API - Multi-Domain Recommendation System",
        "status": "online",
        "version": "1.0.0",
        "features": ["GNN", "DRL", "Cross-Domain"],
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    gnn_exists = Path("models/gnn/best_model_enhanced.pth").exists()
    drl_exists = Path("models/drl/drl_agent.pth").exists()
    matrices_exist = Path("data/interim/matrices/train_ratings.npz").exists()
    
    return {
        "status": "healthy" if (gnn_exists and drl_exists) else "degraded",
        "models": {
            "gnn": gnn_exists,
            "drl": drl_exists
        },
        "data": {
            "matrices": matrices_exist
        }
    }

# Try to import your existing routes
try:
    from src.api.routes import recommendations, explore, health as health_route
    app.include_router(recommendations.router, prefix="/api", tags=["recommendations"])
    app.include_router(explore.router, prefix="/api", tags=["explore"])
    logger.info("✓ All routes loaded successfully")
except ImportError as e:
    logger.warning(f"⚠ Some routes not available: {e}")
    logger.info("Running with basic endpoints only")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
