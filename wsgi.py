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

project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Import the Flask application instance from backend/app/__init__.py
from backend.app import app  # noqa: F401
