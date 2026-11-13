# Transporte de movimento e sincronização em staging

Escopo: porto e caçadas pelo mesmo HTTPS do jogo. Sem alteração de migrations, saves, catálogos, velocidade, colisões, dano, recompensas ou frequência da simulação.

## Contrato

`wss://<origem>/v1/realtime`, subprotocolo `mare.realtime.v1`. A conexão exige origem exata e cookie BFF; a primeira mensagem é `subscribe` com personagem e CSRF ligado à sessão. Identidade e propriedade são verificadas pelo serviço existente. Não há tokens de provedor ou credenciais em URL.

Mensagens `command` aceitam somente `world.move` e `world.stop`, com o mesmo contrato HTTP (requestId, versão, controle/epoch e intenção). O ACK vem depois do COMMIT. Ao perder a resposta, o cliente repete o mesmo requestId por HTTP e recebe o recibo persistido. Demais ações continuam no HTTP.

O servidor publica frames compactos com intervalo alvo de 100 ms, sem sobrepor leituras. Isso não muda os ticks do motor. Uma fila independente, limitada a uma execução e um pedido pendente, impede que uma projeção lenta bloqueie a entrada de movimento. Autoridade, locks, limite de comandos e durabilidade permanecem no serviço transacional.

A projeção completa de progressão continua em HTTP, a cada três segundos ou após ações que a exigem. Um ACK atrasado não substitui movimento mais recente nem provoca outra leitura completa apenas por estar atrasado. Não se promove a versão econômica a partir de frames de movimento.

## Segurança e falhas

- Limites: 64 conexões por processo, oito por IP e duas por sessão; 30 aberturas/minuto/IP; 8 KiB por mensagem; 24 mensagens/segundo/conexão. Os limites de ações existentes continuam ativos.
- Sem compressão. Buffer de saída acima de 256 KiB encerra consumidor lento. Inscrição em até cinco segundos; ausência de mensagens do cliente por 15 segundos encerra a conexão.
- Sequências crescentes, schema estrito, mensagens binárias/ações econômicas/campos extras recusados. Cada frame revalida sessão e propriedade; cada comando revalida o controlador.
- Se a validade do provedor terminar durante a projeção, o snapshot é descartado. A sessão é validada/renovada pelo caminho existente sob lock e um novo snapshot é lido. Revogação e expiração BFF continuam negando acesso. O mesmo tratamento limitado a uma nova leitura existe no cliente HTTP; mutações não são repetidas por essa regra.
- Falha do socket preserva o fallback HTTP. Reconexão não restaura controle revogado nem autoriza dados de outro personagem.

## Apresentação

Predição permanece visual, limitada e sujeita à colisão/velocidade do servidor. O buffer de caçada usa a cadência de realtime quando conectado, em vez do mínimo de 400/900 ms necessário ao polling antigo. Posições repetidas não diminuem artificialmente o intervalo representado pelo próximo passo do combate. Perda de atualizações termina no último ponto autorizado.

`Ping WS` mede ida e volta de uma mensagem curta; `Ping HTTP` inclui a resposta HTTP. `Atualizações` continua sendo o intervalo entre estados recebidos. Essas medidas não são intercambiáveis. Trocar transporte não promete RTT físico de 40–50 ms.

## Verificação reproduzível

- `npm test`, `npm run typecheck`, `npm run build`, `python tools/build_pages.py`.
- PostgreSQL isolado: `server-realtime`, `server-presentation-snapshot`, `server-game-client` e demais regressões afetadas. Provas incluem ACK perdido, replay único, quadro anterior ao ACK, consulta bloqueada sem bloquear comando, troca de controlador, CSRF, origem, propriedade, payload e expiração durante a projeção.
- `MARE_QA_REALTIME=1` no harness `tests/online-walking-browser.mts`: HTTPS, banco e workers reais com identidades sintéticas. Adiciona 125 ms em cada sentido do WebSocket; verifica cliques, WASD rápido, soltura, colisões, velocidade, monstros, viewport estreito, falhas de assets e preservação do save demo. Sem essa variável, testa o fallback HTTP anterior.
- Resultados e medições da aplicação na VPS devem ser registrados após execução; não considerar uma imagem construída como deploy ou como teste de jogabilidade.

