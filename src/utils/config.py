"""
Production-grade configuration management for RecLab
"""
import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from dotenv import load_dotenv

class Config:
    """
    Enhanced configuration class with environment support
    
    Features:
    - Environment-specific configs (dev, staging, production)
    - Nested key access with dot notation
    - Automatic environment variable replacement
    - Validation and defaults
    """
    
    def __init__(self, config_path='config/config.yaml', env=None):
        """
        Initialize configuration
        
        Args:
            config_path: Path to base config file
            env: Environment name (dev, staging, production)
                 If None, reads from ENV environment variable
        """
        self.config_path = config_path
        self.env = env or os.getenv('ENV', 'dev')
        
        # Load .env file if exists
        self._load_env_file()
        
        # Load configuration
        self.config = self._load_config()
        
        # Validate
        self._validate_config()
    
    def _load_env_file(self):
        """Load environment variables from .env file"""
        env_file = Path('config/.env')
        if env_file.exists():
            load_dotenv(env_file)
            print(f"✅ Loaded environment variables from {env_file}")
        else:
            print(f"⚠️  No .env file found at {env_file}")
    
    def _load_config(self) -> Dict:
        """Load configuration from YAML files with environment overrides"""
        
        # Load base config
        config_file = Path(self.config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Config file not found: {config_file}")
        
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        
        # Load environment-specific overrides
        env_config_file = Path(f'config/config.{self.env}.yaml')
        if env_config_file.exists():
            with open(env_config_file, 'r') as f:
                env_config = yaml.safe_load(f)
                config = self._deep_merge(config, env_config)
            print(f"✅ Loaded {self.env} environment overrides")
        
        # Replace environment variable placeholders
        config = self._replace_env_vars(config)
        
        return config
    
    def _deep_merge(self, base: dict, override: dict) -> dict:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _replace_env_vars(self, config: Any) -> Any:
        """Replace ${VAR_NAME} with environment variable values"""
        
        if isinstance(config, dict):
            return {k: self._replace_env_vars(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [self._replace_env_vars(item) for item in config]
        elif isinstance(config, str) and config.startswith('${') and config.endswith('}'):
            var_name = config[2:-1]
            value = os.getenv(var_name)
            if value is None:
                print(f"⚠️  Environment variable {var_name} not set, using placeholder")
                return config
            return value
        else:
            return config
    
    def _validate_config(self):
        """Validate configuration"""
        # Add custom validation here
        pass
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        
        Args:
            key_path: Dot-separated path (e.g., 'models.gnn.hidden_dim')
            default: Default value if key not found
        
        Returns:
            Configuration value
        
        Example:
            >>> config.get('models.gnn.hidden_dim')
            128
            >>> config.get('api.flask_port')
            5000
        """
        keys = key_path.split('.')
        value = self.config
        
        try:
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return default
    
    def get_secret(self, key: str, default: str = None) -> str:
        """
        Get secret from environment variables
        
        Args:
            key: Environment variable name
            default: Default value if not found
        
        Returns:
            Secret value
        """
        value = os.getenv(key, default)
        if value is None:
            print(f"⚠️  Secret {key} not found in environment")
        return value
    
    def get_all(self) -> Dict:
        """Get entire configuration dictionary"""
        return self.config
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.env == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.env == 'dev'


# Singleton instance
_config_instance: Optional[Config] = None

def get_config(env: str = None) -> Config:
    """
    Get or create configuration instance (Singleton pattern)
    
    Args:
        env: Environment name (optional)
    
    Returns:
        Config instance
    """
    global _config_instance
    
    if _config_instance is None:
        _config_instance = Config(env=env)
    
    return _config_instance


# Keep your existing constants for backward compatibility
config = get_config()

# Environment variables (with fallbacks)
MONGODB_URI = config.get_secret('MONGODB_URI', 'mongodb://localhost:27017/reclab')
REDIS_URL = config.get_secret('REDIS_URL', 'redis://localhost:6379/0')
WEAVIATE_URL = config.get_secret('WEAVIATE_URL', 'http://localhost:8080')
GEMINI_API_KEY = config.get_secret('GEMINI_API_KEY')
OMDB_API_KEY = config.get_secret('OMDB_API_KEY')

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw'
PROCESSED_DATA_DIR = DATA_DIR / 'processed'
MODELS_DIR = PROJECT_ROOT / 'models'
LOGS_DIR = PROJECT_ROOT / 'logs'


# Test function
if __name__ == '__main__':
    print("="*60)
    print("Configuration Test")
    print("="*60)
    
    config = get_config()
    
    print(f"\nEnvironment: {config.env}")
    print(f"Project Root: {PROJECT_ROOT}")
    
    print("\nTesting nested key access:")
    print(f"  models.gnn.hidden_dim = {config.get('models.gnn.hidden_dim')}")
    print(f"  api.flask_port = {config.get('api.flask_port')}")
    print(f"  training.epochs = {config.get('training.epochs')}")
    
    print("\nEnvironment Variables:")
    print(f"  MONGODB_URI = {MONGODB_URI[:30]}...")
    print(f"  GEMINI_API_KEY = {'Set' if GEMINI_API_KEY else 'Not set'}")
    print(f"  OMDB_API_KEY = {'Set' if OMDB_API_KEY else 'Not set'}")
    
    print("\n✅ Configuration loaded successfully!")

