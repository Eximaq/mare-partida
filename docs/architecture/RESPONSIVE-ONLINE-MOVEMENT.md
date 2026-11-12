# Resposta ao comando e latência de rede

Diagnóstico de 12/11/2026, sobre `08ace750`, na VPS de testes e em bancada isolada.
Escopo: movimento manual por clique e, na extensão abaixo, por WASD/setas no porto e nas caçadas normais.

## Causa demonstrada

`walkTo` enviava a intenção e a apresentação só recebia o caminho após a resposta
HTTP. Retirar a leitura completa adicional havia reduzido a fila, mas ainda
deixava o primeiro passo dependente de uma ida e volta. Aumentar a VPS não elimina
essa dependência. O teste real de navegador com 250 ms de atraso artificial antes
da requisição mediu 392 ms entre clique e primeiro deslocamento antes da correção.

## Estratégia adotada

1. Prever apenas a apresentação do próprio movimento manual, usando a navegação
   carregada e a velocidade derivada das regras existentes.
2. Continuar enviando somente a intenção de destino. A posição desenhada nunca é
   enviada como estado ou prova de movimento, distância, acerto ou recompensa.
3. Identificar previsões locais e reconciliar com o caminho aceito. Uma resposta
   antiga não pode substituir um clique mais recente na fila.
4. Manter um pedido em voo e apenas o destino mais recente pendente. Cliques extras
   não criam uma fila ilimitada, não antecipam versões e não alteram o protocolo
   de idempotência, sessão ou controlador.
5. Limitar a previsão a 750 ms sem confirmação de comando. Novos cliques não
   renovam esse prazo. Uma confirmação anterior válida pode renovar a janela da
   intenção mais recente. Rejeição, desconexão, perda de controle, morte, mudança
   de mapa e respawn descartam a previsão conforme o contexto.
6. Reconciliar por rota de colisão à velocidade normal. Nenhum salto ou aceleração
   serve para esconder atraso. A previsão não se aplica a dash, ações especiais,
   combate automático, dano, inventário ou personagens de terceiros.

Os 750 ms são uma janela visual, não uma nova validade de sessão ou tick. Os prazos
do backend, combate, persistência e economia permanecem iguais. A primeira entrega contemplava apenas o clique. A extensão de teclado abaixo usa
o mesmo contrato de movimento, sem antecipar ações especiais.

Referências técnicas primárias consultadas:

