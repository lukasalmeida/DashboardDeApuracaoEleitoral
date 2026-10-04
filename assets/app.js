(() => {
    const refreshInterval = 15000;
    const regions = [
        ['ac', 'Acre'], ['al', 'Alagoas'], ['ap', 'Amapá'], ['am', 'Amazonas'],
        ['ba', 'Bahia'], ['ce', 'Ceará'], ['df', 'Distrito Federal'], ['es', 'Espírito Santo'],
        ['go', 'Goiás'], ['ma', 'Maranhão'], ['mt', 'Mato Grosso'], ['ms', 'Mato Grosso do Sul'],
        ['mg', 'Minas Gerais'], ['pa', 'Pará'], ['pb', 'Paraíba'], ['pr', 'Paraná'],
        ['pe', 'Pernambuco'], ['pi', 'Piauí'], ['rj', 'Rio de Janeiro'], ['rn', 'Rio Grande do Norte'],
        ['rs', 'Rio Grande do Sul'], ['ro', 'Rondônia'], ['rr', 'Roraima'], ['sc', 'Santa Catarina'],
        ['sp', 'São Paulo'], ['se', 'Sergipe'], ['to', 'Tocantins'],
    ];
    const elements = {
        region: document.querySelector('#region-filter'),
        office: document.querySelector('#office-filter'),
        turn: document.querySelector('#turn-filter'),
        connection: document.querySelector('#connection-status'),
        lastUpdate: document.querySelector('#last-update'),
        candidateList: document.querySelector('#candidate-list'),
        candidateCount: document.querySelector('#candidate-count'),
        candidateTable: document.querySelector('#candidate-table'),
        toast: document.querySelector('#toast'),
    };
    let currentPayload = null;
    let requestController = null;
    let toastTimeout;

    const formatNumber = (value) => {
        const number = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR').format(number) : '—';
    };

    const numeric = (value) => {
        if (typeof value === 'number') return value;
        const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const percent = (value) => {
        const parsed = numeric(value);
        return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(parsed)}%`;
    };

    const getCandidates = (data) => {
        const roots = [data, ...(Array.isArray(data?.abr) ? data.abr : [])];
        for (const root of roots) {
            const candidates = root?.cand ?? root?.candidatos;
            if (Array.isArray(candidates)) return candidates;
        }
        if (Array.isArray(data?.carg)) {
            return data.carg.flatMap((office) => office.agr ?? [])
                .flatMap((coalition) => coalition.par ?? [])
                .flatMap((party) => (party.cand ?? []).map((candidate) => ({
                    ...candidate,
                    sgp: candidate.sgp ?? party.sg,
                    partyName: party.nm,
                })));
        }
        return [];
    };

    const getValue = (data, keys, fallback = '—') => {
        for (const key of keys) {
            if (data?.[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
        }
        return fallback;
    };

    const findSummary = (data) => {
        const roots = [
            data?.s, data?.e, data?.v, data,
            ...(Array.isArray(data?.abr) ? data.abr : []),
        ].filter(Boolean);
        const summary = {};
        const keys = {
            sections: ['st', 'secoesTotalizadas'],
            sectionsTotal: ['ts', 'secoesTotal'],
            sectionsRate: ['pst', 'percentualApurado'],
            votes: ['tv', 'c', 'comparecimento', 'votosApurados'],
            valid: ['vvc', 'vv', 'votosValidos'],
            nullVotes: ['tvn', 'vn', 'votosNulos'],
            whiteVotes: ['vb', 'votosBrancos'],
            absent: ['a', 'abstencoes'],
            electorate: ['te', 'eleitores'],
        };
        for (const [name, candidates] of Object.entries(keys)) {
            summary[name] = '—';
            for (const root of roots) {
                const value = getValue(root, candidates, null);
                if (value !== null) {
                    summary[name] = value;
                    break;
                }
            }
        }
        const rate = numeric(summary.sectionsRate);
        if (summary.sections === '—') {
            summary.sections = summary.sectionsTotal === '—' || summary.sectionsRate === '—'
                ? '—'
                : Math.round(numeric(summary.sectionsTotal) * rate / 100);
        }
        summary.absentRate = summary.absent === '—' || summary.electorate === '—'
            ? '—'
            : numeric(summary.electorate) > 0
                ? numeric(summary.absent) / numeric(summary.electorate) * 100
                : 0;
        if (summary.valid === '—') {
            summary.valid = getCandidates(data).reduce((total, candidate) => total + numeric(candidate.vap), 0);
        }
        return summary;
    };

    const updateConnection = (state, text) => {
        elements.connection.className = `connection-status ${state}`;
        elements.connection.querySelector('span').textContent = text;
    };

    const showToast = (message) => {
        elements.toast.textContent = message;
        elements.toast.classList.add('is-visible');
        window.clearTimeout(toastTimeout);
        toastTimeout = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 4500);
    };

    const updateSummary = (data) => {
        const summary = findSummary(data);
        const candidates = getCandidates(data);
        const sections = numeric(summary.sections);
        const totalSections = numeric(summary.sectionsTotal);
        const completion = summary.sectionsRate === '—'
            ? (totalSections > 0 ? Math.min(100, sections / totalSections * 100) : 0)
            : Math.min(100, numeric(summary.sectionsRate));
        const valid = numeric(summary.valid);
        const nullVotes = numeric(summary.nullVotes);
        const whiteVotes = numeric(summary.whiteVotes);
        const absent = numeric(summary.absent);
        const allVoters = valid + nullVotes + whiteVotes;
        const validPercent = allVoters > 0 ? valid / allVoters * 100 : 0;

        document.querySelector('#sections-count').textContent = formatNumber(summary.sections);
        document.querySelector('#sections-percent').textContent = totalSections
            ? `${percent(completion)} das seções totalizadas`
            : 'Seções totalizadas pelo TSE';
        document.querySelector('#sections-progress').style.width = `${completion}%`;
        document.querySelector('#sections-badge').textContent = totalSections
            ? `${percent(completion)}`
            : 'TSE';
        document.querySelector('#votes-count').textContent = formatNumber(summary.votes);
        document.querySelector('#valid-votes').textContent = `${formatNumber(summary.valid)} válidos`;
        document.querySelector('#abstention-rate').textContent = summary.absentRate === '—'
            ? '—'
            : percent(summary.absentRate);
        document.querySelector('#abstention-count').textContent = `${formatNumber(summary.absent)} ausentes`;
        document.querySelector('#valid-percent').textContent = percent(validPercent);
        document.querySelector('#legend-valid').textContent = formatNumber(summary.valid);
        document.querySelector('#legend-null').textContent = formatNumber(summary.nullVotes);
        document.querySelector('#legend-white').textContent = formatNumber(summary.whiteVotes);
        document.querySelector('#legend-absent').textContent = formatNumber(summary.absent);
        document.querySelector('.donut').style.setProperty('--valid-share', `${validPercent}%`);
        document.querySelector('#candidate-count').textContent = candidates.length
            ? `${candidates.length} candidaturas no resultado`
            : 'Nenhuma candidatura encontrada para este filtro.';
        renderCandidates(candidates);
    };

    const renderCandidates = (candidates) => {
        const sorted = [...candidates].sort((a, b) => numeric(b.vap ?? b.votos) - numeric(a.vap ?? a.votos));
        if (sorted.length === 0) {
            const empty = '<div class="empty-state"><span class="empty-symbol">◷</span><strong>Sem candidaturas disponíveis</strong><span>O TSE ainda não publicou resultados para esta seleção.</span></div>';
            elements.candidateList.innerHTML = empty;
            elements.candidateTable.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhuma candidatura disponível.</td></tr>';
            return;
        }

        const topCandidates = sorted.slice(0, 5);
        elements.candidateList.innerHTML = topCandidates.map((candidate, index) => {
            const name = getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura');
            const party = getValue(candidate, ['sgp', 'partido', 'siglaPartido'], '—');
            const votes = getValue(candidate, ['vap', 'votos', 'votosNominais'], 0);
            const votePercent = getValue(candidate, ['pvap', 'percentual', 'percentualVotos'], '0');
            const image = candidate.foto ? `<img src="${escapeHtml(candidate.foto)}" alt="" loading="lazy">` : `<span>${escapeHtml(initials(name))}</span>`;
            return `<article class="candidate-row">
                <span class="candidate-rank">${String(index + 1).padStart(2, '0')}</span>
                <span class="candidate-avatar">${image}</span>
                <span class="candidate-details"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(party)}</small></span>
                <span class="candidate-votes"><strong>${formatNumber(votes)}</strong><small>votos</small></span>
                <span class="candidate-share"><strong>${percent(votePercent)}</strong><span class="mini-track"><i style="width:${Math.min(100, numeric(votePercent))}%"></i></span></span>
            </article>`;
        }).join('');

        elements.candidateTable.innerHTML = sorted.map((candidate, index) => `
            <tr>
                <td><span class="table-rank">${String(index + 1).padStart(2, '0')}</span></td>
                <td><strong>${escapeHtml(getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura'))}</strong></td>
                <td>${escapeHtml(getValue(candidate, ['sgp', 'partido', 'siglaPartido']))}</td>
                <td><span class="candidate-status">${escapeHtml(getValue(candidate, ['st', 'situacao', 'dsSitTotTurno'], 'Em apuração'))}</span></td>
                <td><strong>${formatNumber(getValue(candidate, ['vap', 'votos', 'votosNominais'], 0))}</strong></td>
                <td>${percent(getValue(candidate, ['pvap', 'percentual', 'percentualVotos'], 0))}</td>
            </tr>`).join('');
    };

    const initials = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);

    const loadResults = async ({ quiet = false } = {}) => {
        if (requestController) requestController.abort();
        requestController = new AbortController();
        const parameters = new URLSearchParams({
            region: elements.region.value,
            office: elements.office.value,
            turn: elements.turn.value,
        });
        updateConnection('is-loading', 'Sincronizando com o TSE');
        try {
            const response = await fetch(`api/results.php?${parameters}`, {
                headers: { Accept: 'application/json' },
                signal: requestController.signal,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha ao consultar os resultados.');
            currentPayload = data;
            updateSummary(data);
            updateConnection('is-connected', 'Atualização automática ativa');
            elements.lastUpdate.textContent = new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
            }).format(new Date());
            document.querySelector('#candidate-page-subtitle').textContent =
                `${elements.region.options[elements.region.selectedIndex].text} · ${elements.office.options[elements.office.selectedIndex].text} · ${elements.turn.options[elements.turn.selectedIndex].text}`;
            if (location.hash === '#states') renderStateCards();
        } catch (error) {
            if (error.name === 'AbortError') return;
            updateConnection('is-error', 'Dados indisponíveis');
            elements.lastUpdate.textContent = 'Não foi possível atualizar';
            if (!currentPayload) {
                elements.candidateList.innerHTML = `<div class="empty-state error-state"><span class="empty-symbol">!</span><strong>Não foi possível carregar os resultados</strong><span>${escapeHtml(error.message)}</span></div>`;
                elements.candidateTable.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(error.message)}</td></tr>`;
            }
            if (!quiet) showToast(error.message);
        }
    };

    const renderStateCards = () => {
        const grid = document.querySelector('#states-grid');
        grid.innerHTML = regions.map(([code, name]) => `
            <button type="button" class="state-card" data-region="${code}">
                <span class="state-code">${code.toUpperCase()}</span><span class="state-card-name">${name}</span><span class="state-arrow">→</span>
            </button>`).join('');
    };

    const setPage = (page) => {
        const titles = { overview: 'Visão geral', states: 'Estados', candidates: 'Candidaturas' };
        document.querySelectorAll('[data-view]').forEach((view) => view.classList.toggle('is-visible', view.dataset.view === page));
        document.querySelectorAll('[data-page]').forEach((link) => link.classList.toggle('is-active', link.dataset.page === page));
        document.querySelector('#breadcrumb-current').textContent = titles[page] || titles.overview;
        if (page === 'states') renderStateCards();
        if (page === 'candidates' && currentPayload) renderCandidates(getCandidates(currentPayload));
        document.querySelector('#sidebar').classList.remove('is-open');
    };

    document.querySelectorAll('[data-page]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const page = link.dataset.page;
            history.replaceState(null, '', `#${page}`);
            setPage(page);
        });
    });
    window.addEventListener('hashchange', () => setPage(location.hash.slice(1) || 'overview'));
    document.querySelectorAll('#region-filter, #office-filter, #turn-filter').forEach((filter) => {
        filter.addEventListener('change', () => loadResults());
    });
    document.querySelector('#refresh-button').addEventListener('click', () => loadResults());
    document.querySelector('#reset-filters').addEventListener('click', () => {
        elements.region.value = 'br';
        elements.office.value = '1';
        elements.turn.value = '1';
        loadResults();
    });
    document.querySelector('#menu-toggle').addEventListener('click', () => {
        document.querySelector('#sidebar').classList.toggle('is-open');
    });
    document.addEventListener('click', (event) => {
        const stateButton = event.target.closest('[data-region]');
        if (!stateButton) return;
        elements.region.value = stateButton.dataset.region;
        if (location.hash !== '#overview') {
            history.replaceState(null, '', '#overview');
            setPage('overview');
        }
        loadResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (location.hash) setPage(location.hash.slice(1));
    renderStateCards();
    loadResults();
    window.setInterval(() => loadResults({ quiet: true }), refreshInterval);
})();
