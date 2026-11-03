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

Agenda nominal de 250ms, lote com orçamento suave de 200ms e uma transação inteira
por vez. Se um lote ultrapassa seu intervalo, o worker cede ao event loop e faz
uma seleção nova, em vez de desperdiçar outro intervalo inteiro. Não há fila de
ticks atrasados. A proteção de gap/offline superior a dois segundos permanece.

Partições principais têm prioridade. Quando sua seleção está vazia, um worker
pode ajudar o outro domínio somente com atividade atrasada em pelo menos 500ms,
dentro do orçamento restante. A idade é revalidada depois dos locks. Os mesmos
locks e fencing impedem simulação/recompensa duplicada; nenhuma sala é partida.

Cada worker tem uma conexão: a lane é serial e não utiliza uma segunda conexão
em paralelo. API mantém máximo10. Padrão2solo+1Party: máximo13; perfil2+2:14;
perfil4+2:16. Mais workers não garantem mais capacidade. Overrides locais são
explícitos em `.env.server.local`, limitados pelo validador existente.

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
| Solo100, 4+2 sem cooperação | 30s | 3.821 | 179 | 835ms | 1156ms | 95/100 | Reprovado |
| Solo100, 4+2 com cooperação | 30s | 3.054 | 945 | 1289ms | 866ms | 99/100 | Reprovado |

A cooperação reduziu o atraso observado da simulação no ensaio de 100, com mais
fila e descartes na API. A janela de 120s registrou p99 HTTP de 1060ms. Os degraus
de 300, 1.000 e 3.000 ficam condicionados à aprovação dos anteriores.

Typecheck, 223 testes de fundação, 151 arquivos legados e seis verificações Pages
passaram. A suíte PostgreSQL teve 261 sucessos e uma falha por ausência de `PG_BIN`
no ambiente Windows. O teste de restauração nativa passou ao apontar para as
ferramentas instaladas do PostgreSQL 18.6.

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
