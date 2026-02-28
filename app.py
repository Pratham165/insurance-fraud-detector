"""
Fallback Entry Point
====================
If Render or another platform defaults to `gunicorn app:app`,
this file will intercept the call and route it to the backend app.
"""
import sys
import os

project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.app import app  # noqa: F401