## Operação

O Nginx precisa encaminhar o upgrade somente em `/v1/realtime`, com HTTP/1.1 e o mesmo controle de convite, cookies e identidade de proxy dos endpoints existentes. Sem nova porta pública, DNS ou alteração do site principal. O gateway local também encaminha apenas essa rota.

Antes de ativar: guardar dump PostgreSQL verificável, imagem anterior, três scripts do cliente e configuração do gateway. Ativar somente o container da API e os scripts; preservar container/volume PostgreSQL. Rollback de código não restaura banco nem descarta progresso. Monitorar `realtime_window`, `http_window`, fila do pool e eventos dos workers.

Este é um transporte limitado para homologação. Não certifica capacidade para milhares de jogadores: cada assinatura ainda consulta projeções autorizadas no PostgreSQL. Fan-out por sala, deltas e aceite de carga continuam exigindo medição própria.

## Evidências da bancada

- `npm test` final: 307/307 testes de fundação e 188/188 arquivos legados. Typecheck e build aprovados; auditoria das dependências de produção sem vulnerabilidades conhecidas. Nenhum `.env`, chave privada ou dump está no diff.
- Integração em PostgreSQL 18.6 isolado: 59/59 testes aprovados, sem skips, abrangendo transporte, snapshots/autorização, cliente real, HTTP, privilégios, comandos/recibos, estado, lobby, mundo, combate e workers. O ensaio de dois clientes no mesmo IP por 70 segundos executou 1.116 comandos HTTP sem erros; inclui 1.070 movimentos/paradas e 46 seleções de alvo.
- A regressão com a leitura de apresentação deliberadamente bloqueada recebeu o ACK do movimento antes de liberar a leitura. Isso demonstra e cobre a causa da espera na fila do transporte, sem aumentar o prazo de predição ou alterar ticks.
- A regressão de expiração faz o JWT vencer durante a consulta: o quadro antigo é recusado, a renovação usa o lock existente e somente um quadro novo é transmitido. O mock legado de revogação foi ajustado para também negar `/v1/me`; antes ele mantinha a sessão artificialmente válida e deixava a nova leitura sem resposta.
- Browser HTTPS, PostgreSQL e worker reais, identidades sintéticas: porto e Dawn, cliques rápidos, 80 mudanças de WASD, teclas sobrepostas, parada após tecla segurada, rejeição/reconciliação, perseguição automática e monstros aprovados. O transporte teve 125 ms artificiais em cada sentido. Foram recebidos 1.077 quadros; zero erros/limitações do transporte, zero puxão na soltura, zero marcadores de mouse causados pelo teclado, zero reinícios de animação dos monstros. Velocidades máximas observadas: 163,4 px/s manual e 131,4 px/s automática, dentro dos valores originais.
- Resposta visual das 80 teclas: p95 de 43,5 ms no porto e 44,6 ms em Dawn; máximos de 57 e 49,9 ms. Esses tempos descrevem a predição visual, não o RTT físico nem a confirmação durável.
- Viewports desktop/estreito, oito módulos de aparência atrasados por cerca de 28 segundos, falha de asset opcional, recusa específica de mapa essencial ausente e sentinela do save demo passaram.
- Houve execuções preliminares inválidas/falhas: competição com outro jogo em GPU 97%, expiração de JWT causando recarga e espera do comando atrás de leitura lenta. O ensaio aprovado foi executado depois do fechamento do outro jogo e das regressões correspondentes. Não se atribuiu a falha ao hardware da VPS.

O harness também passou integralmente com WebSocket desabilitado: fallback HTTP, 80 teclas, rejeição/reconciliação, velocidades, 53.298 amostras de monstros sem reinício/deslizamento, desconexão/reconexão, viewports e carregamento. O teste de rejeição agora espera o personagem renderizado alcançar a pose parada do servidor antes de tirar a referência; não compara uma pose ainda caminhando com uma posição final.

