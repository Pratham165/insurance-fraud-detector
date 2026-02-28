"""
Backend Configuration
=====================
Loads settings from environment variables with sensible defaults.
"""
import os
from dotenv import load_dotenv

# Load .env file from project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))


class Config:
    """Application configuration loaded from environment."""

    # Flask
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', '5000'))

    # CORS
    ALLOWED_ORIGINS = os.getenv(
        'ALLOWED_ORIGINS',
        'http://localhost:3000'
    ).split(',')

    # Model
    MODEL_DIR = os.getenv(
        'MODEL_DIR',
        os.path.join(PROJECT_ROOT, 'models')
    )
