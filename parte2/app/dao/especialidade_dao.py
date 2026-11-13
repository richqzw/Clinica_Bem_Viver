from app.db import conectar
class EspecialidadeDAO:
    def listar_todas(self):
        con = conectar(); cur = con.cursor(dictionary=True)
        try:
            cur.execute("SELECT id_especialidades, nome, descricao FROM especialidade ORDER BY nome")
            return cur.fetchall()
        finally:
            cur.close(); con.close()
