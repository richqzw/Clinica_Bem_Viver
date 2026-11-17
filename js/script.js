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

        const exemplos = {"especialidades": [{"id_especialidades": 1, "nome": "Clínica Geral", "descricao": "Atendimento médico geral e preventivo"}, {"id_especialidades": 2, "nome": "Cardiologia", "descricao": "Cuidados relacionados ao coração"}, {"id_especialidades": 3, "nome": "Dermatologia", "descricao": "Cuidados com a pele"}, {"id_especialidades": 4, "nome": "Fisioterapia", "descricao": "Reabilitação e prevenção de alterações do movimento"}, {"id_especialidades": 5, "nome": "Pediatria", "descricao": "Atendimento à saúde de crianças e adolescentes"}], "profissionais": [{"id_profissional": 1, "nome": "Marina Exemplo", "crm": "DEMO-001", "email": "marina@example.test", "telefone": "(00) 00000-0001", "id_especialidades": 1, "minicurriculo": ""}, {"id_profissional": 2, "nome": "Paulo Exemplo", "crm": "DEMO-002", "email": "paulo@example.test", "telefone": "(00) 00000-0002", "id_especialidades": 2, "minicurriculo": ""}], "pacientes": [{"id_paciente": 1, "nome": "Ana Demonstração", "cpf": "00000000001", "data_nascimento": "1992-06-15", "email": "ana@example.test", "telefone": "(00) 00000-0003"}, {"id_paciente": 2, "nome": "Lucas Demonstração", "cpf": "00000000002", "data_nascimento": "2001-09-21", "email": "lucas@example.test", "telefone": "(00) 00000-0004"}], "consultas": [{"id_consulta": 1, "id_paciente": 1, "id_profissional": 1, "status": "pendente", "data_consulta": null, "horario_consulta": null, "observacoes": "Pedido de exemplo para testar o agendamento."}]};

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


const apiClinica = (() => {
    const base = './api';
    const rotas = {
        especialidades: '/especialidades',
        profissionais: '/profissionais',
        pacientes: '/pacientes',
        consultas: '/consultas'
    };

    async function requisitar(caminho, method = 'GET', corpo) {
        const opcoes = { method, cache: 'no-store' };
        if (corpo !== undefined) {
            opcoes.headers = { 'Content-Type': 'application/json' };
            opcoes.body = JSON.stringify(corpo);
        }

        let resposta;
        try {
            resposta = await fetch(base + caminho, opcoes);
        } catch {
            throw new Error('Não foi possível conectar ao servidor da clínica.');
        }
        const dados = await resposta.json().catch(() => null);
        if (!resposta.ok || dados === null) {
            throw new Error(dados?.erro || 'O servidor não conseguiu concluir a operação.');
        }
        return dados;
    }

    function salvar(rota, campos, id) {
        if (id === undefined) return requisitar(rota, 'POST', campos);
        return requisitar(rota + '/' + id, 'PUT', campos);
    }

    async function listar() {
        const [doctors, patients, appointments, specialties] = await Promise.all([
            requisitar(rotas.profissionais),
            requisitar(rotas.pacientes),
            requisitar(rotas.consultas),
            requisitar(rotas.especialidades)
        ]);
        const pending = appointments.filter(consulta => consulta.status === 'pendente');
        return { doctors, patients, appointments, specialties, pending };
    }

    return {
        listar,
        salvarEspecialidade: (campos, id) => salvar(rotas.especialidades, campos, id),
        salvarMedico: (campos, id) => salvar(rotas.profissionais, campos, id),
        salvarPaciente: (campos, id) => salvar(rotas.pacientes, campos, id),
        salvarConsulta: (campos, id) => salvar(rotas.consultas, campos, id),
        agendar: (id, data, horario) => requisitar(rotas.consultas + '/' + id + '/agendar', 'PATCH', {
            data_consulta: data,
            horario_consulta: horario
        }),
        excluir: (tipo, id) => requisitar(rotas[tipo] + '/' + id, 'DELETE')
    };
})();


const modoFlask = document.documentElement.dataset.origem === 'flask';
const dadosClinica = modoFlask ? apiClinica : banco;


