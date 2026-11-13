
const API = '/api';

const S = {
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

async function api(path, opts = {}) {
    const r = await fetch(API + path, {
        ...opts,
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            ...(opts.headers || {})
        }
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw Error(d.erro || `Erro ${r.status}`);
    }

    return d;
}

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

function ask(label, current = '') {
    const v = prompt(label, current ?? '');
    return v === null ? null : v.trim();
}


// =========================
// ESPECIALIDADES
// =========================

async function loadSpecialties() {
    S.specialties = await api('/especialidades');

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

async function loadDoctors() {
    S.doctors = await api('/profissionais');

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

async function loadPatients() {
    S.patients = await api('/pacientes');

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

async function loadPending() {
    S.pending = await api('/consultas/pendentes');

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
                        min="${new Date().toISOString().slice(0, 10)}"
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

                <button class="primary">Agendar</button>
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

async function loadAppointments() {
    S.appointments = await api('/consultas');

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
    const results = await Promise.allSettled([
        loadDoctors(),
        loadPatients(),
        loadPending(),
        loadAppointments(),
        loadSpecialties()
    ]);

    const ok = results.filter(x => x.status === 'fulfilled').length;

    $('#apiText').textContent =
        ok === results.length
            ? 'Sistema conectado'
            : ok
                ? 'Conexão parcial'
                : 'API indisponível';

    $('.api-state').classList.toggle(
        'online',
        ok === results.length
    );

    results
        .filter(x => x.status === 'rejected')
        .forEach(x => console.error(x.reason));
}

async function refreshAll() {
    await dashboard();
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

    const tasks = {
        inicio: dashboard,

        medicos: async () => {
            await Promise.all([
                loadDoctors(),
                loadSpecialties()
            ]);
        },

        pacientes: loadPatients,

        consultas: async () => {
            await Promise.all([
                loadDoctors(),
                loadPatients(),
                loadAppointments()
            ]);
        },

        pendentes: loadPending,
        especialidades: loadSpecialties
    };

    (tasks[id] || (() => {}))()
        .catch(e => toast(e.message, true));
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
// CADASTRAR MÉDICO
// =========================

$('#doctorForm').onsubmit = async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const d = values(f);

    d.id_especialidades = Number(d.id_especialidades);

    feedback('doctorMsg', 'Salvando…');

    try {
        await api('/profissionais', {
            method: 'POST',
            body: JSON.stringify(d)
        });

        f.reset();

        feedback('doctorMsg', 'Médico cadastrado!');
        toast('Médico cadastrado com sucesso.');

        await refreshAll();

    } catch (x) {
        feedback('doctorMsg', x.message, true);
        toast(x.message, true);
    }
};


// =========================
// CADASTRAR PACIENTE
// =========================

$('#patientForm').onsubmit = async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const d = values(f);

    d.cpf = d.cpf.replace(/\D/g, '');

    feedback('patientMsg', 'Salvando…');

    try {
        await api('/pacientes', {
            method: 'POST',
            body: JSON.stringify(d)
        });

        f.reset();

        feedback('patientMsg', 'Paciente cadastrado!');
        toast('Paciente cadastrado com sucesso.');

        await refreshAll();

    } catch (x) {
        feedback('patientMsg', x.message, true);
        toast(x.message, true);
    }
};


// =========================
// SELEÇÃO DE MÉDICO
// =========================

$('#doctorSelect').onchange = e => {
    const d = S.doctors.find(x =>
        Number(x.id_profissional) === Number(e.target.value)
    );

    $('#chosenSpecialty').value = d?.especialidade || '';
};


// =========================
// REGISTRAR CONSULTA
// =========================

$('#appointmentForm').onsubmit = async e => {
    e.preventDefault();

    const f = e.currentTarget;
    const d = values(f);

    d.id_paciente = Number(d.id_paciente);
    d.id_profissional = Number(d.id_profissional);

    feedback('appointmentMsg', 'Registrando consulta…');

    try {
        await api('/consultas', {
            method: 'POST',
            body: JSON.stringify(d)
        });

        f.reset();

        $('#chosenSpecialty').value = '';

        feedback(
            'appointmentMsg',
            '✓ Consulta registrada com sucesso! O pedido está aguardando agendamento.'
        );

        toast('Consulta registrada com sucesso.');

        await Promise.all([
            loadPending(),
            loadAppointments(),
            dashboard()
        ]);

    } catch (x) {
        feedback('appointmentMsg', x.message, true);
        toast(x.message, true);
    }
};


// =========================
// AGENDAR CONSULTA PENDENTE
// =========================

$('#pending').onsubmit = async e => {
    const f = e.target.closest('form[data-id]');

    if (!f) return;

    e.preventDefault();

    try {
        await api(`/consultas/${f.dataset.id}/agendar`, {
            method: 'PATCH',
            body: JSON.stringify(values(f))
        });

        toast('Consulta agendada com sucesso.');

        await Promise.all([
            loadPending(),
            loadAppointments(),
            dashboard()
        ]);

    } catch (x) {
        toast(x.message, true);
    }
};

$('#refresh').onclick = () => {
    loadPending().catch(e => toast(e.message, true));
};


// =========================
// EDITAR E EXCLUIR MÉDICOS
// =========================

$('#doctors').onclick = async e => {
    const edit = e.target.closest('[data-edit-doctor]');
    const del = e.target.closest('[data-delete-doctor]');

    if (edit) {
        const d = S.doctors.find(x =>
            x.id_profissional == edit.dataset.editDoctor
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
            await api(`/profissionais/${d.id_profissional}`, {
                method: 'PUT',
                body: JSON.stringify({
                    nome,
                    crm,
                    email,
                    telefone,
                    minicurriculo,
                    id_especialidades: Number(especialidade)
                })
            });

            toast('Médico atualizado.');
            await refreshAll();

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir este médico?')) {
        try {
            await api(`/profissionais/${del.dataset.deleteDoctor}`, {
                method: 'DELETE'
            });

            toast('Médico excluído.');
            await refreshAll();

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
            x.id_paciente == edit.dataset.editPatient
        );

        if (!p) return;

        const nome = ask('Nome completo:', p.nome);
        if (nome === null) return;

        const cpf = ask('CPF (somente números):', p.cpf);
        if (cpf === null) return;

        const data_nascimento = ask(
            'Data de nascimento (AAAA-MM-DD):',
            String(p.data_nascimento).slice(0, 10)
        );

        if (data_nascimento === null) return;

        const email = ask('E-mail:', p.email);
        if (email === null) return;

        const telefone = ask('Telefone:', p.telefone);
        if (telefone === null) return;

        try {
            await api(`/pacientes/${p.id_paciente}`, {
                method: 'PUT',
                body: JSON.stringify({
                    nome,
                    cpf,
                    data_nascimento,
                    email,
                    telefone
                })
            });

            toast('Paciente atualizado.');
            await refreshAll();

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir este paciente?')) {
        try {
            await api(`/pacientes/${del.dataset.deletePatient}`, {
                method: 'DELETE'
            });

            toast('Paciente excluído.');
            await refreshAll();

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
            x.id_consulta == edit.dataset.editAppointment
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
            S.patients.find(p => p.nome === c.paciente)?.id_paciente || ''
        );

        if (id_paciente === null) return;

        const id_profissional = ask(
            `ID do médico:\n${doctorOptions}`,
            S.doctors.find(d => d.nome === c.profissional)?.id_profissional || ''
        );

        if (id_profissional === null) return;

        const data_consulta = ask(
            'Data (AAAA-MM-DD; deixe vazio se pendente):',
            c.data_consulta ? String(c.data_consulta).slice(0, 10) : ''
        );

        if (data_consulta === null) return;

        const horario_consulta = ask(
            'Horário (HH:MM; deixe vazio se pendente):',
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
            await api(`/consultas/${c.id_consulta}`, {
                method: 'PUT',
                body: JSON.stringify({
                    id_paciente: Number(id_paciente),
                    id_profissional: Number(id_profissional),
                    data_consulta,
                    horario_consulta,
                    status: statusValue,
                    observacoes
                })
            });

            toast('Consulta atualizada.');

            await Promise.all([
                loadAppointments(),
                loadPending(),
                dashboard()
            ]);

        } catch (x) {
            toast(x.message, true);
        }
    }

    if (del && confirm('Deseja realmente excluir esta consulta?')) {
        try {
            await api(`/consultas/${del.dataset.deleteAppointment}`, {
                method: 'DELETE'
            });

            toast('Consulta excluída.');

            await Promise.all([
                loadAppointments(),
                loadPending(),
                dashboard()
            ]);

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

dashboard().catch(e => {
    $('#apiText').textContent = 'API indisponível';
    toast(e.message, true);
});
