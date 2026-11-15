import mysql.connector
from mysql.connector.constants import ClientFlag

from config import Config


def conectar():
    if Config.DB_CONFIG is None:
        raise RuntimeError("Defina DB_HOST para conectar a um banco existente.")

    return mysql.connector.connect(
        **Config.DB_CONFIG,
        connection_timeout=5,
        client_flags=[ClientFlag.FOUND_ROWS],
    )
