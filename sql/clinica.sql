CREATE TABLE especialidade (
    id_especialidades INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT
);

CREATE TABLE profissional (
    id_profissional INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    crm TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    telefone TEXT NOT NULL,
    minicurriculo TEXT,
    id_especialidades INTEGER NOT NULL REFERENCES especialidade(id_especialidades)
);

CREATE TABLE paciente (
    id_paciente INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE CHECK (length(cpf) = 11 AND cpf NOT GLOB '*[^0-9]*'),
    data_nascimento TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    telefone TEXT NOT NULL
);

CREATE TABLE consulta (
    id_consulta INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT,
    horario_consulta TEXT,
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'agendada', 'cancelada', 'concluida')),
    observacoes TEXT,
    id_profissional INTEGER NOT NULL REFERENCES profissional(id_profissional),
    id_paciente INTEGER NOT NULL REFERENCES paciente(id_paciente),
    CHECK ((data_consulta IS NULL) = (horario_consulta IS NULL)),
    CHECK (status NOT IN ('agendada', 'concluida') OR data_consulta IS NOT NULL)
);

CREATE UNIQUE INDEX consulta_horario_profissional
    ON consulta (id_profissional, data_consulta, substr(horario_consulta, 1, 5))
    WHERE status = 'agendada';

CREATE UNIQUE INDEX consulta_horario_paciente
    ON consulta (id_paciente, data_consulta, substr(horario_consulta, 1, 5))
    WHERE status = 'agendada';

INSERT INTO especialidade (id_especialidades, nome, descricao) VALUES (1, 'Clínica Geral', 'Atendimento médico geral e preventivo');
INSERT INTO especialidade (id_especialidades, nome, descricao) VALUES (2, 'Cardiologia', 'Cuidados relacionados ao coração');
INSERT INTO especialidade (id_especialidades, nome, descricao) VALUES (3, 'Dermatologia', 'Cuidados com a pele');
INSERT INTO especialidade (id_especialidades, nome, descricao) VALUES (4, 'Fisioterapia', 'Reabilitação e prevenção de alterações do movimento');
INSERT INTO especialidade (id_especialidades, nome, descricao) VALUES (5, 'Pediatria', 'Atendimento à saúde de crianças e adolescentes');
INSERT INTO profissional (id_profissional, nome, crm, email, telefone, id_especialidades, minicurriculo) VALUES (1, 'Marina Exemplo', 'DEMO-001', 'marina@example.test', '(00) 00000-0001', 1, '');
INSERT INTO profissional (id_profissional, nome, crm, email, telefone, id_especialidades, minicurriculo) VALUES (2, 'Paulo Exemplo', 'DEMO-002', 'paulo@example.test', '(00) 00000-0002', 2, '');
INSERT INTO paciente (id_paciente, nome, cpf, data_nascimento, email, telefone) VALUES (1, 'Ana Demonstração', '00000000001', '1992-06-15', 'ana@example.test', '(00) 00000-0003');
INSERT INTO paciente (id_paciente, nome, cpf, data_nascimento, email, telefone) VALUES (2, 'Lucas Demonstração', '00000000002', '2001-09-21', 'lucas@example.test', '(00) 00000-0004');
INSERT INTO consulta (id_consulta, id_paciente, id_profissional, status, data_consulta, horario_consulta, observacoes) VALUES (1, 1, 1, 'pendente', NULL, NULL, 'Pedido de exemplo para testar o agendamento.');
