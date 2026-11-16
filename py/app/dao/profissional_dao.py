from app.db import conectar


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
