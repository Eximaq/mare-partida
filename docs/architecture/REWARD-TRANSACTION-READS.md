# Leituras de poder após recompensas — PR #232

Base: `2cb8451`. Continuação de `ROOM-QUEUE-CONCURRENCY.md`.
Escopo: reduzir trabalho demonstrado dentro da transação de recompensa que
mantém outras salas aguardando. Não altera dois segundos de tolerância,
cadência, orçamento, pools, partições, sessões, regras, RNG ou economia.

## Reprodução e mudança

Um abate em uma Party de quatro personagens executou 119 consultas em cada
uma de três reproduções PostgreSQL. Dessas, 36 pertenciam à releitura de
inventário, identidade, atributos, talentos e frutas para calcular o poder
permanente de cada participante. O trabalho ocorre após a mutação econômica
e antes do COMMIT; portanto ocupa o slot de transação do worker e aumenta a
espera das próximas salas.

Os workers agora solicitam ao observador de conquistas uma leitura agrupada
dos dados atuais. Ela ocorre **depois** da recompensa e da progressão de nível,
sob os mesmos locks, na mesma conexão/transação. O estado lido deve coincidir
com o estado pós-mutação passado pelo worker. Não há cache entre chamadas,
reutilização dos dados anteriores ao tick nem inclusão de bônus temporários.

Comandos e fixtures de migrações históricas continuam usando o leitor anterior.
A opção de esquema atual é interna; não foi adicionada a nenhum contrato HTTP.
Fórmulas e validadores são os mesmos já usados por `readCombatInputs` e
comparados aos leitores individuais nas sete classes.

O mesmo abate passou a executar 87 consultas: menos 32, ou 26,9%. Todas as
escritas de progressão, inventário, XP, morte, conquistas, posição, simulação
e recibos permanecem dentro do mesmo COMMIT. Não houve migração nem redução
de durabilidade.

O teste de regressão falhou com as 119 consultas antes da alteração e passou
após a mudança. As verificações incluem XP por participante, morte e recibos
únicos, poder permanente equivalente, leitura após mudança de nível, recusa
de estado desatualizado e rollback integral quando a persistência de conquistas
falha depois da recompensa.

Os tempos de três ticks instrumentados isolados foram 140/120/169 ms antes e
149/128/126 ms depois. Essa amostra pequena e variável **não demonstra** ganho
estável de tempo; a redução de consultas é a evidência reproduzível.

## Comparação de carga

Janelas instrumentadas de 90 segundos, antes e depois, sem alterar pools,
orçamento ou distribuição. Mesmas 12 salas, 48 atores, semente e perfil HTTP
nas distribuições 6/6 e 8/4.
No 8/4 modificado, a drenagem final levou a duração arredondada para 91 s.
Estado inicial `233a77ff6658cb8b6135902049617eac8cb5f8b662c97d3e154ff17c5ab9227d`;
conjunto de salas `82ace0ce837d925e92f854f6771f9d1443ba599e53ef5454b3cc7c3a29df319a`.
Relógio e escalonamento reais não são determinísticos.

| Distribuição | Revisão | Interrompidos vivos | Slots bloqueados | HTTP p95 | Idade p95 |
|---|---|---:|---:|---:|---:|
| 6/6 | `2cb8451` | 0 | 45 | 168 ms | 602 ms |
| 6/6 | leitura agrupada | 0 | 0 | 155 ms | 768 ms |
| 8/4 | `2cb8451` | 0 | 0 | 170 ms | 1.085 ms |
| 8/4 | leitura agrupada | 4 | 48 | 276 ms | 1.043 ms |

Somente a janela curta 6/6 modificada satisfez os limites. Isso não aprova
capacidade de dez minutos. O 8/4 modificado teve uma sala interrompida,
contra nenhuma na baseline curta; não há evidência de melhora estável.
Todos os pedidos emitidos retornaram 200. Não houve morte, timeout, erro
SQL/tick, reinício, falha de renovação ou descarte de scheduler/fila/aborto.
Os slots bloqueados correspondem a leituras não iniciadas porque a anterior
do mesmo ator continuava ativa; não são erros HTTP.

