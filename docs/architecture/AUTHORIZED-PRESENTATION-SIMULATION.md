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
## Interrupções Idle e fidelidade do gerador

Base de código `2e0ebef` sobre `25cd9d0`. A instalação privada `7122822`
permaneceu disponível durante a investigação. Os ensaios usaram Node 24.22.2,
runtime compilado, pool 10 e partições 2+2. Somente fixtures em PostgreSQL
loopback 55433. Alterações de diagnóstico no JavaScript compilado foram
temporárias e não entram no artefato do servidor.

O gerador anterior aceitava 50 no perfil Party e criava 12 salas. Dois
personagens ficavam fora da formação. Ele também prolongava leases por SQL,
emitia novas leituras para o mesmo ator enquanto havia uma em andamento e
podia deixar de contabilizar slots perdidos no final. O gerador atual exige
grupos completos, registra a distribuição por partição, contabiliza slots
perdidos e usa HTTP para o preparo de presença e a renovação do lease com
CSRF a cada 30 s. O intervalo nominal de leitura é 750 ms, com snapshot
completo a cada 3 s. O cliente real verifica esses prazos num timer de
250 ms. A bancada usa slots escalonados para medir a demanda prevista e
registra como perdido o slot que o cliente ocupado não emitiria. Comandos
de criação e habilitação de auto ocorrem no preparo. A janela mede combate
auto e renovação, sem simular compras ou navegação manual.

### Primeiras amostras instrumentadas

Nestas duas amostras a fixture ainda usava revalidação de 60 s, prazo usado
pelos testes funcionais para exercitar refresh. Isso difere dos 900 s
configurados para o jogo. A fixture de carga passou a espelhar JWT de 900 s,
sessão de 24 h e inatividade de 2 h, sem modificar a configuração do servidor.
O provedor segue simulado e o lease continua com a duração real, renovado
pela rota da aplicação. Este cenário mede uma janela de 10 min iniciada com
sessões novas. Uma janela que cruza a expiração de 900 s precisa de um teste
separado, com refresh ativo e sem depender de fornecedor hospedado.

| Amostra, 65 s | HTTP 200 | Slots perdidos | p95 HTTP | p95 idade | Auto no fim |
|---|---:|---:|---:|---:|---:|
| 50 solo | 4.333 | 1 no scheduler | 422 ms | 1379 ms | 32/50 |
| 48 em 12 Parties | 4.053 | 107 com leitura anterior pendente | 639 ms | 1471 ms | 24/48 |

Em Solo, as 18 interrupções ocorreram com sessão, lease e epoch válidos.
O primeiro grupo teve intervalo de 2,025–2,204 s. No primeiro ator observado
pelo cliente, o tempo até a leitura do cancelamento foi 14,337 s da janela.
No primeiro grupo causal, 1,997–2,197 s já haviam passado antes de selecionar
o lote. A conexão levou menos de 0,05 ms e a fase até a revalidação dos locks
levou cerca de 3–4,3 ms. A janela anterior de 0–10 s teve 666 leituras, p95 de
398 ms, zero slots perdidos e fila máxima de 19. A janela de 10–20 s teve p95
de 512 ms e fila de 28. O atraso predominante ocorreu antes de o worker
pegar a conexão para o ator. Isso exclui a espera no pool daquele worker
como causa imediata.

Em Party, 12 cancelamentos ocorreram com presença e epoch válidos. Na
primeira sala, havia 1,962 s entre o tick persistido e a seleção do lote,
e mais 135 ms até o tick efetivo. A conexão levou 0,044 ms. O primeiro
cancelamento foi visto no cliente a 2,217 s da janela. Outros 12 tiveram
presença recente, lease válido, sessão play sem revogação, prazos absoluto
e de inatividade válidos e epoch da conta correto, com prazo de validação
do provedor expirado. Esse caso surgiu com o provedor de teste de 60 s e
a leitura concorrendo com o refresh. O resultado não atribui à mesma causa
as interrupções dos ensaios antigos que estendiam a validade via SQL.

Party 48 teve p95 da fase de motor de 95–102 ms por partição, p95 de
persistência de 91–94 ms e p95 de COMMIT de 2,4–3,2 ms. As transações
inteiras chegaram a 420–747 ms. Uma amostra de 15,07 s do PostgreSQL
descartável somou 24,03 s de CPU, cerca de 1,59 núcleos equivalentes.
A janela Party completa consumiu 2,33 núcleos equivalentes no processo
Node, incluindo gerador, API e workers. Houve 96 renovações HTTP bem
sucedidas em Party e 100 em Solo. Fila máxima do pool da API 36 e 33.
Os 107 slots Party já estavam bloqueados no cliente sintético pela leitura
em andamento. O limite global do gerador não foi atingido.

Para separar recursos numa próxima bancada, o serviço deve rodar numa
máquina de teste com PostgreSQL isolado, um hostname de teste e certificado
válido. Um segundo host executa somente o gerador contra a origem HTTPS
restrita, com contas sintéticas e sem Supabase hospedado. O endpoint de carga
deve ser autorizado separadamente. Nenhuma mudança em firewall, Radmin, DNS
ou portas foi feita nesta investigação.

