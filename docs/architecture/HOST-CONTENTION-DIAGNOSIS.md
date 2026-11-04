# Hardware, contenção e atraso dos workers — PR #232

Diagnóstico de 03/11/2026 (America/Sao_Paulo), sobre `232e0ad`. As janelas
abaixo usam UTC de 04/11. **Parecer: REPROVADO para capacidade.**

Houve saturação transitória real na máquina, mas ela não explica sozinha
as interrupções. A repetição sem rastreadores de funções também parou
combates, com oferta completa, respostas HTTP 200 e SSD rápido. Não há
evidência suficiente para quantificar quanto uma troca de PC resolveria.
Não foi aplicada nova otimização de combate ou scheduler nesta rodada.

## Ambiente e preservação

- Ryzen 5 4500, 6 núcleos/12 processadores lógicos; 15,87 GiB de RAM visível.
  O banco de teste está em `C:`, SSD XrayDisk 512 GB NVMe, com 54,2 GiB livres
  na coleta. A simulação Node/PostgreSQL medida não utiliza a GTX 1660 Super.
- Node 24.22.2 compilado, PostgreSQL 18.6 descartável em loopback, API pool
  10, duas partições Solo e duas Party, pools dos workers de 2 conexões.
  Gerador e API compartilham processo; workers usam threads desse processo.
- Somente personagens sintéticos, sem Supabase hospedado/e-mails. Regra de
  2 s, ticks de 250 ms, orçamento de lote de 200 ms, JWT de 900 s, sessão
  24 h/2 h, economia, ledger, mapas, assets e saves preservados.
- `fsync`, `synchronous_commit` e `full_page_writes` permaneceram ligados.
  `track_io_timing` e `track_wal_io_timing` estavam desligados e não foram
  alterados. Não há latência física por consulta disponível nessas views.
- Instalação privada com árvore limpa em `7122822`, sem atualização. A
  primeira tentativa perdeu os processos locais e não gerou resultado
  final; foi descartada. Retomou-se somente o cluster descartável na porta
  de loopback já usada, que completou recuperação automática do PostgreSQL.
  Seus dados foram preservados. Os processos privados estavam desligados
  após a interrupção e não foram reiniciados por esta investigação.
- Sem firewall, Radmin, DNS, mudança de porta configurada, prioridade,
  afinidade, pagefile, antivírus, contratação, merge ou deploy.

## Método e limitações

`tools/load/sample-windows-resources.ps1` consulta CIM em modo somente
leitura: CPU total/por processador lógico, fila CPU, memória, entrada/saída
de páginas, latência/fila de disco e CPU/memória privada por grupo de
processos. Não coleta command lines, URLs ou credenciais. A saída deve
ficar em `infra/local/`; arquivos existentes não são sobrescritos.

```powershell
# Conferir o PID atual do postmaster descartável antes de executar.
./tools/load/sample-windows-resources.ps1 `
  -Output "$PWD/infra/local/capacity/host-observation.jsonl" `
  -Seconds 180 -TestPostgresPid <PID_VERIFICADO>
```

A aquisição efetiva levou tipicamente 1,1–1,3 s e até 1,8 s nas janelas de
carga, apesar do intervalo solicitado de 1 s. Não é captura ETW de cada
preempção. Aplicativos do desktop permaneceram ativos e variaram. Observador
e ferramentas juntos consumiram em média 0,48–0,53 CPU-s/s durante os testes;
essa interferência não foi subtraída. CPU-s/s não é percentual de núcleo
físico. O percentual total considera os 12 processadores lógicos.