São resultados de bancada, não medições de capacidade nem garantia de latência na Internet.

## Aplicação e observação na VPS em 13/11/2026

O commit `3e167c54` foi ativado às 03:11 UTC somente em `teste.kaizokuidle2d.com.br`. Imagem `sha256:2bbd36e1fca0bb3ce58cb520ab298e1a115d795d314fd475daa96f4d95590510`, construída e testada com Docker na VPS. O container PostgreSQL permaneceu com o mesmo ID, sem migrations. Readiness 200, `nginx -t` aprovado e hashes dos três scripts conferidos pela origem HTTPS real, com `private/no-store`.

Backup anterior: `/srv/mare-staging/incoming/rollback-realtime-3e167c54.iRYOcr`, contendo dump customizado com índice verificado, configuração, scripts e identificação da imagem anterior. A conta e os personagens foram usados somente pelo fluxo normal do jogo; não houve reset, importação nem alteração direta de progressão.

No Opera do usuário, na origem de testes, foram observados porto, viagem a Dawn, movimento, combate automático e retorno ao porto. O HUD exibiu amostras de Ping WS de 41–49 ms, 60 FPS e intervalos de atualização de aproximadamente 92–116 ms. São leituras pontuais da tela, não percentis; não equivalem ao antigo Ping HTTP nem certificam ausência de trancos em todos os frames.

Janelas agregadas do servidor com duas conexões mostraram cerca de 1.192 frames/minuto, projeção média de 15–26 ms, comandos confirmados em média de 34–45 ms, fila do pool zero e event-loop máximo de até 50 ms nas janelas observadas. Uma amostra de recursos mostrou API em 13,44% de CPU/402 MiB e PostgreSQL em 30,49%/86 MiB. Esses dados não demonstram saturação da VPS nesse ensaio. Não houve 5xx, 429 nem consumidor lento nas janelas consultadas.

Algumas janelas tiveram recusas 4xx de comandos (uma delas: cinco recusas em 51 tentativas). O contador agregado ainda não distingue seus códigos: não atribuir todas as recusas a uma causa sem evidência adicional. A sessão automatizada isolada teve login 401 e não serviu como teste público; a observação real usou a sessão do usuário já aberta no Opera, com autorização.

### Regressão adicional de versão do movimento

A investigação reproduziu em PostgreSQL real um conflito evitável: uma alteração já confirmada chegava em frame compacto, mas o próximo movimento ainda usava a versão da progressão completa ou do último ACK. O teste falhou com `409 state_version_conflict` antes da correção. Movimento/parada agora consideram também a versão compacta validada do mesmo personagem. Isso não promove a versão dos dados econômicos, não dispensa o controle/epoch e não remove a verificação de versão no servidor. Recibos perdidos continuam usando o mesmo requestId.

O teste confirma movimento aceito, ausência de leitura completa extra, versão econômica intacta e replay único após perda do ACK. Conflitos legítimos continuam possíveis se o estado mudar depois do frame; esta correção elimina a reutilização comprovada de uma versão que o cliente já sabia estar desatualizada.

Após esse ajuste, `npm test` repetido passou com 307 testes de fundação e 188 arquivos legados; typecheck e 22 integrações do transporte, cliente e snapshots passaram. O harness completo de navegador passou novamente: 80 teclas, 1.100 frames recebidos, 69 comandos confirmados sem erros/limitações, 54.172 amostras de monstros sem deslizamento ou reinício, desktop/estreito, reconexão, assets atrasados e save demo preservado. Essa repetição continua usando 125 ms artificiais em cada sentido do WebSocket.

Referências técnicas: [ws](https://github.com/websockets/ws/blob/master/doc/ws.md), [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/), [interceptação de WebSocket no Playwright](https://playwright.dev/docs/api/class-websocketroute).
