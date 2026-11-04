# Comparação controlada 6/6 e 8/4 — PR #232

Continuação posterior: [espera entre salas e concorrência limitada](ROOM-QUEUE-CONCURRENCY.md).
Os resultados abaixo registram a revisão `633ddef` e permanecem como baseline.

**Parecer: REPROVADO para capacidade.** O gargalo de resolução de `Math`
foi corrigido; os cancelamentos por atraso da fila permanecem.

Investigação iniciada em 03/11/2026, horário de São Paulo, sobre `f16d6c1`.
O runtime de simulação dessa base é o de `232e0ad`; as revisões intermediárias
acrescentaram diagnóstico, métricas do gerador e documentação.
Instalação privada `7122822` preservada. Sem merge, deploy, alteração de
rede, gameplay, sessões, economia, ledger ou limite de dois segundos.

## Hipótese, regressão e única correção

O caminho frio de Dawn já registrado no diagnóstico anterior fazia
**972.757 resoluções de `Math` no objeto global do contexto VM**. São
operações reais de amostragem/colisão, não consultas PostgreSQL. O teste
`world-catalog-hot-path.test.mts` contou essas travessias na rota real e
falhou antes da correção, sem depender de um limite de tempo da máquina.

`world-catalog.cjs` agora declara `const Math = globalThis.Math` dentro do
contexto antes de carregar os mapas. É o **mesmo objeto Math**, com os mesmos
métodos e resultados; a resolução passa a ser lexical. Não foi acrescentado
cache de caminhos, aproximada geometria ou alterado o algoritmo de busca.
Os fontes dos mapas e seu fingerprint permanecem iguais. Não há migration.

A reprodução isolada passou de 173,71 ms / 172 ms de CPU para 57,86 ms /
62 ms de CPU, mantendo os mesmos 24 pontos. Uma experiência inicial na
mesma execução havia medido 53,39 ms. São amostras frias individuais, não
estimativa de ganho global do servidor. No perfil após a correção, a rota
levou 67,80 ms; de 56 amostras, 5,36% ficaram em `sample` e 8,93% em
`maskLine`. Perfil curto e instrumentado, sem equivalência estatística com
uma janela inteira de combate.

O teste de custo passou com **zero** resoluções globais durante a rota.
Também passaram os nove testes existentes de geometria, caminhos,
componentes, fronteiras e igualdade de estado de combate.

## Bancada controlada

`MARE_LOAD_LAYOUT=6/6` ou `8/4` ativa somente a ferramenta de carga local:

- Exatamente 48 atores sintéticos, 12 salas completas, dois workers Party
  e dois Solo. Nenhuma conta hospedada ou personagem real.
- IDs iniciais reproduzíveis; RNG de combate e loot independente por sala, sem compartilhar
  a sequência entre partições. Tokens de sessão continuam usando bytes
  aleatórios; o gerador nunca acessa o Supabase.
- A atribuição das salas substitui apenas a consulta de seleção no processo
  de teste. O hash/particionamento do runtime de produção não foi alterado.
- Mesmo conjunto de salas e mesmo hash de estado inicial normalizado em
  todas as quatro execuções instrumentadas. A normalização exclui horários
  absolutos e o fingerprint de regras do digest de comparação, sem modificar
  esses valores no banco. Relógios e deltas durante a medição são reais.
- Digest inicial: `233a77ff6658cb8b6135902049617eac8cb5f8b662c97d3e154ff17c5ab9227d`.
  O runner recusa continuar se `MARE_LOAD_EXPECTED_HASH` divergir.
- Mesma oferta: leitura por ator a cada 750 ms, estado completo a cada 3 s,
  renovação HTTP a cada 30 s. Pools, orçamento e ticks originais.
- Não são trajetórias bit a bit iguais: atrasos reais mudam `dt`, ordem de
  eventos, número de sorteios consumidos e mortes/recompensas. O desktop
  compartilhado também varia. Cada execução começa com workers/memos novos.
