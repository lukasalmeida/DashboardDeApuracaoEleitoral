<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$year = htmlspecialchars($config['election_year'], ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f5f7fa">
    <title>Apurador — Painel eleitoral</title>
    <link rel="stylesheet" href="assets/style.css">
    <script src="assets/app.js" defer></script>
</head>
<body>
<div class="app-shell">
    <aside class="sidebar" id="sidebar">
        <a class="brand" href="#overview" aria-label="Apurador, página inicial">
            <span class="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 36 36" fill="none"><path d="M8 25.5 15.2 18l5 4.8L29 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M23.5 12H29v5.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="brand-copy"><strong>apurador</strong><small>PAINEL ELEITORAL</small></span>
        </a>

        <div class="nav-caption">ACOMPANHAMENTO</div>
        <nav class="primary-nav" aria-label="Navegação principal">
            <a class="nav-link is-active" href="#overview" data-page="overview">
                <span class="nav-icon">▦</span><span>Visão geral</span>
            </a>
            <a class="nav-link" href="#states" data-page="states">
                <span class="nav-icon">⌖</span><span>Estados</span>
            </a>
            <a class="nav-link" href="#candidates" data-page="candidates">
                <span class="nav-icon">♙</span><span>Candidaturas</span>
            </a>
        </nav>

        <div class="sidebar-bottom">
            <div class="source-card">
                <span class="source-icon" aria-hidden="true">✓</span>
                <div><strong>Fonte oficial</strong><small>Dados publicados pelo TSE</small></div>
            </div>
            <div class="profile">
                <span class="profile-avatar">BR</span>
                <span><strong>Brasil</strong><small>Eleições <?= $year ?></small></span>
                <span class="profile-more" aria-hidden="true">···</span>
            </div>
        </div>
    </aside>

    <main class="main-area">
        <header class="topbar">
            <button class="menu-toggle" id="menu-toggle" type="button" aria-label="Abrir menu">☰</button>
            <div class="breadcrumbs"><span>Brasil</span><span class="crumb-separator">/</span><strong id="breadcrumb-current">Visão geral</strong></div>
            <div class="topbar-actions">
                <span class="connection-status" id="connection-status"><i></i><span>Conectando ao TSE</span></span>
                <button class="icon-button" id="theme-toggle" type="button" aria-label="Alternar tema" aria-pressed="false" title="Ativar tema escuro">☾</button>
                <button class="icon-button" id="refresh-button" type="button" aria-label="Atualizar agora" title="Atualizar agora">↻</button>
            </div>
        </header>

        <div class="content-wrap">
            <section class="page-view is-visible" id="page-overview" data-view="overview">
                <div class="page-heading">
                    <div>
                        <div class="eyebrow"><span class="live-dot"></span> APURAÇÃO ELEITORAL</div>
                        <h1>Acompanhe a apuração</h1>
                        <p class="page-description">Resultados oficiais atualizados diretamente da base do Tribunal Superior Eleitoral.</p>
                    </div>
                    <div class="last-update"><span>Última atualização</span><strong id="last-update">Aguardando dados</strong></div>
                </div>

                <div class="filter-bar">
                    <label class="filter-control">
                        <span>ELEIÇÃO</span>
                        <select id="year-filter" aria-label="Ano da eleição">
                            <option value="<?= $year ?>">Eleições <?= $year ?></option>
                        </select>
                    </label>
                    <span class="filter-divider"></span>
                    <label class="filter-control">
                        <span>LOCALIDADE</span>
                        <select id="region-filter" aria-label="Estado">
                            <option value="br">Brasil</option>
                            <option value="ac">Acre</option><option value="al">Alagoas</option><option value="ap">Amapá</option>
                            <option value="am">Amazonas</option><option value="ba">Bahia</option><option value="ce">Ceará</option>
                            <option value="df">Distrito Federal</option><option value="es">Espírito Santo</option><option value="go">Goiás</option>
                            <option value="ma">Maranhão</option><option value="mt">Mato Grosso</option><option value="ms">Mato Grosso do Sul</option>
                            <option value="mg">Minas Gerais</option><option value="pa">Pará</option><option value="pb">Paraíba</option>
                            <option value="pr">Paraná</option><option value="pe">Pernambuco</option><option value="pi">Piauí</option>
                            <option value="rj">Rio de Janeiro</option><option value="rn">Rio Grande do Norte</option><option value="rs">Rio Grande do Sul</option>
                            <option value="ro">Rondônia</option><option value="rr">Roraima</option><option value="sc">Santa Catarina</option>
                            <option value="sp">São Paulo</option><option value="se">Sergipe</option><option value="to">Tocantins</option>
                        </select>
                    </label>
                    <span class="filter-divider"></span>
                    <label class="filter-control">
                        <span>CARGO</span>
                        <select id="office-filter" aria-label="Cargo">
                            <option value="1">Presidente</option><option value="3">Governador</option><option value="5">Senador</option>
                            <option value="6">Deputado federal</option><option value="7">Deputado estadual</option>
                            <option value="8">Deputado distrital</option>
                        </select>
                    </label>
                    <span class="filter-divider"></span>
                    <label class="filter-control">
                        <span>TURNO</span>
                        <select id="turn-filter" aria-label="Turno"><option value="1">1º turno</option><option value="2">2º turno</option></select>
                    </label>
                    <button class="filter-reset" id="reset-filters" type="button" title="Restaurar filtros">↺</button>
                </div>

                <div class="summary-grid">
                    <article class="summary-card primary-summary">
                        <div class="card-topline"><span>SEÇÕES APURADAS</span><span class="card-icon">▤</span></div>
                        <div class="metric-value" id="sections-count">—</div>
                        <div class="metric-foot"><span id="sections-percent">Aguardando totalização</span><span class="metric-badge" id="sections-badge">TSE</span></div>
                        <div class="progress-track"><span id="sections-progress"></span></div>
                    </article>
                    <article class="summary-card">
                        <div class="card-topline"><span>VOTOS APURADOS</span><span class="card-icon mint">✓</span></div>
                        <div class="metric-value" id="votes-count">—</div>
                        <div class="metric-foot"><span>Votos contabilizados</span><span class="metric-side" id="valid-votes">— válidos</span></div>
                    </article>
                    <article class="summary-card">
                        <div class="card-topline"><span>ABSTENÇÃO</span><span class="card-icon amber">↗</span></div>
                        <div class="metric-value" id="abstention-rate">—</div>
                        <div class="metric-foot"><span>Eleitoras e eleitores ausentes</span><span class="metric-side" id="abstention-count">—</span></div>
                    </article>
                </div>

                <div class="dashboard-grid">
                    <section class="panel results-panel">
                        <div class="panel-heading">
                            <div><h2>Resultado por candidatura</h2><p>Votos e percentual sobre os votos válidos</p></div>
                            <span class="data-tag"><i></i> DADOS DO TSE</span>
                        </div>
                        <div class="candidate-list" id="candidate-list">
                            <div class="empty-state"><span class="empty-symbol">◷</span><strong>Carregando resultados</strong><span>Aguardando a resposta do serviço oficial.</span></div>
                        </div>
                        <div class="panel-footer"><span id="candidate-count">As candidaturas aparecem após a primeira atualização.</span><a href="#candidates" data-page="candidates">Ver candidaturas <span>→</span></a></div>
                    </section>

                    <section class="panel turnout-panel">
                        <div class="panel-heading">
                            <div><h2>Dados da apuração</h2><p>Progresso da totalização</p></div>
                            <span class="chart-menu" aria-hidden="true">···</span>
                        </div>
                        <div class="turnout-chart" id="turnout-chart" aria-label="Gráfico de votos válidos, brancos, nulos e abstenção">
                            <div class="donut"><div class="donut-center"><strong id="valid-percent">—</strong><span>votos válidos</span></div></div>
                            <div class="chart-legend">
                                <div><i class="legend-valid"></i><span>Válidos</span><strong id="legend-valid">—</strong></div>
                                <div><i class="legend-null"></i><span>Nulos</span><strong id="legend-null">—</strong></div>
                                <div><i class="legend-white"></i><span>Brancos</span><strong id="legend-white">—</strong></div>
                                <div><i class="legend-absent"></i><span>Abstenções</span><strong id="legend-absent">—</strong></div>
                            </div>
                        </div>
                        <div class="turnout-note"><span class="note-icon">i</span><span>Os percentuais podem mudar até o encerramento da totalização.</span></div>
                    </section>
                </div>

                <section class="panel regional-panel">
                    <div class="panel-heading">
                        <div><h2>Apuração por estado</h2><p>Selecione um estado para consultar os resultados locais</p></div>
                        <a class="text-link" href="#states" data-page="states">Ver todos <span>→</span></a>
                    </div>
                    <div class="state-chips" id="state-chips">
                        <button type="button" data-region="sp"><span class="state-code">SP</span><span>São Paulo</span><span class="state-arrow">↗</span></button>
                        <button type="button" data-region="mg"><span class="state-code">MG</span><span>Minas Gerais</span><span class="state-arrow">↗</span></button>
                        <button type="button" data-region="rj"><span class="state-code">RJ</span><span>Rio de Janeiro</span><span class="state-arrow">↗</span></button>
                        <button type="button" data-region="ba"><span class="state-code">BA</span><span>Bahia</span><span class="state-arrow">↗</span></button>
                        <button type="button" data-region="pr"><span class="state-code">PR</span><span>Paraná</span><span class="state-arrow">↗</span></button>
                        <button type="button" data-region="rs"><span class="state-code">RS</span><span>Rio Grande do Sul</span><span class="state-arrow">↗</span></button>
                    </div>
                </section>
            </section>

            <section class="page-view" id="page-states" data-view="states">
                <div class="page-heading">
                    <div><div class="eyebrow">ACOMPANHAMENTO REGIONAL</div><h1>Resultados por estado</h1><p class="page-description">Escolha uma unidade federativa para consultar a totalização publicada pelo TSE.</p></div>
                </div>
                <section class="panel states-page-panel">
                    <div class="panel-heading"><div><h2>Unidades federativas</h2><p>Os dados são carregados para o cargo e turno selecionados</p></div></div>
                    <div class="states-grid" id="states-grid"></div>
                </section>
            </section>

            <section class="page-view" id="page-candidates" data-view="candidates">
                <div class="page-heading">
                    <div><div class="eyebrow">DISPUTA ELEITORAL</div><h1>Candidaturas</h1><p class="page-description">Classificação por votos recebidos na localidade selecionada.</p></div>
                </div>
                <section class="panel candidates-page-panel">
                    <div class="panel-heading"><div><h2>Resultado completo</h2><p id="candidate-page-subtitle">Dados consolidados pela Justiça Eleitoral</p></div></div>
                    <div class="table-wrap">
                        <table><thead><tr><th>POSIÇÃO</th><th>CANDIDATURA</th><th>PARTIDO</th><th>SITUAÇÃO</th><th>VOTOS</th><th>% VÁLIDOS</th></tr></thead>
                            <tbody id="candidate-table"><tr><td colspan="6" class="table-empty">Aguardando dados do TSE.</td></tr></tbody></table>
                    </div>
                </section>
            </section>

            <footer class="page-footer"><span>Os dados são fornecidos pelo Tribunal Superior Eleitoral.</span><a href="https://resultados.tse.jus.br/" target="_blank" rel="noopener noreferrer">Consultar portal oficial do TSE ↗</a></footer>
        </div>
    </main>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</body>
</html>
