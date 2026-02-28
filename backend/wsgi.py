"""
WSGI Entry Point
================
Used by Gunicorn (production server) to start the Flask app.

Run locally with:
    gunicorn wsgi:app

On Render, set the Start Command to:
    gunicorn wsgi:app
"""
import os
import sys


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from app import app 
