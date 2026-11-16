# Modelagem da Clínica Bem Viver

## Modelo conceitual

- Uma especialidade classifica zero ou mais profissionais. Cada profissional tem uma especialidade.
- Um profissional atende zero ou mais consultas. Cada consulta tem um profissional.
- Um paciente solicita zero ou mais consultas. Cada consulta pertence a um paciente.

## Modelo lógico

~~~mermaid
erDiagram
    ESPECIALIDADE ||--o{ PROFISSIONAL : classifica
    PROFISSIONAL ||--o{ CONSULTA : atende
    PACIENTE ||--o{ CONSULTA : solicita

    ESPECIALIDADE {
        INTEGER id_especialidades PK
        TEXT nome UK
        TEXT descricao
    }
    PROFISSIONAL {
        INTEGER id_profissional PK
        TEXT nome
        TEXT crm UK
        TEXT email UK
        TEXT telefone
        TEXT minicurriculo
        INTEGER id_especialidades FK
    }
    PACIENTE {
        INTEGER id_paciente PK
        TEXT nome
        TEXT cpf UK
        TEXT data_nascimento
        TEXT email UK
        TEXT telefone
    }
    CONSULTA {
        INTEGER id_consulta PK
        TEXT data_consulta
        TEXT horario_consulta
        TEXT status
        TEXT observacoes
        INTEGER id_profissional FK
        INTEGER id_paciente FK
    }
~~~

As datas usam `AAAA-MM-DD`. Uma consulta nasce pendente e recebe data e horário ao ser agendada. O [esquema SQL](../../banco/clinica_bem_viver.sql) protege os vínculos e evita conflitos na agenda.

## Diagrama de classes UML

~~~mermaid
classDiagram
    class Especialidade {
        +int id_especialidades
        +str nome
        +str descricao
    }
    class Profissional {
        +int id_profissional
        +str nome
        +str crm
        +str email
        +str telefone
        +str minicurriculo
        +int id_especialidades
        +to_dict()
    }
    class Paciente {
        +int id_paciente
        +str nome
        +str cpf
        +str data_nascimento
        +str email
        +str telefone
        +to_dict()
    }
    class Consulta {
        +int id_consulta
        +int id_paciente
        +int id_profissional
        +str data_consulta
        +str horario_consulta
        +str status
        +str observacoes
    }

    Especialidade "1" -- "0..*" Profissional : classifica
    Profissional "1" -- "0..*" Consulta : atende
    Paciente "1" -- "0..*" Consulta : solicita
~~~

Em [py/app/models](../../py/app/models/) ficam as classes. As rotas validam os dados e chamam os [DAOs](../../py/app/dao/) para ler ou gravar no banco.

Os [diagramas originais](originais/) registram o desenho inicial, incluindo a entidade isolada Usuário. A modelagem acima corresponde aos recursos implementados.
