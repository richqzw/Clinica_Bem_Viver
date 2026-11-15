const banco = (() => {
    const bancoNome = 'clinica-bem-viver-completo';
    const chave = 'clinica';
    const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const nomes = (a, b) => ordem.compare(a.nome, b.nome);

    const especialidades = [
        { id_especialidades: 1, nome: 'Clínica Geral', descricao: 'Atendimento médico geral e preventivo' },
        { id_especialidades: 2, nome: 'Cardiologia', descricao: 'Cuidados relacionados ao coração' },
        { id_especialidades: 3, nome: 'Dermatologia', descricao: 'Cuidados com a pele' },
        { id_especialidades: 4, nome: 'Fisioterapia', descricao: 'Reabilitação e prevenção de alterações do movimento' },
        { id_especialidades: 5, nome: 'Pediatria', descricao: 'Atendimento à saúde de crianças e adolescentes' }
    ];

    const iniciais = {
        profissionais: [
            {
                id_profissional: 1,
                nome: 'Marina Exemplo',
                crm: 'DEMO-001',
                email: 'marina@example.test',
                telefone: '(00) 00000-0001',
                id_especialidades: 1,
                minicurriculo: ''
            },
            {
                id_profissional: 2,
                nome: 'Paulo Exemplo',
                crm: 'DEMO-002',
                email: 'paulo@example.test',
                telefone: '(00) 00000-0002',
                id_especialidades: 2,
                minicurriculo: ''
            }
        ],
        pacientes: [
            {
                id_paciente: 1,
                nome: 'Ana Demonstração',
                cpf: '00000000001',
                data_nascimento: '1992-06-15',
                email: 'ana@example.test',
                telefone: '(00) 00000-0003'
            },
            {
                id_paciente: 2,
                nome: 'Lucas Demonstração',
                cpf: '00000000002',
                data_nascimento: '2001-09-21',
                email: 'lucas@example.test',
                telefone: '(00) 00000-0004'
            }
        ],
        consultas: [
            {
                id_consulta: 1,
                id_paciente: 1,
                id_profissional: 1,
                status: 'pendente',
                data_consulta: null,
                horario_consulta: null,
                observacoes: 'Pedido de exemplo para testar o agendamento.'
            }
        ],
        proximosIds: { profissionais: 3, pacientes: 3, consultas: 2 }
    };

    const entidades = {
        profissionais: { id: 'id_profissional', erro: 'Médico não encontrado.' },
        pacientes: { id: 'id_paciente', erro: 'Paciente não encontrado.' },
        consultas: { id: 'id_consulta', erro: 'Consulta não encontrada.' }
    };

    let conexao;

    function abrir() {
        conexao ??= new Promise((resolve, reject) => {
            const pedido = indexedDB.open(bancoNome, 1);
            pedido.onupgradeneeded = () => {
                pedido.result.createObjectStore('dados').add(iniciais, chave);
            };
            pedido.onsuccess = () => resolve(pedido.result);
            pedido.onerror = () => reject(new Error('O navegador não conseguiu abrir os dados.'));
        });
        return conexao;
    }

    async function acessar(modo, operacao) {
        const db = await abrir();
        return new Promise((resolve, reject) => {
            const transacao = db.transaction('dados', modo);
            const loja = transacao.objectStore('dados');
            const leitura = loja.get(chave);
            let resultado;

            transacao.oncomplete = () => resolve(resultado);
            transacao.onabort = () => reject(new Error('O navegador não conseguiu acessar os dados.'));

            leitura.onsuccess = () => {
                try {
                    const dados = leitura.result;
                    resultado = operacao(dados);
                    if (modo === 'readwrite') {
                        loja.put(dados, chave);
                    }
                } catch (erro) {
                    transacao.abort();
                    reject(erro);
                }
            };
        });
    }

    function buscar(dados, tipo, id) {
        const entidade = entidades[tipo];
        const registro = dados[tipo].find(item => item[entidade.id] === id);
        if (!registro) throw new Error(entidade.erro);
        return registro;
    }

    function salvar(dados, tipo, id, campos) {
        if (id === undefined) {
            dados[tipo].push({ ...campos, [entidades[tipo].id]: dados.proximosIds[tipo]++ });
            return;
        }
        Object.assign(buscar(dados, tipo, id), campos);
    }

    function texto(valor, campo, limite, obrigatorio = true) {
        const resultado = (valor ?? '').trim();
        if (obrigatorio && !resultado) throw new Error('Preencha o campo ' + campo + '.');
        if (resultado.length > limite) throw new Error('O campo ' + campo + ' aceita até ' + limite + ' caracteres.');
        return resultado;
    }

    function email(valor) {
        const resultado = texto(valor, 'e-mail', 150).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+$/.test(resultado)) throw new Error('Informe um e-mail válido.');
        return resultado;
    }

    function dataValida(data) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
        const dia = new Date(data + 'T00:00:00Z');
        return Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === data;
    }

    function horarioValido(horario) {
        return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(horario);
    }

    function salvarMedico(campos, id) {
        return acessar('readwrite', dados => {
            const medico = {
                nome: texto(campos.nome, 'nome', 150),
                crm: texto(campos.crm, 'CRM', 30),
                email: email(campos.email),
                telefone: texto(campos.telefone, 'telefone', 20),
                minicurriculo: texto(campos.minicurriculo, 'minicurrículo', 500, false),
                id_especialidades: Number(campos.id_especialidades)
            };

            if (!especialidades.some(e => e.id_especialidades === medico.id_especialidades)) {
                throw new Error('Selecione uma especialidade válida.');
            }
            if (dados.profissionais.some(p =>
                p.id_profissional !== id &&
                (ordem.compare(p.crm, medico.crm) === 0 || p.email === medico.email)
            )) {
                throw new Error('CRM ou e-mail já cadastrado.');
            }
            salvar(dados, 'profissionais', id, medico);
        });
    }

    function salvarPaciente(campos, id) {
        return acessar('readwrite', dados => {
            const paciente = {
                nome: texto(campos.nome, 'nome', 150),
                cpf: (campos.cpf ?? '').replace(/[.\s-]/g, ''),
                data_nascimento: campos.data_nascimento,
                email: email(campos.email),
                telefone: texto(campos.telefone, 'telefone', 20)
            };

            if (!/^\d{11}$/.test(paciente.cpf)) throw new Error('O CPF deve conter 11 números.');
            if (!dataValida(paciente.data_nascimento)) throw new Error('Informe uma data de nascimento válida.');
            if (dados.pacientes.some(p =>
                p.id_paciente !== id && (p.cpf === paciente.cpf || p.email === paciente.email)
            )) {
                throw new Error('CPF ou e-mail já cadastrado.');
            }
            salvar(dados, 'pacientes', id, paciente);
        });
    }

    function validarAgenda(data, horario) {
        if (!dataValida(data) || !horarioValido(horario)) {
            throw new Error('Informe uma data e um horário válidos.');
        }
    }

    function salvarConsulta(campos, id) {
        return acessar('readwrite', dados => {
            const consulta = {
                id_paciente: Number(campos.id_paciente),
                id_profissional: Number(campos.id_profissional),
                observacoes: texto(campos.observacoes, 'observações', 500, false),
                status: id === undefined ? 'pendente' : campos.status,
                data_consulta: campos.data_consulta || null,
                horario_consulta: campos.horario_consulta || null
            };
            buscar(dados, 'pacientes', consulta.id_paciente);
            buscar(dados, 'profissionais', consulta.id_profissional);

            if (!['pendente', 'agendada', 'cancelada', 'concluida'].includes(consulta.status)) {
                throw new Error('Status de consulta inválido.');
            }
            if (consulta.data_consulta || consulta.horario_consulta ||
                ['agendada', 'concluida'].includes(consulta.status)) {
                validarAgenda(consulta.data_consulta, consulta.horario_consulta);
            }

            salvar(dados, 'consultas', id, consulta);
        });
    }

    function agendar(id, data, horario) {
        return acessar('readwrite', dados => {
            const consulta = buscar(dados, 'consultas', id);
            if (consulta.status !== 'pendente') throw new Error('O pedido já saiu da fila de pendentes.');
            validarAgenda(data, horario);
            Object.assign(consulta, {
                data_consulta: data,
                horario_consulta: horario,
                status: 'agendada'
            });
        });
    }

    function excluir(tipo, id) {
        return acessar('readwrite', dados => {
            const registro = buscar(dados, tipo, id);
            if (tipo !== 'consultas' && dados.consultas.some(c => c[entidades[tipo].id] === id)) {
                throw new Error('Exclua as consultas vinculadas antes de remover o cadastro.');
            }
            dados[tipo].splice(dados[tipo].indexOf(registro), 1);
        });
    }

    function listar() {
        return acessar('readonly', dados => {
            const especialidadesPorId = new Map(especialidades.map(e => [e.id_especialidades, e.nome]));
            const doctors = dados.profissionais.map(p => ({
                ...p,
                especialidade: especialidadesPorId.get(p.id_especialidades)
            })).sort(nomes);
            const patients = dados.pacientes.sort(nomes);
            const medicosPorId = new Map(doctors.map(p => [p.id_profissional, p]));
            const pacientesPorId = new Map(patients.map(p => [p.id_paciente, p]));

            const appointments = dados.consultas.map(c => {
                const medico = medicosPorId.get(c.id_profissional);
                const paciente = pacientesPorId.get(c.id_paciente);
                return {
                    ...c,
                    profissional: medico.nome,
                    especialidade: medico.especialidade,
                    paciente: paciente.nome,
                    telefone: paciente.telefone
                };
            }).sort((a, b) => b.id_consulta - a.id_consulta);

            return {
                doctors,
                patients,
                appointments,
                pending: appointments.filter(c => c.status === 'pendente'),
                specialties: [...especialidades].sort(nomes)
            };
        });
    }

    return { listar, salvarMedico, salvarPaciente, salvarConsulta, agendar, excluir };
})();