- A ferramenta recusa destinos externos, porta 55432 e nomes dos bancos
  privados. Dados e perfis extensos ficam ignorados em `infra/local/`.
  As execuções controladas são sequenciais, não concorrentes entre si.
- 4/8 e 7/5 são suportados pela bancada, mas não foram medidos nesta entrega.
  Nenhuma conclusão foi extrapolada para essas distribuições.

Os hooks privados do build descartável registraram tick persistido,
elegibilidade SQL (+100 ms), vencimento nominal (+250 ms), lote, aquisição,
locks, motor, persistência e COMMIT. A fila lógica não é uma FIFO física.
Fases aninhadas não devem ser somadas duas vezes. O build foi recompilado
para retirar todos os hooks antes dos ensaios de aceite. Nenhuma instrumentação
privada foi copiada para o runtime versionado ou para a instalação do jogo.

## Validade da bancada e comparação instrumentada

A primeira implementação do gerador determinístico reutilizava o namespace
UUID do preparo nos workers. Isso produziu colisões de chaves de comandos,
rollbacks e atrasos artificiais. **As primeiras quatro comparações foram
invalidadas e não sustentam conclusão sobre o efeito da distribuição.**
Os dados brutos foram preservados fora do Git; o banco sintético de uma
execução interrompida também foi preservado sob outro nome, sem tocar
bancos reais.

A regressão gerou 100 IDs no preparo e 100 em cada um dos dois workers:
antes, apenas 100 eram distintos; após separar namespaces, os 300 são
únicos. O namespace dos monstros continua por sala, independente da
partição. O runner agora contabiliza erros SQL dos workers, sem SQL,
parâmetros ou identificadores no relatório.

Uma segunda auditoria encontrou sorteios de loot ainda vinculados ao
worker. As rodadas intermediárias sem erros SQL são exploratórias; não
sustentam a comparação estrita de RNG entre distribuições. A versão final
separa os fluxos de combate e loot por sala, inclusive IDs gerados na
transação. A bancada exige transações seriais por worker e falha se um
sorteio ocorrer fora do contexto esperado. Isso não modifica o runtime.

A regressão com o motor real confirmou que inverter a ordem A/B das salas
preserva estados e identidades geradas. As comparações finais são refeitas
sobre o mesmo digest inicial com essa versão da bancada.

## Comparação final instrumentada (90 segundos por execução)

| Código | Revisão | Salas | Interrupções / 48 | HTTP p95 | Idade p95 | Slots ocupados |
|---|---|---:|---:|---:|---:|---:|
| T1 | Antes | 6/6 | 4 | 532 ms | 1348 ms | 30 |
| T2 | Antes | 8/4 | 12 | 247 ms | 1370 ms | 0 |
| T3 | Depois | 8/4 | 36 | 733 ms | 1278 ms | 279 |
| T4 | Depois | 6/6 | 44 | 731 ms | 1354 ms | 250 |

Ordem real: antes 6/6, antes 8/4, depois 8/4, depois 6/6. Todas tiveram
zero erros SQL/falhas de tick, zero mortes, reinícios, timeouts, erros HTTP,
falhas de renovação, perdas do scheduler ou rejeições pelo limite global.
Os slots ausentes foram exclusivamente bloqueados pela requisição anterior.
Mesmo estado inicial e oferta não tornam o desktop nem o avanço temporal
determinísticos. **Nenhuma das quatro passou; não se demonstrou superioridade
estável de uma distribuição nem ganho global de capacidade com a correção.**

O p95 do motor por partição caiu de 74,58/77,28 para 69,98/61,40 ms em 6/6,
e de 92,18/48,73 para 50,88/42,45 ms em 8/4. Entretanto, COMMIT atingiu
504/427 ms e 475/513 ms nos dois ensaios posteriores, respectivamente.
As trajetórias e quantidade de recompensas divergiram com o tempo real.
Essas distribuições não autorizam atribuir a piora agregada à mudança lexical,
nem descartá-la: o benefício comprovado é o custo isolado da rota e a
regressão estrutural, não o aceite sob carga.

## Cada interrupção e os predecessores

