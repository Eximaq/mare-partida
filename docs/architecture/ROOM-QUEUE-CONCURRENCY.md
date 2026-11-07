# Espera entre salas independentes — PR #232

Continuação de `CONTROLLED-PARTY-CAPACITY.md`, sobre a revisão `633ddef`.
Esta entrega não autoriza merge, deploy, atualização da instalação privada
`7122822`, testes com 100 ou mais jogadores ou extrapolação para 3.000.

## Causa e correção delimitada

O worker processava uma transação por vez, embora seu pool já tivesse duas
conexões. Enquanto uma sala aguardava persistência/COMMIT, uma sala sem
personagens em comum permanecia na fila. Os rastros anteriores mostram
esperas de 1.347–2.871 ms **depois da primeira aparição na seleção SQL**,
com sessões, presença e epoch válidos. Não era apenas demora do SELECT ou
da aquisição de conexão.

A regressão usa PostgreSQL real e duas salas/atores independentes. Um
trigger exclusivo do banco descartável bloqueia a persistência do primeiro
por advisory lock; a segunda sala precisa persistir antes da liberação.
O código anterior falhou nos dois modos. Com a correção, a segunda avança,
sem expor alterações parciais da primeira. Variantes liberam a primeira
transação para COMMIT ou provocam erro: o rollback preserva todos os seus
membros e não desfaz o COMMIT independente da segunda.

`simulationBatch` admite no máximo duas transações independentes por worker,
na ordem dos candidatos selecionados. Sobrepõe espera de I/O; não executa
dois motores JavaScript simultaneamente na mesma thread. Usa as duas
conexões já existentes, sem aumentar pools ou número de workers.

- O timer continua em 250 ms, com um único ciclo em andamento por lane.
- O orçamento de admissão continua em 200 ms. Transações já admitidas
  terminam integralmente, mesmo quando excedem esse orçamento **soft**.
  Agora podem existir até duas nessa situação, nunca uma fila ilimitada.
- Um slot livre retira o próximo candidato somente se o orçamento permitir.
  A próxima seleção continua priorizando o tick persistido mais antigo.
- `Promise.allSettled` aguarda todas as transações iniciadas antes de
  propagar falha. Uma conexão recusada não libera prematuramente a lane
  nem permite sobreposição com o próximo ciclo/desligamento do pool.
- Locks, ordem de autorização, `SKIP LOCKED`, validação de epoch e consultas
  dentro de cada transação permanecem iguais. Um COMMIT completo por sala.
- Prazo de dois segundos, timeouts SQL, política de sessão, economia,
  ledger, RNG de produção, mapas e balanceamento permanecem iguais.
- Chamadas diretas legadas mantêm concorrência padrão 1. Os workers privados
  de simulação passam explicitamente 2; não há parâmetro HTTP para isso.

Isso corrige o bloqueio serial evitável, mas não garante que toda fila caiba
no prazo. Custo de motor, recompensa e persistência ainda pode saturar uma
partição. Uma regressão funcional aprovada não aprova capacidade.

## Integridade da comparação

O fixture controlado v3 substitui o escopo global de RNG de teste por
`AsyncLocalStorage`, separado por transação/sala. Um teste reproduziu a
falha do fixture serial com duas cadeias intercaladas; a versão nova
produz os mesmos UUIDs e valores de loot em execução serial e concorrente.
Mantém streams separados para motor e loot, mesmas sementes e UUIDs de
setup. Não muda RNG de produção nem relógio, TTL ou estado de Supabase.

Nos cenários 6/6 e 8/4: mesmas 12 salas, 48 atores, estado inicial,
semente e perfil HTTP. Hash inicial:
`233a77ff6658cb8b6135902049617eac8cb5f8b662c97d3e154ff17c5ab9227d`.
Hash do conjunto de salas:
`82ace0ce837d925e92f854f6771f9d1443ba599e53ef5454b3cc7c3a29df319a`.
Tempo real e escalonamento do Windows não são determinísticos; não se
afirma reprodução bit a bit da trajetória. Solo usa particionamento/RNG
normais, sem alegar o mesmo conjunto sintético entre execuções.

## Comparação curta: 90 segundos, com instrumentação

| Distribuição | Revisão | Interrompidos vivos | Slots bloqueados | HTTP p95 | Idade do estado p95 |
|---|---|---:|---:|---:|---:|
| 6/6 | `633ddef`, serial | 44 | 250 | 731 ms | 1.354 ms |
| 6/6 | duas transações | 0 | 273 | 745 ms | 1.091 ms |
| 8/4 | `633ddef`, serial | 36 | 279 | 733 ms | 1.278 ms |
| 8/4 | duas transações | 20 | 623 | 990 ms | 1.288 ms |

