from flask import Flask

from config import Config
from app.db import preparar_banco
from app.routes.api_routes import api


def create_app():
    raiz = Config.RAIZ_PROJETO
    app = Flask(__name__, static_folder=str(raiz / "docs"), static_url_path="/docs")
    preparar_banco(app)
    app.register_blueprint(api, url_prefix="/api")

    @app.get("/")
    @app.get("/index.html")
    def home():
        pagina = (raiz / "index.html").read_text(encoding="utf-8")
        return pagina.replace('data-origem="navegador"', 'data-origem="flask"', 1)

    return app