Cada linha abaixo representa quatro jogadores da mesma sala e do mesmo
tick; são as 96 interrupções observadas nas quatro execuções. Sessão, presença
e epoch estavam válidos em todas. S1–S12 são rótulos sintéticos locais.
Os tempos são em ms. "Antes" mede desde o tick persistido até o início da
seleção; subtrair 250 dá o atraso em relação ao tick nominal devido.
A elegibilidade SQL começa em +100 ms. Não existe enqueue físico separado:
o estado fica logicamente elegível enquanto a partição termina trabalho.

| Ensaio/sala | Intervalo do tick | Antes da seleção | SELECT | Dentro do lote | Pool | Locks/preparo de locks | Predecessores na mesma partição (ms sobrepostos) |
|---|---:|---:|---:|---:|---:|---:|---|
| T1/S4 | 2123 | 2119 | 1 | 0 | 0.07 | 9.69 | S4:185 + S6:85 + S5:178 + S7:260 + S8:275 + S11:308 = 1291 |
| T2/S2 | 2134 | 2130 | 1 | 0 | 0.07 | 10.89 | S2:75 + S11:88 + S8:208 + S4:172 + S6:137 + S5:119 + S7:231 + S9:282 = 1312 |
| T2/S11 | 2094 | 2047 | 1 | 42 | 0.06 | 10.76 | S11:86 + S8:208 + S4:172 + S6:137 + S5:119 + S7:231 + S9:282 = 1235 |
| T2/S8 | 2041 | 1959 | 1 | 79 | 0.06 | 9.98 | S8:206 + S4:172 + S6:137 + S5:119 + S7:231 + S9:282 = 1147 |
| T3/S7 | 2059 | 2056 | 1 | 0 | 0.05 | 9.80 | S7:144 + S9:212 + S8:128 + S2:136 + S11:129 + S6:124 + S4:148 + S5:145 = 1166 |
| T3/S8 | 2026 | 2023 | 1 | 0 | 0.06 | 10.54 | S8:126 + S2:136 + S11:129 + S6:124 + S4:148 + S5:145 + S7:38 + S9:120 + S8:9 + S2:147 = 1122 |
| T3/S2 | 2157 | 2154 | 1 | 0 | 0.06 | 13.59 | S2:145 + S8:39 + S11:149 + S6:169 + S4:89 + S5:575 + S7:97 + S9:236 = 1499 |
| T3/S6 | 2414 | 2409 | 2 | 0 | 0.06 | 15.14 | S6:167 + S4:89 + S5:575 + S7:97 + S9:236 + S2:44 + S8:74 + S11:526 = 1808 |
| T3/S4 | 2137 | 2079 | 2 | 54 | 0.11 | 11.42 | S4:86 + S5:575 + S7:97 + S9:236 + S2:44 + S8:74 + S11:526 = 1638 |
| T3/S5 | 2088 | 1991 | 2 | 92 | 0.06 | 12.26 | S5:573 + S7:97 + S9:236 + S2:44 + S8:74 + S11:526 = 1550 |
| T3/S9 | 2364 | 2360 | 1 | 0 | 0.05 | 11.84 | S9:85 + S2:97 + S8:78 + S11:545 + S6:42 + S4:151 + S5:101 + S7:385 = 1484 |
| T3/S11 | 2202 | 2198 | 1 | 0 | 0.06 | 12.42 | S11:146 + S6:362 + S4:61 + S5:127 + S7:100 + S9:65 + S2:90 + S8:490 = 1441 |
| T3/S12 | 2072 | 2069 | 1 | 0 | 0.04 | 10.55 | S12:482 + S1:385 + S3:458 + S10:368 = 1693 |
| T4/S6 | 2233 | 2227 | 2 | 0 | 0.06 | 14.67 | S6:603 + S5:138 + S7:160 + S8:70 + S11:143 + S4:544 = 1658 |
| T4/S4 | 2134 | 2129 | 2 | 0 | 0.07 | 10.62 | S4:90 + S6:73 + S5:566 + S7:75 + S8:187 + S11:513 = 1504 |
| T4/S11 | 2273 | 2268 | 1 | 1 | 0.06 | 14.33 | S11:515 + S4:85 + S5:108 + S7:90 + S6:297 + S8:519 = 1614 |
| T4/S5 | 2257 | 2253 | 2 | 0 | 0.05 | 9.91 | S5:106 + S7:90 + S6:297 + S8:519 + S11:47 + S4:495 = 1554 |
| T4/S7 | 3190 | 3186 | 1 | 0 | 0.04 | 11.65 | S7:87 + S6:297 + S8:519 + S11:47 + S4:495 + S5:287 + S7:6 + S6:253 = 1991 |
| T4/S8 | 2381 | 2339 | 1 | 37 | 0.05 | 11.47 | S8:515 + S11:47 + S4:495 + S5:287 + S7:6 + S6:253 = 1603 |
| T4/S10 | 2342 | 2338 | 1 | 0 | 0.10 | 12.24 | S10:90 + S12:197 + S2:532 + S1:176 + S3:94 + S9:405 = 1494 |
| T4/S12 | 2300 | 2245 | 1 | 52 | 0.05 | 11.86 | S12:194 + S2:532 + S1:176 + S3:94 + S9:405 = 1401 |
| T4/S2 | 2836 | 2833 | 1 | 0 | 0.03 | 9.13 | S2:430 + S1:155 + S3:518 + S9:443 + S10:437 + S12:415 = 2398 |
| T4/S1 | 2361 | 2325 | 1 | 33 | 0.03 | 8.41 | S1:152 + S3:518 + S9:443 + S10:437 + S12:415 = 1965 |
| T4/S3 | 2237 | 2169 | 1 | 64 | 0.05 | 7.66 | S3:515 + S9:443 + S10:437 + S12:415 = 1810 |

