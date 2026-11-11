# Auditoria de latência da VPS de testes — 11/11/2026

A animação do navegador, o tempo de uma requisição e o intervalo entre estados do servidor são medidas diferentes. A meta de 40 ms foi avaliada como latência HTTP. O worker calcula a caçada a cada 250 ms e a tela desenha entre as posições confirmadas. A cadência de apresentação e o custo de rede devem ser medidos separadamente. [Snapshot Interpolation](https://gafferongames.com/post/snapshot_interpolation/) · [Telemetria de rede do Source 2](https://help.steampowered.com/en/faqs/view/5E6F-5B36-5485-F6B9)

| Caminho | Amostra | Mediana | p95 |
|---|---|---:|---:|
| Prontidão da API por loopback na VPS | 24 respostas após a primeira | 3 ms | 7 ms |
| Endpoint leve de sessão pelo domínio, a partir da VPS | 24 respostas após a primeira, HTTP/2 | 22,5 ms | 39 ms |
| Mesmo endpoint pelo domínio, a partir do PC | 30 respostas após a primeira, Node fetch | 68 ms | 407 ms |
| Atualizações em Dawn no navegador, versão anterior | 5 respostas com dados controlados | 756 ms | 761 ms |
| Atualizações em Dawn no navegador, candidata | 14 respostas com dados controlados | 263 ms | 298 ms |

O mínimo do PC foi 54 ms, com processamento de 1–20 ms registrado pelo servidor. A rota pública do PC chegou à borda GRU. O teste da VPS e o do PC usam clientes HTTP diferentes e não permitem subtrair percentis para atribuir o atraso a um único trecho. A amostra inicial da VPS tinha 2 CPUs, 3.867 MiB de memória e 2.696 MiB disponíveis. As janelas da API observadas no ambiente em uso mostraram médias de 12–14 ms durante o jogo e nenhum 429 ou 5xx. [Cloudflare: diagnóstico de sites lentos](https://developers.cloudflare.com/speed/troubleshooting/slow-website/) · [MDN: Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)

O ensaio interno usou PostgreSQL descartável na VPS, um personagem sintético por destino e um no porto, com simulação real e dez segundos de leitura simultânea por cenário. Os 15 destinos foram selecionados pelo catálogo. A viagem para Skypiea falhava antes da auditoria por uma restrição antiga de conquistas. A tabela compara as duas cadências após essa correção de esquema. Cada caçada teve 40 respostas na candidata.

| Mapa | HTTP p95 antes → candidata | Atualizações p95 antes → candidata |
|---|---:|---:|
| Porto | 63 → 94 ms | 765 → 781 ms |
| Dawn | 54 → 31 ms | 791 → 266 ms |
| Conchas | 28 → 34 ms | 769 → 274 ms |
| Orange | 20 → 23 ms | 762 → 261 ms |
| Animais Raros | 16 → 28 ms | 758 → 269 ms |
| Syrup | 28 → 22 ms | 755 → 275 ms |
| Baratie | 18 → 29 ms | 759 → 270 ms |
| Arlong | 17 → 19 ms | 755 → 266 ms |
| Loguetown | 10 → 16 ms | 754 → 261 ms |
| Deserto de Alabasta | 11 → 12 ms | 753 → 253 ms |
| Alubarna 1 | 17 → 19 ms | 753 → 264 ms |
| Alubarna 2 | 39 → 12 ms | 775 → 256 ms |
| Alubarna 3 | 26 → 10 ms | 767 → 255 ms |
| Alubarna 4 | 19 → 10 ms | 763 → 253 ms |
| Alubarna 5 | 19 → 15 ms | 762 → 256 ms |
| Skypiea | 20 → 19 ms | 763 → 257 ms |

Na candidata, 614 respostas foram concluídas com zero erros, leituras descartadas ou interrupções registradas. O resultado do porto nessa amostra piorou com mais leituras concorrentes de caçada. O teste independente com 16 vizinhos confirmou que a projeção do porto usa três consultas, em vez de até 18. A janela curta, o aquecimento e o comportamento da IA impedem atribuir cada variação de HTTP exclusivamente ao patch.

O primeiro ajuste usava 250 ms durante a caçada automática solo visível e voltava ao ritmo anterior quando media HTTP acima de 200 ms. Em caso de 429, respeitava a espera de 60 segundos da API. A interpolação usava a cadência mais rápida quando disponível. Party, masmorras, Impel Down e chefes de evento conservavam o intervalo anterior. A migração amplia a lista de visitas válidas para Skypiea sem reescrever registros. A escolha de cadência deve considerar o custo de cada tick e a quantidade de partidas que cabem em um núcleo. [Nakama: frequência de simulação autoritativa](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/#tick-rate)

O ensaio por mapa mede HTTP interno. A captura em Dawn carrega o cliente do domínio de testes e fornece ao jogo respostas controladas para medir cadência e desenho. Os 40 ms de HTTP pela internet, os 40 ms de intervalo entre estados e o comportamento sob lotação permanecem fora do que foi validado. Uma conexão persistente com envio após cada tick pode remover a espera até a próxima consulta. Seu impacto no túnel, na reconexão, na autorização e na carga da VPS exige um ensaio próprio. [Cloudflare Tunnel: streaming e WebSockets](https://developers.cloudflare.com/tunnel/troubleshooting/)

A suíte de fundação passou com 259 testes. A rodada Linux com lobby, mundo e projeção passou com 29 testes. No PostgreSQL local isolado, 83 de 84 testes de integração passaram na rodada paralela e 15 verificações adicionais de migração passaram. A falha na rodada paralela foi o teste de vitória do chefe privado. A suíte inteira do chefe passou em uma repetição isolada (6 de 6). A verificação de tipos, a compilação e o teste de caçada no navegador passaram.

A imagem da candidata e a imagem de retorno compatível com a migração foram montadas na VPS. A ativação ficou pendente porque a credencial temporária de SSH expirou. A migração 0056 foi validada apenas em bancos descartáveis.

## Verificação com dois jogadores no mesmo IP

A meta de 40 ms é uma referência. A verificação com duas sessões separadas em Dawn mede pausas de combate, erros, limites de requisição, leituras descartadas e filas. O ensaio usa dois personagens descartáveis, workers reais e o mesmo IP sintético no gateway local. Para reproduzir com o runtime compilado, execute `npm run load:local` com `MARE_LOAD_CLIENTS=2`, `MARE_LOAD_SHARED_IP=1`, `MARE_LOAD_INTERVAL_MS=250`, `MARE_LOAD_SIMULATION=workers`, `MARE_LOAD_SECONDS=75` e um `TEST_DATABASE_URL` apontando para um PostgreSQL descartável. `MARE_LOAD_PROGRESS=1` registra o p95 do HTTP e da API e a duração das renovações em janelas de dez segundos.

Na primeira rodada com o carregador de desenvolvimento, de 125 segundos, as 978 respostas emitidas foram HTTP 200. Os dois personagens permaneceram em caçada automática, sem fila no pool ou reinício de worker. Houve 22 leituras descartadas porque a resposta anterior ainda estava em voo. Na repetição isolada de 75 segundos, houve 582 respostas HTTP 200, 18 leituras bloqueadas pela resposta anterior e p95 de 50 ms, com um pico de p95 de 450 ms na janela de 30 a 40 segundos. O gerador executou no horário previsto e nenhum pedido expirou. As duas rodadas reprovaram pelo critério de descartes. A repetição confirma que a execução concorrente das outras suítes é insuficiente para explicar o pico.

Com a API compilada no Windows (Node 24.15.0 e PostgreSQL 18.6), sem o carregador de desenvolvimento, os dois ensaios aprovaram. Todos os pedidos retornaram HTTP 200. Houve zero descartes, interrupções, reinícios de worker e espera observada no pool. A repetição de três minutos teve p95 por janela de dez segundos entre 26 e 34 ms. O ensaio é local e ainda não identifica a origem do pico do runtime de desenvolvimento nem dos trancos pelo domínio de testes.

| Duração | Leituras HTTP | p95 | p99 | Máximo | Renovações | Renovação mais lenta |
|---:|---:|---:|---:|---:|---:|---:|
| 75 s | 600 | 28 ms | 36 ms | 58 ms | 4 | 15 ms |
| 180 s | 1.440 | 29 ms | 36 ms | 74 ms | 10 | 17 ms |

A inspeção encontrou que a espera de até 10 segundos de uma leitura de estado podia bloquear as leituras seguintes. A leitura periódica agora tem prazo de 1,5 segundo, compartilhado com eventual consulta de estado completo, e espaça as novas tentativas a partir de 500 ms. Uma resposta 429 conserva a espera de 60 segundos. A validação das respostas e o envio de comandos continuam sob o contrato existente.

Na janela autenticada pelo domínio de testes, a próxima coleta deve parear o intervalo de atualização e o RTT no navegador com o `Server-Timing` da mesma resposta e as janelas `http_window` e `simulation_pool` na VPS. Os intervalos de estado medem a chegada de respostas sucessivas. O RTT mede o tempo de uma requisição. Uma captura em Dawn e no porto com as duas sessões permite localizar a diferença entre servidor, transporte e apresentação no navegador.

## Oscilação da cadência sob latência variável

A revisão `825489f6` foi ativada na VPS de testes após ensaio da migração numa cópia do banco. No ensaio isolado na VPS, duas sessões solo em Dawn fizeram 600 leituras em 75 segundos com p95 interno de 24 ms, sem descartes, interrupções, fila no pool ou reinícios de worker. O domínio HTTPS respondeu ao desafio de convite em todas as 12 requisições sem autenticação. Essa medição verifica o acesso ao gateway. O fluxo autenticado continua necessário para medir a rota real durante a partida.

A troca de 250 para 750 ms após uma única leitura acima de 200 ms adicionava espera a uma resposta que já estava atrasada. A regressão injeta respostas de 80, 325 e 900 ms e verifica a ausência de sobreposição. No Chromium, a espera após as três respostas de cerca de 325 ms caiu de 413–431 ms para 60–62 ms. A resposta de 900 ms continua ocupando a janela de leitura enquanto está em trânsito. A correção mantém uma leitura por vez, os limites de taxa e o recuo de novas tentativas em caso de erro. Os modos fora da caçada automática solo conservam a cadência anterior.

## Diagnóstico de picos na VPS

Uma janela real registrou 12 respostas e máximo de 2.826 ms, sem 429 ou 5xx. Na janela seguinte, 53 respostas tiveram máximo de 56 ms e os workers continuaram saudáveis. O contador antigo mistura todas as rotas e só registra respostas concluídas, então essas janelas não identificam o endpoint responsável.

O relatório `http_window` preserva os totais e passa a agrupar saúde, login, autenticação, quadros, estado, comandos e controle. `aborted` conta conexões encerradas antes de concluir a resposta. Esses casos ficam fora dos percentis de respostas completas. `eventLoopMaxMs` é a maior amostra do event loop da API na janela e `dbPoolWaiting` é a fila no momento da coleta. As métricas ficam no log privado e usam categorias fixas, sem caminhos brutos, parâmetros, identificadores ou credenciais. O teste HTTP cobre fechamento antecipado e evita contagem dupla de respostas concluídas. [Eventos HTTP e estado da resposta no Node.js](https://nodejs.org/docs/latest-v24.x/api/http.html#responsewritablefinished) · [Amostragem do event loop](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions)
