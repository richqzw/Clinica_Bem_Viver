# Clínica Bem Viver

**Projeto Integrado de DWS, POO e Banco de Dados**

Sistema de gestão de clínica para cadastrar especialidades, médicos e pacientes, receber pedidos e agendar consultas.

## Estrutura do projeto

```text
Clinica_Bem_Viver/
├── backend/
│   └── python/
│       ├── app/
│       │   ├── dao/          # Acesso ao banco de dados
│       │   ├── models/       # Classes do domínio (POO)
│       │   ├── routes/       # Rotas da API Flask
│       │   ├── db.py
│       │   └── validacao.py
│       ├── tests/            # Testes automatizados
│       ├── config.py
│       ├── requirements.txt
│       └── run.py
├── database/
│   └── clinica_bem_viver.sql
├── frontend/
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── dados/
│       └── clinica.json
├── docs/
│   └── modelagem/            # Diagramas e documentação da modelagem
├── .github/
│   └── workflows/
│       └── pages.yml
└── README.md
```

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript.
- **Back-end:** Python, Flask e Programação Orientada a Objetos.
- **Banco de dados:** SQLite.
- **Integração:** API REST com JSON e Fetch.

## Executar localmente

Requisitos: Python 3.12 ou superior.

No terminal, na pasta raiz do projeto:

```powershell
python -m pip install -r backend/python/requirements.txt
python backend/python/run.py
```

Abra no navegador: http://127.0.0.1:5000/

O Flask inicializa o banco SQLite em memória com o esquema SQL e os dados fictícios de `frontend/dados/clinica.json`. Os registros criados durante a execução ficam disponíveis enquanto o servidor estiver aberto.

## Fluxo principal

1. Cadastre ou selecione um médico e um paciente.
2. Em **Solicitar consulta**, envie um pedido.
3. Em **Pedidos pendentes**, escolha a data e o horário e clique em **Agendar**.
4. A consulta agendada aparece em **Consultas registradas**.
5. A agenda impede conflitos de horário para o mesmo médico ou paciente.

Use somente dados fictícios para demonstrações.

## API

A API fica disponível em `http://127.0.0.1:5000/api/`.

| Recurso | Operações |
|---|---|
| Especialidades | `GET`, `POST`, `PUT` e `DELETE` |
| Médicos (`/profissionais`) | `GET`, `POST`, `PUT` e `DELETE` |
| Pacientes | `GET`, `POST`, `PUT` e `DELETE` |
| Consultas | `GET`, `POST`, `PUT`, `DELETE` e `PATCH /consultas/<id>/agendar` |

## Testes

Com as dependências instaladas:

```powershell
Set-Location backend/python
python -m unittest discover -s tests
```

## GitHub Pages

O workflow em `.github/workflows/pages.yml` executa os testes e publica o front-end estático. No GitHub Pages, a demonstração utiliza os dados de exemplo e o armazenamento local do navegador; ela não executa o servidor Flask nem compartilha os cadastros entre visitantes.

Para executar o sistema integrado com Flask e SQLite, siga as instruções de **Executar localmente**.

## Entrega pelo GitHub

Mantenha o histórico de commits atualizado e adicione o professor como colaborador do repositório, conforme as instruções da atividade.
