"""
Flask Application Factory
"""
import logging
from flask import Flask
from flask_cors import CORS
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)
app.config.from_object(Config)

# CORS — restrict to known origins
CORS(app, resources={
    r"/api/*": {
        "origins": Config.ALLOWED_ORIGINS
    }
})

from . import routes
