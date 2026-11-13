# Canais do porto e visibilidade — 13/11/2026

## Comportamento e causa

O porto distribui jogadores automaticamente em canais de **24 personagens**. Cada jogador recebe no máximo 23 vizinhos do mesmo canal, sem o corte assimétrico anterior de 16. O botão **Canal N** permite escolher o canal dos amigos. Canais lotados recusam a entrada; a primeira vaga livre abre outro canal automaticamente. Uma troca manual tem intervalo de cinco segundos. Caçadas, Party, chefe semanal, colisões, velocidade, economia e saves permanecem com as regras existentes.

A invisibilidade da conta legada foi reproduzida com três contas isoladas e confirmada por leitura do banco de testes: faltava sua linha em `character_profile`. O `INNER JOIN` eliminava esse personagem da lista dos outros, embora sua própria sessão pudesse jogar. O leitor agora usa `LEFT JOIN` e a mesma aparência/preferências padrão da leitura individual. Não cria nem reescreve o perfil para mascarar o problema. A regressão falhou antes da correção e passou depois; as três contas veem-se mutuamente.

## Autoridade e persistência

- Migração aditiva `0058_lobby_channels.sql`: somente reservas efêmeras, FK de personagem, slot único por canal e índice de expiração. Seeds apenas para controladores já ativos no porto.
- Admissão serializada por lock transacional curto; movimento e snapshots não adquirem esse lock. Renovação acompanha os 120 segundos do lease existente. Viagem remove a reserva e retorno readmite o personagem.
- Reservas podem permanecer até o lease vencer após desconexão/logout, para reconexão estável. O personagem já fica invisível quando sessão/controle deixam de ser válidos; ocupação reservada no seletor pode superar a quantidade visível temporariamente.
- `GET /v1/characters/:id/lobby-channels` exige sessão e propriedade. `lobby.channel` usa o fluxo normal de comandos, CSRF, controle, versão e recibo idempotente. Payload extra, proprietário forjado, destino inexistente e canal cheio são rejeitados.
- Cada snapshot verifica conta, epoch, expiração absoluta/inativa, validade do provedor e controle. Revogação concorrente é conferida novamente após COMMIT. Nenhum resultado de autorização é armazenado em cache.
- A projeção pública contém apenas identidade visual, equipamento público e movimento autoritativo. Não expõe conta, sessão, inventário privado ou credenciais.

## Desempenho investigado

O PostgreSQL gastava **8,88–13,05 ms planejando** uma consulta de roster cuja execução levava **0,128–0,356 ms** na cópia isolada. Consultas preparadas nomeadas reutilizam o plano SQL, sempre consultando dados atuais. A regressão verifica o uso de plano genérico e a recusa imediata após logout.

Posições e aparência agora vêm da mesma consulta do roster, eliminando a segunda busca de posições. O frame pessoal reúne progressão, mundo, batalha e relógio; encontros compartilhados continuam usando o leitor canônico de Party/chefe semanal. Capacidades de schema vêm da consulta inicial, evitando consultas redundantes a `to_regclass`.

A suíte WebSocket também revelou uma corrida de ordenação: uma leitura MVCC antiga pode ser amostrada depois do horário de um comando já confirmado. O cliente comparava apenas esse horário e fazia uma leitura completa desnecessária. A regressão determinística reproduziu duas leituras em vez de uma. O recibo agora é ordenado pela versão comprometida, preservando um frame mais novo e sem promover a versão econômica. Recibos perdidos continuam sendo repetidos com o mesmo requestId.

### Bancada Linux

Container temporário na VPS, limitado a 1 CPU/768 MiB, banco descartável, PostgreSQL real, AuthService e WebSocket reais, provedor simulado sem e-mails. Gerador/API/PG dividem o host; conexão loopback, oito personagens mudando destino uma vez por segundo e demais observadores. Identidades de proxy privadas simulam clientes distintos sem afrouxar limites por IP. Cada rodada de 48 dura 120 segundos; não é um ensaio de Internet nem de 48 jogadores atacando simultaneamente.

| Versão | Conexões | p95 intervalo de frames | p95 comando |
|---|---:|---:|---:|
| Roster sem plano reutilizado | 16 | 495,93 ms | 327,95 ms |
| Plano reutilizado no roster | 16 | 190,27 ms | 252,25 ms |
| Plano reutilizado no roster | 48 | 323,34 ms | 259,41 ms |
| Roster atômico/capacidades | 48 | 312,27 ms | 251,06 ms |
| Frame pessoal em uma consulta | 48 | 262,21 ms | 228,48 ms |
| Sem schema Party redundante | 48 | 253,70 ms | 235,55 ms |
| Planos de autorização reutilizados, rodada A | 48 | 213,92 ms | 207,37 ms |
| Repetição final, rodada B | 48 | 215,29 ms | 203,81 ms |

