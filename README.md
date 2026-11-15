# Clínica Bem Viver

Projeto acadêmico de gestão de uma clínica com cadastro de médicos e pacientes, especialidades e agendamento de consultas. O site roda no GitHub Pages e já abre com exemplos fictícios.

## Como testar

1. Cadastre um médico e um paciente ou use os exemplos que aparecem nas listas.
2. Em **Solicitar consulta**, escolha o paciente e o médico e envie o pedido.
3. Em **Pedidos pendentes**, selecione a data e o horário e clique em **Agendar**.
4. Confira a consulta nas **Consultas registradas**. As listas permitem editar e excluir registros. Para excluir um médico ou paciente, exclua primeiro as consultas vinculadas.

Os cadastros ficam salvos no IndexedDB do navegador em que foram feitos. Cada navegador ou perfil tem seus próprios registros. Limpar os dados do site retorna a demonstração aos exemplos iniciais. Use apenas dados fictícios.

## Arquivos Python

A pasta [parte2](parte2/) contém os modelos, as rotas e as classes de acesso a dados do trabalho. Para abrir a interface pelo Flask, execute os comandos na raiz do projeto.

~~~powershell
python -m pip install -r parte2/requirements.txt
python parte2/run.py
~~~

A prévia abre em [localhost:5000](http://127.0.0.1:5000/) e salva os cadastros no navegador. As rotas da API são carregadas quando `DB_HOST` aponta para um banco já existente. `DB_USER`, `DB_PASSWORD`, `DB_PORT` e `DB_NAME` configuram essa conexão.

## Publicação

Em **Settings → Pages**, selecione **GitHub Actions** como fonte. A publicação roda ao enviar alterações para a branch `main` e hospeda os arquivos de `parte3`. O endereço fica na página de configurações do Pages.

A [pasta de modelagem](parte1/) reúne os diagramas conceitual e lógico do trabalho.
