"""
Check which files should be included in production deployment
"""
from pathlib import Path
import os

def check_deployment_files():
    """Check what files exist and what's needed for deployment"""
    
    print("="*70)
    print("🔍 RecLab Production Files Check")
    print("="*70)
    
    project_root = Path.cwd()
    
    # Files that MUST be included
    required_files = {
        'Root Directory': [
            '.gitignore',
            'Procfile',
            'render.yaml',
            'requirements.txt',
            'README.md'
        ],
        'Backend': [
            'backend/package.json',
            'backend/package-lock.json',
            'backend/server.js',
            'backend/.env.example',
            'backend/controllers/',
            'backend/middleware/',
            'backend/models/',
            'backend/routes/',
            'backend/utils/'
        ],
        'Frontend': [
            'frontend/package.json',
            'frontend/package-lock.json',
            'frontend/index.html',
            'frontend/vite.config.js',
            'frontend/tailwind.config.js',
            'frontend/.env.example',
            'frontend/src/',
            'frontend/public/'
        ],
        'Python Source': [
            'src/api/',
            'src/models/',
            'src/utils/',
            'src/external/',
            'src/data/',
            'src/database/',
            'src/evaluation/'
        ],
        'Config': [
            'config/config.yaml',
            'config/config.production.yaml'
        ],
        'Models (Small)': [
            'models/drl/drl_agent.pth',
            'models/drl/replay_buffer.pkl'
        ],
        'Data (Required)': [
            'data/interim/matrices/',
            'data/splits/'
        ]
    }
    
    # Files that should be EXCLUDED (already in .gitignore)
    excluded_patterns = [
        'node_modules/',
        'venv/',
        '__pycache__/',
        '*.pyc',
        '.env',
        'weaviate_backup/',
        'models/gnn/best_model_enhanced.pth',  # Too large
        'models/gnn/best_model.pth',  # Too large
        'data/raw/*.jsonl',  # Raw data files
        'data/processed/*.jsonl',
        'notebooks/',
        '.ipynb_checkpoints/',
        'logs/',
        'uploads/',
        '.vscode/',
        '.idea/',
        'dist/',
        'build/'
    ]
    
    print("\n✅ FILES TO INCLUDE IN PRODUCTION:")
    print("-"*70)
    for category, files in required_files.items():
        print(f"\n📁 {category}:")
        for file_path in files:
            full_path = project_root / file_path
            if full_path.exists():
                if full_path.is_dir():
                    print(f"   ✅ {file_path} (directory)")
                else:
                    size = full_path.stat().st_size / 1024
                    print(f"   ✅ {file_path} ({size:.1f} KB)")
            else:
                print(f"   ⚠️  {file_path} (MISSING - may need to create)")
    
    print("\n\n❌ FILES TO EXCLUDE (via .gitignore):")
    print("-"*70)
    for pattern in excluded_patterns:
        print(f"   ❌ {pattern}")
    
    print("\n\n" + "="*70)
    print("📋 SUMMARY:")
    print("="*70)
    print("✅ Include: Source code, configs, small models, package files")
    print("❌ Exclude: node_modules, venv, large models, raw data, logs")
    print("\nNext: Copy the .gitignore file to ensure these are properly excluded")
    print("="*70)

if __name__ == "__main__":
    check_deployment_files()
