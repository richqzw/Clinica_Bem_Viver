
from app.db import conectar


class ConsultaDAO:

    def solicitar(self, id_paciente, id_profissional, observacoes=None):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                INSERT INTO consulta (
                    id_paciente,
                    id_profissional,
                    status,
                    observacoes
                )
                VALUES (%s, %s, 'pendente', %s)
            ''', (id_paciente, id_profissional, observacoes))

            con.commit()
            return cur.lastrowid

        finally:
            cur.close()
            con.close()

    def listar_pendentes(self):
        con = conectar()
        cur = con.cursor(dictionary=True)

        try:
            cur.execute('''
                SELECT
                    c.id_consulta,
                    c.status,
                    c.observacoes,
                    p.id_paciente,
                    p.nome AS paciente,
                    p.telefone,
                    pr.id_profissional,
                    pr.nome AS profissional,
                    e.nome AS especialidade
                FROM consulta c
                JOIN paciente p
                    ON p.id_paciente = c.id_paciente
                JOIN profissional pr
                    ON pr.id_profissional = c.id_profissional
                JOIN especialidade e
                    ON e.id_especialidades = pr.id_especialidades
                WHERE c.status = 'pendente'
                ORDER BY c.id_consulta DESC
            ''')

            return cur.fetchall()

        finally:
            cur.close()
            con.close()

    def listar_todas(self):
        con = conectar()
        cur = con.cursor(dictionary=True)

        try:
            cur.execute('''
                SELECT
                    c.id_consulta,
                    c.id_paciente,
                    c.id_profissional,
                    CAST(c.data_consulta AS CHAR) AS data_consulta,
                    CAST(c.horario_consulta AS CHAR) AS horario_consulta,
                    c.status,
                    c.observacoes,
                    p.nome AS paciente,
                    pr.nome AS profissional,
                    e.nome AS especialidade
                FROM consulta c
                JOIN paciente p
                    ON p.id_paciente = c.id_paciente
                JOIN profissional pr
                    ON pr.id_profissional = c.id_profissional
                JOIN especialidade e
                    ON e.id_especialidades = pr.id_especialidades
                ORDER BY c.id_consulta DESC
            ''')

            return cur.fetchall()

        finally:
            cur.close()
            con.close()

    def agendar(self, ident, data, horario):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                UPDATE consulta
                SET
                    data_consulta = %s,
                    horario_consulta = %s,
                    status = 'agendada'
                WHERE id_consulta = %s
                  AND status = 'pendente'
            ''', (data, horario, ident))

            con.commit()
            return cur.rowcount

        finally:
            cur.close()
            con.close()

    def atualizar(self, ident, d):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                UPDATE consulta
                SET
                    id_paciente = %s,
                    id_profissional = %s,
                    data_consulta = %s,
                    horario_consulta = %s,
                    status = %s,
                    observacoes = %s
                WHERE id_consulta = %s
            ''', (
                d['id_paciente'],
                d['id_profissional'],
                d.get('data_consulta') or None,
                d.get('horario_consulta') or None,
                d['status'],
                d.get('observacoes'),
                ident
            ))

            con.commit()
            return cur.rowcount

        finally:
            cur.close()
            con.close()

    def excluir(self, ident):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                DELETE FROM consulta
                WHERE id_consulta = %s
            ''', (ident,))

            con.commit()
            return cur.rowcount

        finally:
            cur.close()
            con.close()
