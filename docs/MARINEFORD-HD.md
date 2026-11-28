# Marineford HD — PR #394

Marineford recebe uma pintura original com quartel monumental ao norte, telhados azul-marinho, plataforma de execução, praça de pedra, muralhas com canhões, cais ao sul e navios na baía. A composição adapta o local para a navegação e o combate do jogo.

## Arte e referências

O PNG em `assets/marineford/naval-headquarters/scene-hd.png` tem **1448 × 1086 pixels nativos**, **3.681.156 bytes** e foi copiado sem alteração. O mundo mede **3072 × 2304 unidades de jogo**; essa escala não acrescenta resolução à imagem. Câmera e máscaras de profundidade recortam a mesma fonte integral.

SHA-256: `3dc00b8722c5327d23680753a3292e6294b611929788ff48941051334a598f87`.

Referências oficiais consultadas:

- [Marineford — ONE PIECE Bounty Rush](https://opbr-en.bn-ent.net/stage/detail/0008.html): quartel branco, telhados sobrepostos, plataforma, muralhas, canhões e navios.
- [Marineford — ONE PIECE ODYSSEY](https://en.bandainamcoent.eu/one-piece/news/one-piece-odyssey-the-full-story-of-marineford): sede da Marinha, baía, plataforma e contexto de Akainu.

O desenho é uma adaptação jogável, sem pretensão de reproduzir exatamente uma planta canônica. Screenshots de terceiros não são distribuídos. Prompt, proveniência e registro do asset acompanham a fonte. O mapa anterior, a capa de viagem e os sprites aprovados continuam preservados.

## Integração

`marineford-map-data.js` instala a fonte compartilhada em `MareMapExportData.marineford`; `marineford-world.js` desenha o cenário e as máscaras pintadas. Os seis destinos regionais e o mapa oficial semanal usam essa fonte. Catálogo do servidor, navegação, profundidade, estado de carregamento, build estático e contexto Docker carregam a nova geometria.

| Modo | Contrato |
| --- | --- |
| Caçadas | `marineford-01` até `marineford-06`, seis encontros em cada destino |
| Progressão regional | Squard Nv.151, Onigumo Nv.156, Little Oars Jr. Nv.161, Izo Nv.166, Vista Nv.171 e Jozu Nv.176 |
| Chegada regional | (1536, 1824), com raio seguro existente de 160 |
| Retorno regional | (1536, 2112), interação `return`, raio 40 |
| Boss semanal oficial | `marineford`, Akainu com âncora em (1536, 1280) |
| Entrada semanal | x = 1536; y = 1280 + raio da área de ataque + 48 |
| Saída semanal | Ação existente de sair do encontro; sem portal ou zona segura no mapa oficial |

Os três setores mantêm seus IDs: `west-courtyard`, `north-courtyard` e `east-courtyard`. Os 36 IDs de encontro, níveis, atributos, recompensas e progressos independentes são preservados. O centro fica livre para o maior círculo de ataque permitido no evento semanal. As escadas laterais levam ao quartel, e a plataforma tem passagem pela escada central; seus apoios, a porta do quartel, os canhões, os parapeitos e o mar impedem caminhada.

O ensaio privado de Akainu continua em `quest-dungeons`, com a arte da Masmorra de Chefes. Horários, ativação administrativa, aprovação de balanceamento, regras de vitória e recompensas do evento semanal seguem seus contratos existentes.

## Compatibilidade e verificação

A migração aditiva `0078_marineford_hd_map.sql` e o upgrade do motor atualizam posições reconhecidas sem reiniciar a progressão. A geometria nova é compartilhada por personagens, grupos e salas oficiais; ataques espaciais iniciados no piso antigo são encerrados. HP, identidade dos inimigos, derrotas, cooldowns e registros de recompensa são preservados.

A migração identifica a versão geométrica das configurações e salas semanais. Registros antigos começam sem versão; os migrados e novos usam versão 1. Uma configuração nula continua nula. A revisão de configuração só aumenta quando as coordenadas mudam, preservando a aprovação administrativa. Reexecutar a migração não reposiciona um chefe que já caminhou no mapa novo nem desfaz uma configuração editada depois da atualização. Salas privadas, arena dos espadachins e arquivo histórico sem participantes conservam a geometria anterior.

Snapshots reconhecidos de retorno ao lobby recebem a assinatura atual, mantendo posição, caminho e metadados. Assinaturas desconhecidas continuam rejeitadas. Migrações históricas são imutáveis.

- Assinatura de mundo: `a24fd0cc9dd735b8be11a4103dc358877599de95a45c8c0036b841c254e5f6c8`.
- Assinatura de batalha: `132be50d66d77d11a46dff57be1d0a7c7c5a51125da40fe279c468032d3ff67e`.

O workflow `marineford.yml` cobre navegação, compatibilidade, migração em PostgreSQL e dois fluxos no navegador: seis caçadas e um evento semanal oficial em banco efêmero. O teste semanal entra com dois jogadores, observa a pintura, Akainu e o efeito de magma desenhados no canvas, reconecta e retorna ao porto.

### Resultados observados

| Gate | Resultado |
| --- | --- |
| Layout, compatibilidade, encontros regionais, regras semanais e profundidade | 22/22 |
| PostgreSQL: nova migração e regras semanais | 11/11 |
| PostgreSQL ampliado: cenas anteriores, banco e aceitação | 24/25; falha antiga da matriz de comandos descrita abaixo |
| Cadeia de assinaturas até 0078 | 1/1 |
| Auditoria geométrica | 20/20 rotas; um componente; zero colisores inválidos |
| Build TypeScript, typecheck, build estático, sintaxe e diff check | Aprovados |
| Navegador regional | Seis viagens, 36 encontros, combate, reload e retorno aprovados |
| Navegador semanal oficial | Duas sessões, ativação, Akainu/magma, reconexão e saída aprovados |

O fluxo regional percorreu os três setores em **1366 × 768 / DPR 1** e **393 × 852 / DPR 2**, usando o movimento real do jogador. As escadas, o deck da plataforma e o cais foram acessados sem teleporte. Squard foi vencido pelo combate normal da fixture; o progresso e o respawn sobreviveram ao reload. O clique no marcador retornou ao porto nos dois viewports.

A fonte PNG servida é byte a byte idêntica ao original. Três recortes de câmera tiveram diferença de pixels zero. A oclusão real da plataforma cobriu **194 pixels** do personagem atrás da madeira, zero na frente e zero no vão da escada. O complemento final percorreu esses pontos e confirmou **dez sondas sólidas**, incluindo os cavaletes com barris ao lado do quartel. As fontes anteriores e a capa mantiveram seus hashes.

O fluxo semanal usa um banco efêmero, duas contas de fixture e as ações reais da interface. O administrador configurou e abriu o evento oficial; ambos os jogadores entraram em `marineford`. O teste observou diretamente chamadas de desenho da nova pintura, do corpo de Akainu e de `magma-area.webp` no `worldCanvas`. O jogador reconectou ao mesmo evento, saiu ao porto e o administrador encerrou a sala. Nenhuma vitória ou recompensa foi criada pela fixture de encerramento.

Nas execuções finais não houve erro de página, worker, SQL ou recurso pertinente ausente. Uma tentativa durante o rebuild do diretório servido foi descartada e repetida após sua estabilização, sem relaxar as asserções. O HUD móvel existente continua ocupando parte considerável da tela: a barra semanal sobrepõe parte do HP do jogador, e menu/XP cobrem parte de Akainu. Esse CSS não foi alterado; controles de saída, personagem e efeitos continuam funcionais. A preparação interna do avatar padrão registra as duas falhas já conhecidas de attack/skill south; as poses de locomoção e os frames exatos usados na verificação ficaram prontos, sem alteração do pipeline do personagem.

`npm test` terminou em **247/251** na foundation. Permanecem as quatro falhas preexistentes documentadas na base: contagem antiga do catálogo, dois casos do contexto Docker (`sword-compendium.js` / `daily-sword-boss-specials.json`) e expectativa do comando de inventário do Visual Completo. Esse comando para antes da suíte legada; os gates focados foram executados separadamente.

O gate PostgreSQL ampliado terminou em **24/25**. Os casos de Marineford, regras semanais, Alubarna, arena de chefes, cadeia das ilhas tardias, banco e navegação passaram. A única falha foi a matriz de segurança em `server-final-acceptance.test.mts`, que omite a ação existente `swords.activate`. O bloco desse teste e a ação no schema já existem na base `914e745`; a alteração desta tarefa nesse arquivo apenas prolonga a cadeia de migrações, cujo caso passou. A matriz de segurança não foi alterada. Não se declara aprovação integral das suítes gerais.

Comandos principais:

```sh
node --test tests/marineford-layout.test.cjs tests/marineford-scene-compat.test.cjs tests/marineford-prepared.test.cjs tests/late-archipelago.test.cjs tests/late-world-combat.test.cjs tests/weekly-boss-rules.test.cjs tests/world-depth.test.cjs
node tools/audit_maps.cjs --map marineford --full
npm run build
npm run typecheck
python tools/build_pages.py --static-demo
python tests/run_honors_hd_browser.py tests/marineford_fortress_browser.cjs --offline --dist
node --import tsx tests/marineford_weekly_browser.mts
node --import tsx --test --test-concurrency=1 tests/integration/server-marineford-scene.test.mts tests/integration/server-weekly-boss.test.mts
```

A inclusão permanece no PR #394 em rascunho, sem merge ou publicação em produção.