O intervalo de cancelamento usa `clock_timestamp()` lido no início da
transação. Locks/preparo também incluem validações posteriores; por isso
essas colunas não devem ser somadas como se terminassem no mesmo instante.
Predecessores incluem o restante da execução anterior da própria sala:
`tick_at` registra o início do estado, e não o instante posterior do COMMIT.
A diferença não atribuída aos predecessores inclui esperas entre lotes,
timer, seleção e agendamento do host; não é toda custo de pathfinding.

Em T1, 1.291 dos 2.119 ms anteriores à seleção correspondem a seis
transações: 185 + 85 + 178 + 260 + 275 + 308 ms. Quatro ciclos com recompensa
executaram 118–124 consultas e 43–49 escritas; os dois sem recompensa,
24 consultas e 9 escritas. Persistência dos ciclos com recompensa:
102–115 ms. Não houve espera importante para adquirir conexão nessa parada.

Em T3, a primeira parada já aconteceu antes das grandes caudas de COMMIT:
oito predecessores ocuparam 1.166 dos 2.056 ms, com persistência de
74–91 ms em sete ciclos de recompensa. Em paradas posteriores houve COMMIT
de 444 ms. Em T4, a primeira parada acumulou 1.658 ms em seis transações,
incluindo COMMIT de 504 ms. Assim, I/O pode agravar o prazo, mas não é
condição necessária para que ele seja violado. O tempo de COMMIT inclui a
resposta do banco e o agendamento do cliente; não equivale a tempo exclusivo
de fsync e não permite atribuir cada cauda ao SSD sem wait events correlatos.

A seleção serial, o trabalho econômico dentro da transação e as pausas
entre lotes permanecem como custos demonstrados. Não foram alterados
budget, frequência, limite de dois segundos, locks, COMMIT, ledger ou
persistência para mascarar o resultado. A próxima correção precisa
isolar qual parcela pode ser reduzida preservando as mesmas garantias.

### Candidato listado não significa execução selecionada

Os registros também permitem separar a primeira aparição na consulta da
seleção efetiva para executar a transação. A coluna anterior "Antes da
seleção" usa **o lote que efetivamente processou a sala**, não a primeira
vez que o SQL a retornou. Em todos esses casos ela já havia sido listada
em lotes anteriores. Em 22 dos 24 eventos não houve tentativa intermediária:
o orçamento terminou antes de alcançar a sala. Nos outros dois houve
uma tentativa com ROLLBACK antes da execução que registrou a interrupção.

