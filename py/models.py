from dataclasses import dataclass


@dataclass
class Especialidade:
    nome: str
    descricao: str | None = None
    id_especialidades: int | None = None

class Paciente:
    def __init__(self, nome, cpf, data_nascimento, email, telefone, id_paciente=None):
        self.id_paciente = id_paciente
        self.nome, self.cpf, self.data_nascimento = nome, cpf, data_nascimento
        self.email, self.telefone = email, telefone
    def to_dict(self):
        return {"id_paciente": self.id_paciente, "nome": self.nome, "cpf": self.cpf,
                "data_nascimento": str(self.data_nascimento), "email": self.email, "telefone": self.telefone}

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

class Consulta:
    def __init__(self, id_paciente, id_profissional, data_consulta=None,
                 horario_consulta=None, status="pendente", observacoes=None,
                 id_consulta=None):
        self.id_consulta = id_consulta
        self.id_paciente = id_paciente
        self.id_profissional = id_profissional
        self.data_consulta = data_consulta
        self.horario_consulta = horario_consulta
        self.status = status
        self.observacoes = observacoes
