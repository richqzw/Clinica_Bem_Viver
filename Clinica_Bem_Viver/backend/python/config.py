import os
from pathlib import Path


class Config:
    RAIZ_PROJETO = Path(__file__).resolve().parents[1]
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
