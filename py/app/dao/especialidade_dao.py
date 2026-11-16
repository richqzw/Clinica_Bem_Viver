from app.db import conectar
from app.models.especialidade import Especialidade


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
