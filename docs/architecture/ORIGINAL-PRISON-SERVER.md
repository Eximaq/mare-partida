# Impel Down com autoridade do servidor

O jogo online usa o diário, mapa, monstros, HUD e mochila originais. O backend
prepara e persiste a identidade do próximo adversário, conduz o duelo e registra
a vitória. Recarregar, sair e retornar não sorteia outro inimigo nem reinicia o
limite de ouro roubado pelos talentos. Saves da demonstração permanecem separados.

## Regras preservadas

- Cem andares sequenciais, um adversário por andar e guardião a cada cinco. O
  catálogo compartilhado mantém exatamente as 31 definições atuais; os guardiões
  provisórios continuam provisórios, conforme o jogo existente.
- HP/ATQ/DEF multiplicados por `1.30^(andar−1)`; velocidades e tempos originais.
  Entrada e renascimento nas posições do mapa. Avanço após 850ms do relógio do
  servidor, com HP restaurado e energia/recargas preservadas entre andares.
- Derrota mantém o mesmo andar e identidade. Vitória não concede XP, loot normal,
  progresso de caçada regional, mortes globais ou contratos. Os andares habilitam
  exclusivamente as conquistas de prisão correspondentes.
- Marcos 5–50, de cinco em cinco: uma Caixa de Pérolas Nível1. Mochila cheia mantém
  o direito pendente. Nenhuma recompensa nova foi inventada após o andar50.
- Caixa bloqueada não abre. A abertura consome uma caixa e produz uma pérola do
  mesmo nível, com as cinco chances originais de20%, inclusive com mochila cheia.
- Andares10/25/50/100 habilitam as quatro conquistas originais de prisão e seus
  onze pontos de talentos. O catálogo total continua com31 conquistas/72 pontos;
  agora22 conquistas/47 pontos possuem domínio autoritativo disponível.

## Contratos e persistência

`prison.prepare`, `prison.enter` e `prison.claim` aceitam somente `{floor}`;
`items.open-box`, somente `{itemId}`. Não existem comandos para declarar vitória,
fornecer inimigo, dano, prêmio ou progresso. A sessão determina a identidade;
propriedade, CSRF, controlador exclusivo, versão e rate limit precedem o replay.

Migração0024 acrescenta estado, andares concluídos e marcos resgatados. Ledgers têm
unicidade por personagem/andar e vínculo diferido ao recibo. A transação inclui
monstro, progresso, inventário, contadores, versão e recibo; falha reverte tudo.
A role de runtime não pode apagar estado, trocar seu dono ou reescrever vitórias e
resgates. Estado persistido rejeita claims futuros e encontros fora de sequência.

O motor inclui as regras da prisão no hash. A migração atualiza exclusivamente o
hash conhecido da versão anterior, preservando os demais campos dos combates.
Hashes desconhecidos continuam recusados. Atualizar exige backup, API parada,
migration/grants pelo owner e reinício; a aplicação não recebe privilégios de DDL.

## Evidências e limites

- `world-prison.test.mts`: fórmulas, agressividade, ausência de loot/caçada,
  renascimento com identidade estável e equivalência integral do catálogo.
- `server-prison.test.mts`: PostgreSQL descartável real, worker, marcos, caixa,
  capacidade, concorrência/replay, rollback, retorno do andar100, conquista,
  propriedade/CSRF/controlador, grants e migração preservadora.
- `prison-client.test.mts`: intenções estritas, saves isolados e estado consistente.
- `prison-online-browser.cjs`: interface original desktop/mobile, mapa, encontro,
  reload, retorno e abertura de caixa. BFF simulado somente nesta fixture visual;
  transações e worker são testados separadamente com PostgreSQL.
- Navegador offline de Impel Down e suítes legadas verificam preservação do jogo.

Nenhum teste deste incremento envia e-mail ou altera o Supabase hospedado. GitHub
Pages distribui o cliente estático; o backend continua local. Masmorras de chefes,
frutas, Haki e demais itens do manifesto integral seguem em execução separada.

Atualização local executada com backup e API/gateway parados: as38 tabelas
anteriores conservaram seus hashes, normalizando somente a troca conhecida do
hash de regras do combate. Permaneceram quatro contas e três personagens;
24 migrações e zero andares artificiais. Reinício HTTPS verificado com TLS válido,
recursos200 e catálogo401 sem sessão.
