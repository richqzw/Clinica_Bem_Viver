import re
from datetime import date, time

from werkzeug.exceptions import BadRequest

from app.models.consulta import Consulta
from app.models.especialidade import Especialidade
from app.models.paciente import Paciente
from app.models.profissional import Profissional


def texto(dados, chave, rotulo, limite, obrigatorio=True):
    valor = dados.get(chave)
    if valor is None and not obrigatorio:
        return ""
    if not isinstance(valor, str) or (obrigatorio and not valor.strip()):
        raise BadRequest(f"Preencha o campo {rotulo}.")
    valor = valor.strip()
    if len(valor) > limite:
        raise BadRequest(f"O campo {rotulo} aceita até {limite} caracteres.")
    return valor


def email(dados):
    valor = texto(dados, "email", "e-mail", 150).lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+", valor):
        raise BadRequest("Informe um e-mail válido.")
    return valor


def identificador(dados, chave, rotulo):
    valor = dados.get(chave)
    if isinstance(valor, str) and re.fullmatch(r"[0-9]{1,19}", valor):
        valor = int(valor)
    if type(valor) is not int or not 0 < valor < 2**63:
        raise BadRequest(f"Selecione {rotulo}.")
    return valor


def data_validada(valor, mensagem):
    if isinstance(valor, str):
        try:
            convertida = date.fromisoformat(valor)
            if convertida.isoformat() == valor:
                return valor
        except ValueError:
            pass
    raise BadRequest(mensagem)


def agenda(dados):
    mensagem = "Informe uma data e um horário válidos."
    data = data_validada(dados.get("data_consulta"), mensagem)
    horario = dados.get("horario_consulta")
    if not isinstance(horario, str) or not re.fullmatch(r"[0-9]{2}:[0-9]{2}(:[0-9]{2})?", horario):
        raise BadRequest(mensagem)
    try:
        time.fromisoformat(horario)
    except ValueError as erro:
        raise BadRequest(mensagem) from erro
    return data, horario


def especialidade(dados):
    return Especialidade(
        nome=texto(dados, "nome", "nome", 100),
        descricao=texto(dados, "descricao", "descrição", 255, obrigatorio=False),
    )


def profissional(dados):
    return Profissional(
        texto(dados, "nome", "nome", 150),
        texto(dados, "crm", "CRM", 30),
        email(dados),
        texto(dados, "telefone", "telefone", 20),
        texto(dados, "minicurriculo", "minicurrículo", 500, obrigatorio=False),
        identificador(dados, "id_especialidades", "uma especialidade"),
    )


def paciente(dados):
    cpf = re.sub(r"[.\s-]", "", texto(dados, "cpf", "CPF", 14))
    if not re.fullmatch(r"[0-9]{11}", cpf):
        raise BadRequest("O CPF deve conter 11 números.")
    return Paciente(
        texto(dados, "nome", "nome", 150),
        cpf,
        data_validada(dados.get("data_nascimento"), "Informe uma data de nascimento válida."),
        email(dados),
        texto(dados, "telefone", "telefone", 20),
    )


def consulta(dados, editar=False):
    registro = Consulta(
        identificador(dados, "id_paciente", "um paciente"),
        identificador(dados, "id_profissional", "um médico"),
        observacoes=texto(dados, "observacoes", "observações", 500, obrigatorio=False),
    )
    if editar:
        registro.status = dados.get("status")
        if registro.status not in ("pendente", "agendada", "cancelada", "concluida"):
            raise BadRequest("Status de consulta inválido.")
        if dados.get("data_consulta") or dados.get("horario_consulta") or registro.status in ("agendada", "concluida"):
            registro.data_consulta, registro.horario_consulta = agenda(dados)
    return registro
