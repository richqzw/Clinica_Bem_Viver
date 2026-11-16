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
