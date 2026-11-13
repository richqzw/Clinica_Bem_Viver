from app.db import conectar
class ProfissionalDAO:
    def listar_todos(self):
        con = conectar(); cur = con.cursor(dictionary=True)
        try:
            cur.execute('''SELECT p.id_profissional,p.nome,p.crm,p.email,p.telefone,p.minicurriculo,
                           e.id_especialidades,e.nome AS especialidade
                           FROM profissional p JOIN especialidade e
                           ON e.id_especialidades=p.id_especialidades ORDER BY p.nome''')
            return cur.fetchall()
        finally:
            cur.close(); con.close()
    def buscar_por_id(self, ident):
        con = conectar(); cur = con.cursor(dictionary=True)
        try:
            cur.execute('''SELECT p.id_profissional,p.nome,p.crm,p.email,p.telefone,p.minicurriculo,
                           e.id_especialidades,e.nome AS especialidade
                           FROM profissional p JOIN especialidade e
                           ON e.id_especialidades=p.id_especialidades WHERE p.id_profissional=%s''',(ident,))
            return cur.fetchone()
        finally:
            cur.close(); con.close()
    def cadastrar(self, p):
        con = conectar(); cur = con.cursor()
        try:
            cur.execute('''INSERT INTO profissional(nome,crm,email,telefone,minicurriculo,id_especialidades)
                           VALUES(%s,%s,%s,%s,%s,%s)''',
                        (p.nome,p.crm,p.email,p.telefone,p.minicurriculo,p.id_especialidades))
            con.commit(); return cur.lastrowid
        finally:
            cur.close(); con.close()
