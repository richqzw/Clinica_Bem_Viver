# Clínica Bem Viver

**Projeto Integrado de DWS, POO e Banco de Dados**

A clínica cadastra especialidades, médicos e pacientes, registra pedidos e define data e horário para cada consulta. [Abrir a demonstração no GitHub Pages](https://richqzw.github.io/Clinica_Bem_Viver_Completo/)

## Organização

| Caminho | Conteúdo |
|---|---|
| [index.html](index.html) | Painel, listas e formulários em HTML |
| [docs/static/](docs/static/) | CSS responsivo, código da interface e acesso aos dados |
| [docs/dados/clinica.json](docs/dados/clinica.json) | Exemplos fictícios para o Pages e para o Flask |
| [docs/modelagem/](docs/modelagem/) | Modelo conceitual, modelo lógico e diagrama de classes |
| [banco/clinica_bem_viver.sql](banco/clinica_bem_viver.sql) | Tabelas, chaves e restrições do SQLite |
| [py/](py/) | Modelos Python, classes DAO, rotas Flask e testes |

## Apresentação com Flask e SQLite

Com Python 3.12, execute os comandos na raiz do projeto.

~~~powershell
python -m pip install -r py/requirements.txt
python py/run.py
~~~

Abra [a Clínica Bem Viver local](http://127.0.0.1:5000/). A interface envia e recebe JSON via Fetch, e os DAOs leem e gravam no SQLite. O Flask monta o banco em memória com o SQL e os exemplos na inicialização. Os registros duram enquanto o servidor estiver aberto.

1. Cadastre um médico e um paciente ou escolha os exemplos das listas.
2. Em **Solicitar consulta**, escolha o paciente e o médico e envie o pedido.
3. Em **Pedidos pendentes**, escolha a data e o horário e clique em **Agendar**. A consulta sai da fila e aparece nas **Consultas registradas**.
4. Edite a consulta e confira a lista atualizada. A agenda bloqueia dois horários iguais para o mesmo médico ou paciente.
5. Para excluir um médico ou paciente, exclua primeiro as consultas vinculadas. Para remover uma especialidade, transfira ou exclua os médicos vinculados a ela.

O [endereço de status da API](http://127.0.0.1:5000/api/) devolve JSON.

| Recurso | Leitura | Cadastro e alterações |
|---|---|---|
| Especialidades | `GET /api/especialidades` | `POST` na coleção e `PUT` ou `DELETE` por ID |
| Médicos | `GET /api/profissionais` | `POST` na coleção e `PUT` ou `DELETE` por ID |
| Pacientes | `GET /api/pacientes` | `POST` na coleção e `PUT` ou `DELETE` por ID |
| Consultas | `GET /api/consultas` e `GET /api/consultas/pendentes` | `POST` na coleção, `PUT` ou `DELETE` por ID e `PATCH /api/consultas/<id>/agendar` |

## GitHub Pages

A demonstração online usa os dados de exemplo em JSON e salva as alterações no navegador. Cada navegador ou perfil tem seus próprios registros. Use dados fictícios.

O GitHub Actions roda os testes e publica o `index.html` da raiz com os arquivos de `docs/static` e `docs/dados` a cada envio para `main`.

## Testes

Com as dependências instaladas, rode os testes a partir da pasta `py`.

~~~powershell
Set-Location py
python -m unittest discover -s tests
~~~
