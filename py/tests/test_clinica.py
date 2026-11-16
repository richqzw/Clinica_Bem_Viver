import unittest

from app import create_app


MEDICO = {
    "nome": "Médico de teste",
    "crm": "DEMO-003",
    "email": "medico@example.test",
    "telefone": "(00) 00000-0005",
    "id_especialidades": "2",
}
PACIENTE = {
    "nome": "Paciente de teste",
    "cpf": "000.000.000-03",
    "data_nascimento": "2003-07-04",
    "email": "paciente@example.test",
    "telefone": "(00) 00000-0006",
}
HORARIO = {"data_consulta": "2099-11-18", "horario_consulta": "10:30"}


class ClinicaTest(unittest.TestCase):
    def setUp(self):
        app = create_app()
        self.addCleanup(app.extensions["banco"][1].close)
        self.cliente = app.test_client()

    def solicitar(self, paciente, medico):
        resposta = self.cliente.post("/api/consultas", json={
            "id_paciente": paciente,
            "id_profissional": medico,
        })
        self.assertEqual(resposta.status_code, 201, resposta.json)
        return resposta.json["id_consulta"]

    def test_pagina_e_arquivos_publicados(self):
        resposta = self.cliente.get("/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn(b'data-origem="flask"', resposta.data)
        for recurso in (
            "/docs/static/css/estilo.css",
            "/docs/static/js/api.js",
            "/docs/static/js/clinica.js",
            "/docs/static/js/pages.js",
            "/docs/dados/clinica.json",
        ):
            with self.subTest(recurso=recurso), self.cliente.get(recurso) as arquivo:
                self.assertEqual(arquivo.status_code, 200)

    def test_especialidade_cadastro_edicao_e_vinculo(self):
        rota = "/api/especialidades"
        resposta = self.cliente.post(rota, json={"nome": "Oftalmologia"})
        self.assertEqual(resposta.status_code, 201)
        ident = resposta.json["id_especialidades"]
        self.assertEqual(self.cliente.put(f"{rota}/{ident}", json={"nome": "Oftalmologia clínica"}).status_code, 200)
        nomes = [registro["nome"] for registro in self.cliente.get(rota).json]
        self.assertIn("Oftalmologia clínica", nomes)
        self.assertEqual(self.cliente.delete(f"{rota}/1").status_code, 409)
        self.assertEqual(self.cliente.delete(f"{rota}/{ident}").status_code, 200)

    def test_editar_e_excluir_pacientes_e_profissionais(self):
        medico = self.cliente.post("/api/profissionais", json=MEDICO)
        paciente = self.cliente.post("/api/pacientes", json=PACIENTE)
        self.assertEqual((medico.status_code, paciente.status_code), (201, 201))

        rota_medico = f"/api/profissionais/{medico.json['id_profissional']}"
        rota_paciente = f"/api/pacientes/{paciente.json['id_paciente']}"
        self.assertEqual(self.cliente.put(rota_medico, json=MEDICO).status_code, 200)
        alterado = {**PACIENTE, "nome": "Paciente editado"}
        self.assertEqual(self.cliente.put(rota_paciente, json=alterado).status_code, 200)
        registros = self.cliente.get("/api/pacientes").json
        self.assertIn("Paciente editado", [registro["nome"] for registro in registros])
        self.assertEqual(self.cliente.delete(rota_medico).status_code, 200)
        self.assertEqual(self.cliente.delete(rota_paciente).status_code, 200)

    def test_validacao_de_json_campos_e_cpf_duplicado(self):
        self.assertEqual(self.cliente.post("/api/pacientes", json=[]).status_code, 400)
        self.assertEqual(self.cliente.post("/api/profissionais", json={**MEDICO, "nome": 12}).status_code, 400)
        self.assertEqual(self.cliente.post("/api/pacientes", json={**PACIENTE, "data_nascimento": "2025-02-29"}).status_code, 400)
        self.assertEqual(self.cliente.post("/api/pacientes", json=PACIENTE).status_code, 201)
        duplicado = {**PACIENTE, "email": "outra-pessoa@example.test"}
        self.assertEqual(self.cliente.post("/api/pacientes", json=duplicado).status_code, 409)

    def test_consultas_protegem_vinculos_e_horarios(self):
        mesmo_medico = self.solicitar(2, 1)
        mesmo_paciente = self.solicitar(1, 2)
        self.assertEqual(self.cliente.patch("/api/consultas/1/agendar", json=HORARIO).status_code, 200)

        for ident in (mesmo_medico, mesmo_paciente):
            resposta = self.cliente.patch(f"/api/consultas/{ident}/agendar", json=HORARIO)
            self.assertEqual(resposta.status_code, 409)
        alteracao = {**HORARIO, "status": "agendada", "id_paciente": 2, "id_profissional": 1}
        self.assertEqual(self.cliente.put(f"/api/consultas/{mesmo_medico}", json=alteracao).status_code, 409)

        pendentes = self.cliente.get("/api/consultas/pendentes").json
        self.assertEqual({consulta["id_consulta"] for consulta in pendentes}, {mesmo_medico, mesmo_paciente})
        self.assertEqual(self.cliente.delete("/api/pacientes/1").status_code, 409)
        self.assertEqual(self.cliente.delete("/api/consultas/1").status_code, 200)
        self.assertEqual(self.cliente.patch(f"/api/consultas/{mesmo_medico}/agendar", json=HORARIO).status_code, 200)
