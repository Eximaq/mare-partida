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

O cliente usa 250 ms durante a caçada automática solo visível e volta ao ritmo anterior quando mede HTTP acima de 200 ms. Em caso de 429, respeita a espera de 60 segundos da API. A interpolação usa a cadência mais rápida quando disponível. Party, masmorras, Impel Down e chefes de evento conservam o intervalo anterior. A migração amplia a lista de visitas válidas para Skypiea sem reescrever registros. A escolha de cadência deve considerar o custo de cada tick e a quantidade de partidas que cabem em um núcleo. [Nakama: frequência de simulação autoritativa](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/#tick-rate)

O ensaio por mapa mede HTTP interno. A captura em Dawn carrega o cliente do domínio de testes e fornece ao jogo respostas controladas para medir cadência e desenho. Os 40 ms de HTTP pela internet, os 40 ms de intervalo entre estados e o comportamento sob lotação permanecem fora do que foi validado. Uma conexão persistente com envio após cada tick pode remover a espera até a próxima consulta. Seu impacto no túnel, na reconexão, na autorização e na carga da VPS exige um ensaio próprio. [Cloudflare Tunnel: streaming e WebSockets](https://developers.cloudflare.com/tunnel/troubleshooting/)

A suíte de fundação passou com 259 testes. A rodada Linux com lobby, mundo e projeção passou com 29 testes. No PostgreSQL local isolado, 83 de 84 testes de integração passaram na rodada paralela e 15 verificações adicionais de migração passaram. A falha na rodada paralela foi o teste de vitória do chefe privado. A suíte inteira do chefe passou em uma repetição isolada (6 de 6). A verificação de tipos, a compilação e o teste de caçada no navegador passaram.

A imagem da candidata e a imagem de retorno compatível com a migração foram montadas na VPS. A ativação ficou pendente porque a credencial temporária de SSH expirou. A migração 0056 foi validada apenas em bancos descartáveis.
