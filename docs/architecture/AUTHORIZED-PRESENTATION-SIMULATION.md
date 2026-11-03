# Apresentação autorizada e simulação compartilhada

Base: main `7122822` (#231). O objetivo é retirar leituras de apresentação da
seção crítica da simulação, reduzir duplicação de monstros de Party e medir o
runtime compilado. Não altera gameplay, mapas, velocidades, combate, loot, HUD,
Paper Doll, assets, saves, contratos de comandos ou política de autenticação.

## Limite de autorização

`online-state` e `frame` verificam sessão opaca, tipo play, revogação, epoch da
conta, expiração absoluta/inativa e propriedade no PostgreSQL. Se a validade do
provedor venceu, o refresh continua no caminho serializado existente: nenhum
token é reutilizado concorrentemente ou enviado ao navegador. Não há cache de
permissão, credencial, sessão ou personagem entre requisições.

A projeção usa `REPEATABLE READ READ ONLY`; todos os seus domínios pertencem ao
mesmo snapshot. Não mantém os locks exclusivos de sessão/conta/personagem/Party
durante essa montagem. Depois do COMMIT, uma consulta nova revalida sessão,
epoch, prazos, token e dono. Se logout, recuperação, rotação ou expiração se
confirmaram durante a leitura, a resposta é descartada com 401.

O heartbeat de inatividade usa `SKIP LOCKED`: se a simulação já possui a sessão,
não enfileira a leitura atrás dela. Nesse caso o prazo armazenado continua sendo
aplicado, sem extensão presumida nem ressurreição de sessão expirada. Uma nova
atividade poderá renová-lo quando o lock estiver disponível. O limite permanece
24 horas absolutas e duas horas de inatividade; JWT/recheck permanecem 900s.

Presença é uma escrita curta validada contra controle/sessão/epoch. Transferência
automática de liderança só entra na seção serializada quando o líder ultrapassa
o prazo existente. Comandos econômicos, controle, refresh, revogação e workers
continuam adquirindo e revalidando seus locks. Nenhum ID do cliente prova dono.

Perfis históricos sem linha usam os mesmos defaults na apresentação; criação e
comandos persistem o perfil. Hierarquia apresentada deriva poder atual sem escrever
durante o GET; eventos/comandos continuam atualizando a projeção persistida do ranking.

Referências: [isolamento PostgreSQL18](https://www.postgresql.org/docs/18/transaction-iso.html),
[locks PostgreSQL18](https://www.postgresql.org/docs/18/explicit-locking.html),
[sessões Supabase](https://supabase.com/docs/guides/auth/sessions). As sessões
internas do BFF têm política própria; não dependem dos limites pagos do provedor.

## Uma linha canônica de monstros

Uma Party conserva os monstros somente em `party_instances.simulation`. Novas
gravações pessoais mantêm `mobs:[]` e os estados individuais completos: HP, energia,
recargas, habilidades, talentos, IDs, efeitos e recibos. Os leitores reidratam a
lista canônica, incluindo linhas antigas ainda duplicadas. Não há limpeza em massa,
migration, novo grant ou alteração de fingerprint do motor/mundo.

O worker reutiliza a sala que já travou; leituras completas consultam cada sala
uma vez para o lote de até quatro membros. Cópias pessoais em memória continuam
independentes antes da conexão explícita feita pelo motor, preservando os efeitos
de reset de um participante. Frames dos colegas não transferem monstros que não
utilizam. A resposta do próprio jogador continua contendo os monstros canônicos.

Na fixture inicial de quatro membros, linhas pessoais somavam aproximadamente
38,8KB; passaram a 8,2KB. Os monstros continuaram íntegros na sala e nas respostas.
Não é uma promessa de redução percentual para inventários/salas reais.

## Agenda e recursos

O runtime mantém o agendamento anterior de 250ms, o orçamento suave de 200ms
e a execução serial por partição. A seleção imediata após um lote atrasado foi
retirada após os ensaios comparativos. A proteção de gap/offline permanece.

Os workers atendem às partições solo ou Party. A idade da sala é revalidada
depois dos locks. Cada sala é persistida em uma transação com os mesmos locks
e fencing para proteger simulação e recompensas contra duplicação.

## Runtime e validade do ensaio

Node24.22.2 LTS é fixado em `.node-version`, Docker e engines. A cópia Windows foi
extraída separadamente, com SHA256 conferido na distribuição oficial; o Node do
sistema não foi substituído. O launcher escolhe a cópia portátil da versão fixada
ou o Node correspondente no PATH, e falha antes de iniciar serviços se incompatível.
[Release e checksums oficiais](https://nodejs.org/en/blog/release/v24.22.2).

O perfil anterior mostrou aproximadamente4,5s em `existsSync` do carregador tsx
durante um diagnóstico. `npm run load:local` agora compila primeiro e executa API,
domínio e workers compilados, com pool/timeouts reais da API. O stripping nativo
é usado somente para os dois arquivos de tooling da fixture, sem registrar loader
no processo. Arquivos gerados privados são removidos após o ensaio. Relatório
registra versão Node, identidade compilada do serviço e limite do pool.

HTTP, PostgreSQL e workers são reais; identidade é fictícia, banco aleatório é
loopback descartável. Nenhum e-mail, conta hospedada ou dado de jogador é usado.
Não testa capacidade do provedor real. Gerador/API/PG/desktop compartilham o PC.
RNG, distribuição das partições e carga do host variam: não é comparação A/B.

Interrupções nativas0xC0000409 foram novamente observadas com Node24.15 durante
setup, sem relatório de causa. Uma repetição também concluiu. Existem relatos
upstream de problemas nativos. As janelas concluídas com 24.22.2 abaixo não
reproduziram a interrupção. A causa exata permanece inconclusiva.

## Aceite e operação

Os critérios exigem todas as respostas HTTP200, zero descartes e paradas indevidas,
p95 HTTP abaixo de 500ms e p95 da idade da simulação abaixo de 1000ms.

| Ensaio compilado no Windows | Janela | HTTP200 | Descartes | p95 HTTP | p95 simulação | Auto ativo | Resultado |
|---|---:|---:|---:|---:|---:|---:|---|
| Solo50, 2+2 antes da cooperação | 60s | 3.999 | 0 | 38ms | 770ms | 50/50 | Passou |
| Party50, 2+2 antes da cooperação | 60s | 4.000 | 0 | 371ms | 812ms | 50/50 | Passou |
| Party50, 2+2 com cooperação | 120s | 7.999 | 1 | 303ms | 538ms | 50/50 | Reprovado |
| Party50, 2+2 com cooperação | 60s | 3.848 | 152 | 1682ms | 641ms | 37/50 | Reprovado |
| Solo100, 4+2 sem cooperação | 30s | 3.821 | 179 | 835ms | 1156ms | 95/100 | Reprovado |
| Solo100, 4+2 com cooperação | 30s | 3.054 | 945 | 1289ms | 866ms | 99/100 | Reprovado |

A cooperação reduziu o atraso observado da simulação no ensaio de 100 e aumentou
a fila e os descartes na API. A repetição com 50 em Party registrou 13 combates
interrompidos. Esses resultados motivaram retirar a cooperação do runtime. Os
degraus de 300, 1.000 e 3.000 dependem da aprovação dos anteriores.

Typecheck, 223 testes de fundação, 151 arquivos legados e seis verificações Pages
passaram. A suíte PostgreSQL teve 261 sucessos e uma falha por ausência de `PG_BIN`
no ambiente Windows. O teste de restauração nativa passou ao apontar para as
ferramentas instaladas do PostgreSQL 18.6.
Após retirar a cooperação, build, typecheck e 25 regressões focadas em Party,
combate, agendamento e workers passaram.

Antes de atualizar a instalação: parar API/HTTPS, criar backup nativo, restaurá-lo
em outro banco isolado e comparar todas as tabelas. Não há migration nova.
Compilar/substituir o runtime, configurar somente o perfil validado e reiniciar
pelo supervisor. Preservar PostgreSQL, credenciais, certificados, Radmin e dados.
Frontend estático segue Pages; este bloco não hospeda backend público nem muda
Supabase, DNS ou serviços pagos.

3.000 simultâneos continuam sendo um requisito de capacidade separado da cobertura
funcional. Precisam passar os degraus de carga, reconexão/comandos econômicos e soak,
além de ensaio em host de homologação com gerador separado. Gargalos remanescentes
devem ser tratados na projeção/transporte e no custo durável por ator/sala; não
retirar autorização, locks, ledger, fsync ou limites para forçar aprovação.

### Repetição com 50 conexões e perfil 2+2

| Revisão e perfil | Janela | HTTP200 | Descartes | p95 HTTP | p95 simulação | Auto ativo | Resultado |
|---|---:|---:|---:|---:|---:|---:|---|
| Base 7122822, solo | 60s | 4.000 | 0 | 49ms | 725ms | 50/50 | Passou |
| Candidata 6566ca0, solo | 60s | 4.000 | 0 | 547ms | 1169ms | 7/50 | Reprovado |
| Candidata 6566ca0, Party | 120s | 7.994 | 6 | 591ms | 643ms | 50/50 | Reprovado |
| Candidata a4d3b01, solo | 60s | 4.000 | 0 | 73ms | 854ms | 50/50 | Passou |
| Candidata a4d3b01, Party | 60s | 4.000 | 0 | 232ms | 1163ms | 42/50 | Reprovado |

O mesmo host, Node e pool foram usados na comparação. RNG, distribuição das
partições e carga do host variam entre execuções. A repetição com o agendamento
anterior passou no solo e ainda registrou oito paradas em Party. O PR fica aberto
e a atualização da instalação aguarda a validação de carga.
## Diagnóstico de Party após integração de Skypiea

A base GitHub era `25cd9d055ccc80ed0cdee4d6a206e462ca65f6c6`. O PR integrou
essa revisão no merge `78b8baf`. As migrações aditivas 0035 e 0036, o catálogo,
os dados de terreno e colisão, os sprites e o código de navegação do mapa foram
preservados. As fixtures de carga usam Dawn. Elas exercitam as migrações e o
runtime atualizado, com cobertura de Skypiea separada da carga.

Ensaios sequenciais com Node 24.22.2, API compilada, pool 10 e dois workers por
lane. PostgreSQL isolado na porta 55433. Cada cliente solicita uma projeção a
cada 750 ms, com uma resposta completa a cada quatro solicitações. O perfil de
50 Party cria 12 salas completas e mantém dois personagens fora das salas.
O PostgreSQL persistente e os provedores externos ficaram fora do ensaio.

| Base integrada, sem instrumentação | HTTP 200 | Descartes | HTTP p50/p95/p99/máx. | Idade p95 | Auto | Pico de fila do pool |
|---|---:|---:|---|---:|---:|---:|
| 50 solo, 60 s | 4.000 | 0 | 22/524/877/1067 ms | 1365 ms | 20/50 | 58 |
| 50 Party, 60 s | 3.982 | 18 | 248/1100/1524/1749 ms | 1224 ms | 34/50 | 86 |
| 100 solo, 30 s | 3.787 | 212 | 292/1073/1277/1374 ms | 1798 ms | 15/100 | 86 |

A instrumentação amostrou o tempo decorrido no cliente PostgreSQL e em fases
do runtime. Ela introduz overhead, portanto os critérios de carga usam as
execuções sem instrumentação. Abaixo, valores em ms no formato
p50/p95/p99/máximo. As duas linhas de transação representam partições distintas.

| Operação | Party 50 | Solo 100 |
|---|---|---|
| Acesso/revalidação de sessão | 3/96/211/553 | 4/192/244/732 |
| Aquisição de conexão, frame | 15/167/295/495 | 122/220/280/732 |
| Aquisição de conexão, full | 19/163/344/550 | 130/238/389/700 |
| Projeção (consultas e montagem) | 46/227/327/563 | 27/136/176/349 |
| Frame, ponta a ponta no serviço | 156/723/899/1049 | 591/875/1104/1201 |
| Full, ponta a ponta no serviço | 343/859/1037/1166 | 738/990/1188/1302 |
| Locks de pares + presença, Party 0 | 9/14/21/48 | — |
| Locks de pares + presença, Party 1 | 10/14/21/51 | — |
| Leitura e preparação, Party 0 | 10/15/20/110 | — |
| Leitura e preparação, Party 1 | 11/15/23/122 | — |
| Motor IA/combate/navegação, Party 0 | 27/81/149/236 | — |
| Motor IA/combate/navegação, Party 1 | 12/47/109/341 | — |
| Persistência e recompensas, Party 0 | 19/88/117/147 | — |
| Persistência e recompensas, Party 1 | 17/76/100/164 | — |
| Escrita da sala, Party 0 | 2/3/7/9 | — |
| Escrita da sala, Party 1 | 2/3/6/17 | — |
| Transação, Party 0 | 73/166/270/362 | — |
| Transação, Party 1 | 54/131/221/450 | — |

No Party instrumentado, 15 atores passaram pelo cancelamento de intervalo de
2,116–2,345 s e sete pela condição de presença desconectada. As sete ocorreram
em ticks com 0,126–0,649 s de intervalo. O predicado de presença não foi
decomposto nessa amostra. Presença envelhecida na preparação é uma hipótese,
não uma conclusão. Em solo, todas as 29 paradas de 50 e as 88 de 100 foram
pela proteção de intervalo. Não houve morte, mudança de epoch observada como
causa de cancelamento ou reinício de worker nas três amostras instrumentadas.

No Party, o p95 do pool dos próprios workers ficou abaixo de 0,11 ms após
aquecimento, e apenas seis consultas com SKIP LOCKED retornaram sem a linha
esperada em mais de 11 mil tentativas. Esses números não isolam toda espera
interna do PostgreSQL. O tempo de engine/persistência, combinado com lotes
longos e intervalos perdidos, explica o atraso imediatamente anterior às
paradas por gap. No solo de 100, a fila da API chegou a 86 com pool 10 e o
worker continuou com p95 de aquisição abaixo de 0,1 ms. O custo de projeção
não pode ser inferido apenas do ping. A aplicação executou p95 de 24/54
consultas no frame/full em Party e 18/44 no solo de 100.

Nas amostras de base, o p99 do event loop da API ficou em 31–34 ms, o RSS
em 540–658 MiB e o processo consumiu 1,94–2,42 núcleos equivalentes. O payload
médio ficou entre 16.481 e 29.987 bytes. API, gerador e PostgreSQL compartilham
o host. Faltam CPU do PostgreSQL e perfis separados de IA, navegação e geração
de carga para atribuir todo o custo. Partições processam o tick mais antigo
primeiro dentro da própria fila. Essa ordenação não garante o limite de dois
segundos sob sobrecarga nem equilibra custos de salas entre partições.
### Correções e primeira comparação

A aquisição do lock de cada par passou de três consultas para uma. A sessão
continua sendo bloqueada antes da conta, e o advisory lock do personagem só
é tentado depois das duas verificações. A presença continua revalidada após
o bloqueio de todos os pares. Os updates do estado pessoal e da sala incluem
o tick no mesmo comando, dentro da mesma transação com os ledgers.

A leitura seguinte também consolidou associação, líder e metadados da
atividade. Os metadados da sala são projetados sem transportar a lista de
monstros. A projeção de movimento do grupo ativo faz cinco consultas dentro
do snapshot autorizado. O teste anterior ao patch falhou ao executar a leitura
pela interface antiga em transação read-only. Depois, a projeção respeitou a
transação, o contrato da atividade e o limite de consultas. A regressão dos
locks falhou antes com três consultas e passou com uma, após exercitar as três
formas de contenção.

| Primeira correção, antes da projeção compacta | HTTP 200 | Descartes | HTTP p50/p95/p99/máx. | Idade p95 | Auto |
|---|---:|---:|---|---:|---:|
| 50 solo, 60 s | 4.000 | 0 | 17/194/709/828 ms | 1280 ms | 49/50 |
| 50 Party, 60 s | 3.984 | 16 | 226/1255/1527/1680 ms | 1478 ms | 27/50 |
| 100 solo, 30 s | 3.771 | 225 | 350/1012/1403/1638 ms | 1783 ms | 17/100 |
| 100 Party, 31 s | 2.537 | 1463 | 1072/1842/2088/2277 ms | 1852 ms | 21/100 |

A redução determinística de consultas foi confirmada. As janelas curtas
acima reprovaram e não demonstram ganho sustentado de capacidade. A primeira
linha do teste Party 100 é da candidata, sem amostra comparável da base para
esse perfil. Foram aprovados 38 testes focados de Party, combate e snapshots,
incluindo rollback do ledger, compartilhamento de XP, idempotência de entrada,
autorização, revogação concorrente e privilégios mínimos. A ferramenta de carga
mede progresso não negativo e contagem de recibos, sem certificar sozinha
replay e consistência econômica sob carga.

A rodada do GitHub em `78b8baf` passou em foundation, Docker e testes gerais.
O navegador confirmou movimento próprio/remoto, recuperação da aba suspensa e
zero 429 na caminhada, mas retornou control_required ao tentar viajar. Esse
resultado é um bloqueio de aceite adicional. As mudanças do PR não alteram o
mapa, engine, balanceamento, prazos ou número de conexões do runtime.