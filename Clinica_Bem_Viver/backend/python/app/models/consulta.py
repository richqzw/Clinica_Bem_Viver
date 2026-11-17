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
