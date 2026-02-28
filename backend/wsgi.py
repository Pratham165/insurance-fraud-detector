"""
WSGI Entry Point
================
Used by Gunicorn (production server) to start the Flask app.

Run locally with:
    gunicorn --chdir backend wsgi:app

On Render, set the Start Command to:
    gunicorn --chdir backend wsgi:app
"""
import os
import sys

# backend/ directory — so `from app import app` works
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
# project root — so `from ml.preprocessing import ...` works
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, PROJECT_ROOT)

from app import app  # noqa: F401, E402
