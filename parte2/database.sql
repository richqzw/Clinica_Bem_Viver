CREATE DATABASE IF NOT EXISTS clinica_bem_viver CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinica_bem_viver;

CREATE TABLE IF NOT EXISTS especialidade (
 id_especialidades INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(100) NOT NULL UNIQUE,
 descricao VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS profissional (
 id_profissional INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(150) NOT NULL,
 crm VARCHAR(30) NOT NULL UNIQUE,
 email VARCHAR(150) NOT NULL UNIQUE,
 telefone VARCHAR(20) NOT NULL,
 minicurriculo VARCHAR(500),
 id_especialidades INT NOT NULL,
 FOREIGN KEY (id_especialidades) REFERENCES especialidade(id_especialidades)
);
CREATE TABLE IF NOT EXISTS usuario (
 id_usuario INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(150) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 senha_hash VARCHAR(255) NOT NULL,
 perfil ENUM('medico','paciente','admin') NOT NULL
);
CREATE TABLE IF NOT EXISTS paciente (
 id_paciente INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(150) NOT NULL,
 cpf CHAR(11) NOT NULL UNIQUE,
 data_nascimento DATE NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 telefone VARCHAR(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS consulta (
 id_consulta INT AUTO_INCREMENT PRIMARY KEY,
 data_consulta DATE NULL,
 horario_consulta TIME NULL,
 status ENUM('pendente','agendada','cancelada','concluida') NOT NULL DEFAULT 'pendente',
 observacoes VARCHAR(500),
 id_profissional INT NOT NULL,
 id_paciente INT NOT NULL,
 FOREIGN KEY (id_profissional) REFERENCES profissional(id_profissional),
 FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
);
INSERT IGNORE INTO especialidade (nome, descricao) VALUES
('Clínica Geral','Atendimento médico geral e preventivo'),
('Cardiologia','Cuidados relacionados ao coração'),
('Dermatologia','Cuidados com a pele'),
('Fisioterapia','Reabilitação e prevenção de alterações do movimento'),
('Pediatria','Atendimento à saúde de crianças e adolescentes');
