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
        year: document.querySelector('#year-filter'),
        region: document.querySelector('#region-filter'),
        office: document.querySelector('#office-filter'),
        turn: document.querySelector('#turn-filter'),
        connection: document.querySelector('#connection-status'),
        lastUpdate: document.querySelector('#last-update'),
        candidateList: document.querySelector('#candidate-list'),
        candidateCount: document.querySelector('#candidate-count'),
        candidateTable: document.querySelector('#candidate-table'),
        chart: document.querySelector('#results-chart'),
        chartType: document.querySelector('#chart-type'),
        chartMetric: document.querySelector('#chart-metric'),
        chartLimit: document.querySelector('#chart-limit'),
        electedPresidentResults: document.querySelector('#elected-president-results'),
        electedStatesGrid: document.querySelector('#elected-states-grid'),
        electedStateDetails: document.querySelector('#elected-state-details'),
        toast: document.querySelector('#toast'),
    };
    let currentPayload = null;
    let requestController = null;
    let electedLoadToken = 0;
    let electedView = 'president';
    let electedRegion = null;
    let toastTimeout;
    const themeToggle = document.querySelector('#theme-toggle');

    const setTheme = (theme, persist = false) => {
        const isDark = theme === 'dark';
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        themeToggle.textContent = isDark ? '☀' : '☾';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.title = isDark ? 'Ativar tema claro' : 'Ativar tema escuro';
        document.querySelector('meta[name="theme-color"]').content = isDark ? '#111821' : '#f5f7fa';

        if (persist) {
            try {
                localStorage.setItem('apurador-theme', isDark ? 'dark' : 'light');
            } catch (error) {
                console.warn('Não foi possível salvar a preferência de tema.', error);
            }
        }
    };

    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem('apurador-theme');
    } catch (error) {
        console.warn('Não foi possível carregar a preferência de tema.', error);
    }
    setTheme(savedTheme === 'dark' ? 'dark' : 'light');
    themeToggle.addEventListener('click', () => {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });

    const formatNumber = (value) => {
        const number = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(number) ? new Intl.NumberFormat('pt-BR').format(number) : '—';
    };

    const numeric = (value) => {
        if (typeof value === 'number') return value;
        const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const percentNumber = (value) => {
        if (typeof value === 'number') return value;
        const parsed = Number(String(value ?? '').trim().replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : numeric(value);
    };

    const percent = (value) => {
        const parsed = percentNumber(value);
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
        renderChart(candidates);
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
            const votePercent = percentNumber(getValue(candidate, ['pvap', 'percentual', 'percentualVotos'], '0'));
            return `<article class="candidate-row">
                <span class="candidate-rank">${String(index + 1).padStart(2, '0')}</span>
                ${renderCandidateAvatar(candidate, name)}
                <span class="candidate-details"><strong>${renderCandidateName(candidate, name)}</strong><small>${escapeHtml(party)}</small></span>
                <span class="candidate-votes"><strong>${formatNumber(votes)}</strong><small>votos</small></span>
                <span class="candidate-share"><strong>${percent(votePercent)}</strong><span class="mini-track"><i style="width:${Math.min(100, numeric(votePercent))}%"></i></span></span>
            </article>`;
        }).join('');

        elements.candidateTable.innerHTML = sorted.map((candidate, index) => `
            <tr>
                <td><span class="table-rank">${String(index + 1).padStart(2, '0')}</span></td>
                <td><span class="candidate-table-name">${renderCandidateAvatar(candidate, getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura'))}<strong>${renderCandidateName(candidate, getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura'))}</strong></span></td>
                <td>${escapeHtml(getValue(candidate, ['sgp', 'partido', 'siglaPartido']))}</td>
                <td><span class="candidate-status">${escapeHtml(getValue(candidate, ['st', 'situacao', 'dsSitTotTurno'], 'Em apuração'))}</span></td>
                <td><strong>${formatNumber(getValue(candidate, ['vap', 'votos', 'votosNominais'], 0))}</strong></td>
                <td>${percent(getValue(candidate, ['pvap', 'percentual', 'percentualVotos'], 0))}</td>
            </tr>`).join('');
        bindCandidateImageFallbacks(elements.candidateList);
        bindCandidateImageFallbacks(elements.candidateTable);
    };

    const initials = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    const isElected = (candidate) => {
        const electionFlag = String(getValue(candidate, ['e', 'eleito', 'isElected'], '')).toLowerCase();
        const status = String(getValue(candidate, ['st', 'dsSitTotTurno', 'situacaoTurno', 'situacao'], ''))
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
        return ['s', 'sim', 'true', '1'].includes(electionFlag) || /^ELEIT[OA]\b/.test(status);
    };

    const renderCandidateName = (candidate, name) => {
        const badge = isElected(candidate) ? '<span class="candidate-elected-badge" aria-label="Candidato eleito">ELEITO</span>' : '';
        return `<span class="candidate-name"><span class="candidate-name-label">${escapeHtml(name)}</span>${badge}</span>`;
    };

    const candidatePhotoUrl = (candidate, regionOverride = '') => {
        const photo = getValue(candidate, ['foto', 'fotoUrl', 'urlFoto', 'foto_url'], '');
        if (photo) return String(photo);

        const candidateId = String(getValue(candidate, ['sqcand', 'sqCandidato', 'sq_candidato'], ''));
        const year = String(elements.year.value);
        if (!/^\d{12}$/.test(candidateId) || !/^\d{4}$/.test(year)) return '';

        const region = regionOverride
            ? (regionOverride === 'br' ? 'BR' : regionOverride.toUpperCase())
            : elements.office.value === '1' ? 'BR' : elements.region.value.toUpperCase();
        return `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/204060${year}/${candidateId}/${region}`;
    };

    const renderCandidateAvatar = (candidate, name, region = '') => {
        const photo = candidatePhotoUrl(candidate, region);
        const image = photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy">` : '';
        return `<span class="candidate-avatar"><span>${escapeHtml(initials(name))}</span>${image}</span>`;
    };

    const bindCandidateImageFallbacks = (container) => {
        container.querySelectorAll('.candidate-avatar img').forEach((image) => {
            image.addEventListener('error', () => image.remove(), { once: true });
        });
    };

    const fetchElectionResults = async (region, office) => {
        const parameters = new URLSearchParams({ region, office, turn: elements.turn.value });
        const response = await fetch(`api/results.php?${parameters}`, {
            headers: { Accept: 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao consultar os resultados.');
        return data;
    };

    const electedCandidates = (data) => getCandidates(data).filter(isElected);

    const renderElectedCandidates = (candidates, emptyMessage, region) => {
        if (candidates.length === 0) {
            return `<div class="elected-empty">${escapeHtml(emptyMessage)}</div>`;
        }
        return `<div class="elected-candidate-list">${candidates.map((candidate) => {
            const name = getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura');
            const party = getValue(candidate, ['sgp', 'partido', 'siglaPartido'], '—');
            return `<article class="elected-candidate">
                ${renderCandidateAvatar(candidate, name, region)}
                <span class="elected-candidate-info"><strong>${renderCandidateName(candidate, name)}</strong><small>${escapeHtml(party)}</small></span>
            </article>`;
        }).join('')}</div>`;
    };

    const loadElectedPresident = async () => {
        const token = ++electedLoadToken;
        elements.electedPresidentResults.innerHTML = '<div class="elected-loading">Consultando resultado nacional do TSE…</div>';
        try {
            const data = await fetchElectionResults('br', '1');
            if (token !== electedLoadToken) return;
            elements.electedPresidentResults.innerHTML = renderElectedCandidates(
                electedCandidates(data),
                'O TSE ainda não confirmou candidatura eleita para a Presidência neste turno.',
                'br',
            );
            bindCandidateImageFallbacks(elements.electedPresidentResults);
        } catch (error) {
            if (token !== electedLoadToken) return;
            elements.electedPresidentResults.innerHTML = `<div class="elected-error">${escapeHtml(error.message)}</div>`;
        }
    };

    const renderElectedStateCards = () => {
        elements.electedStatesGrid.innerHTML = regions.map(([code, name]) => `
            <button type="button" class="state-card${electedRegion === code ? ' is-selected' : ''}" data-elected-region="${code}">
                <span class="state-code">${code.toUpperCase()}</span><span class="state-card-name">${name}</span><span class="state-arrow">→</span>
            </button>`).join('');
    };

    const loadElectedState = async (region) => {
        electedRegion = region;
        renderElectedStateCards();
        const token = ++electedLoadToken;
        const regionName = regions.find(([code]) => code === region)?.[1] ?? region.toUpperCase();
        const offices = [
            ['3', 'Governador'],
            ['5', 'Senador'],
            ['6', 'Deputado federal'],
            [region === 'df' ? '8' : '7', region === 'df' ? 'Deputado distrital' : 'Deputado estadual'],
        ];
        elements.electedStateDetails.innerHTML = `<div class="panel-heading"><div><h2>${escapeHtml(regionName)}</h2><p>Eleitos confirmados no ${elements.turn.value}º turno</p></div></div><div class="elected-office-grid">${offices.map(([, name]) => `<section class="elected-office-card"><h3>${escapeHtml(name)}</h3><div class="elected-loading">Consultando o TSE…</div></section>`).join('')}</div>`;

        const cards = [...elements.electedStateDetails.querySelectorAll('.elected-office-card')];
        for (const [index, [office, name]] of offices.entries()) {
            try {
                const data = await fetchElectionResults(region, office);
                if (token !== electedLoadToken) return;
                cards[index].innerHTML = `<h3>${escapeHtml(name)}</h3>${renderElectedCandidates(
                    electedCandidates(data),
                    'Nenhuma candidatura eleita confirmada pelo TSE.',
                    region,
                )}`;
                bindCandidateImageFallbacks(cards[index]);
            } catch (error) {
                if (token !== electedLoadToken) return;
                cards[index].innerHTML = `<h3>${escapeHtml(name)}</h3><div class="elected-error">${escapeHtml(error.message)}</div>`;
            }
        }
    };

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);

    const renderChartMessage = (title, message, isError = false) => {
        elements.chart.innerHTML = `<div class="empty-state${isError ? ' error-state' : ''}"><span class="empty-symbol">${isError ? '!' : '◷'}</span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
    };

    const renderChart = (candidates) => {
        const metric = elements.chartMetric.value;
        const limit = Number(elements.chartLimit.value);
        const sorted = [...candidates]
            .sort((a, b) => numeric(b.vap ?? b.votos) - numeric(a.vap ?? a.votos))
            .slice(0, limit)
            .map((candidate) => ({
                name: String(getValue(candidate, ['nm', 'nmu', 'nome', 'nomeurna', 'cc'], 'Candidatura')),
                party: String(getValue(candidate, ['sgp', 'partido', 'siglaPartido'], '—')),
                votes: numeric(getValue(candidate, ['vap', 'votos', 'votosNominais'], 0)),
                share: percentNumber(getValue(candidate, ['pvap', 'percentual', 'percentualVotos'], 0)),
            }));
        const chartType = elements.chartType.value;
        const metricLabel = metric === 'votes' ? 'votos' : '% dos votos válidos';
        const title = chartType === 'donut'
            ? 'Distribuição das candidaturas'
            : metric === 'votes' ? 'Votos por candidatura' : 'Percentual por candidatura';
        document.querySelector('#chart-title').textContent = title;

        if (sorted.length === 0) {
            document.querySelector('#chart-subtitle').textContent = 'Sem candidaturas para a seleção atual.';
            renderChartMessage('Sem resultados para exibir', 'O TSE ainda não publicou candidaturas para os filtros selecionados.');
            return;
        }

        const valueOf = (candidate) => metric === 'votes' ? candidate.votes : candidate.share;
        const formatValue = (candidate) => metric === 'votes' ? formatNumber(candidate.votes) : percent(candidate.share);
        const subtitle = `${sorted.length} ${sorted.length === 1 ? 'candidatura exibida' : 'candidaturas exibidas'} · ${metricLabel}`;
        document.querySelector('#chart-subtitle').textContent = subtitle;

        if (chartType === 'donut') {
            renderDonutChart(sorted, valueOf, formatValue, subtitle);
        } else if (chartType === 'columns') {
            renderColumnChart(sorted, valueOf, formatValue, metric);
        } else {
            renderHorizontalChart(sorted, valueOf, formatValue, metric);
        }
    };

    const renderHorizontalChart = (candidates, valueOf, formatValue, metric) => {
        const width = 960;
        const rowHeight = 52;
        const barX = 240;
        const barWidth = 570;
        const maxValue = Math.max(...candidates.map(valueOf), 0);
        if (maxValue <= 0) {
            elements.chart.innerHTML = '<div class="chart-zero-state">Ainda não há votos contabilizados para comparar.</div>';
            return;
        }
        const rows = candidates.map((candidate, index) => {
            const y = index * rowHeight;
            const bar = Math.max(2, valueOf(candidate) / maxValue * barWidth);
            return `<g>
                <text class="chart-label" x="8" y="${y + 21}">${escapeHtml(candidate.name.slice(0, 30))}</text>
                <text class="chart-sub-label" x="8" y="${y + 37}">${escapeHtml(candidate.party)}</text>
                <rect class="chart-track" x="${barX}" y="${y + 11}" width="${barWidth}" height="20" rx="6"></rect>
                <rect x="${barX}" y="${y + 11}" width="${bar}" height="20" rx="6" fill="${index === 0 ? 'var(--orange)' : 'var(--chart-bar)'}"></rect>
                <text class="chart-value" x="${barX + barWidth + 14}" y="${y + 26}">${escapeHtml(formatValue(candidate))}</text>
            </g>`;
        }).join('');
        elements.chart.innerHTML = `<svg class="results-svg horizontal-svg" viewBox="0 0 ${width} ${candidates.length * rowHeight}" role="img" aria-label="Gráfico de barras horizontais comparando ${candidates.length} candidaturas por ${metric === 'votes' ? 'total de votos' : 'percentual de votos válidos'}">${rows}</svg>`;
    };

    const renderColumnChart = (candidates, valueOf, formatValue, metric) => {
        const width = 960;
        const height = 390;
        const left = 58;
        const top = 22;
        const bottom = 92;
        const plotHeight = height - top - bottom;
        const plotWidth = width - left - 18;
        const slot = plotWidth / candidates.length;
        const barWidth = Math.min(48, slot * 0.62);
        const maxValue = Math.max(...candidates.map(valueOf), 0);
        if (maxValue <= 0) {
            elements.chart.innerHTML = '<div class="chart-zero-state">Ainda não há votos contabilizados para comparar.</div>';
            return;
        }
        const grid = [0, 0.5, 1].map((ratio) => {
            const y = top + plotHeight * (1 - ratio);
            const label = metric === 'votes' ? formatNumber(maxValue * ratio) : percent(maxValue * ratio);
            return `<line class="chart-gridline" x1="${left}" x2="${width - 18}" y1="${y}" y2="${y}"></line><text class="chart-axis-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${escapeHtml(label)}</text>`;
        }).join('');
        const bars = candidates.map((candidate, index) => {
            const value = valueOf(candidate);
            const barHeight = value / maxValue * plotHeight;
            const x = left + slot * index + (slot - barWidth) / 2;
            const y = top + plotHeight - barHeight;
            const labelX = x + barWidth / 2;
            return `<g>
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="5" fill="${index === 0 ? 'var(--orange)' : 'var(--chart-bar)'}">
                    <title>${escapeHtml(candidate.name)} · ${escapeHtml(formatValue(candidate))}</title>
                </rect>
                <text class="chart-column-value" x="${labelX}" y="${Math.max(top + 12, y - 8)}" text-anchor="middle">${escapeHtml(formatValue(candidate))}</text>
                <text class="chart-column-label" x="${labelX}" y="${top + plotHeight + 20}" text-anchor="middle">${escapeHtml(candidate.name.slice(0, 13))}</text>
                <text class="chart-sub-label" x="${labelX}" y="${top + plotHeight + 36}" text-anchor="middle">${escapeHtml(candidate.party.slice(0, 11))}</text>
            </g>`;
        }).join('');
        elements.chart.innerHTML = `<svg class="results-svg column-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de colunas comparando ${candidates.length} candidaturas">${grid}${bars}</svg>`;
    };

    const renderDonutChart = (candidates, valueOf, formatValue, subtitle) => {
        const total = candidates.reduce((sum, candidate) => sum + valueOf(candidate), 0);
        if (total <= 0) {
            elements.chart.innerHTML = '<div class="chart-zero-state">Ainda não há votos contabilizados para comparar.</div>';
            return;
        }
        const circumference = 565.49;
        let offset = 0;
        const colors = ['var(--orange)', '#41b995', '#edb654', '#6684bd', '#dd7370', '#9b79bd', '#59a9c2', '#a0ad7e', '#e28d50', '#8293a4'];
        const segments = candidates.map((candidate, index) => {
            const length = valueOf(candidate) / total * circumference;
            const segment = `<circle cx="150" cy="150" r="90" fill="none" stroke="${colors[index % colors.length]}" stroke-width="34" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${escapeHtml(candidate.name)} · ${escapeHtml(formatValue(candidate))}</title></circle>`;
            offset += length;
            return segment;
        }).join('');
        const legend = candidates.map((candidate, index) => `
            <div class="donut-legend-item">
                <i style="--legend-color:${colors[index % colors.length]}"></i>
                <span title="${escapeHtml(candidate.name)}">${escapeHtml(candidate.name.slice(0, 20))}</span>
                <strong>${escapeHtml(formatValue(candidate))}</strong>
            </div>`).join('');
        elements.chart.innerHTML = `<div class="donut-chart-layout">
            <svg class="results-svg donut-svg" viewBox="0 0 300 300" role="img" aria-label="Gráfico de rosca com a distribuição dos votos entre ${candidates.length} candidaturas">
                <g transform="rotate(-90 150 150)">${segments}</g>
                <text class="donut-total" x="150" y="145" text-anchor="middle">${escapeHtml(candidates.length)}</text>
                <text class="donut-caption" x="150" y="166" text-anchor="middle">candidaturas</text>
            </svg>
            <div class="donut-legend" aria-label="Legenda do gráfico">${legend}</div>
        </div><span class="visually-hidden">${escapeHtml(subtitle)}</span>`;
    };

    const loadResults = async ({ quiet = false } = {}) => {
        if (requestController) requestController.abort();
        requestController = new AbortController();
        const parameters = new URLSearchParams({
            region: elements.region.value,
            office: elements.office.value,
            turn: elements.turn.value,
        });
        updateConnection('is-loading', 'Sincronizando com o TSE');
        renderChartMessage('Atualizando gráfico', 'Aguardando os dados oficiais desta seleção.');
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
            currentPayload = null;
            updateConnection('is-error', 'Dados indisponíveis');
            elements.lastUpdate.textContent = 'Não foi possível atualizar';
            document.querySelector('#sections-count').textContent = '—';
            document.querySelector('#sections-percent').textContent = 'Dados indisponíveis para esta seleção';
            document.querySelector('#sections-progress').style.width = '0%';
            document.querySelector('#sections-badge').textContent = 'TSE';
            document.querySelector('#votes-count').textContent = '—';
            document.querySelector('#valid-votes').textContent = '— válidos';
            document.querySelector('#abstention-rate').textContent = '—';
            document.querySelector('#abstention-count').textContent = '— ausentes';
            document.querySelector('#valid-percent').textContent = '—';
            document.querySelector('#legend-valid').textContent = '—';
            document.querySelector('#legend-null').textContent = '—';
            document.querySelector('#legend-white').textContent = '—';
            document.querySelector('#legend-absent').textContent = '—';
            document.querySelector('.donut').style.setProperty('--valid-share', '0%');
            elements.candidateCount.textContent = 'Resultados indisponíveis para esta seleção.';
            elements.candidateList.innerHTML = `<div class="empty-state error-state"><span class="empty-symbol">!</span><strong>Não foi possível carregar os resultados</strong><span>${escapeHtml(error.message)}</span></div>`;
            elements.candidateTable.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(error.message)}</td></tr>`;
            renderChartMessage('Não foi possível carregar o gráfico', error.message, true);
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
        const titles = { overview: 'Visão geral', states: 'Estados', elected: 'Eleitos', candidates: 'Candidaturas', charts: 'Gráficos' };
        document.querySelectorAll('[data-view]').forEach((view) => view.classList.toggle('is-visible', view.dataset.view === page));
        document.querySelectorAll('[data-page]').forEach((link) => link.classList.toggle('is-active', link.dataset.page === page));
        document.querySelector('#breadcrumb-current').textContent = titles[page] || titles.overview;
        if (page === 'states') renderStateCards();
        if (page === 'elected') {
            renderElectedStateCards();
            if (electedView === 'president') loadElectedPresident();
            else if (electedRegion) loadElectedState(electedRegion);
        }
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
        filter.addEventListener('change', () => {
            loadResults();
            if (filter === elements.turn && location.hash === '#elected') {
                if (electedView === 'president') loadElectedPresident();
                else if (electedRegion) loadElectedState(electedRegion);
            }
        });
    });
    document.querySelectorAll('#chart-type, #chart-metric, #chart-limit').forEach((control) => {
        control.addEventListener('change', () => {
            if (currentPayload) renderChart(getCandidates(currentPayload));
        });
    });
    document.querySelector('#refresh-button').addEventListener('click', () => {
        loadResults();
        if (location.hash === '#elected') {
            if (electedView === 'president') loadElectedPresident();
            else if (electedRegion) loadElectedState(electedRegion);
        }
    });
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
        const electedTab = event.target.closest('[data-elected-view]');
        if (electedTab) {
            electedView = electedTab.dataset.electedView;
            document.querySelectorAll('[data-elected-view]').forEach((tab) => {
                const selected = tab === electedTab;
                tab.classList.toggle('is-active', selected);
                tab.setAttribute('aria-selected', String(selected));
            });
            document.querySelector('#elected-president-view').hidden = electedView !== 'president';
            document.querySelector('#elected-states-view').hidden = electedView !== 'states';
            electedLoadToken++;
            if (electedView === 'president') loadElectedPresident();
            else if (electedRegion) loadElectedState(electedRegion);
            return;
        }
        const electedStateButton = event.target.closest('[data-elected-region]');
        if (electedStateButton) {
            loadElectedState(electedStateButton.dataset.electedRegion);
            return;
        }
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