| Ensaio/sala | Primeira lista desde tick (ms) | Aparições em lotes | Espera após primeira lista até aquisição (ms) |
|---|---:|---:|---:|
| T1/S4 | 523 | 4 | 1597 |
| T2/S2 | 591 | 4 | 1540 |
| T2/S11 | 508 | 4 | 1582 |
| T2/S8 | 420 | 4 | 1619 |
| T3/S7 | 531 | 4 | 1526 |
| T3/S8 | 500 | 4 | 1524 |
| T3/S2 | 331 | 4 | 1824 |
| T3/S6 | 327 | 4 | 2084 |
| T3/S4 | 788 | 3 | 1347 |
| T3/S5 | 700 | 3 | 1385 |
| T3/S9 | 511 | 4 | 1850 |
| T3/S11 | 365 | 4 | 1834 |
| T3/S12 | 531 | 4 | 1539 |
| T4/S6 | 663 | 4 | 1566 |
| T4/S4 | 328 | 4 | 1803 |
| T4/S11 | 710 | 4 | 1560 |
| T4/S5 | 425 | 4 | 1830 |
| T4/S7 | 316 | 6 | 2871 |
| T4/S8 | 516 | 4 | 1861 |
| T4/S10 | 537 | 4 | 1802 |
| T4/S12 | 444 | 4 | 1854 |
| T4/S2 | 505 | 5 | 2329 |
| T4/S1 | 772 | 4 | 1587 |
| T4/S3 | 616 | 4 | 1618 |

Exemplo T4/S7: tick nominal devido em +250 ms, candidato já
listado em +316 ms, seis aparições em lotes, aquisição em +3.187 ms e
cancelamento pelo intervalo de 3.190 ms. Isso localiza o atraso na espera
pelo processamento serial e orçamento da partição, **não em um SELECT que
levou três segundos nem na aquisição da conexão**. O orçamento não pode
interromper uma transação em curso; ao acabar, os demais candidatos
aguardam outra chamada do timer de 250 ms. Não foi alterada essa política.

As tentativas intermediárias foram T3/S8 (9 ms/8 consultas) e T4/S7
(6 ms/8 consultas), ambas com ROLLBACK e sem erro SQL. O registro agregado
não distingue qual guarda de lock/presença causou cada recusa. Ao todo,
os ensaios T1–T4 tiveram 16, 2, 10 e 6 ciclos revertidos, respectivamente;
não são commits de recompensa nem violações de atomicidade. O trabalho
revertido também está incluído nos custos da partição.

## Pathfinding observado

| Execução | Chamadas nas duas partições | Chamadas com coordenadas repetidas* | Maior chamada |
|---|---:|---:|---:|
| T1 | 329184 | 65223 | 92.23 ms |
| T2 | 309676 | 53494 | 114.89 ms |
| T3 | 334371 | 34739 | 23.07 ms |
| T4 | 289434 | 31273 | 114.29 ms |

*Repetição exata dentro da janela diagnóstica de até 4.096 pares por worker;
não representa hit rate de um cache proposto. Foram guardadas apenas as
100 chamadas mais lentas por worker, sem inferir frequência a partir desse
recorte. Todos esses cenários usaram o mapa Dawn. Para chamadas de pelo
menos 5 ms, T1 e T2 conservaram 100 por worker: são **no mínimo 200**
em cada ensaio. T3 registrou exatamente 18 (10+8), e T4, 77 (25+52),
sem atingir o teto do coletor. Esses números descrevem as trajetórias
realmente executadas, não uma taxa projetada para outra população.

