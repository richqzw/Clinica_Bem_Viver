
from app.db import conectar


class PacienteDAO:

    def cadastrar(self, p):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                INSERT INTO paciente (
                    nome,
                    cpf,
                    data_nascimento,
                    email,
                    telefone
                )
                VALUES (%s, %s, %s, %s, %s)
            ''', (
                p.nome,
                p.cpf,
                p.data_nascimento,
                p.email,
                p.telefone
            ))

            con.commit()
            return cur.lastrowid

        finally:
            cur.close()
            con.close()

    def listar_todos(self):
        con = conectar()
        cur = con.cursor(dictionary=True)

        try:
            cur.execute('''
                SELECT
                    id_paciente,
                    nome,
                    cpf,
                    data_nascimento,
                    email,
                    telefone
                FROM paciente
                ORDER BY nome
            ''')

            return cur.fetchall()

        finally:
            cur.close()
            con.close()

    def atualizar(self, ident, d):
        con = conectar()
        cur = con.cursor()

        try:
            cur.execute('''
                UPDATE paciente
                SET
                    nome = %s,
                    cpf = %s,
                    data_nascimento = %s,
                    email = %s,
                    telefone = %s
                WHERE id_paciente = %s
            ''', (
                d['nome'],
                d['cpf'],
                d['data_nascimento'],
                d['email'],
                d['telefone'],
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
            cur.execute(
                'DELETE FROM paciente WHERE id_paciente = %s',
                (ident,)
            )

            con.commit()
            return cur.rowcount

        finally:
            cur.close()
            con.close()
