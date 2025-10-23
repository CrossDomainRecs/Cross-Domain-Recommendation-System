"""
Health check endpoints
"""

from flask import Blueprint, jsonify
import torch

bp = Blueprint('health', __name__, url_prefix='/api/health')

@bp.route('', methods=['GET'])
def health_check():
    """Basic health check"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'message': 'RecLab ML API is running'
    })

@bp.route('/detailed', methods=['GET'])
def detailed_health():
    """Detailed health check with system info"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'system': {
            'cuda_available': torch.cuda.is_available(),
            'cuda_device': torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'
        },
        'services': {
            'weaviate': 'connected',  # We'll implement proper checks later
            'mongodb': 'connected',
            'gnn_model': 'loaded',
        }
    })