As maiores chamadas anteriores incluíram `(1405,06;1604,61) →
(1497,20;1325,53)`, 92,23 ms/6 pontos, e `(2240,26;1151,26) →
(2366,96;1808,24)`, 114,89 ms/18 pontos; não eram repetições exatas
registradas. Após a correção, T3 teve máximo de 23,07 ms/14 pontos, de
`(1286,97;1729,79)` para `(1495,60;1582,33)`. T4 ainda registrou
114,29 ms em uma rota de um ponto: tempo decorrido sob carga inclui
preempção/GC e não prova igual tempo de CPU da busca. A rota fria perfilada
separadamente no início deste documento é a evidência causal usada na
correção; não foi criado cache por observar coordenadas repetidas.

Reproduzida isoladamente após encerrar as suítes, a rota de um ponto de
T4 levou 5,37 ms, com origem caminhável e linha direta livre. A cauda de
114,29 ms não se repetiu nesse caso. O contador de CPU do SO informou
16 ms para a chamada curta de 5,37 ms; não foi tratado como medição exata
de CPU exclusiva. O resultado não distingue, sozinho, preempção de GC.

## Aceite longo: REPROVADO

Build compilado sem os hooks de profiling, mesma correção de `Math`,
Node 24.22.2, dois workers Solo e dois Party. O coletor Windows permaneceu
somente em leitura, a cada cinco segundos. Nenhuma suíte pesada foi
executada em paralelo à carga. Limites mantidos: zero interrupções
indevidas, zero slots perdidos/erros, HTTP p95 <500 ms, idade p95 <1000 ms.

| Perfil | Duração efetiva | Auto desligado, vivos ao final | Transições observadas pelo leitor | HTTP p95 | Idade p95 | Resultado |
|---|---:|---:|---:|---:|---:|---|
| Solo 50, primeira tentativa | 324/600 s, abortada por HTTP 503 | 50 | 17 | 83 ms | 850 ms | REPROVADO |
| Solo 50, repetição | 600 s | 43 | 43 | 73 ms | 720 ms | REPROVADO |
| Party 48, 8/4, primeira | 600 s | 12 | 12 | 332 ms | 804 ms | REPROVADO |
| Party 48, 8/4, repetição | 600 s | 32 | 32 | 326 ms | 875 ms | REPROVADO |

Todos os personagens estavam vivos. No primeiro Solo, somente 17 transições
foram vistas antes da recusa HTTP; o estado final de 50 não equivale a 50
cancelamentos com causa individual instrumentada. O critério de dez minutos
não foi completado nessa tentativa: não se considera uma janela aprovada.
Nos ensaios longos não há trace por transação; a causalidade detalhada de
cada evento é a das quatro rodadas curtas, não extrapolada para todos eles.

Solo usou particionamento e aleatoriedade normais: 26/24 e 28/22 personagens.
Party repetiu o mesmo digest e a fixture v2 com RNG de motor/loot por sala,
zero erros SQL, zero falhas de tick e zero reinícios. Todas as renovações
HTTP passaram nas quatro tentativas. Não houve mortes, OOM ou reinício de
worker observado. O benchmark verifica saldo não negativo, mas isso,
isoladamente, não prova todos os invariantes econômicos; regressões de
atomicidade e durabilidade são verificações separadas.

### Oferta de leitura e falhas

| Perfil | Slots previstos | HTTP 200 | HTTP 503 | Bloqueados pela leitura anterior | Scheduler | Após aborto, não tentados |
|---|---:|---:|---:|---:|---:|---:|
| Solo primeira | 40.000 | 21.403 | 40 | 130 | 1 | 18.426 |
| Solo repetição | 40.000 | 39.950 | 0 | 50 | 0 | 0 |
| Party primeira | 38.400 | 38.187 | 0 | 213 | 0 | 0 |
| Party repetição | 38.400 | 38.160 | 0 | 240 | 0 | 0 |

Zero timeouts, erros de rede, respostas inválidas e rejeições pelo limite
global do gerador. Slot bloqueado não é pacote perdido: a oferta daquele
instante deixou de ser emitida porque a leitura anterior continuava ativa.
HTTP 503 é resposta efetivamente recebida e não deve ser somada de novo
como slot não emitido. O campo legado `dropped` agrega somente slots.

