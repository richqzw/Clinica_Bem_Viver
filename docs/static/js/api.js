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