Na sala interrompida, o intervalo entre ticks foi 2.397 ms. Ela apareceu
na primeira lista após 512 ms e aguardou mais 1.883 ms até a admissão, em
cinco listas. Aquisição de conexão: 0,11 ms; locks/preparação: 10,80 ms.
Treze transações de outras salas se sobrepõem à espera; a união dos seus
intervalos cobre 1.455 ms, sem somar tempos concorrentes como seriais.
Uma delas consumiu 259 ms no motor (229 ms nas chamadas de navegação) e
439 ms no total; outra consumiu 293 ms na persistência. Os tempos incluem
escalonamento. Não provam consumo exclusivo de CPU ou fsync.

A partição com oito salas reduziu a persistência p95 de 117,51 para
93,78 ms e a transação p95 de 205,06 para 179,59 ms nesse par de ensaios.
Mesmo assim houve interrupção: p95 menor não elimina a cauda nem a espera
anterior à seleção. Nenhum cache de pathfinding foi introduzido.

Na partição de oito salas foram 236.619 chamadas de pathfinding em Dawn,
p95 0,15 ms, máximo 41,71 ms. As três mais lentas nessa partição:

| Origem (x; y) | Destino (x; y) | Duração | Pontos retornados | Par exato já observado |
|---|---|---:|---:|---|
| 2.020,55; 952,44 | 1.525,26; 1.237,04 | 41,71 ms | 25 | não |
| 2.411,45; 1.837,19 | 2.051,44; 1.239,91 | 33,92 ms | 8 | não |
| 872; 1.608 | 1.040; 1.488 | 28,80 ms | 11 | não |

A segunda ocorreu em uma transação que precedeu a sala interrompida.
Os pares exatos já vistos tiveram máximo 6,45 ms nessa partição, dentro
do limite de observação de 4.096 pares por mapa. Isso não demonstra que
um cache resolveria a cauda nem separa CPU da busca de pausas do runtime.
COMMIT p95 foi 2,24 ms, mas o máximo chegou a 532,65 ms; não se confunde
o tempo observado no cliente Node com latência exclusiva de disco.

## Aceite e repetição

50 Solo e 48 Party 8/4, 600 segundos cada, duas rodadas, sem hooks detalhados
no runtime. Os limites permanecem zero interrupções, zero slots perdidos,
HTTP p95 <500 ms e idade p95 <1.000 ms. Não são 98 jogadores juntos.

| Perfil | Interrompidos vivos | Slots bloqueados | HTTP p95 | Idade p95 |
|---|---:|---:|---:|---:|
| Solo 50, primeira (26/24) | 49 | 155 | 50 ms | 344 ms |
| Party 48, primeira (8/4) | 32 | 480 | 224 ms | 547 ms |
| Solo 50, repetição (33/17) | 40 | 6 | 91 ms | 513 ms |
| Party 48, repetição (8/4) | 24 | 554 | 454 ms | 734 ms |

Solo primeira: 39.845 respostas 200, sem timeout, erro de rede, resposta
inválida, morte, falha de renovação ou reinício. Todos os 155 slots perdidos
estavam bloqueados pela leitura anterior do mesmo ator. Primeiro cancelamento
observado em 108,376 s; último em 455,320 s. As dez janelas completas de 10 s
anteriores ao primeiro cancelamento tiveram p95 HTTP entre 39 e 449 ms.
O p95 global de 50 ms inclui períodos com só um combate ativo e **não**
representa estabilidade de 50 combates simultâneos.

Party primeira: 37.920 respostas 200, 480 slots bloqueados por leitura
anterior, zero perdas de scheduler/fila/aborto. Fixture íntegro, sem erros
SQL/ticks com falha, timeouts, erros de rede, mortes, reinícios ou falhas
de renovação. Interrupções observadas entre 7,744 e 376,285 s; a primeira
ocorreu antes da primeira janela completa de 10 s. Perto de 380 s houve
p95 HTTP de 2.372 ms e 365 slots bloqueados na janela de 10 s. Não se
excluiu esse trecho nem se reiniciou combate para mascarar a interrupção.