Latência de disco usa deltas dos contadores brutos, frequência, base de
operações e tratamento de wrap de 32 bits. O CIM formatado arredondava as
frações de segundo para zero. **O p95 de disco abaixo é das médias por
intervalo, não o p95 de cada I/O.** [Referência Microsoft](https://learn.microsoft.com/en-us/windows/win32/wmisdk/timer-algorithm-counter-types).

Dois ensaios receberam hooks privados no build descartável para lote,
conexão, consultas, locks, motor, navegação, persistência e COMMIT. Esse custo
é adicional. O build foi restaurado antes da terceira janela e dos testes
funcionais. IDs, RNG, estado aleatório e carga do desktop variaram: não é
A/B controlado, mesmo com distribuição 8/4 repetida. Logs extensos e dados
de processos ficaram ignorados, fora do Git.

## Resultados

| Perfil | Janela UTC | Distribuição | Duração | Auto final | p95 HTTP / idade | Slots não emitidos |
|---|---|---|---:|---:|---:|---:|
| Party 48, instrumentado | 01:15:37–01:16:06 | 8/4 salas | 28 s; abortou | 0/48 | 3326 / 2041 ms | 4813 |
| Solo 50, instrumentado | 01:17:33–01:19:04 | 25/25 atores | 90 s | 36/50 | 79 / 992 ms | 21 |
| Party 48, sem hooks | 01:20:54–01:22:24 | 8/4 salas | 90 s | 36/48 | 173 / 1224 ms | 0 |

Party instrumentado estava configurado para 90 s e abortou em resposta a
falhas. Duração inclui drenagem e parada dos workers. Todos estavam vivos
ao final. O p95 depois de parar o combate mede menos trabalho útil; não
representa ganho de capacidade. Nenhuma linha aprova 10 minutos.

| Recurso | Sem benchmark: 26,4 s | Party instrumentado | Solo instrumentado | Party sem hooks |
|---|---:|---:|---:|---:|
| CPU total média / p95 / máximo | 21 / 44 / 57% | 65 / 100 / 100% | 50 / 84 / 100% | 57 / 93 / 98% |
| Fila CPU máxima | — | 19 | 38 | 53 |
| RAM disponível mínima | 1693 MiB | 756 MiB | 719 MiB | 1019 MiB |
| Leitura SSD p95 das médias | 1,22 ms | 267,89 ms | 0,99 ms | 0,94 ms |
| Escrita SSD p95 das médias | 0,60 ms | 226,71 ms | 0,26 ms | 0,14 ms |
| Fila SSD máxima | 0 | 24 | 3 | 1 |
| CPU Node média, CPU-s/s | 0,003 | 1,35 | 1,93 | 2,27 |
| CPU PostgreSQL teste média, CPU-s/s | 0,009 | 0,79 | 1,34 | 1,52 |

A janela sem benchmark foi coletada depois do Solo, antes do build da
repetição Party, mantendo desktop e observador ativos. Não houve OOM
registrado. Entradas de páginas chegaram a 19.425/s no Party instrumentado
e 35.141/s no Solo; saídas foram zero no Party e quase zero no Solo. A margem
de RAM é pequena, mas hard faults também podem ler arquivos mapeados: não
provam, isoladamente, falta de RAM como causa de cada parada.
[Working set, Microsoft](https://learn.microsoft.com/en-us/windows/win32/memory/working-set).
Não foram medidos temperatura, throttling térmico, SMART ou defeito físico.

## Causalidade do atraso antes da seleção

Não existe uma fila FIFO explícita de entidades. A fila lógica corresponde
aos ticks persistidos elegíveis. Os hooks registraram: tick anterior,
elegibilidade SQL após 100 ms, vencimento nominal de 250 ms, primeira
observação no lote, início/fim da seleção, início da entidade, aquisição,
locks/revalidação, motor, persistência, COMMIT e fim da transação.
Cada cancelamento foi ligado à sequência de predecessores da mesma partição.

O tick de referência do banco antecede o fim de todos os locks. A primeira
observação no lote não é o instante exato de entrada numa fila física.
Pathfinding está dentro do motor e consultas dentro da transação: não somar
fases aninhadas como se fossem custos independentes.

**Party: 48 cancelamentos por prazo, com presença e epoch válidos.** A
primeira sala atingiu 2098 ms, dos quais 2093 ms antes de começar a seleção.
Cinco transações anteriores ocuparam **374 + 191 + 162 + 179 + 192 = 1098 ms**;
cada uma fez 24 consultas e 9 escritas. A consulta de seleção levou cerca
de 1 ms, a espera nessa seleção cerca de 1 ms e a conexão 0,074 ms. A fase
completa de locks/revalidação levou 15 ms, parcialmente posterior ao tick
de referência. O restante inclui intervalos do scheduler, consultas de
outros lotes e atraso de execução; não foi rotulado como I/O.

Perto dessa primeira parada, três amostras de CPU foram 72%, 99% e 100%,
com fila até 19. O SSD ainda estava rápido: leituras médias de 0,82–2,69 ms
por intervalo. A forte contenção de disco/WAL ocorreu depois.

**Solo: 14 cancelamentos por prazo, com sessão, lease e epoch válidos.**
O primeiro intervalo atingiu 2071 ms: 1864 ms antes da seleção, 3 ms de
consulta e 194 ms aguardando atores anteriores dentro do lote. Quatorze
transações anteriores consumiram **1316 ms** antes do lote; a primeira,
465 ms. Conexão de 0,059 ms. Nessa vizinhança a fila CPU era zero e não
houve a cauda de disco de centenas de milissegundos vista em Party.

**Party sem hooks:** quatro paradas observadas perto de 7 s e oito perto
de 11 s. Próximo às primeiras: CPU 46–76%, fila CPU zero, SSD sem fila,
leitura média de cerca de 0,5 ms e escrita de 0,11–0,15 ms. Próximo às demais:
CPU 65–71%, fila CPU 0–2. Sem hooks, o instante da leitura pode ser posterior
ao cancelamento; esse ensaio confirma a falha, não seu ramo causal exato.

## PostgreSQL, persistência e pathfinding

Party instrumentado, p95 por partição: motor 151–161 ms, persistência
100–130 ms, COMMIT 393–410 ms e transação 432–439 ms. COMMIT chegou a 614 ms.
Nas 91 amostras PostgreSQL da janela: 41 observações backend-amostra em
`IO/WalWrite`, 372 em `LWLock/WALWrite` e zero bloqueadores de locks pesados.
São observações, não eventos únicos nem duração. Isso relaciona a cauda de
COMMIT à contenção de WAL/disco, sem diagnosticar defeito do SSD.

`idle in transaction`/`ClientRead` pode corresponder ao banco aguardando o
Node entre consultas, inclusive durante o motor. Não prova transação
esquecida. Sessão ativa sem wait event não equivale automaticamente a CPU.
[Definições PostgreSQL 18](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW).

Solo: p95 de transação 52–53 ms, COMMIT 1,18–1,19 ms e máximos de COMMIT
280–311 ms. As 267 amostras disponíveis cobrem parte da janela, com intervalo
entre observadores: 38 observações `IO/WalWrite`, 20 `LWLock/WALWrite` e uma
espera de `transactionid`. Não demonstram lock pesado sustentado dominante.

Party sem recompensa normalmente fez 9 escritas: quatro mundos, quatro
combates e uma sala. Com recompensa, houve até 136 consultas e 57 escritas.
Isso não autoriza eliminar operações ou retirar ledger e estado da mesma
transação. Atomicidade e durabilidade permanecem intactas.

Foram observadas 47.085 chamadas de pathfinding Party (6,1 s somados) e
589.792 Solo (32,0 s). Exemplos em `dawn`, sem repetição exata anterior no
observador:

| Origem → destino | Tempo observado | Caminho retornado |
|---|---:|---:|
| (1300,07;1453,07) → (1507,10;1284,79) | 55,98 ms | 13 pontos |
| (872;1608) → (1040;1488), primeira transação | 47,41 ms | 11 pontos |

As caudas Solo atingiram 187,26 e 85,95 ms nas partições. Tempo decorrido
inclui preempção; não é CPU exclusiva da função. Loop p99 do processo
principal: 38 ms Party instrumentado, 33 ms Solo e 29 ms Party sem hooks.
Nos workers instrumentados: 152–153 ms Party e 56–60 ms Solo. Não foi
implementado cache de caminhos.

Uma reprodução **isolada**, depois dos ensaios de carga, mostrou que parte
da cauda é trabalho de CPU reproduzível do código: em `dawn`, de
`(2137.7381123218383,1057.5929338939222)` para
`(2304.423881155701,1851.783344798676)`, a chamada levou 171,92 ms e cerca
de 172 ms de CPU da thread. Origem caminhável, destino sem ajuste, linha
direta bloqueada, retorno de 24 pontos. Não havia API nem PostgreSQL nessa
reprodução. O mapa já tinha seu grid construído; a rota ainda não estava
aquecida nos memos existentes. Dez repetições ficaram entre 1,8 e 3,8 ms.
Isso caracteriza sensibilidade ao estado dos memos existentes, não prova
que um cache adicional seja correto ou tenha boa taxa de acerto real.

Outro processo, com profiler de CPU, levou 184,25 ms e coletou 128 amostras:
48,44% de self samples em `sample` e 21,09% em `maskLine`, de
`dawn-world.js`. Esse perfil curto aponta as consultas da máscara de terreno
como alvo concreto; não estima sua fração em toda a carga nem autoriza
modificar colisões. A ferramenta reproduzível é:

```sh
node tools/load/profile-navigation.mjs
node tools/load/profile-navigation.mjs --profile
```

Ela usa os arquivos versionados, não acessa banco/credenciais e guarda o
perfil somente em `infra/local/capacity/`. Não há asserção frágil de tempo;
otimização futura deve preservar exatamente a validade e o resultado da
rota, com regressão de geometria e nova medição de capacidade.

## Slots, erros e timeouts do gerador

O relatório acrescenta `readSlots`, `requestFailures`, UTC inicial/final e
PID. `dropped` preserva a soma legada de slots previstos não emitidos; não
representa pacotes de rede descartados.

- Party instrumentado: 5760 slots planejados, 947 emitidos, 686 bloqueados
  pela leitura anterior, 27 perdidos pelo scheduler e 4100 não tentados após
  aborto. Emitidos: 916 HTTP 200, 4 HTTP 503 e 27 timeouts. Limite global de
  96 leituras em voo não atingido.
- Solo: 6000 slots, 5979 HTTP 200, 21 bloqueados por leitura anterior; zero
  erros HTTP, timeouts, rejeições por capacidade ou perdas do scheduler.
- Party sem hooks: 5760 HTTP 200 e zero slots perdidos, timeouts ou erros.

O gerador oferece carga fixa e impede leituras simultâneas do mesmo ator.
Uma pendência pode impedir o próximo slot sem perder uma requisição enviada.
Isso reprova o critério de oferta, mas não deve ser chamado de perda de rede.
Não é possível separar CPU de API e gerador usando apenas o processo
compartilhado. O novo smoke compilado de quatro membros, incluindo renovação
HTTP e consistência desses contadores, passou; typecheck também passou.

## Parecer e trabalho restante

| Hipótese | Resultado |
|---|---|
| Saturação do host | Confirmada em picos de CPU e I/O; desktop e bancada disputam recursos. |
| RAM como causa única | Não demonstrada; margem baixa, sem OOM observado. |
| Disco explica todas as paradas | Não: Solo e Party sem hooks também falharam com disco rápido. |
| Gerador explica todas as paradas | Não demonstrado: Party parou com oferta completa e HTTP 200. |
| Espera serial anterior à seleção | Confirmada; predecessores consomem parte relevante dos 2 s. |
| Comprar hardware resolve | Não demonstrado; frações causais ainda não isoladas. |

Esta entrega prioriza o diagnóstico de hardware antes de continuar
otimizando. Não contém correção especulativa do jogo. A comparação
determinística 6/6, 8/4, 4/8 e 7/5 com os mesmos IDs, snapshot, RNG por sala
e oferta HTTP permanece pendente: distribuição igual não torna estas
rodadas determinísticas. A atribuição controlada deve existir somente na
bancada; também será necessário testar o particionamento normal.

Depois de demonstrar e corrigir a causa com regressão, executar 50 Solo e
48 Party por 10 minutos cada e repetir: zero interrupções indevidas, zero
slots perdidos/erros, p95 HTTP <500 ms e idade <1000 ms. Não aumentar para
100. Não presumir 3.000. Resultado atual **REPROVADO**.

O [plano privado para dois computadores](PRIVATE-LOAD-GENERATOR-PLAN.md)
está preparado, mas sua execução e as alterações de rede dependem de
autorização específica.

## Registro de validação do diagnóstico

Na primeira CI de `5ebb94e`, testes essenciais, Docker/Linux e navegador
passaram. O job foundation falhou no smoke de quatro contas: o subprocesso
terminou com código 2, mas o teste não exibiu os contadores que motivaram a
reprovação. Esse resultado não foi classificado como problema do hardware
local nem descartado como flake sem evidência.

O teste passou a mostrar somente métricas agregadas do subprocesso ao falhar,
mantendo todas as asserções e limites. A execução local passou novamente e
o typecheck passou. Uma repetição verde não determina retroativamente a causa
da primeira falha; o novo diagnóstico permite investigar uma recorrência.
