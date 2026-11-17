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