Os p95 globais incluem o período posterior às interrupções, quando a carga
de combate já diminuiu; não certificam atendimento de todos os jogadores.
Antes da primeira transição observada, as janelas completas de dez segundos
em Solo tiveram p95 entre 38–475 ms (9 janelas) e 39–536 ms (10 janelas).
Party primeira parou em 2,06 s, sem janela completa anterior; na repetição,
a primeira parada foi vista em 26,96 s, com duas janelas p95 de 532 e 178 ms.
Esses valores são p95 por janela, **não** um p95 agregado pré-interrupção.
A repetição Party teve novas paradas após 432 s e até 560 s: o problema
não está restrito à partida inicial.

## Hardware, PostgreSQL e gerador

| Ensaio | CPU host p95/máx. | Fila CPU p95/máx. | RAM disponível mínima | Escrita C: p95/máx. | Loop principal p99 |
|---|---:|---:|---:|---:|---:|
| Solo primeira | 79% / 100% | 9 / 45 | 1.361 MiB | 0,29 / 13,27 ms | 33 ms |
| Solo repetição | 72% / 100% | 2 / 17 | 1.460 MiB | 0,34 / 8,19 ms | 33 ms |
| Party primeira | 92% / 100% | 9 / 42 | 1.312 MiB | 0,55 / 3,00 ms | 31 ms |
| Party repetição | 90% / 98% | 7 / 16 | 1.206 MiB | 0,28 / 13,05 ms | 32 ms |

O disco usa deltas dos contadores brutos; são médias de I/O por intervalo,
não a latência individual de fsync. Filas instantâneas C: tiveram máximos
1/6/2/2, respectivamente. Leituras p95: 0,77/1,53/0,73/2,05 ms. A coleta
CIM levou p95 de 1,22–1,32 s dentro de cada intervalo de cinco segundos;
CPU, disco e processos não são amostras atômicas no mesmo instante.

Consumo médio em CPUs lógicas equivalentes (1 = um processador lógico
ocupado): Node 1,93/1,67/2,50/2,34; PostgreSQL de teste
1,26/1,33/1,59/1,53; navegadores 1,09/1,01/0,95/1,16. O grupo de ferramentas
e observador consumiu 0,32–0,34. O grupo Node inclui processos Node do host,
não só a API; API, gerador e workers também compartilham um processo. Não
há medição causal separando a CPU do gerador da API nesta arquitetura.

Correlações próximas às **observações pelo leitor**, com resolução de cinco
segundos e janela de ±3 s; não são timestamps exatos do cancelamento:

- Solo primeira, 99,61 s: CPU 76%, fila 45, escrita 0,11 ms, fila de disco 0.
  Há contenção de CPU observada, sem saturação do disco naquela amostra.
- Solo repetição, 105,17 s: CPU 67%/38%, fila CPU 0; escrita
  0,11/6,75 ms e fila de disco 0/6. Há um pico de I/O próximo, sem prova de
  que ele causou cada interrupção.
- Party primeira, 2,06 s: CPU 45–73%, fila 1–3, escrita 0,12–0,14 ms.
- Party repetição, 26,96 s: CPU 79%, fila 0, escrita 0,17 ms, fila de disco 0.
  Na nova série de paradas em 432,24 s: CPU 48%, fila 1, escrita 0,11 ms,
  fila de disco 0.

Existem picos reais de CPU e I/O e pouca margem de RAM para outros programas.
Entretanto, os dados **não demonstram que o PC seja a causa única**, nem que
comprar uma VPS resolverá. CPU total moderada não exclui saturação de uma thread/partição: o processador
lógico mais ocupado teve p95 de 100% nas quatro janelas, sem atribuição
individual desse núcleo a um processo específico.
A resolução do coletor não exclui picos curtos;
RAM baixa sem OOM também não quantifica o efeito de paginação. Os traces
identificam custo de código e espera serial mesmo quando o SELECT/pool são
rápidos. O gerador tem erros de oferta mensuráveis, mas as paradas também
ocorrem com requisições respondendo 200.

