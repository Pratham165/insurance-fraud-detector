"""
WSGI Entry Point (Root Level)
=============================
This file sits at the root of the repository so Gunicorn can easily
find the `backend.app` module without any complex sys.path hacking.

On Render, the Start Command must be:
    gunicorn wsgi:app
"""
import sys
import os

# Add the backend directory to the Python path
# so that `import config` and `from app import ...` inside the backend work.
project_root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(project_root, 'backend')
sys.path.insert(0, backend_dir)

# Import the Flask application instance
from backend.app import app  # noqa: F401
