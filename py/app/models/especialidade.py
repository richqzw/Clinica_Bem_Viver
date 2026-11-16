from dataclasses import dataclass


@dataclass
class Especialidade:
    nome: str
    descricao: str | None = None
    id_especialidades: int | None = None