A separação em outro computador permanece no
[plano privado de gerador](PRIVATE-LOAD-GENERATOR-PLAN.md), sem execução.
Serão necessários alvo/porta e autorização específica para rede e confiança
HTTPS/mTLS; não foi alterado firewall, Radmin, DNS ou binding do jogo.

## Parecer e limite da correção

**REPROVADO para o aceite inicial de 50 Solo / 48 Party.** A resolução
lexical de `Math` elimina um custo de CPU demonstrado, com regressão
reproduzível, mas **não elimina o atraso de seleção nem os cancelamentos**.
Não se recomenda promover esta revisão como capacidade validada.

A próxima intervenção deve atacar o tempo serial por sala e as múltiplas
idas ao banco para recompensa/persistência, medindo também as esperas entre
lotes. Deve preservar o COMMIT único e a durabilidade; não se autoriza
resolver a reprovação aumentando o prazo de dois segundos, alterando ticks,
adiando o ledger ou relaxando regras. A distribuição 6/6 não é solução
comprovada por si só. O particionamento normal de Party e 4/8–7/5 ainda
precisam de validação futura, sem apagar os resultados reprovados atuais.

Não houve execução com 100 ou mais jogadores nesta entrega. Nenhuma
capacidade para 3.000 foi presumida. A instalação `7122822`, saves, contas,
assets e gameplay permanecem fora do escopo de alteração. Sem merge/deploy.

## Verificações funcionais

- Build e typecheck passaram.
- `npm test`: 227 testes de fundação, sem skips/falhas, e 152/152 arquivos
  de regressão Node legada passaram. O harness Supabase/browser legado
  separado não integra esse comando.
- `npm run test:integration`: 262 testes PostgreSQL passaram, sem falhas
  ou skips, incluindo backup/restauração, privilégios mínimos, replay,
  concorrência, rollback, navegação e smoke compilado de quatro contas.
- `python tools/build_pages.py`: build estático concluído localmente, sem
  publicação.
- `tests/shared-lobby-browser.mts` e `tests/online-walking-browser.mts`:
  passaram com HTTPS local confiável, Node/worker e PostgreSQL reais,
  provedor de fixture sem e-mails. Duas contas, mapas/Paper Doll originais,
  movimentação, viagem/retorno, logout e save da demonstração preservados;
  viewport desktop e estreito. Capturas inspecionadas, fora do Git.
- `node tools/server-completeness.mts`: contratos presentes 27/27. Esse
  inventário funcional não certifica capacidade ou ausência de bugs.
- `git diff --check` passou. Revisão dos nove arquivos não encontrou
  credenciais; dados brutos e `.env` não integram a entrega.
- Instalação privada conferida novamente: `7122822`, árvore limpa.
  Os processos da bancada foram encerrados e seu cluster PostgreSQL
  dedicado foi parado de forma limpa, preservando arquivos e evidências.
  A CI da revisão publicada deve ser consultada no PR; nenhuma execução
  local de Docker foi alegada.

## Reprodução

Com PostgreSQL **descartável** configurado no `.env.test.local` ignorado,
Node fixado pelo projeto e nenhuma outra bancada ativa:

```powershell
npm run build
$env:MARE_LOAD_MODE='party'
$env:MARE_LOAD_CLIENTS='48'
$env:MARE_LOAD_SECONDS='90' # 600 para a janela de aceite
$env:MARE_LOAD_SIMULATION='workers'
$env:SIMULATION_SOLO_WORKERS='2'
$env:SIMULATION_PARTY_WORKERS='2'
$env:MARE_LOAD_LAYOUT='6/6' # repetir com 8/4
$env:MARE_LOAD_EXPECTED_HASH='233a77ff6658cb8b6135902049617eac8cb5f8b662c97d3e154ff17c5ab9227d'
node --env-file=.env.test.local tools/load/run-local-capacity.mjs
```

Para particionamento/RNG normais, remover `MARE_LOAD_LAYOUT` e
`MARE_LOAD_EXPECTED_HASH`. A rotina controlada não deve ser importada por
aplicações; só existe na ferramenta de teste e seu wrapper temporário.