Ambos os cenários novos continuam **REPROVADOS** nos limites de latência e
slots perdidos. Todos os pedidos emitidos retornaram 200; zero erros SQL,
ticks com falha, mortes, timeouts, falhas de renovação ou reinícios. Slots
bloqueados são leituras previstas que não foram iniciadas porque a anterior
do mesmo ator ainda estava ativa; não equivalem a erro HTTP ou timeout.

Menos interrupções conserva mais combates ativos e, portanto, mais trabalho
de motor/recompensa durante a janela. Não se deve interpretar menor latência
após muitos cancelamentos como melhora do servidor, nem atribuir toda a
diferença entre rodadas exclusivamente à mudança de código.

## Rastro residual no cenário 8/4

Os 20 cancelamentos correspondem a cinco salas da partição com oito salas;
a partição com quatro não cancelou. Os cinco intervalos foram
2.359, 2.358, 2.268, 2.269 e 2.082 ms. Presença e epoch estavam válidos.

- Primeira aparição na lista: 501–526 ms após o tick anterior.
- Da primeira aparição até aquisição: 1.554–1.855 ms, em três ou quatro listas.
- Aquisição de pool no intento final: 0,10–0,30 ms.
- Locks/preparação inicial nesse intento: 13,27–20,45 ms.
- Sete ou oito transações de outras salas sobrepõem o intervalo de espera.
  A **união** de seus intervalos cobre 1.416–1.552 ms. Não se soma duração
  concorrente como se fosse tempo de parede serial.
- Transações com recompensa nesse trecho chegam a 118–124 consultas e
  43–49 escritas; permanecem atômicas. Não houve adiamento de ledger.
- Na partição de oito, motor p95 85,94 ms; persistência p95 130,88 ms;
  COMMIT p95 5,31 ms; transação p95 272,97 ms. Essas durações incluem
  escalonamento/concorrência, não representam CPU ou fsync exclusivos.

A instrumentação cobre tick persistido/devido, primeira lista lógica,
seleções seguintes, aquisição, locks, motor, persistência e COMMIT. Cada
transação usa contexto assíncrono próprio; o rastreador serial antigo não
foi usado para atribuir custos concorrentes. O perfil mantém coordenadas e
condições de caminhos lentos apenas nos artefatos locais ignorados. Nenhum
cache novo de pathfinding foi introduzido.

O intervalo entre o término de um lote e a próxima seleção teve mediana
111–194 ms, p95 238–253 ms e máximo 263 ms entre as quatro partições
observadas. Inclui a espera pelo timer e escalonamento; não é tempo SQL.
O timer e o comportamento de não enfileirar ticks continuam inalterados.

Pathfinding em Dawn: 343.131 chamadas no 6/6 e 331.906 no 8/4 em 90 s,
somando as duas partições. p95 por chamada de 0,19–0,27 ms, com caudas:

| Cenário | Origem (x, y) | Destino (x, y) | Duração | Pontos retornados | Repetido na janela observada |
|---|---|---|---:|---:|---|
| 6/6 | 2.503,52; 1.544,35 | 2.312,47; 1.205,90 | 58,09 ms | 0 | não |
| 8/4 | 1.568,00; 1.347,14 | 1.596,13; 1.397,40 | 56,96 ms | 0 | sim |
| 8/4 | 2.239,47; 1.147,99 | 2.366,73; 1.808,82 | 47,47 ms | 20 | não |

Coordenadas arredondadas apenas nesta tabela. Retorno vazio significa que
o algoritmo não entregou rota nessa chamada, não prova por si só a causa
do custo. A observação de repetição guarda no máximo 4.096 pares por mapa;
não representa todo o histórico. Tempos sob carga incluem escalonamento
e possíveis pausas do runtime; não equivalem automaticamente a CPU da busca.

Depois dos ensaios, as mesmas três rotas foram chamadas 20 vezes cada,
isoladamente, com a mesma geometria. Ambas as extremidades eram caminháveis.
Os retornos permaneceram respectivamente 0, 0 e 20 pontos. p95:
0,28 / 0,16 / 1,98 ms; primeiras chamadas: 1,40 / 0,53 / 40,78 ms.
Os custos de 58 e 57 ms das duas rotas vazias não se reproduziram isolados.
A terceira teve custo frio significativo, mas as repetições foram menores.
Isso não identifica GC ou escalonamento como causa única, nem justifica cache.

## Aceite de dez minutos e verificações

50 Solo e 48 Party 8/4 são executados separadamente, duas rodadas de cada,
runtime compilado sem hooks detalhados, observador Windows somente leitura
a cada cinco segundos. Não significa um ensaio combinado de 98 jogadores.