A regra de dois segundos segue intacta. Qualquer proposta para separar
atraso interno de ausência real deve provar continuidade de sessão, epoch e
lease no intervalo, definir um teto de trabalho sem progresso retroativo
e preservar o cancelamento quando faltar evidência de presença.
### Party 52 com política de produção na fixture

Em 65 s, 52 atores formaram 13 salas completas. Foram 104 renovações de lease
por HTTP sem falhas. Dos 4.507 slots previstos, 73 ficaram bloqueados por uma
leitura anterior. HTTP p95 590 ms, idade p95 1279 ms, 36 de 52 combates
ativos ao final. As 16 paradas vieram do limite de dois segundos e ocorreram
com presença e epoch válidos. Nenhuma repetiu a expiração de provedor da
fixture de 60 s. A primeira sala tinha idade de 1,853 s ao selecionar o lote
e de 2,017 s ao ler o tick. A aquisição de conexão levou 0,060 ms e a fase
de locks 12,4 ms. O último tick antecedia a seleção do lote em quase todo
o intervalo observado.

A instrumentação registrou 250.774 chamadas de pathfinding nas duas
partições Party. O p95 foi 0,27 ms por chamada e os máximos foram 112 e
161 ms. As chamadas somaram 17,7 s de tempo decorrido, incluídos nos 31,7 s
dos passos individuais de combate. Não é uma medição de CPU exclusiva.
Os maiores COMMITs foram 244 e 284 ms, com p95 de 1,36 e 1,83 ms.
Isso permite priorizar a cauda de navegação e a duração da transação,
com análise separada da fila de leituras da API. Ainda não vincula cada
atraso a uma operação específica de uma sala anterior na mesma partição.
### Repetições de 60 s sem instrumentação

| Cenário | Distribuição | HTTP 200 | Slots perdidos | HTTP p95 | Idade p95 | Auto final |
|---|---|---:|---:|---:|---:|---:|
| Party 48, runtime base | 8 / 4 salas | 3808 | 32 | 530 ms | 1554 ms | 16/48 |
| Solo 50, runtime base | 29 / 21 atores | 4000 | 0 | 86 ms | 1182 ms | 38/50 |
| Solo 50, uma gravação de tick | 32 / 18 atores | 4000 | 0 | 115 ms | 1258 ms | 40/50 |

A mudança no tick Solo reutiliza a gravação existente de estado e tick de
Party. Mantém o epoch atual no avanço normal e o epoch revalidado no ramo
de cancelamento. O teste com trigger do banco descartável contou duas
gravações antes e uma depois, com avanço de tick e epoch preservado.
Passaram 11 testes de integração de combate e orçamento, com rollback,
bloqueio de progresso offline e recompensa única sob concorrência. O smoke
compilado de quatro membros verificou renovação HTTP e zero slots perdidos.

Os perfis Solo acima usam as mesmas frequências, política, pools e número
de workers. A distribuição aleatória difere. A comparação confirma menos
gravações por tick, sem demonstrar ganho de capacidade nem eliminar as
interrupções. Party 48 teve a primeira parada observada em 2,113 s.
O pico de oito salas na mesma partição é evidência de distribuição
desigual nesse ensaio. Seu efeito isolado ainda precisa de um controle
com o mesmo conjunto de atores/salas. Ambas as configurações de Solo
e a de Party reprovaram em janelas curtas. Os dois testes de 10 min
anteriores permanecem reprovados. O próximo aceite sustentado depende
de corrigir as interrupções reproduzidas, sem aumentar a carga.

Parecer desta rodada **REPROVADO para atualizar o servidor privado**.
### Decomposição complementar de 35 s

| Fase instrumentada, p95 | Solo 50 | Party 48 |
|---|---:|---:|
| Projeção na API | 65,80 ms | 184,65 ms |
| Atualização de presença | 4,05 ms | 7,82 ms |
| Serialização JSON da resposta | 0,25 ms | 0,44 ms |
| Leitura e preparação no worker | 7,35–7,63 ms | 14,40–15,04 ms |
| Motor no worker | 28,44–31,71 ms | 82,31–89,17 ms |
| Persistência antes de COMMIT | 26,36–26,46 ms | 85,77–95,79 ms |
| COMMIT | 1,21–1,30 ms | 1,51–1,66 ms |
| Transação do worker | 54,96–58,63 ms | 161,28–171,62 ms |

A janela Party teve seis salas por partição e ainda cancelou 20 combates
por intervalo entre ticks. A janela Solo teve 28/22 atores e seis
cancelamentos pelo mesmo motivo. Isso reproduz o problema com a política
de produção na fixture e mostra que o desequilíbrio não é necessário
para produzir a falha. Aproximadamente 11% das chamadas de pathfinding
Party repetiram coordenadas exatas numa janela de 4.096 pares. Elas
representaram 1,18 s dos 9,54 s medidos nessa fase. A repetição medida
não justifica sozinha introduzir cache de rotas. A prioridade é correlacionar
os lotes anteriores com a espera de cada ator e separar recursos para medir
se os picos persistem quando o gerador deixa de compartilhar CPU com a API.