Solo repetição: 39.994 respostas 200, seis leituras bloqueadas, zero
perdas de scheduler/fila/aborto, timeouts, erros de rede/resposta, mortes,
falhas de renovação ou reinícios. Interrupções entre 2,162 e 17,208 s.
A distribuição normal foi 33/17, diferente dos 26/24 da primeira rodada;
não é uma comparação com estado inicial/RNG idênticos. Não houve janela
completa de 10 s com todos os combates ativos antes da primeira interrupção.

Party repetição: 37.846 respostas 200, 554 leituras bloqueadas, zero perdas
de scheduler/fila/aborto. Fixture íntegro, sem erros SQL/ticks com falha,
timeouts, erros de rede/resposta, mortes, reinícios ou falhas de renovação.
Interrupções entre 6,618 e 329,237 s, também antes de uma janela completa
com todos os combates ativos. Nenhuma das quatro janelas passou no aceite.

Comparação com os dez minutos anteriores de `2cb8451`, documentados em
`ROOM-QUEUE-CONCURRENCY.md` (host compartilhado e Solo não determinístico):

| Perfil | `2cb8451`: interrompidos / slots bloqueados | Esta revisão: interrompidos / slots bloqueados |
|---|---:|---:|
| Solo primeira | 20 / 452 | 49 / 155 |
| Party primeira | 32 / 5.352 | 32 / 480 |
| Solo repetição | 48 / 664 | 40 / 6 |
| Party repetição | 8 / 289 | 24 / 554 |

As variações não demonstram ganho estável de capacidade. Menos slots
bloqueados depois de interromper mais combates não é aprovação de desempenho.

## Recursos do host e limites de atribuição

Na primeira janela Solo, CPU total p95 73%, máximo 100%; fila de CPU
p95 1, máximo 18; RAM disponível mínima 3.156 MiB. Escrita em C: p95
0,20 ms, máximo 11,26 ms; leitura máxima 22,53 ms. Próximo à primeira
observação de interrupções houve amostra de CPU 100%/fila 18, seguida de
escrita 11,26 ms e aumento de leituras de páginas. Há interferência real
do host nesse trecho, mas a amostragem de cinco segundos não prova causa
exclusiva nem mede cada pausa. O coletor levou até 3,51 s para uma amostra.

No 8/4 curto, junto ao cancelamento, a amostra indicou CPU total 62%,
2.739 MiB disponíveis e escrita de 0,14 ms. Não há saturação global de CPU,
RAM ou disco demonstrada nesse instante; picos menores que a amostragem e
contenção de uma thread continuam possíveis. Event-loop p99 da partição
com oito salas: 82,97 ms; processo principal: 31,67 ms. O loop da API não
representa sozinho as threads de simulação.

Configuração conferida durante a carga: `fsync=on`, `synchronous_commit=on`
e `full_page_writes=on`. Não se reduziu durabilidade para melhorar tempos.

Party primeira: CPU total p95 83%, máximo 94%; RAM disponível mínima
1.978 MiB; escrita p95 0,20 ms, máximo 11,77 ms. Perto da primeira
interrupção, escrita de 8,52–11,77 ms e CPU de 31–75%; perto do grupo
seguinte, escrita de 6,49 ms. São intervalos amostrados próximos à
observação pelo leitor, não o instante exato de cada cancelamento.
Uma consulta a `pg_stat_activity` perto da metade da janela não encontrou
backend bloqueado por outro; as transações observadas tinham até 5 ms.
Essa amostra não exclui locks em outros instantes.

Solo repetição: CPU total p95 89%, máximo 99%; fila p95 2, máximo 17;
RAM disponível mínima 1.900 MiB; escrita p95 0,89 ms, máximo 11,12 ms;
coletor máximo 2,95 s. Event-loop principal p99 foi 33 ms no Solo e
32 ms na primeira Party. Esses números não localizam todas as pausas
das threads nem isolam a interferência do gerador na mesma máquina.

