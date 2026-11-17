import os
import re
from datetime import date, time
from pathlib import Path
from sqlite3 import DatabaseError, IntegrityError

from flask import Blueprint, Flask, current_app, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest

from dao import ConsultaDAO, EspecialidadeDAO, PacienteDAO, ProfissionalDAO, preparar_banco
from models import Consulta, Especialidade, Paciente, Profissional

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
def validar_agenda(dados):
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
def validar_especialidade(dados):
    return Especialidade(
        nome=texto(dados, "nome", "nome", 100),
        descricao=texto(dados, "descricao", "descrição", 255, obrigatorio=False),
    )
def validar_profissional(dados):
    return Profissional(
        texto(dados, "nome", "nome", 150),
        texto(dados, "crm", "CRM", 30),
        email(dados),
        texto(dados, "telefone", "telefone", 20),
        texto(dados, "minicurriculo", "minicurrículo", 500, obrigatorio=False),
        identificador(dados, "id_especialidades", "uma especialidade"),
    )
def validar_paciente(dados):
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
def validar_consulta(dados, editar=False):
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
            registro.data_consulta, registro.horario_consulta = validar_agenda(dados)
    return registro
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
    registro = validar_especialidade(corpo_json())
    try:
        ident = EspecialidadeDAO().cadastrar(registro)
    except IntegrityError:
        return erro("Especialidade já cadastrada.", 409)
    return jsonify(mensagem="Especialidade cadastrada.", id_especialidades=ident), 201
@api.put("/especialidades/<int:ident>")
def atualizar_especialidade(ident):
    registro = validar_especialidade(corpo_json())
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
    profissional = validar_profissional(corpo_json())
    try:
        ident = ProfissionalDAO().cadastrar(profissional)
    except IntegrityError as falha:
        return conflito_profissional(falha)
    return jsonify(mensagem="Profissional cadastrado.", id_profissional=ident), 201
@api.put("/profissionais/<int:ident>")
def atualizar_profissional(ident):
    profissional = validar_profissional(corpo_json())
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
    paciente = validar_paciente(corpo_json())
    try:
        ident = PacienteDAO().cadastrar(paciente)
    except IntegrityError:
        return erro("CPF ou e-mail já cadastrado.", 409)
    return jsonify(mensagem="Paciente cadastrado.", id_paciente=ident), 201
@api.put("/pacientes/<int:ident>")
def atualizar_paciente(ident):
    paciente = validar_paciente(corpo_json())
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
    consulta = validar_consulta(corpo_json())
    try:
        ident = ConsultaDAO().solicitar(consulta)
    except IntegrityError as falha:
        return conflito_consulta(falha)
    return jsonify(mensagem="Pedido registrado como pendente.", id_consulta=ident, status="pendente"), 201
@api.patch("/consultas/<int:ident>/agendar")
def agendar(ident):
    data, horario = validar_agenda(corpo_json())
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
    consulta = validar_consulta(corpo_json(), editar=True)
    try:
        total = ConsultaDAO().atualizar(ident, consulta)
    except IntegrityError as falha:
        return conflito_consulta(falha)
    return resposta_alteracao(total, "Consulta atualizada.", "Consulta não encontrada.")
@api.delete("/consultas/<int:ident>")
def excluir_consulta(ident):
    total = ConsultaDAO().excluir(ident)
    return resposta_alteracao(total, "Consulta excluída.", "Consulta não encontrada.")
def create_app():
    raiz = Path(__file__).resolve().parents[1]
    app = Flask(__name__, static_folder=None)
    preparar_banco(app)
    app.register_blueprint(api, url_prefix="/api")
    @app.get("/")
    @app.get("/index.html")
    def home():
        pagina = (raiz / "index.html").read_text(encoding="utf-8")
        return pagina.replace('data-origem="navegador"', 'data-origem="flask"', 1)
    @app.get("/css/<path:arquivo>")
    def css(arquivo):
        return send_from_directory(raiz / "css", arquivo)
    @app.get("/js/<path:arquivo>")
    def javascript(arquivo):
        return send_from_directory(raiz / "js", arquivo)
    return app
if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=int(os.getenv("FLASK_PORT", "5000")))
