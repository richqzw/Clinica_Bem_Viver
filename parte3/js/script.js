
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

function ask(label, current = '') {
    const v = prompt(label, current ?? '');
    return v === null ? null : v.trim();
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
                        data-edit-doctor="${d.id_profissional}">
                        Editar
                    </button>

                    <button class="action-delete"
                        data-delete-doctor="${d.id_profissional}">
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
                                        data-edit-patient="${p.id_paciente}">
                                        Editar
                                    </button>

                                    <button class="action-delete"
                                        data-delete-patient="${p.id_paciente}">
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
                                        data-edit-appointment="${c.id_consulta}">
                                        Editar
                                    </button>

                                    <button class="action-delete"
                                        data-delete-appointment="${c.id_consulta}">
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
        S = await banco.listar();
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

        $('#dataStatus').textContent = 'Demonstração';
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

    $$('.nav').forEach(b =>
        b.classList.toggle('active', b.dataset.page === id)
    );

    $('#crumb').textContent =
        $(`.nav[data-page="${id}"]`)?.textContent.trim() || id;

    $('#sidebar').classList.remove('open');
}

$$('[data-page]').forEach(b => {
    b.onclick = () => go(b.dataset.page);
});

$$('[data-go]').forEach(b => {
    b.onclick = () => go(b.dataset.go);
});

$('#menu').onclick = () => {
    $('#sidebar').classList.toggle('open');
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

cadastro('#doctorForm', 'doctorMsg', banco.salvarMedico, 'Médico cadastrado com sucesso.');
cadastro('#patientForm', 'patientMsg', banco.salvarPaciente, 'Paciente cadastrado com sucesso.');
cadastro(
    '#appointmentForm',
    'appointmentMsg',
    banco.salvarConsulta,
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
        await banco.agendar(Number(formulario.dataset.id), campos.data_consulta, campos.horario_consulta);
        toast('Consulta agendada com sucesso.');
        await dashboard();
    } catch (erro) {
        toast(erro.message, true);
    } finally {
        botao.disabled = false;
    }
};

$('#refresh').onclick = dashboard;


// =========================
// EDITAR E EXCLUIR MÉDICOS
// =========================

$('#doctors').onclick = async e => {
    const edit = e.target.closest('[data-edit-doctor]');
    const del = e.target.closest('[data-delete-doctor]');

    if (edit) {
        const d = S.doctors.find(x =>
            x.id_profissional === Number(edit.dataset.editDoctor)
        );

        if (!d) return;

        const nome = ask('Nome do médico:', d.nome);
        if (nome === null) return;

        const crm = ask('CRM:', d.crm);
        if (crm === null) return;

        const email = ask('E-mail:', d.email);
        if (email === null) return;

        const telefone = ask('Telefone:', d.telefone);
        if (telefone === null) return;

        const minicurriculo = ask(
            'Minicurrículo:',
            d.minicurriculo || ''
        );

        if (minicurriculo === null) return;

        const opcoes = S.specialties
            .map(s => `${s.id_especialidades} - ${s.nome}`)
            .join('\n');

        const especialidade = ask(
            `Digite o ID da especialidade:\n${opcoes}`,
            d.id_especialidades
        );

        if (especialidade === null) return;

        try {
            await banco.salvarMedico({
                nome, crm, email, telefone, minicurriculo,
                id_especialidades: especialidade
            }, d.id_profissional);

            toast('Médico atualizado.');
            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir este médico?')) {
        try {
            await banco.excluir('profissionais', Number(del.dataset.deleteDoctor));

            toast('Médico excluído.');
            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }
};


// =========================
// EDITAR E EXCLUIR PACIENTES
// =========================

$('#patients').onclick = async e => {
    const edit = e.target.closest('[data-edit-patient]');
    const del = e.target.closest('[data-delete-patient]');

    if (edit) {
        const p = S.patients.find(x =>
            x.id_paciente === Number(edit.dataset.editPatient)
        );

        if (!p) return;

        const nome = ask('Nome completo:', p.nome);
        if (nome === null) return;

        const cpf = ask('CPF (somente números):', p.cpf);
        if (cpf === null) return;

        const data_nascimento = ask(
            'Data de nascimento (AAAA-MM-DD):',
            p.data_nascimento
        );

        if (data_nascimento === null) return;

        const email = ask('E-mail:', p.email);
        if (email === null) return;

        const telefone = ask('Telefone:', p.telefone);
        if (telefone === null) return;

        try {
            await banco.salvarPaciente({ nome, cpf, data_nascimento, email, telefone }, p.id_paciente);

            toast('Paciente atualizado.');
            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir este paciente?')) {
        try {
            await banco.excluir('pacientes', Number(del.dataset.deletePatient));

            toast('Paciente excluído.');
            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }
};


// =========================
// EDITAR E EXCLUIR CONSULTAS
// =========================

$('#appointments').onclick = async e => {
    const edit = e.target.closest('[data-edit-appointment]');
    const del = e.target.closest('[data-delete-appointment]');

    if (edit) {
        const c = S.appointments.find(x =>
            x.id_consulta === Number(edit.dataset.editAppointment)
        );

        if (!c) return;

        const patientOptions = S.patients
            .map(p => `${p.id_paciente} - ${p.nome}`)
            .join('\n');

        const doctorOptions = S.doctors
            .map(d => `${d.id_profissional} - ${d.nome}`)
            .join('\n');

        const id_paciente = ask(
            `ID do paciente:\n${patientOptions}`,
            c.id_paciente
        );

        if (id_paciente === null) return;

        const id_profissional = ask(
            `ID do médico:\n${doctorOptions}`,
            c.id_profissional
        );

        if (id_profissional === null) return;

        const data_consulta = ask(
            'Data (AAAA-MM-DD, deixe vazio se pendente):',
            c.data_consulta || ''
        );

        if (data_consulta === null) return;

        const horario_consulta = ask(
            'Horário (HH:MM, deixe vazio se pendente):',
            c.horario_consulta || ''
        );

        if (horario_consulta === null) return;

        const statusValue = ask(
            'Status: pendente, agendada, cancelada ou concluida:',
            c.status
        );

        if (statusValue === null) return;

        const observacoes = ask(
            'Observações:',
            c.observacoes || ''
        );

        if (observacoes === null) return;

        try {
            await banco.salvarConsulta({
                id_paciente,
                id_profissional,
                data_consulta,
                horario_consulta,
                status: statusValue.toLowerCase(),
                observacoes
            }, c.id_consulta);

            toast('Consulta atualizada.');

            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir esta consulta?')) {
        try {
            await banco.excluir('consultas', Number(del.dataset.deleteAppointment));

            toast('Consulta excluída.');

            await dashboard();

        } catch (x) {
            toast(x.message, true);
        }
    }
};


// =========================
// DATA E INICIALIZAÇÃO
// =========================

$('#today').textContent = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
});

dashboard();
