"""
Application Entry Point
=======================
Starts the Flask development server.

Usage (from project root):
    cd backend
    python run.py

For production:
    gunicorn -w 4 -b 0.0.0.0:5000 app:app
"""
import os
import sys

# Add project root to Python path (parent of backend/)
# This allows importing from the `ml` package
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from app import app
from config import Config

if __name__ == '__main__':
    print(f"Starting FraudGuard AI API on http://{Config.HOST}:{Config.PORT}")
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
