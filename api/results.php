<?php
declare(strict_types=1);

$config = require dirname(__DIR__) . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$turn = (string) ($_GET['turn'] ?? '1');
$office = (string) ($_GET['office'] ?? '1');
$region = strtolower((string) ($_GET['region'] ?? 'br'));
$municipality = (string) ($_GET['municipality'] ?? '');

if (!isset($config['offices'][$office])) {
    respond(400, ['error' => 'Cargo inválido para a eleição de 2026.']);
}

$officeConfig = $config['offices'][$office];
$electionCode = $config['election_codes'][$officeConfig['scope']][$turn] ?? null;
if ($electionCode === null) {
    respond(400, ['error' => 'Turno inválido. Selecione o primeiro ou o segundo turno.']);
}

$validRegions = [
    'ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms',
    'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc',
    'se', 'sp', 'to',
];

if ($region !== 'br' && !in_array($region, $validRegions, true)) {
    respond(400, ['error' => 'UF inválida.']);
}

if ($officeConfig['scope'] === 'state' && $region === 'br') {
    respond(400, ['error' => 'Selecione uma UF: o TSE publica os resultados desses cargos por estado, não em uma totalização nacional.']);
}

if ($municipality !== '' && ($region === 'br' || !preg_match('/^\d{5}$/', $municipality))) {
    respond(400, ['error' => 'Informe um código TSE de município com cinco dígitos e uma UF válida.']);
}

$electionYear = $config['election_year'];

if (!preg_match('/^\d{4}$/', $electionYear) || !preg_match('/^\d{3,4}$/', $electionCode)) {
    respond(500, ['error' => 'A configuração da eleição está inválida. Confira TSE_ELECTION_YEAR e os códigos da eleição e do turno.']);
}

$scope = $region;
if ($municipality !== '') {
    $scope .= $municipality;
}

$url = sprintf(
    '%s/ele%s/%s/dados/%s/%s-c%04d-e%06d-u.json',
    $config['tse_base_url'],
    $electionYear,
    $electionCode,
    $scope,
    $scope,
    (int) $office,
    (int) $electionCode
);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 12,
        'ignore_errors' => true,
        'header' => "Accept: application/json\r\nUser-Agent: ApuradorEleicao/1.0\r\n",
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
    ],
]);

set_error_handler(static function (int $severity, string $message): never {
    throw new ErrorException($message, 0, $severity);
});

try {
    $payload = file_get_contents($url, false, $context);
} catch (Throwable $exception) {
    restore_error_handler();
    error_log('Falha ao consultar a API do TSE: ' . $exception->getMessage());
    respond(502, ['error' => 'Não foi possível conectar ao serviço de resultados do TSE. Tente novamente em instantes.']);
}
restore_error_handler();

$statusLine = $http_response_header[0] ?? '';
preg_match('/\s(\d{3})\s/', $statusLine, $statusMatch);
$upstreamStatus = isset($statusMatch[1]) ? (int) $statusMatch[1] : 502;

if ($payload === false || $upstreamStatus < 200 || $upstreamStatus >= 300) {
    error_log(sprintf('API do TSE respondeu HTTP %d para %s', $upstreamStatus, $url));
    respond(502, [
        'error' => 'O TSE não disponibilizou resultados para essa combinação de eleição, turno, cargo e localidade.',
        'source_status' => $upstreamStatus,
    ]);
}

$data = json_decode($payload, true);
if (!is_array($data)) {
    error_log('A API do TSE retornou uma resposta JSON inválida.');
    respond(502, ['error' => 'O TSE retornou dados em um formato inesperado.']);
}

header('X-Data-Source: resultados.tse.jus.br');
echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
