import mysql.connector
from config import Config
def conectar():
    return mysql.connector.connect(**Config.DB_CONFIG)
