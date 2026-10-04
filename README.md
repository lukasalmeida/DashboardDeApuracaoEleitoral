# Apurador Eleitoral

Apurador Eleitoral é um painel web em PHP para acompanhar a apuração das eleições brasileiras com dados públicos e oficiais do Tribunal Superior Eleitoral (TSE). O projeto consulta os arquivos JSON de resultados no backend, centraliza as regras de acesso em um proxy local e apresenta a apuração em tempo real com filtros por região, cargo e turno.

## Descrição do repositório

Este repositório reúne uma interface de acompanhamento eleitoral responsiva, capaz de exibir visão geral da apuração, resultados por estado e ranking de candidaturas. A aplicação usa o servidor PHP como ponte para buscar os dados do TSE, evitando expor diretamente a origem oficial no navegador e permitindo que a tela seja atualizada automaticamente sem depender de chamadas cross-origin no cliente.

### Principais funcionalidades

- Consulta dos arquivos oficiais de resultado do TSE
- Atualização automática do painel em intervalos regulares
- Filtros por eleição, UF, cargo e turno
- Visualização em três perspectivas: visão geral, estados e candidaturas
- Proxy local para manter a fonte dos dados fixa e controlada
- Suporte a execução local e via Docker

## Requisitos

- PHP 8.1 ou superior
- Extensão OpenSSL habilitada para conexões HTTPS

## Executar localmente

```bash
php -S localhost:8000
```

Abra <http://localhost:8000>. O painel inicia configurado para as Eleições 2026. Os códigos variam entre cargos federais e estaduais e também entre os turnos; eles podem ser configurados por variáveis de ambiente:

```bash
TSE_ELECTION_YEAR=2026 \
TSE_FEDERAL_FIRST_TURN_CODE=6257 \
TSE_FEDERAL_SECOND_TURN_CODE=6258 \
TSE_STATE_FIRST_TURN_CODE=6259 \
TSE_STATE_SECOND_TURN_CODE=6260 \
php -S localhost:8000
```

Os códigos padrão seguem a configuração oficial do pleito de 2026: 6257/6258 para Presidente e 6259/6260 para os cargos estaduais, primeiro e segundo turnos, respectivamente. Deputado Federal está incluído no arquivo da eleição estadual, conforme o cadastro do TSE. O painel consome o arquivo unificado `-u.json`. Atualize as variáveis se o TSE publicar códigos diferentes. Até a publicação dos resultados, ou se o TSE não disponibilizar o arquivo solicitado, o painel informa que os dados estão indisponíveis; nenhum resultado demonstrativo é apresentado como se fosse oficial.

## Executar com Docker

```bash
docker build -t apurador-eleicao .
docker run --rm -p 8000:80 apurador-eleicao
```

Abra <http://localhost:8000>. Para sobrescrever as configurações da eleição:

O comando mantém o contêiner em primeiro plano no terminal; isso é esperado. Para executá-lo em segundo plano, acrescente `-d`. Se a porta `8000` já estiver ocupada, use outra porta no lado esquerdo do mapeamento, por exemplo `-p 8001:80`, e abra <http://localhost:8001>.

```bash
docker run --rm -p 8000:80 \
  -e TSE_ELECTION_YEAR=2026 \
  -e TSE_FEDERAL_FIRST_TURN_CODE=6257 \
  -e TSE_FEDERAL_SECOND_TURN_CODE=6258 \
  -e TSE_STATE_FIRST_TURN_CODE=6259 \
  -e TSE_STATE_SECOND_TURN_CODE=6260 \
  apurador-eleicao
```

## Integração

O endpoint `api/results.php` consulta o formato unificado de totalização do TSE:

```text
https://resultados.tse.jus.br/oficial/ele{ano}/{código-da-eleição-e-turno}/dados/{abrangência}/{arquivo}-c{cargo}-e{código-com-seis-dígitos}-u.json
```

Parâmetros aceitos pelo proxy:

- `region`: `br` ou sigla de UF.
- `office`: código TSE do cargo (por exemplo, `1` para Presidente e `6` para Deputado Federal).
- `turn`: `1` ou `2`.
- `municipality` (opcional): código TSE de cinco dígitos, junto com uma UF.

Exemplo:

```text
/api/results.php?region=br&office=1&turn=1
```

O menu permite alternar entre visão geral, resultados por estado e candidaturas. Os filtros são usados em todas as telas e o botão de atualização força uma nova consulta.
