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
- Suporte a execução local e via Docker Compose

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

## Executar com Docker Compose

```bash
docker compose up -d --build
```

Abra <http://localhost:8000>. O serviço é iniciado em segundo plano e usa `restart: unless-stopped`, então volta após uma falha ou reinicialização do Docker. Para conferir o estado e acompanhar os logs:

```bash
docker compose ps
docker compose logs -f apurador
```

Para parar e remover o contêiner:

```bash
docker compose down
```

Por padrão, a aplicação usa a porta `8000` e os códigos eleitorais descritos acima. Para alterar a porta ou sobrescrever as configurações, crie um arquivo `.env` ao lado do `docker-compose.yml`, por exemplo:

```dotenv
APURADOR_PORT=8001
TSE_ELECTION_YEAR=2026
TSE_FEDERAL_FIRST_TURN_CODE=6257
TSE_FEDERAL_SECOND_TURN_CODE=6258
TSE_STATE_FIRST_TURN_CODE=6259
TSE_STATE_SECOND_TURN_CODE=6260
```

Depois aplique as alterações com `docker compose up -d --build` e abra <http://localhost:8001>. Não use `docker compose down` se quiser que o serviço continue em execução; para reiniciá-lo manualmente, use `docker compose restart`.

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

Para Presidente, `region=br` consulta o resultado nacional. Governador, Senador e os cargos de deputado são publicados por UF; selecione uma sigla como `sp` para consultar esses cargos.

Exemplo:

```text
/api/results.php?region=br&office=1&turn=1
/api/results.php?region=sp&office=3&turn=1
```

O menu permite alternar entre visão geral, resultados por estado e candidaturas. Os filtros são usados em todas as telas e o botão de atualização força uma nova consulta.
