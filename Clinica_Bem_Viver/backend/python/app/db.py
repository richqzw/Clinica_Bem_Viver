import json
import sqlite3
from contextlib import contextmanager
from threading import Lock

from flask import current_app

from config import Config


def preparar_banco(app):
    raiz = Config.RAIZ_PROJETO
    esquema = (raiz / "database" / "clinica_bem_viver.sql").read_text(encoding="utf-8")
    exemplos = json.loads((raiz / "frontend" / "dados" / "clinica.json").read_text(encoding="utf-8"))

    banco = sqlite3.connect(":memory:", check_same_thread=False)
    banco.row_factory = sqlite3.Row
    banco.execute("PRAGMA foreign_keys = ON")

    try:
        with banco:
            banco.executescript(esquema)
            banco.executemany("""
                INSERT INTO especialidade (id_especialidades, nome, descricao)
                VALUES (:id_especialidades, :nome, :descricao)
            """, exemplos["especialidades"])
            banco.executemany("""
                INSERT INTO profissional
                    (id_profissional, nome, crm, email, telefone, id_especialidades, minicurriculo)
                VALUES
                    (:id_profissional, :nome, :crm, :email, :telefone, :id_especialidades, :minicurriculo)
            """, exemplos["profissionais"])
            banco.executemany("""
                INSERT INTO paciente (id_paciente, nome, cpf, data_nascimento, email, telefone)
                VALUES (:id_paciente, :nome, :cpf, :data_nascimento, :email, :telefone)
            """, exemplos["pacientes"])
            banco.executemany("""
                INSERT INTO consulta
                    (id_consulta, id_paciente, id_profissional, status, data_consulta, horario_consulta, observacoes)
                VALUES
                    (:id_consulta, :id_paciente, :id_profissional, :status, :data_consulta, :horario_consulta, :observacoes)
            """, exemplos["consultas"])
    except Exception:
        banco.close()
        raise

    app.extensions["banco"] = (Lock(), banco)


@contextmanager
def conectar():
    trava, banco = current_app.extensions["banco"]
    # O banco em memória pertence à aplicação e é compartilhado entre as rotas.
    with trava, banco:
        yield banco
