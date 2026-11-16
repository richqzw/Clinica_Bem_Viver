const banco = (() => {
    const bancoNome = 'clinica-bem-viver-completo';
    const chave = 'clinica';
    const ordem = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const nomes = (a, b) => ordem.compare(a.nome, b.nome);

    const entidades = {
        especialidades: { id: 'id_especialidades', erro: 'Especialidade não encontrada.' },
        profissionais: { id: 'id_profissional', erro: 'Médico não encontrado.' },
        pacientes: { id: 'id_paciente', erro: 'Paciente não encontrado.' },
        consultas: { id: 'id_consulta', erro: 'Consulta não encontrada.' }
    };

    let conexao;
    let preparacao;

    function abrir() {
        conexao ??= new Promise((resolve, reject) => {
            const pedido = indexedDB.open(bancoNome, 1);
            pedido.onupgradeneeded = () => {
                pedido.result.createObjectStore('dados');
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
                        loja.put(dados ?? resultado, chave);
                    }
                } catch (erro) {
                    transacao.abort();
                    reject(erro);
                }
            };
        });
    }

    async function preparar() {
        const preparados = await acessar('readonly', dados => dados?.proximosIds?.especialidades);
        if (preparados) return;

        let exemplos;
        try {
            const resposta = await fetch('./docs/dados/clinica.json');
            if (!resposta.ok) throw new Error();
            exemplos = await resposta.json();
        } catch {
            throw new Error('Não foi possível carregar os exemplos da clínica. Abra pelo GitHub Pages ou pelo Flask.');
        }

        await acessar('readwrite', dados => {
            const registros = dados ?? exemplos;
            registros.especialidades ??= exemplos.especialidades;
            registros.proximosIds ??= {};
            for (const [tipo, { id }] of Object.entries(entidades)) {
                registros.proximosIds[tipo] ??=
                    registros[tipo].reduce((maior, item) => Math.max(maior, item[id]), 0) + 1;
            }
            return registros;
        });
    }

    async function usar(modo, operacao) {
        preparacao ??= preparar().catch(erro => {
            preparacao = undefined;
            throw erro;
        });
        await preparacao;
        return acessar(modo, operacao);
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

    function salvarEspecialidade(campos, id) {
        return usar('readwrite', dados => {
            const registro = {
                nome: texto(campos.nome, 'nome', 100),
                descricao: texto(campos.descricao, 'descrição', 255, false)
            };
            if (dados.especialidades.some(e => e.id_especialidades !== id && ordem.compare(e.nome, registro.nome) === 0)) {
                throw new Error('Especialidade já cadastrada.');
            }
            salvar(dados, 'especialidades', id, registro);
        });
    }

    function salvarMedico(campos, id) {
        return usar('readwrite', dados => {
            const medico = {
                nome: texto(campos.nome, 'nome', 150),
                crm: texto(campos.crm, 'CRM', 30),
                email: email(campos.email),
                telefone: texto(campos.telefone, 'telefone', 20),
                minicurriculo: texto(campos.minicurriculo, 'minicurrículo', 500, false),
                id_especialidades: Number(campos.id_especialidades)
            };

            if (!dados.especialidades.some(e => e.id_especialidades === medico.id_especialidades)) {
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
        return usar('readwrite', dados => {
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

    function validarConflito(dados, consulta, id) {
        const minuto = consulta.horario_consulta.slice(0, 5);
        const ocupado = dados.consultas.some(c =>
            c.id_consulta !== id &&
            c.status === 'agendada' &&
            c.data_consulta === consulta.data_consulta &&
            c.horario_consulta?.slice(0, 5) === minuto &&
            (c.id_profissional === consulta.id_profissional || c.id_paciente === consulta.id_paciente)
        );
        if (ocupado) throw new Error('O médico ou paciente já tem consulta agendada nesse horário.');
    }

    function salvarConsulta(campos, id) {
        return usar('readwrite', dados => {
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

            if (consulta.status === 'agendada') validarConflito(dados, consulta, id);
            salvar(dados, 'consultas', id, consulta);
        });
    }

    function agendar(id, data, horario) {
        return usar('readwrite', dados => {
            const consulta = buscar(dados, 'consultas', id);
            if (consulta.status !== 'pendente') throw new Error('O pedido já saiu da fila de pendentes.');
            validarAgenda(data, horario);
            validarConflito(dados, { ...consulta, data_consulta: data, horario_consulta: horario }, id);
            Object.assign(consulta, {
                data_consulta: data,
                horario_consulta: horario,
                status: 'agendada'
            });
        });
    }

    function excluir(tipo, id) {
        return usar('readwrite', dados => {
            const registro = buscar(dados, tipo, id);
            if (tipo === 'especialidades' && dados.profissionais.some(p => p.id_especialidades === id)) {
                throw new Error('Alterar ou excluir os médicos vinculados libera esta especialidade.');
            }
            if ((tipo === 'profissionais' || tipo === 'pacientes') &&
                dados.consultas.some(c => c[entidades[tipo].id] === id)) {
                throw new Error('Exclua as consultas vinculadas antes de remover o cadastro.');
            }
            dados[tipo].splice(dados[tipo].indexOf(registro), 1);
        });
    }

    function listar() {
        return usar('readonly', dados => {
            const especialidadesPorId = new Map(dados.especialidades.map(e => [e.id_especialidades, e.nome]));
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
                specialties: [...dados.especialidades].sort(nomes)
            };
        });
    }

    return { listar, salvarEspecialidade, salvarMedico, salvarPaciente, salvarConsulta, agendar, excluir };
})();