| Perfil | Duração | Interrompidos vivos | HTTP p95 | Idade p95 | Slots bloqueados |
|---|---:|---:|---:|---:|---:|
| Solo 50, primeira (26/24) | 600 s | 20 | 383 ms | 866 ms | 452 |
| Party 48, primeira (8/4) | 600 s | 32 | 1.068 ms | 1.208 ms | 5.352 |
| Solo 50, repetição (32/18) | 600 s | 48 | 444 ms | 851 ms | 664 |
| Party 48, repetição (8/4) | 600 s | 8 | 335 ms | 597 ms | 289 |

Primeiro Solo: 39.548 respostas 200 para 40.000 slots previstos; zero
timeouts, erros de rede, respostas inválidas, falhas de renovação ou
reinícios. Os 452 slots não emitidos estavam bloqueados pela requisição
anterior do mesmo ator; zero perdas de scheduler/fila cheia/aborto.
Os primeiros cancelamentos foram observados em 244,6 s e os últimos em
572,5 s. Não se descartou o trecho final para melhorar o resultado.

CPU total do host p95 99%, máximo 100%; fila de processadores p95 17,
máximo 66. RAM disponível mínima 1.305 MiB; escrita em C: p95 0,45 ms,
máximo 3,66 ms. A saturação de CPU foi real em parte da janela. O processo
da bancada (API, gerador e workers juntos) consumiu p95 2,75 núcleos
lógicos; o PostgreSQL de teste, p95 2,20. Outros processos também estavam
ativos. Esses grupos usam janelas de amostragem e não isolam CPU por
componente interno do Node, nem provam causa de cada cancelamento.

Na primeira Party, uma consulta somente leitura ao `pg_stat_activity`,
perto de 270 s, encontrou zero bloqueados por outros backends e conexões
`idle in transaction`/`ClientRead`, com transação de até 364 ms. É uma
amostra pontual, não uma exclusão de contenção em outros instantes.

Primeira Party: 33.048 respostas 200; zero erros SQL/ticks com falha,
timeouts, erros de rede, falhas de renovação, reinícios ou mortes. Os
5.352 slots foram bloqueados por leitura anterior, sem perdas de scheduler,
fila cheia ou aborto. Cancelamentos observados entre 4,6 e 173,5 s.
CPU p95/máximo 100%; RAM mínima 434 MiB; fila de CPU p95/máximo 22/45;
escrita p95/máximo 0,86/24,31 ms. O coletor demorou p95 1,60 s por amostra
e teve um máximo de 6,21 s: não há resolução suficiente para atribuir cada
pausa a CPU, memória, disco ou componente específico. A carga de outros
processos variou; os benchmarks não são um experimento de host dedicado.

Consulta de configuração durante os testes confirmou `fsync=on`,
`synchronous_commit=on` e `full_page_writes=on`. Não se reduziu durabilidade
para diminuir latência.

Solo repetido: 39.336 respostas 200, zero timeouts/rede/respostas inválidas,
renovações com falha ou reinícios; todos os 664 slots perdidos por leitura
anterior ativa. Primeiro cancelamento observado em 2,2 s, último em 411,1 s.
A distribuição normal foi 32/18, diferente dos 26/24 da primeira rodada;
não é uma comparação causal de código com entradas idênticas. CPU p95 e
máximo 100%, RAM mínima 1.468 MiB, escrita p95/máximo 0,46/14,94 ms.

Party repetida: 38.111 respostas 200, zero erros SQL/ticks com falha,
timeouts, rede, respostas inválidas, falhas de renovação ou reinícios.
Todos os 289 slots perdidos por leitura anterior ativa; zero descartes de
fila cheia, scheduler ou aborto. Cancelamentos observados entre 6,1 e
331,3 s. CPU p95 86%, máximo 100%; RAM mínima 5.738 MiB; fila de CPU
p95/máximo 2/23; escrita p95/máximo 3,66/18,37 ms.

Perto dos cancelamentos dessa última Party, as amostras mostraram CPU total
63–75%, RAM disponível aproximadamente 6.570–6.582 MiB e escrita
3,12–4,19 ms. São amostras próximas à **observação pelo leitor**, não ao
instante exato de cancelamento. Não demonstram saturação global nesses
instantes; tampouco excluem saturação de uma thread/núcleo ou picos curtos.
Event-loop p99 do processo principal: 34 / 46 / 35 / 32 ms, na ordem da
tabela. As threads de simulação têm suas próprias pausas, medidas apenas
no perfil curto; não se deve usar o event-loop principal para representá-las.

## Comparação com a baseline e parecer