Party repetição: CPU p95 92%, máximo 100%; fila p95 9, máximo 31; RAM
disponível mínima 829 MiB; escrita p95 2,15 ms, máximo 13,99 ms; coletor
máximo 4,18 s. Houve pressão de recursos, mas não há resolução suficiente
para atribuir cada interrupção exclusivamente à CPU, memória ou disco.
Event-loop principal p99: 32 ms. Não foram encerrados processos do usuário,
alteradas afinidades/prioridades ou modificadas políticas do Windows.

API, gerador, workers e PostgreSQL da bancada continuam no mesmo computador.
A instalação privada foi atualizada separadamente, por autorização do dono,
de `7122822` para `2cb8451`, com backup restaurado e conferido. Ela permanece
disponível durante esta investigação; este patch não foi instalado nela.
Seu processo é carga externa potencial, e não se presume isolamento de CPU.

Sem merge, deploy público, alteração de rede/Supabase ou carga de 100+ atores.
Não há afirmação de capacidade para 3.000 jogadores.

## Verificação funcional

- `npm run build` e `npm run typecheck`: aprovados.
- `npm test`: 231 testes de fundação e 152/152 arquivos Node legados aprovados.
- `npm run test:integration`: 269 testes PostgreSQL aprovados, zero falhas,
  cancelamentos ou skips. Inclui as três novas regressões, autorização,
  recompensa única, replay, perda de resposta após COMMIT e rollback.
- `python tools/build_pages.py`: build local aprovado; não publica o site.
- `shared-lobby-browser.mts` e `online-walking-browser.mts`: aprovados com
  HTTPS confiável, API/worker/PostgreSQL reais e identidade sintética sem
  e-mails. Duas contas, presença mútua, movimento com atraso de 100/250 ms,
  caçada, logout, retomada de rede e save da demonstração verificados.
  Inspeção das capturas confirmou mapa, HUD e Paper Doll nos dois tamanhos.
  A captura da primeira caminhada manteve um aviso genérico após o cenário
  de desconexão injetada. A repetição diagnóstica passou e não mostrou o
  aviso antes nem depois da falha; o polling da UI também exibe esse erro
  quando uma consulta falha. A origem exata daquela mensagem não foi
  isolada e não foi atribuída à alteração de banco. Não se afirma ausência
  de todo aviso de interface apenas porque o harness passou.
- Varredura do diff não encontrou JWT, chave privada, segredo de provedor,
  DSN com credencial ou e-mail pessoal. `.env` e evidências brutas ignorados.

A `main` avançou para `59573aa` durante esta verificação, com HUD e equipamentos
do colaborador. Nenhuma alteração nova foi encontrada nos módulos de servidor
modificados aqui. Esses commits não foram mesclados nem sobrescritos: as
medições deste documento pertencem à base `2cb8451` mais esta correção.

## Parecer

**REPROVADO no aceite de capacidade.** A redução de consultas é reproduzível
e a integridade das recompensas é coberta por regressão, mas o atraso entre
atendimentos ainda ultrapassa dois segundos. Não recomendar merge ou
instalação desta revisão como solução definitiva do lag.

- Código: menos 32 round trips por recompensa de quatro participantes;
  espera residual antes da admissão e caudas de motor/persistência continuam.
- Ambiente: picos de CPU e I/O coincidiram com parte das interrupções;
  outras ocorreram sem saturação global demonstrada. Não culpar apenas o PC.
- Gerador: não houve descarte por fila cheia ou scheduler, mas houve
  slots perdidos por resposta anterior pendente. Compartilhar o processo e
  o host impede excluir interferência mesmo com esses contadores zerados.

O próximo experimento deve separar a contribuição dos componentes, conforme
`PRIVATE-LOAD-GENERATOR-PLAN.md`, com ambiente e rede autorizados antes da
execução. Não foi criado listener remoto nem aplicada regra de firewall.
Repetir indefinidamente o mesmo perfil no mesmo host compartilhado não
demonstrará por si só a causa de cada pico. Tampouco há evidência de que
contratar uma VPS, sem esse isolamento e medição, resolverá o problema.
