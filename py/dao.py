import sqlite3
from contextlib import contextmanager
from threading import Lock

from flask import current_app

from pathlib import Path
from models import Especialidade


def preparar_banco(app):
    raiz = Path(__file__).resolve().parents[1]
    esquema = (raiz / "sql" / "clinica.sql").read_text(encoding="utf-8")

    banco = sqlite3.connect(":memory:", check_same_thread=False)
    banco.row_factory = sqlite3.Row
    banco.execute("PRAGMA foreign_keys = ON")

    try:
        with banco:
            banco.executescript(esquema)
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


class ConsultaDAO:
    def solicitar(self, consulta):
        with conectar() as banco:
            cursor = banco.execute("""
                INSERT INTO consulta (id_paciente, id_profissional, observacoes)
                VALUES (?, ?, ?)
            """, (consulta.id_paciente, consulta.id_profissional, consulta.observacoes))
            return cursor.lastrowid

    def listar_todas(self, status=None):
        with conectar() as banco:
            linhas = banco.execute("""
                SELECT c.id_consulta, c.id_paciente, c.id_profissional,
                       c.data_consulta, c.horario_consulta, c.status, c.observacoes,
                       p.nome AS paciente, p.telefone,
                       pr.nome AS profissional, e.nome AS especialidade
                FROM consulta c
                JOIN paciente p ON p.id_paciente = c.id_paciente
                JOIN profissional pr ON pr.id_profissional = c.id_profissional
                JOIN especialidade e ON e.id_especialidades = pr.id_especialidades
                WHERE (? IS NULL OR c.status = ?)
                ORDER BY c.id_consulta DESC
            """, (status, status))
            return [dict(linha) for linha in linhas]

    def listar_pendentes(self):
        return self.listar_todas("pendente")

    def agendar(self, ident, data, horario):
        with conectar() as banco:
            cursor = banco.execute("""
                UPDATE consulta
                SET data_consulta = ?, horario_consulta = ?, status = 'agendada'
                WHERE id_consulta = ? AND status = 'pendente'
            """, (data, horario, ident))
            return cursor.rowcount

    def atualizar(self, ident, consulta):
        with conectar() as banco:
            cursor = banco.execute("""
                UPDATE consulta
                SET id_paciente = ?, id_profissional = ?, data_consulta = ?,
                    horario_consulta = ?, status = ?, observacoes = ?
                WHERE id_consulta = ?
            """, (consulta.id_paciente, consulta.id_profissional, consulta.data_consulta,
                  consulta.horario_consulta, consulta.status, consulta.observacoes, ident))
            return cursor.rowcount

    def excluir(self, ident):
        with conectar() as banco:
            return banco.execute("DELETE FROM consulta WHERE id_consulta = ?", (ident,)).rowcount


class EspecialidadeDAO:
    def listar_todas(self):
        with conectar() as banco:
            linhas = banco.execute("""
                SELECT id_especialidades, nome, descricao
                FROM especialidade
                ORDER BY nome COLLATE NOCASE
            """)
            return [Especialidade(**dict(linha)) for linha in linhas]

    def cadastrar(self, especialidade):
        with conectar() as banco:
            cursor = banco.execute(
                "INSERT INTO especialidade (nome, descricao) VALUES (?, ?)",
                (especialidade.nome, especialidade.descricao),
            )
            return cursor.lastrowid

    def atualizar(self, ident, especialidade):
        with conectar() as banco:
            cursor = banco.execute(
                "UPDATE especialidade SET nome = ?, descricao = ? WHERE id_especialidades = ?",
                (especialidade.nome, especialidade.descricao, ident),
            )
            return cursor.rowcount

    def excluir(self, ident):
        with conectar() as banco:
            return banco.execute(
                "DELETE FROM especialidade WHERE id_especialidades = ?", (ident,)
            ).rowcount


class PacienteDAO:
    def cadastrar(self, paciente):
        with conectar() as banco:
            cursor = banco.execute("""
                INSERT INTO paciente (nome, cpf, data_nascimento, email, telefone)
                VALUES (?, ?, ?, ?, ?)
            """, (paciente.nome, paciente.cpf, paciente.data_nascimento, paciente.email, paciente.telefone))
            return cursor.lastrowid

    def listar_todos(self):
        with conectar() as banco:
            linhas = banco.execute("""
                SELECT id_paciente, nome, cpf, data_nascimento, email, telefone
                FROM paciente
                ORDER BY nome COLLATE NOCASE
            """)
            return [dict(linha) for linha in linhas]

    def atualizar(self, ident, paciente):
        with conectar() as banco:
            cursor = banco.execute("""
                UPDATE paciente
                SET nome = ?, cpf = ?, data_nascimento = ?, email = ?, telefone = ?
                WHERE id_paciente = ?
            """, (paciente.nome, paciente.cpf, paciente.data_nascimento,
                  paciente.email, paciente.telefone, ident))
            return cursor.rowcount

    def excluir(self, ident):
        with conectar() as banco:
            return banco.execute("DELETE FROM paciente WHERE id_paciente = ?", (ident,)).rowcount


class ProfissionalDAO:
    def listar_todos(self):
        return self._consultar()

    def buscar_por_id(self, ident):
        registros = self._consultar(ident)
        return registros[0] if registros else None

    def _consultar(self, ident=None):
        with conectar() as banco:
            linhas = banco.execute("""
                SELECT p.id_profissional, p.nome, p.crm, p.email, p.telefone,
                       p.minicurriculo, p.id_especialidades, e.nome AS especialidade
                FROM profissional p
                JOIN especialidade e ON e.id_especialidades = p.id_especialidades
                WHERE (? IS NULL OR p.id_profissional = ?)
                ORDER BY p.nome COLLATE NOCASE
            """, (ident, ident))
            return [dict(linha) for linha in linhas]

    def cadastrar(self, profissional):
        with conectar() as banco:
            cursor = banco.execute("""
                INSERT INTO profissional (nome, crm, email, telefone, minicurriculo, id_especialidades)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (profissional.nome, profissional.crm, profissional.email, profissional.telefone,
                  profissional.minicurriculo, profissional.id_especialidades))
            return cursor.lastrowid

    def atualizar(self, ident, profissional):
        with conectar() as banco:
            cursor = banco.execute("""
                UPDATE profissional
                SET nome = ?, crm = ?, email = ?, telefone = ?, minicurriculo = ?, id_especialidades = ?
                WHERE id_profissional = ?
            """, (profissional.nome, profissional.crm, profissional.email, profissional.telefone,
                  profissional.minicurriculo, profissional.id_especialidades, ident))
            return cursor.rowcount

    def excluir(self, ident):
        with conectar() as banco:
            return banco.execute("DELETE FROM profissional WHERE id_profissional = ?", (ident,)).rowcount
