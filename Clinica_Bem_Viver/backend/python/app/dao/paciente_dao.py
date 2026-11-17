from app.db import conectar


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
