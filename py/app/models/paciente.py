class Paciente:
    def __init__(self, nome, cpf, data_nascimento, email, telefone, id_paciente=None):
        self.id_paciente = id_paciente
        self.nome, self.cpf, self.data_nascimento = nome, cpf, data_nascimento
        self.email, self.telefone = email, telefone
    def to_dict(self):
        return {"id_paciente": self.id_paciente, "nome": self.nome, "cpf": self.cpf,
                "data_nascimento": str(self.data_nascimento), "email": self.email, "telefone": self.telefone}
