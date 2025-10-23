# RecLab - Cross-Domain Recommendation System

A cutting-edge recommendation system using Graph Neural Networks (GNN) and Deep Reinforcement Learning (DRL) for personalized cross-domain recommendations across Books, Movies, and Music.

## Features

- 🧠 Advanced ML: GNN + DRL hybrid approach
- 🔄 Cross-domain recommendations
- 🚀 Cold-start solution with semantic search
- 📊 Real-time feedback loop
- 🎯 Explainable recommendations
- ⚡ High-performance architecture

## Tech Stack

**Backend:**
- Python (Flask) - ML microservices
- Node.js (Express) - API server
- MongoDB - User data & interactions
- Weaviate - Vector database
- Redis - Caching

**Frontend:**
- React
- TailwindCSS

**ML Stack:**
- PyTorch
- PyTorch Geometric / DGL
- Sentence Transformers
- Google Gemini API

## Quick Start

1. Clone and setup:
```bash
cd RecLab
cp .env.example .env
# Edit .env with your API keys
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

3. Run data pipeline:
```bash
python scripts/run_data_pipeline.py
```

4. Start services:
```bash
# Flask ML service
python src/api/app.py

# Node.js backend
cd backend && npm install && npm start

# React frontend
cd frontend && npm install && npm start
```

## Project Structure

See `docs/architecture.md` for detailed structure documentation.

## License

MIT
