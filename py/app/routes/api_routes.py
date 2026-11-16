from datetime import date
from sqlite3 import DatabaseError, IntegrityError

from flask import Blueprint, current_app, jsonify, request
from werkzeug.exceptions import BadRequest

from app import validacao
from app.dao.consulta_dao import ConsultaDAO
from app.dao.especialidade_dao import EspecialidadeDAO
from app.dao.paciente_dao import PacienteDAO
from app.dao.profissional_dao import ProfissionalDAO

api = Blueprint("api", __name__)


def erro(mensagem, status):
    return jsonify(erro=mensagem), status


def corpo_json():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        raise BadRequest("Envie os dados em um objeto JSON.")
    return dados


def resposta_alteracao(total, sucesso, ausente):
    if not total:
        return erro(ausente, 404)
    return jsonify(mensagem=sucesso)


def conflito_profissional(falha):
    if falha.sqlite_errorname == "SQLITE_CONSTRAINT_FOREIGNKEY":
        return erro("Especialidade não encontrada.", 404)
    return erro("CRM ou e-mail já cadastrado.", 409)


def conflito_consulta(falha):
    if falha.sqlite_errorname == "SQLITE_CONSTRAINT_FOREIGNKEY":
        return erro("Paciente ou profissional não encontrado.", 404)
    return erro("O médico ou paciente já tem consulta agendada nesse horário.", 409)


@api.errorhandler(BadRequest)
def dados_invalidos(falha):
    return erro(falha.description, 400)


@api.errorhandler(DatabaseError)
def falha_banco(falha):
    current_app.logger.error("Falha ao acessar o banco da clínica.", exc_info=falha)
    return erro("Falha ao acessar os dados da clínica.", 500)


@api.get("/")
def inicio():
    return jsonify(mensagem="API Clínica Bem Viver funcionando")


@api.get("/especialidades")
def especialidades():
    return jsonify(EspecialidadeDAO().listar_todas())


@api.post("/especialidades")
def cadastrar_especialidade():
    registro = validacao.especialidade(corpo_json())
    try:
        ident = EspecialidadeDAO().cadastrar(registro)
    except IntegrityError:
        return erro("Especialidade já cadastrada.", 409)
    return jsonify(mensagem="Especialidade cadastrada.", id_especialidades=ident), 201


@api.put("/especialidades/<int:ident>")
def atualizar_especialidade(ident):
    registro = validacao.especialidade(corpo_json())
    try:
        total = EspecialidadeDAO().atualizar(ident, registro)
    except IntegrityError:
        return erro("Especialidade já cadastrada.", 409)
    return resposta_alteracao(total, "Especialidade atualizada.", "Especialidade não encontrada.")


@api.delete("/especialidades/<int:ident>")
def excluir_especialidade(ident):
    try:
        total = EspecialidadeDAO().excluir(ident)
    except IntegrityError:
        return erro("Alterar ou excluir os médicos vinculados libera esta especialidade.", 409)
    return resposta_alteracao(total, "Especialidade excluída.", "Especialidade não encontrada.")


@api.get("/profissionais")
def profissionais():
    return jsonify(ProfissionalDAO().listar_todos())


@api.get("/profissionais/<int:ident>")
def profissional_por_id(ident):
    registro = ProfissionalDAO().buscar_por_id(ident)
    if registro is None:
        return erro("Médico não encontrado.", 404)
    return jsonify(registro)


@api.post("/profissionais")
def cadastrar_profissional():
    profissional = validacao.profissional(corpo_json())
    try:
        ident = ProfissionalDAO().cadastrar(profissional)
    except IntegrityError as falha:
        return conflito_profissional(falha)
    return jsonify(mensagem="Profissional cadastrado.", id_profissional=ident), 201


@api.put("/profissionais/<int:ident>")
def atualizar_profissional(ident):
    profissional = validacao.profissional(corpo_json())
    try:
        total = ProfissionalDAO().atualizar(ident, profissional)
    except IntegrityError as falha:
        return conflito_profissional(falha)
    return resposta_alteracao(total, "Médico atualizado.", "Médico não encontrado.")


@api.delete("/profissionais/<int:ident>")
def excluir_profissional(ident):
    try:
        total = ProfissionalDAO().excluir(ident)
    except IntegrityError:
        return erro("Exclua as consultas vinculadas antes de remover o cadastro.", 409)
    return resposta_alteracao(total, "Médico excluído.", "Médico não encontrado.")


@api.get("/pacientes")
def pacientes():
    return jsonify(PacienteDAO().listar_todos())


@api.post("/pacientes")
def cadastrar_paciente():
    paciente = validacao.paciente(corpo_json())
    try:
        ident = PacienteDAO().cadastrar(paciente)
    except IntegrityError:
        return erro("CPF ou e-mail já cadastrado.", 409)
    return jsonify(mensagem="Paciente cadastrado.", id_paciente=ident), 201


@api.put("/pacientes/<int:ident>")
def atualizar_paciente(ident):
    paciente = validacao.paciente(corpo_json())
    try:
        total = PacienteDAO().atualizar(ident, paciente)
    except IntegrityError:
        return erro("CPF ou e-mail já cadastrado.", 409)
    return resposta_alteracao(total, "Paciente atualizado.", "Paciente não encontrado.")


@api.delete("/pacientes/<int:ident>")
def excluir_paciente(ident):
    try:
        total = PacienteDAO().excluir(ident)
    except IntegrityError:
        return erro("Exclua as consultas vinculadas antes de remover o cadastro.", 409)
    return resposta_alteracao(total, "Paciente excluído.", "Paciente não encontrado.")


@api.get("/consultas")
def consultas():
    return jsonify(ConsultaDAO().listar_todas())


@api.get("/consultas/pendentes")
def pendentes():
    return jsonify(ConsultaDAO().listar_pendentes())


@api.post("/consultas")
def solicitar_consulta():
    consulta = validacao.consulta(corpo_json())
    try:
        ident = ConsultaDAO().solicitar(consulta)
    except IntegrityError as falha:
        return conflito_consulta(falha)
    return jsonify(mensagem="Pedido registrado como pendente.", id_consulta=ident, status="pendente"), 201


@api.patch("/consultas/<int:ident>/agendar")
def agendar(ident):
    data, horario = validacao.agenda(corpo_json())
    if data < date.today().isoformat():
        return erro("Escolha uma data a partir de hoje.", 400)
    try:
        total = ConsultaDAO().agendar(ident, data, horario)
    except IntegrityError as falha:
        return conflito_consulta(falha)
    if not total:
        return erro("Pedido inexistente ou já fora da fila de pendentes.", 404)
    return jsonify(mensagem="Consulta agendada.", status="agendada")


@api.put("/consultas/<int:ident>")
def atualizar_consulta(ident):
    consulta = validacao.consulta(corpo_json(), editar=True)
    try:
        total = ConsultaDAO().atualizar(ident, consulta)
    except IntegrityError as falha:
        return conflito_consulta(falha)
    return resposta_alteracao(total, "Consulta atualizada.", "Consulta não encontrada.")


@api.delete("/consultas/<int:ident>")
def excluir_consulta(ident):
    total = ConsultaDAO().excluir(ident)
    return resposta_alteracao(total, "Consulta excluída.", "Consulta não encontrada.")
