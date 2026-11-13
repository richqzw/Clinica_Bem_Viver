from pathlib import Path
from flask import Flask, send_from_directory
from flask_cors import CORS
from app.routes.api_routes import api

def create_app():
    frontend = Path(__file__).resolve().parents[2] / "parte3"
    app = Flask(__name__, static_folder=str(frontend), static_url_path="")
    CORS(app)
    app.register_blueprint(api, url_prefix="/api")
    @app.get("/")
    def home():
        return send_from_directory(frontend, "index.html")
    return app
