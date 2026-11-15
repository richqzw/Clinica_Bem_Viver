import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


def configuracao_banco():
    host = os.getenv("DB_HOST", "").strip()
    if not host:
        return None

    return {
        "host": host,
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", ""),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "clinica_bem_viver"),
    }


class Config:
    DB_CONFIG = configuracao_banco()
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