- [Gabriel Gambetta — Client-side prediction and server reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html).
- [Colyseus — Client prediction and reconciliation](https://docs.colyseus.io/netcode/client-prediction).

A técnica é aplicada ao adaptador existente. Não há evidência para substituir
autenticação, ledger, saves, motor ou PostgreSQL por um framework novo.

## Medições e limites de interpretação

As chamadas de rede abaixo não autenticam contas do jogo nem alteram personagens.
Credenciais, cookies e corpos de autenticação não foram registrados.

| Medida | Amostras | p50 | p95 | Máximo |
|---|---:|---:|---:|---:|
| API leve pelo domínio, primeira rodada | 30 | 94 ms | 118 ms | 687 ms |
| HTML pequeno pelo domínio, primeira rodada | 30 | 82 ms | 92 ms | 99 ms |
| Mesma API leve em loopback dentro da VPS | 30 | 3,19 ms | 5,99 ms | 25,72 ms |
| API leve pelo domínio, segunda rodada | 30 | 187 ms | 418 ms | 984 ms |
| Tempo `Server-Timing` da segunda rodada | 30 | 2 ms | 3 ms | 5 ms |
| HTML pelo domínio, comparação alternada | 30 | 88 ms | 184 ms | 409 ms |
| Mesmo HTML por encaminhamento SSH privado | 30 | 164 ms | 695 ms | 727 ms |

Todas essas amostras HTTP válidas retornaram 200. Tentativas iniciais do
encaminhamento retornaram 421/308 por Host/scheme e foram excluídas da comparação,
sem mudar a configuração do servidor. O teste SSH manteve autenticação do convite,
usou apenas loopback e foi encerrado depois. Não foram abertas portas públicas.

A comparação SSH utiliza outro transporte e não isola cada salto do Cloudflare.
Ela não sustenta remover o proxy. A variabilidade inclui caminho de rede, TLS,
proxy e agendamento no computador cliente. Não atribuir isso só ao provedor ou ao
PC. ICMP direto teve respostas de 61–137 ms e 6/15 sem resposta; ICMP pode ter
tratamento diferente de HTTP e isso não demonstra perda equivalente no jogo.

A amostra de recursos mostrou CPU abaixo de 1% por container de API/PG e load
average 0,12/0,21/0,14. Não é um ensaio de capacidade. Nos agregados recentes reais,
frames tiveram médias de 23–27 ms, leituras completas 40–47 ms e comandos até
63 ms na janela com 23 comandos. São grupos de rotas, não traces de cada clique.
Os percentis do log são limites de buckets, não quantis exatos.

## Verificação reproduzível

- `tests/foundation/movement-prediction.test.mts`: resposta antes do ACK,
  imutabilidade do estado, respostas antigas, reversões, colisões, timeout sob spam,
  confirmação durante fila contínua, perda de controle, mapa e respawn.
- `tests/online-walking-browser.mts`: navegador real, API e PostgreSQL isolados,
  worker real, identidade fictícia. Atraso de 250 ms em requests, cliques alternados
  a cada 110 ms, rejeição 409, velocidade, chegada ao destino, monstros, reconexão,
  viewport estreito e save demo preservado. Não substitui teste hospedado de Auth.
- Antes: teste de resposta falhou com 392 ms. Depois: primeiro clique 8,5 ms no
  porto e 5,4 ms em Dawn, com HTTP de 302 e 278 ms. Oito reversões por mapa ficaram
  entre 9,8 e 26,1 ms. Rejeições retornaram à posição confirmada sem alterar versão.
- Execução final: `npm test` com 272/272 testes de fundação e 188/188 arquivos
  legados. Build estático, sintaxe dos dois scripts e `git diff --check` passaram.
  Navegador observou 108 amostras de movimento dos monstros, zero deslocamentos sem
  animação e zero reinícios do relógio visual. Desktop e viewport de 640 px passaram.
- Uma primeira execução perdeu a sonda de monstros e foi inconclusiva para esse
  trecho. A repetição completa passou. Erros posteriores da instrumentação
  (`__name` no evaluate e listener duplicado) foram corrigidos no teste, sem
  relaxar a asserção de resposta ou de velocidade.

## Próximos critérios de arquitetura

- Medir clique → primeiro quadro, ACK de comando, intervalo de atualização,
  RTT HTTP, processamento/locks e frame time separadamente. Não renomear ou
  reduzir artificialmente o número de ping.
- Validar comportamento com dois clientes e jitter antes de afirmar estabilização
  integral. A meta de resposta local é um ou dois quadros; RTT de 50–60 ms depende
  da rota de ambos os clientes e não é certificado por esta entrega.
- Avaliar canal persistente de inputs/snapshots com sequência, backpressure,
  reconexão e controle de sessão se medições mostrarem que o polling e a fila
  HTTP continuam dominantes. WebSocket sozinho não elimina RTT nem autoriza
  writes econômicos pelo cliente.
- Preservar interpolação dos terceiros separada da previsão do próprio personagem.
  Só alterar a simulação ou persistência após profiling com causa reproduzível.
- Nenhuma conclusão de capacidade para 3.000 jogadores decorre destes ensaios.

## Entrada no Opera: correção de preparação de aparência (12/11/2026)

Observação no Opera autenticado pelo domínio da VPS: o console registrou
`bootstrap_failed initial_appearance_timeout`. Na aba Network, camadas PNG do
personagem ainda retornavam 200, com exemplos de 2,59–3,49 s. A API continuava
retornando frames. Isso demonstra uma falha na preparação visual da entrada,
não uma recusa de login nem perda do personagem. Não explica sozinho todo tranco
que possa ocorrer durante a partida.

O limite anterior de 20 s contava todo o carregamento frio e a composição dos
sprites como uma única espera. O preparo agora acompanha progresso confirmado
(manifestos, módulos, imagens decodificadas e quadros compostos), com 20 s sem
progresso e teto de 120 s. O limite do mapa permanece 20 s. Resultado `false`
do compositor é propagado como falha, em vez de liberar a partida incompleta.
Nenhum prazo de combate, sessão, tick ou regra de jogo foi alterado. A revisão do
manifesto foi regenerada porque inclui o código do carregador; nenhuma imagem
foi modificada.

Evidências desta revisão:

- Regressões antes da correção: 2 falhas reproduzidas (progresso além de 20 s e
  resultado de preparação malsucedido), 2 casos de timeout já aprovados.
- Depois: 4/4 regressões; suíte completa com 276/276 testes de fundação e 188/188
  arquivos legados; sintaxe, revisão de assets, build estático e diff conferidos.
- Navegador com PostgreSQL e worker isolados: oito módulos atrasados em 3 s cada;
  entrada concluída em 29.714 ms, sem erro fatal e sem liberar sprites incompletos.
- Primeiro deslocamento: 11,8 ms no porto e 10,7 ms em Dawn, com RTT da bancada de
  344/360 ms. Dezesseis mudanças rápidas de direção: 5,9–37,6 ms. Rejeição de
  comando reconciliada nos dois mapas. Velocidade e colisão preservadas.
- 106 amostras de movimento de monstros, zero deslocamentos sem animação e zero
  reinícios da fase visual. Desktop, viewport de 640 px, reconexão, falha de mapa
  base e preservação do save demo aprovados.

Esses números de resposta são da bancada, não medições certificadas do Opera
pela VPS. A correção de entrada foi aplicada na VPS e os três hashes foram verificados pelo
HTTPS público. Backup: `rollback-appearance-0f7dc1c9.RvbWaS`, em
`/srv/mare-staging/incoming/`. API e PostgreSQL não foram reiniciados. O controle
do Opera foi interrompido pela ferramenta antes da inspeção final; não se deve
declarar o movimento da VPS estabilizado só com estes testes.

## WASD e setas: mesma resposta imediata do clique

O teclado ainda verificava `busy/pending` antes de processar mudanças de direção e
mandava `world.move` diretamente, sem chamar a previsão visual usada pelo mouse.
Com uma requisição em voo, a troca de tecla e a soltura aguardavam a rede.
Quatro regressões do código real reproduziram essa diferença antes da correção.

WASD e setas agora usam a mesma fila limitada do clique. A posição visual orienta
somente o destino desejado, nunca substitui a posição autoritativa. A soltura
prepara uma parada visual imediata e mantém somente o último `world.stop` pendente;
um novo movimento pode substituí-lo. A abertura de um painel conserva a parada,
e respostas rejeitadas ou mudanças de mapa descartam a intenção obsoleta.
Velocidade diagonal normalizada, navegação, limite de 750 ms sem confirmação,
renovação de destino de 2,2 s, comandos de frutas e autoridade do servidor foram
preservados.

Verificação de teclado:

- Nove regressões de integração entre o controlador de input e a apresentação:
  início, inversão com pedido pendente, soltura, fila, diagonal, painel, rejeição,
  mudança de mapa, cliente indisponível, setas e caminho especial do gênio.
- Navegador com API/worker/PostgreSQL isolados e atraso artificial de 250 ms:
  três sequências de oito mudanças por mapa (porto e Dawn), 48 amostras,
  resposta visual p50 37,6 ms, p95 46,3 ms e máximo 49,3 ms. Soltura entre
  20,1 e 29,2 ms. RTT medido no ensaio perto de 324 ms, não 40 ms.
- Cliques, rejeição e reconciliação passaram nos dois mapas; velocidade normal
  preservada. A execução observou 104 amostras de movimento dos monstros,
  zero deslizes sem animação e zero reinícios da fase visual.
- Um primeiro ensaio perdeu duas respostas no fim da sequência de Dawn; não havia
  trace suficiente para determinar a causa desse episódio. Após instrumentação,
  uma execução completa de 16 teclas e a repetição ampliada de 48 passaram sem
  alterar o limite de aprovação ou a janela de previsão. Isso não autoriza afirmar
  ausência de todo jitter. Outra repetição parou por falha da sonda do teste
  (clique antes do primeiro quadro capturado); a posição anterior agora é colhida
  no próprio evento de entrada.

O teste é de apresentação e contrato de movimento com rede simulada, não de
capacidade nem uma nova medição de RTT da Internet. A validação pelo usuário na
VPS continua relevante; nenhuma economia, save ou regra de combate foi alterada.

Verificações finais desta extensão: 285/285 testes de fundação, 188/188 arquivos
legados, build estático, sintaxe e diff aprovados. A repetição completa do navegador
passou também reconexão, viewport estreito, preparação lenta (27,4 s), falha de mapa
base e preservação do save demo. O PostgreSQL descartável foi parado ao encerrar.

## Separação entre teclado e destino do mouse

O caminho de WASD/setas chamava `walkTo`, que publica `lobbyDestination` para o
marcador circular do mouse. A drenagem da fila também chamava essa função após
uma confirmação, restaurando o marcador. Não havia geração de eventos de mouse;
a interferência estava no estado compartilhado e foi reproduzida por duas
regressões antes da mudança.

`moveOnlineKeyboard` agora trata direção e mantém a intenção como teclado na
fila. Cancela destino de clique e ação de NPC, e uma confirmação atrasada não
converte a direção em clique. Soltura continua enviando parada; o mouse conserva
seu próprio marcador. A fila de uma intenção pendente e a previsão limitada são
compartilhadas, mas os manipuladores de entrada são distintos. O protocolo
autoritativo continua `world.move`/`world.stop`: não foi criado um protocolo novo
de vetores, nem alterada a velocidade, colisão, economia ou persistência.

Doze testes focados passaram, incluindo mistura de mouse/teclado e confirmação
atrasada. A fundação passou 288/288 com concorrência de testes limitada a dois,
e os arquivos legados passaram 188/188. Na primeira execução com concorrência
padrão, um teste de reinício de worker não recuperou a saúde dentro de 350 ms;
o teste isolado e a suíte com dois executores passaram, sem mudar a asserção ou
o código do worker. Isso não é evidência de capacidade da VPS.

Um ensaio visual registrou zero eventos de ponteiro e zero marcadores nas três
sequências do porto, mas reprovou resposta imediata de duas teclas: a confirmação
do primeiro comando demorou 1.046 ms, ultrapassando a janela de previsão de
750 ms. O trace mostra retorno à posição confirmada e interrupção da previsão.
A origem do custo adicional dessa requisição não foi isolada; não se atribui
esse custo ao PC nem à Internet. Nenhum limite foi ampliado para aprovar o teste.

Essa condição reapareceu em outra execução. As falhas de latência agora são
coletadas e reprovam a execução ao final, permitindo observar também os cenários
independentes sem esconder o resultado. O novo teste de tecla mantida caminha de
volta pelo contrato autoritativo antes da perseguição: sem essa preparação ele
deixava o personagem perto dos monstros e não produzia as 101 amostras mínimas de
deslocamento exigidas pelo teste anterior.

Execução completa final, sem alterar a correção ou os limites:

- 48 inversões nos dois mapas; zero eventos de ponteiro e zero quadros com
  marcador de clique. Tecla mantida por três segundos também sem marcador.
- Resposta visual p50 38 ms, p95 45,4 ms e máximo 48,8 ms; soltura 20,2–48,4 ms.
  Requisições tiveram atraso artificial de 250 ms, além do processamento real.
- Cliques, velocidade, rejeição/reconciliação, perseguição e 114 amostras de
  movimento de monstros passaram; zero deslizes e reinícios da fase visual.
- Reconexão, viewport estreito, carregamento progressivo de 27,1 s, falha
  explícita de mapa base e preservação do save demo passaram. Banco descartável
  encerrado. Build, sintaxe e diff conferidos.

A correção do marcador está validada; a execução final aprovada não apaga as
esperas longas anteriores nem certifica estabilidade absoluta da rede.