Todos esses ensaios válidos tiveram zero erros, desconexões inesperadas, slots de comando perdidos por pendência e falhas de roster. Os intermediários acima de 250 ms reprovaram o critério do teste; não foram tratados como aprovação. Tentativas iniciais com erros no próprio gerador (payload de lease e heartbeat/renovação serial) foram corrigidas e excluídas da comparação.

Na rodada A final, mediana dos frames 135,87 ms e máximo 507,13 ms: p95 aprovado não significa ausência absoluta de picos. Uma amostra da rodada intermediária mostrou processo de teste em aproximadamente 113 MiB e maior uso de CPU no PostgreSQL; não sustenta atribuir o problema à RAM. Não há certificação de 3.000 jogadores nem garantia de ping pela Internet.

**APROVADO no perfil ensaiado**: duas rodadas finais com 48 conexões, 960 comandos de movimento por rodada, p95 abaixo de 250 ms e zero erros/perdas/falhas de roster. Rodada B: mediana 139,88 ms, máximo 476,04 ms. Medir carga maior, mais personagens emitindo comandos simultaneamente e Internet real exige outro ensaio; não extrapolar essa aprovação.

## Verificações

- `npm run build`, `npm run typecheck`, `python tools/build_pages.py` e `git diff --check` aprovados. Suíte foundation final: 310/310; suíte legada: 188/188 arquivos. Após a última correção de ordenação, 22 testes do cliente e os dois testes de integração WebSocket também passaram.
- Regressões específicas: visibilidade de perfil legado, 48 admissões concorrentes em 24/24, disputa pela última vaga, cooldown, retorno de viagem, renovação/expiração, proprietário falso, replay e planos preparados.
- PostgreSQL real: testes de Party, chefe semanal, apresentação, WebSocket e mundo; snapshots recusados se houver logout, rotação, revogação ou expiração durante a leitura.
- Navegador real/HTTPS/WebSocket: 47 personagens de fixture, três perfis isolados com 23 vizinhos, troca de canal desktop e viewport de 390 px, nenhum erro de página e save DEV sentinela preservado. p95 de `requestAnimationFrame`: 16,8 ms na amostra final. Essa medição de renderização não é RTT de rede.
- Migração em cópia Docker/Linux: 90 tabelas existentes com fingerprint idêntico antes/depois, repetição sem migrations pendentes, grants mínimos e readiness aprovados. Nenhuma conta real cadastrada e nenhum e-mail enviado.

O ensaio final de navegador no Windows foi funcional: três contextos renderizaram a 16,8 ms de p95, mas o transporte local também teve picos (máximo 1.472 ms). Não usar essa bancada como certificação de rede. O aceite de carga acima veio das duas execuções isoladas no Linux. Um ensaio WebSocket concorrente com outras tarefas excedeu o prazo de 500 ms; a repetição com a bancada livre passou sem alterar esse prazo. A falha de ordenação de recibo foi tratada separadamente com regressão determinística.

## Aplicação e retorno

Aplicado somente em `https://teste.kaizokuidle2d.com.br`, imagem `sha256:3292d92fe1b9c7e53cbda41e379aec720a556da4e4fa72de1b9a66c723e44f84`. Readiness 200, página de entrada HTTPS 200, três hashes estáticos iguais ao build e identidade anônima recusada com 401. PostgreSQL permaneceu no mesmo container; cinco contas, quatro personagens e quatro linhas de progressão preservados. Configurações de autenticação e gateway mantiveram seus hashes.

Backup lógico verificável antes da migração em `/srv/mare-staging/incoming/rollback-channels-20261113T044625Z/pre-apply.dump`; imagem anterior conservada com histórico 0058 compatível. A primeira sonda recebeu conexão encerrada durante o reinício e acionou retorno. Confirmada a imagem anterior saudável, a sonda passou a aguardar também esse erro transitório; reaplicação concluída com readiness aprovado. A migração permaneceu aplicada uma única vez. O retorno restaura API e três arquivos estáticos, mantendo PostgreSQL, dados e a tabela aditiva. Não executar downgrade destrutivo nem restaurar dump sobre dados mais recentes automaticamente.

PR #271 permanece Draft, sem merge. Site principal, DNS, Supabase e trabalho dos colaboradores fora do escopo.