let S = {
    doctors: [],
    patients: [],
    specialties: [],
    pending: [],
    appointments: []
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const initials = n => String(n || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
    .join('')
    .toUpperCase();

function toast(msg, error = false) {
    const t = $('#toast');

    t.textContent = msg;
    t.className = 'toast show' + (error ? ' error' : '');

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        t.className = 'toast';
    }, 3200);
}

function feedback(id, msg, error = false) {
    const e = $('#' + id);

    e.textContent = msg;
    e.classList.toggle('error', error);
}

function values(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function status(s) {
    const k = ['pendente', 'agendada', 'cancelada', 'concluida'].includes(s)
        ? s
        : 'pendente';

    return `<span class="status ${k}">${k[0].toUpperCase() + k.slice(1)}</span>`;
}

function dateBR(d) {
    return d
        ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'A definir';
}

function dataHoje() {
    const agora = new Date();
    const horaLocal = agora.getTime() - agora.getTimezoneOffset() * 60_000;
    return new Date(horaLocal).toISOString().slice(0, 10);
}

// =========================
// ESPECIALIDADES
// =========================

function renderSpecialties() {
    $('#specialtySelect').innerHTML =
        '<option value="">Selecione</option>' +
        S.specialties.map(s =>
            `<option value="${s.id_especialidades}">${esc(s.nome)}</option>`
        ).join('');

    $('#specialties').innerHTML = S.specialties.map((s, i) => `
        <article class="specialty-card">
            <div class="symbol">${['✳', '♡', '✦', '⌁', '♧', '◇'][i % 6]}</div>
            <h3>${esc(s.nome)}</h3>
            <p>${esc(s.descricao || 'Especialidade disponível na clínica.')}</p>
            <div class="actions">
                <button type="button" class="action-edit" data-editar="especialidades" data-id="${s.id_especialidades}">Editar</button>
                <button type="button" class="action-delete" data-excluir="especialidades" data-id="${s.id_especialidades}">Excluir</button>
            </div>
        </article>
    `).join('') || '<div class="panel empty">Sem especialidades cadastradas.</div>';

    $('#summary').innerHTML = S.specialties.map(s => `
        <div class="row">
            <div class="row-info">
                <b>${esc(s.nome)}</b>
            </div>
            <span class="pill">
                ${S.doctors.filter(d =>
                    Number(d.id_especialidades) === Number(s.id_especialidades)
                ).length} médicos
            </span>
        </div>
    `).join('') || '<div class="empty">Nenhuma especialidade cadastrada.</div>';
}


// =========================
// MÉDICOS
// =========================

function renderDoctors() {
    $('#nMed').textContent = S.doctors.length;
    $('#doctorCount').textContent = S.doctors.length;

    $('#doctors').innerHTML = S.doctors.map(d => `
        <div class="doctor">
            <div class="initial">${esc(initials(d.nome))}</div>

            <div class="doctor-content">
                <b>${esc(d.nome)}</b>

                <small>
                    CRM ${esc(d.crm)} · ${esc(d.email)}
                    <br>
                    ${esc(d.telefone)}
                </small>

                <span class="tag">${esc(d.especialidade)}</span>

                ${d.minicurriculo
                    ? `<small>${esc(d.minicurriculo)}</small>`
                    : ''}

                <div class="actions">
                    <button class="action-edit"
                        type="button" data-editar="profissionais" data-id="${d.id_profissional}">
                        Editar
                    </button>

                    <button class="action-delete"
                        type="button" data-excluir="profissionais" data-id="${d.id_profissional}">
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    `).join('') || '<div class="empty">Nenhum médico cadastrado.</div>';

    $('#doctorSelect').innerHTML =
        '<option value="">Selecione o médico</option>' +
        S.doctors.map(d => `
            <option value="${d.id_profissional}">
                ${esc(d.nome)} · ${esc(d.especialidade)}
            </option>
        `).join('');
}


// =========================
// PACIENTES
// =========================

function renderPatients() {
    $('#nPac').textContent = S.patients.length;
    $('#patientCount').textContent = S.patients.length;

    $('#patients').innerHTML = S.patients.length
        ? `
            <table>
                <thead>
                    <tr>
                        <th>NOME</th>
                        <th>CPF</th>
                        <th>TELEFONE</th>
                        <th>AÇÕES</th>
                    </tr>
                </thead>

                <tbody>
                    ${S.patients.map(p => `
                        <tr>
                            <td>${esc(p.nome)}</td>
                            <td>${esc(p.cpf)}</td>
                            <td>${esc(p.telefone)}</td>

                            <td>
                                <div class="actions">
                                    <button class="action-edit"
                                        type="button" data-editar="pacientes" data-id="${p.id_paciente}">
                                        Editar
                                    </button>

                                    <button class="action-delete"
                                        type="button" data-excluir="pacientes" data-id="${p.id_paciente}">
                                        Excluir
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<div class="empty">Nenhum paciente cadastrado.</div>';

    $('#patientSelect').innerHTML =
        '<option value="">Selecione o paciente</option>' +
        S.patients.map(p => `
            <option value="${p.id_paciente}">
                ${esc(p.nome)}
            </option>
        `).join('');
}


// =========================
// CONSULTAS PENDENTES
// =========================

function renderPending() {
    $('#nPen').textContent = S.pending.length;

    $('#pending').innerHTML = S.pending.map(c => `
        <article class="pending-card">

            <div class="panel-title">
                <small>PEDIDO #${c.id_consulta}</small>
                ${status(c.status)}
            </div>

            <h3>${esc(c.paciente)}</h3>

            <p>Solicitação para ${esc(c.especialidade)}</p>

            <div class="meta">
                <div>
                    <small>MÉDICO</small>
                    <b>${esc(c.profissional)}</b>
                </div>

                <div>
                    <small>TELEFONE</small>
                    <b>${esc(c.telefone)}</b>
                </div>
            </div>

            ${c.observacoes
                ? `<p>${esc(c.observacoes)}</p>`
                : ''}

            <form class="schedule" data-id="${c.id_consulta}">
                <label>
                    Data
                    <input
                        name="data_consulta"
                        type="date"
                        min="${dataHoje()}"
                        required
                    >
                </label>

                <label>
                    Horário
                    <input
                        name="horario_consulta"
                        type="time"
                        required
                    >
                </label>

                <button type="submit" class="primary">Agendar</button>
            </form>

        </article>
    `).join('') || `
        <div class="panel empty">
            Não há pedidos pendentes no momento.
        </div>
    `;

    renderRecent();
}


// =========================
// CONSULTAS REGISTRADAS
// =========================

function renderAppointments() {
    $('#nAge').textContent =
        S.appointments.filter(c => c.status === 'agendada').length;

    $('#appointments').innerHTML = S.appointments.length
        ? `
            <table>
                <thead>
                    <tr>
                        <th>PACIENTE</th>
                        <th>MÉDICO</th>
                        <th>ESPECIALIDADE</th>
                        <th>DATA</th>
                        <th>STATUS</th>
                        <th>AÇÕES</th>
                    </tr>
                </thead>

                <tbody>
                    ${S.appointments.map(c => `
                        <tr>
                            <td>${esc(c.paciente)}</td>
                            <td>${esc(c.profissional)}</td>
                            <td>${esc(c.especialidade)}</td>

                            <td>
                                ${dateBR(c.data_consulta)}
                                ${esc(c.horario_consulta || '')}
                            </td>

                            <td>${status(c.status)}</td>

                            <td>
                                <div class="actions">
                                    <button class="action-edit"
                                        type="button" data-editar="consultas" data-id="${c.id_consulta}">
                                        Editar
                                    </button>

                                    <button class="action-delete"
                                        type="button" data-excluir="consultas" data-id="${c.id_consulta}">
                                        Excluir
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `
        : '<div class="empty">Nenhuma consulta registrada.</div>';
}


// =========================
// ATIVIDADES RECENTES
// =========================

function renderRecent() {
    $('#recent').innerHTML = S.pending.slice(0, 5).map(c => `
        <div class="row">
            <div class="initial">${esc(initials(c.paciente))}</div>

            <div class="row-info">
                <b>${esc(c.paciente)}</b>
                <small>
                    ${esc(c.especialidade)} · ${esc(c.profissional)}
                </small>
            </div>

            ${status(c.status)}
        </div>
    `).join('') || '<div class="empty">Nenhum pedido pendente.</div>';
}


// =========================
// PAINEL PRINCIPAL
// =========================

async function dashboard() {
    try {
        S = await dadosClinica.listar();
        const selecoes = $$('.form select').map(select => [select, select.value]);

        renderDoctors();
        renderPatients();
        renderPending();
        renderAppointments();
        renderSpecialties();

        for (const [select, valor] of selecoes) {
            if ([...select.options].some(opcao => opcao.value === valor)) {
                select.value = valor;
            }
        }
        mostrarEspecialidade();

        $('#dataStatus').textContent = modoFlask ? 'Banco conectado' : 'Demonstração';
        $('.data-state').classList.add('online');
    } catch (erro) {
        $('#dataStatus').textContent = 'Dados indisponíveis';
        $('.data-state').classList.remove('online');
        toast(erro.message, true);
    }
}


// =========================
// NAVEGAÇÃO
// =========================

function go(id) {
    $$('.page').forEach(p =>
        p.classList.toggle('show', p.id === id)
    );

    $$('.nav').forEach(b => {
        const ativo = b.dataset.page === id;
        b.classList.toggle('active', ativo);
        if (ativo) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });

    $('#crumb').textContent =
        $(`.nav[data-page="${id}"]`)?.textContent.trim() || id;

    $('#sidebar').classList.remove('open');
    $('#menu').setAttribute('aria-expanded', 'false');
}

$$('[data-page]').forEach(b => {
    b.onclick = () => go(b.dataset.page);
});

$$('[data-go]').forEach(b => {
    b.onclick = () => go(b.dataset.go);
});

$('#menu').onclick = () => {
    const aberto = $('#sidebar').classList.toggle('open');
    $('#menu').setAttribute('aria-expanded', String(aberto));
};


// =========================
// FORMULÁRIOS DE CADASTRO
// =========================

function cadastro(seletor, mensagemId, salvar, sucesso) {
    const formulario = $(seletor);
    const botao = formulario.querySelector('button[type="submit"]');

    formulario.onsubmit = async evento => {
        evento.preventDefault();
        if (botao.disabled) return;

        botao.disabled = true;
        feedback(mensagemId, 'Salvando…');

        try {
            await salvar(values(formulario));
            formulario.reset();
            feedback(mensagemId, sucesso);
            toast(sucesso);
            await dashboard();
        } catch (erro) {
            feedback(mensagemId, erro.message, true);
            toast(erro.message, true);
        } finally {
            botao.disabled = false;
        }
    };
}

cadastro('#specialtyForm', 'specialtyMsg', dadosClinica.salvarEspecialidade, 'Especialidade cadastrada com sucesso.');
cadastro('#doctorForm', 'doctorMsg', dadosClinica.salvarMedico, 'Médico cadastrado com sucesso.');
cadastro('#patientForm', 'patientMsg', dadosClinica.salvarPaciente, 'Paciente cadastrado com sucesso.');
cadastro(
    '#appointmentForm',
    'appointmentMsg',
    dadosClinica.salvarConsulta,
    'Consulta registrada. O pedido está aguardando agendamento.'
);

function mostrarEspecialidade() {
    const id = Number($('#doctorSelect').value);
    const medico = S.doctors.find(d => d.id_profissional === id);
    $('#chosenSpecialty').value = medico?.especialidade || '';
}

$('#doctorSelect').onchange = mostrarEspecialidade;


// =========================
// AGENDAR CONSULTA PENDENTE
// =========================

$('#pending').onsubmit = async evento => {
    const formulario = evento.target.closest('form[data-id]');
    if (!formulario) return;

    evento.preventDefault();
    const botao = formulario.querySelector('button[type="submit"]');
    if (botao.disabled) return;

    botao.disabled = true;
    const campos = values(formulario);

    try {
        await dadosClinica.agendar(Number(formulario.dataset.id), campos.data_consulta, campos.horario_consulta);
        toast('Consulta agendada com sucesso.');
        await dashboard();
    } catch (erro) {
        toast(erro.message, true);
    } finally {
        botao.disabled = false;
    }
};

$('#refresh').onclick = dashboard;


const edicao = {
    especialidades: {
        lista: 'specialties',
        chave: 'id_especialidades',
        formulario: '#specialtyForm',
        salvar: dadosClinica.salvarEspecialidade,
        titulo: 'Editar especialidade',
        atualizacao: 'Especialidade atualizada.',
        exclusao: 'Especialidade excluída.',
        confirmar: 'Deseja excluir esta especialidade?'
    },
    profissionais: {
        lista: 'doctors',
        chave: 'id_profissional',
        formulario: '#doctorForm',
        salvar: dadosClinica.salvarMedico,
        titulo: 'Editar médico',
        atualizacao: 'Médico atualizado.',
        exclusao: 'Médico excluído.',
        confirmar: 'Deseja excluir este médico?'
    },
    pacientes: {
        lista: 'patients',
        chave: 'id_paciente',
        formulario: '#patientForm',
        salvar: dadosClinica.salvarPaciente,
        titulo: 'Editar paciente',
        atualizacao: 'Paciente atualizado.',
        exclusao: 'Paciente excluído.',
        confirmar: 'Deseja excluir este paciente?'
    },
    consultas: {
        lista: 'appointments',
        chave: 'id_consulta',
        formulario: '#appointmentForm',
        salvar: dadosClinica.salvarConsulta,
        titulo: 'Editar consulta',
        atualizacao: 'Consulta atualizada.',
        exclusao: 'Consulta excluída.',
        confirmar: 'Deseja excluir esta consulta?'
    }
};

const dialogo = $('#editor');
const formularioEdicao = $('#editorForm');
const salvarEdicao = $('#editorSave');
const cancelarEdicao = $('#editorCancel');

cancelarEdicao.onclick = () => dialogo.close();
dialogo.oncancel = evento => {
    if (salvarEdicao.disabled) evento.preventDefault();
};

function abrirEditor(tipo, config, registro) {
    const campos = $('#editorFields');
    const rotulos = [...$(config.formulario).querySelectorAll('label')];
    campos.replaceChildren(
        ...rotulos.filter(rotulo => rotulo.querySelector('[name]')).map(rotulo => rotulo.cloneNode(true))
    );
    if (tipo === 'consultas') {
        campos.append($('#agendaFields').content.cloneNode(true));
    }
    for (const campo of campos.querySelectorAll('[name]')) {
        campo.removeAttribute('id');
        campo.value = registro[campo.name] ?? '';
    }
    $('#editorTitle').textContent = config.titulo;
    $('#editorMsg').hidden = true;
    feedback('editorMsg', '');

    formularioEdicao.onsubmit = async evento => {
        evento.preventDefault();
        if (salvarEdicao.disabled) return;

        salvarEdicao.disabled = cancelarEdicao.disabled = true;
        $('#editorMsg').hidden = false;
        feedback('editorMsg', 'Salvando…');
        try {
            await config.salvar(values(formularioEdicao), registro[config.chave]);
            dialogo.close();
            toast(config.atualizacao);
            await dashboard();
        } catch (erro) {
            feedback('editorMsg', erro.message, true);
        } finally {
            salvarEdicao.disabled = cancelarEdicao.disabled = false;
        }
    };

    dialogo.showModal();
}

$('main').addEventListener('click', async evento => {
    const botao = evento.target.closest('button[data-editar], button[data-excluir]');
    if (!botao || botao.disabled) return;

    const tipo = botao.dataset.editar ?? botao.dataset.excluir;
    const config = edicao[tipo];
    const ident = Number(botao.dataset.id);
    if (botao.dataset.editar) {
        const registro = S[config.lista].find(item => item[config.chave] === ident);
        if (registro) abrirEditor(tipo, config, registro);
        return;
    }

    if (!confirm(config.confirmar)) return;
    botao.disabled = true;
    try {
        await dadosClinica.excluir(tipo, ident);
        toast(config.exclusao);
        await dashboard();
    } catch (erro) {
        toast(erro.message, true);
    } finally {
        botao.disabled = false;
    }
});


if (modoFlask) {
    $('#dataNote').textContent = 'Modo de apresentação. Use dados fictícios. Os cadastros duram enquanto o servidor estiver aberto.';
}

$('#today').textContent = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
});

dashboard();
