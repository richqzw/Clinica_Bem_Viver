class Profissional:
    def __init__(self, nome, crm, email, telefone, minicurriculo, id_especialidades, id_profissional=None):
        self.id_profissional = id_profissional
        self.nome, self.crm, self.email = nome, crm, email
        self.telefone, self.minicurriculo = telefone, minicurriculo
        self.id_especialidades = id_especialidades
    def to_dict(self):
        return {"id_profissional": self.id_profissional, "nome": self.nome, "crm": self.crm,
                "email": self.email, "telefone": self.telefone, "minicurriculo": self.minicurriculo,
                "id_especialidades": self.id_especialidades}
