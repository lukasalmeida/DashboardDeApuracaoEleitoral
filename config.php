<?php
declare(strict_types=1);

function environmentValue(string $name, string $default): string
{
    $value = getenv($name);
    return $value === false || $value === '' ? $default : $value;
}

return [
    'tse_base_url' => 'https://resultados.tse.jus.br/oficial',
    'election_year' => environmentValue('TSE_ELECTION_YEAR', '2026'),
    'election_codes' => [
        'federal' => [
            '1' => environmentValue('TSE_FEDERAL_FIRST_TURN_CODE', '6257'),
            '2' => environmentValue('TSE_FEDERAL_SECOND_TURN_CODE', '6258'),
        ],
        'state' => [
            '1' => environmentValue('TSE_STATE_FIRST_TURN_CODE', '6259'),
            '2' => environmentValue('TSE_STATE_SECOND_TURN_CODE', '6260'),
        ],
    ],
    'offices' => [
        '1' => ['name' => 'Presidente', 'scope' => 'federal'],
        '3' => ['name' => 'Governador', 'scope' => 'state'],
        '5' => ['name' => 'Senador', 'scope' => 'state'],
        '6' => ['name' => 'Deputado federal', 'scope' => 'state'],
        '7' => ['name' => 'Deputado estadual', 'scope' => 'state'],
        '8' => ['name' => 'Deputado distrital', 'scope' => 'state'],
    ],
];
