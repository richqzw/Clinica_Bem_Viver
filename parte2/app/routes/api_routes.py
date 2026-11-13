from flask import Blueprint, jsonify, request
from mysql.connector import Error, IntegrityError
from app.models.profissional import Profissional
from app.models.paciente import Paciente
from app.dao.profissional_dao import ProfissionalDAO
from app.dao.paciente_dao import PacienteDAO
from app.dao.especialidade_dao import EspecialidadeDAO
from app.dao.consulta_dao import ConsultaDAO
api = Blueprint("api", __name__)

@api.get("/")
def inicio():
    return jsonify({"mensagem":"API Clínica Bem Viver funcionando"})

@api.get("/especialidades")
def especialidades():
    try: return jsonify(EspecialidadeDAO().listar_todas()), 200
    except Error: return jsonify({"erro":"Falha ao consultar especialidades."}), 500

@api.post("/profissionais")
def cadastrar_profissional():
    d = request.get_json(silent=True) or {}
    campos = ["nome","crm","email","telefone","id_especialidades"]
    if any(not d.get(c) for c in campos):
        return jsonify({"erro":"Informe nome, CRM, e-mail, telefone e especialidade."}), 400
    try:
        p = Profissional(d["nome"].strip(),d["crm"].strip(),d["email"].strip().lower(),
                         d["telefone"].strip(),d.get("minicurriculo"),d["id_especialidades"])
        ident = ProfissionalDAO().cadastrar(p)
        return jsonify({"mensagem":"Profissional cadastrado.","id_profissional":ident}), 201
    except IntegrityError: return jsonify({"erro":"CRM/e-mail já cadastrado ou especialidade inexistente."}), 409
    except Error: return jsonify({"erro":"Erro ao cadastrar profissional."}), 500

@api.get("/profissionais")
def profissionais():
    try: return jsonify(ProfissionalDAO().listar_todos()), 200
    except Error: return jsonify({"erro":"Falha ao consultar profissionais."}), 500

@api.get("/profissionais/<int:ident>")
def profissional_por_id(ident):
    try:
        p = ProfissionalDAO().buscar_por_id(ident)
        return (jsonify(p),200) if p else (jsonify({"erro":"Profissional não encontrado."}),404)
    except Error: return jsonify({"erro":"Falha ao consultar profissional."}), 500

@api.post("/pacientes")
def cadastrar_paciente():
    d = request.get_json(silent=True) or {}
    campos = ["nome","cpf","data_nascimento","email","telefone"]
    if any(not d.get(c) for c in campos):
        return jsonify({"erro":"Preencha todos os dados do paciente."}), 400
    cpf = "".join(x for x in str(d["cpf"]) if x.isdigit())
    if len(cpf) != 11: return jsonify({"erro":"CPF deve conter 11 números."}), 400
    try:
        p = Paciente(d["nome"].strip(),cpf,d["data_nascimento"],d["email"].strip().lower(),d["telefone"].strip())
        ident = PacienteDAO().cadastrar(p)
        return jsonify({"mensagem":"Paciente cadastrado.","id_paciente":ident}), 201
    except IntegrityError: return jsonify({"erro":"CPF ou e-mail já cadastrado."}), 409
    except Error: return jsonify({"erro":"Erro ao cadastrar paciente. Confira a data."}), 400

@api.get("/pacientes")
def pacientes():
    try: return jsonify(PacienteDAO().listar_todos()), 200
    except Error: return jsonify({"erro":"Falha ao consultar pacientes."}), 500

@api.post("/consultas")
def solicitar_consulta():
    d = request.get_json(silent=True) or {}
    if not d.get("id_paciente") or not d.get("id_profissional"):
        return jsonify({"erro":"Informe o paciente e o profissional desejado."}), 400
    try:
        ident = ConsultaDAO().solicitar(d["id_paciente"],d["id_profissional"],d.get("observacoes"))
        return jsonify({"mensagem":"Pedido registrado como pendente.","id_consulta":ident,"status":"pendente"}), 201
    except IntegrityError: return jsonify({"erro":"Paciente ou profissional não encontrado."}), 404
    except Error: return jsonify({"erro":"Falha ao solicitar consulta."}), 500

@api.get("/consultas")
def consultas():
    try: return jsonify(ConsultaDAO().listar_todas()), 200
    except Error: return jsonify({"erro":"Falha ao consultar agendamentos."}), 500

@api.get("/consultas/pendentes")
def pendentes():
    try: return jsonify(ConsultaDAO().listar_pendentes()), 200
    except Error: return jsonify({"erro":"Falha ao consultar pedidos pendentes."}), 500

@api.patch("/consultas/<int:ident>/agendar")
def agendar(ident):
    d = request.get_json(silent=True) or {}
    if not d.get("data_consulta") or not d.get("horario_consulta"):
        return jsonify({"erro":"Informe data e horário."}), 400
    try:
        alteradas = ConsultaDAO().agendar(ident,d["data_consulta"],d["horario_consulta"])
        if not alteradas: return jsonify({"erro":"Pedido inexistente ou não está pendente."}), 404
        return jsonify({"mensagem":"Consulta agendada.","status":"agendada"}), 200
    except Error: return jsonify({"erro":"Falha ao agendar consulta."}), 500
