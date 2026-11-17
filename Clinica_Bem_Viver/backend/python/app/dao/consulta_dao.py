from app.db import conectar


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