| Perfil | `633ddef`: duração / interrompidos vivos | Esta revisão: duração / interrompidos vivos |
|---|---|---|
| Solo, primeira | 324 s, aborto por HTTP 503 / 50 | 600 s / 20 |
| Solo, repetição | 600 s / 43 | 600 s / 48 |
| Party 8/4, primeira | 600 s / 12 | 600 s / 32 |
| Party 8/4, repetição | 600 s / 32 | 600 s / 8 |

**REPROVADO para o aceite inicial. Não se demonstrou ganho estável de
capacidade. Não recomendar merge/deploy desta revisão como solução do lag.**

A regressão prova a correção de um bloqueio serial evitável entre
transações independentes, incluindo COMMIT/rollback íntegros. Os ensaios
provam que essa correção é insuficiente para eliminar o atraso acumulado.
Todas as janelas reprovaram por interrupções e slots bloqueados; a primeira
Party também excedeu HTTP p95 <500 ms e idade p95 <1.000 ms.

O p95 global inclui períodos com menos combates ativos. Somente o primeiro
Solo teve janelas completas de 10 s antes da primeira interrupção: 24,
com p95 HTTP entre 42 e 906 ms. Os outros ensaios interromperam atores antes
de completar a primeira janela. Não chamar p95 baixo após cancelamentos
de aprovação de todos os jogadores simultâneos.

Separação das evidências:

- **Código:** bloqueio serial reproduzido e corrigido; espera residual
  entre lotes, custos de motor e transações de recompensa ainda presentes.
- **Hardware/ambiente:** houve saturação e pressão de memória reais em
  algumas janelas, com atividade externa variável. Também houve interrupção
  sem evidência amostrada de saturação global. Não é uma reprovação atribuível
  exclusivamente ao PC, nem prova de que uma VPS resolverá o problema.
- **Gerador:** zero descartes por capacidade própria, erros de rede ou
  timeouts. Houve slots não iniciados porque a resposta anterior ainda
  estava pendente. API, gerador e workers compartilham processo/máquina;
  este ensaio não mede isoladamente o custo de cada componente.

Não repetir indefinidamente o mesmo teste esperando aprovação. O próximo
experimento útil é comparar a mesma revisão/perfil em ambiente privado
isolado, com plano e autorização próprios, conforme
`PRIVATE-LOAD-GENERATOR-PLAN.md`. Uma VPS de homologação é uma opção de
medição, não uma correção garantida. Não foi contratada/preparada nesta
entrega. A investigação de custo por sala/transação continua necessária.

## Verificações funcionais e publicação

- Build e typecheck passaram.
- `npm test`: 231 testes de fundação e 152/152 arquivos Node legados
  passaram, sem falhas ou skips na fundação. O harness Supabase/browser
  legado separado não integra esse comando.
- `npm run test:integration`: 266 testes PostgreSQL passaram, sem falhas
  ou skips (623,56 s). Inclui as quatro regressões novas de bloqueio,
  COMMIT e rollback em Solo/Party, além das garantias existentes.
- A regressão original falhou contra o despacho serial nos dois modos;
  o grupo direcionado de orçamento/concorrência passou com dez testes.
  O fixture RNG também teve reprodução negativa antes da correção de escopo.
- `python tools/build_pages.py` passou localmente, sem publicação do site.
- `shared-lobby-browser.mts` e `online-walking-browser.mts` passaram com
  HTTPS confiável, API/worker e PostgreSQL reais, provedor sintético sem
  e-mails. Duas contas, mapa/Paper Doll/HUD originais, caminhada, caçada,
  viagem/retorno, logout e save da demonstração; desktop e viewport estreito.
  Capturas recentes inspecionadas, fora do Git. Esses testes não representam
  a carga de 48/50 jogadores nem aprovação global da sincronização.
- Inventário de contratos: 27/27 presentes. Não é certificação de capacidade.
- Revisão dos 11 arquivos e verificação de padrões de credenciais: sem
  chaves privadas, JWTs ou senhas de conexão adicionados. `.env`, imagens,
  perfis e relatórios brutos permanecem ignorados. `git diff --check` passou.
- Instalação privada conferida novamente em `7122822`, com árvore limpa.
  Nenhum runtime, rede, firewall, Radmin ou banco privado foi atualizado.
- API/worker/gateways de teste encerrados. Cluster PostgreSQL da bancada
  parado de forma limpa após conferir zero clientes; dados locais preservados.
- Publicação restrita ao PR #232, com prefixo `[CF-Pages-Skip]`, sem merge
  automático ou deploy. Resultado da CI deve ser consultado no próprio PR;
  não se afirma execução local de Docker.

Os testes usam apenas PostgreSQL isolado em loopback e provedor sintético.
Nenhum cadastro/e-mail, alteração de Supabase, firewall, Radmin, serviço
público ou instalação privada faz parte desta investigação.
