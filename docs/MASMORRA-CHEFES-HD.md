# Masmorra de Chefes HD — PR #394

A arena compartilhada `quest-dungeons` recebe uma pintura original de uma fortaleza marítima subterrânea: piso circular de pedra, portão gradeado ao norte, celas e correntes nas bordas, canais laterais e entrada ao sul. É uma composição criada para o jogo, sem afirmar que essa masmorra existe no cânone de One Piece.

## Arte e referências

Fonte: `assets/quest-dungeons/boss-arena/scene-hd.png`, PNG original de **1448 × 1086 pixels**, **3.296.555 bytes**, copiado byte a byte. O mundo mede **3072 × 2304 unidades de jogo**. A escala de mundo não acrescenta resolução à fonte. Câmera e máscaras de profundidade recortam a pintura integral.

SHA-256: `2cf6960aacd51640e1a6bc1850d68b77fd92cd0ac48609883c156ac8346d3945`.

Referências oficiais da Bandai Namco consultadas:

- [Impel Down Level 6 — ONE PIECE Bounty Rush](https://opbr-en.bn-ent.net/stage/detail/0021.html): pedra azul-cinza, grades, celas, correntes e massa arquitetônica.
- [Dressrosa — ONE PIECE Bounty Rush](https://opbr-en.bn-ent.net/stage/detail/0010.html): legibilidade da arena circular e anéis no pavimento.
- [Marineford — ONE PIECE Bounty Rush](https://opbr-en.bn-ent.net/stage/detail/0008.html): muralhas e fortificações marítimas monumentais.

As referências orientam a composição; screenshots de terceiros não foram distribuídos. Prompt, proveniência, dimensões reais e registro do asset acompanham a imagem. Os mapas anteriores, as máscaras antigas e as ilustrações dos chefes permanecem preservados.

## Integração jogável

`boss-arena-map-data.js` instala a geometria em `MareMapExportData['quest-dungeons']`. `boss-arena-world.js` desenha a pintura e o baú independente. Cliente, catálogo autoritativo, navegação, profundidade, build estático e contexto Docker carregam a mesma cena.

| Elemento | Coordenada / contrato |
| --- | --- |
| Entrada do jogador | (1536, 1824) |
| Chefe da masmorra | (1536, 1152) |
| Aproximação do baú | (1536, 640), raio 90 |
| Interação do baú | `40420c70-1e86-493e-a829-79b42d260c18`, primeira interação do mapa |
| Sprite do baú | `1cb97a09-0a88-4167-9627-1fd4b1e6ca0b`, asset existente separado da pintura |
| Saída | Ação Retornar e retorno ao lobby após claim, conforme o fluxo existente |
| Ensaio privado de Akainu | Entrada compartilhada; chefe em (1536, 1644) |

O centro fica livre para aproximação e circulação. Água, grades, pés dos braseiros, pilares e baú impedem caminhada; os projéteis mantêm as regras existentes de colisão com objetos sólidos. As máscaras pintadas recompõem o cenário na frente dos personagens quando necessário. O baú continua visível e trancado antes da vitória; o estado pendente habilita o claim e a indicação existente.

Os **18 chefes de níveis 10 a 180** continuam compartilhando a arena, com IDs, atributos, limites de acesso e recompensas existentes. As vitórias sem recompensa configurada continuam nesse estado. Não há novo chefe nem mudança no evento oficial de Marineford, na prisão Impel Down ou na arena dos espadachins.

## Compatibilidade

A migração aditiva `0077_boss_arena_hd_map.sql` atualiza a assinatura de mundo reconhecida. Apenas personagens dentro de `quest-dungeons` são reposicionados; rotas dependentes do piso antigo são encerradas. Batalhas reconhecidas reancoram os inimigos, preservando HP, identidade, mortos, cooldowns, vitória pendente e registros de recompensa.

O ensaio privado de Akainu também usa essa arena. A migração cobre sua configuração, estado espacial e snapshots de retorno, para que a saída não restaure uma assinatura obsoleta. Assinaturas desconhecidas continuam rejeitadas. Migrações históricas e regras econômicas permanecem inalteradas.

Os snapshots de retorno ao lobby reconhecem a cadeia auditada de hashes de `0053` a `0076`, mantendo posição, rota e metadados. O snapshot de batalha é preservado e atualizado pelo caminho normal de compatibilidade ao retornar.

- Assinatura de mundo: `3ff8961b1da8075bbb81434407e077a9cef07b375d058b303f21bfe078c9068c`.
- Assinatura de batalha: `df87a9e7018eff5bcbee1d33a2d8ba3347ff3fc019133d6c0bdf86f8145e51cc`.

## Verificação

Os testes de layout verificam rotas reais no navegador de cliente e no índice do servidor, sondas independentes sobre a pintura, obstáculos e linha de visão do ensaio privado. `tests/boss-arena-scene-compat.test.cjs` cobre os 18 encontros, estados ativos e pendentes, caminhos históricos de upgrade e o ensaio privado.

`tests/boss_arena_browser.cjs` serve o build estático real em computador e celular e gera evidências em `MARE_QA_DIR`. O workflow `boss-arena.yml` reúne os gates de layout, navegador e PostgreSQL. Os resultados desta integração constam na descrição do PR.

| Gate executado | Resultado |
| --- | --- |
| Layout, compatibilidade da arena, contratos de masmorras e profundidade | 27/27 |
| Masmorras autoritativas e cadeia de migrações | 5/5 |
| PostgreSQL real: migração da arena e regressão de Alubarna | 5/5 |
| PostgreSQL real: boss semanal existente | 7/7 |
| Auditoria geométrica | 10/10 rotas; um componente transitável; zero colisores inválidos |
| Build TypeScript, typecheck, build estático, sintaxe e diff check | Aprovados |

No navegador, os 18 chefes foram acessados pelo catálogo. Foram percorridos 15 caminhos reais, com desktop **1366 × 768 / DPR 1** e mobile **393 × 852 / DPR 2**. Alvida e Morgan foram derrotados pelo combate normal da fixture, sem chamada direta de derrota. Vitória pendente sobreviveu ao reload e reabriu a arena sem outro chefe. O clique no baú retornou ao lobby nos dois viewports; claim repetido e reentrada após claim ficaram bloqueados.

Três recortes de câmera tiveram diferença zero em relação à fonte integral. O braseiro alterou 955 pixels do personagem atrás dele; o pilar alterou 2.832. A imagem servida e os assets antigos mantiveram seus hashes. Não houve erro de página ou recurso pertinente ausente.

O `npm test` geral terminou em **247/251** na foundation, com as quatro falhas já registradas na base: expectativa antiga de quantidade de itens, dois casos do contexto Docker (`sword-compendium.js` / `daily-sword-boss-specials.json`) e expectativa de comando de inventário do Visual Completo. Esse comando para antes da suíte legada; os testes focados acima foram executados separadamente.

Na suíte histórica `server-dungeons.test.mts`, nove casos passaram e três falhas de `sword_collections` foram reproduzidas sem alterações na base `e045963`: permissão da role de runtime e duas fixtures de migração que não criam a tabela. Os testes novos de migração e claim da arena passaram em PostgreSQL real. Não se declara aprovação de toda a suíte nem publicação em produção.

Comandos focados:

```sh
node --test tests/boss-arena-layout.test.cjs tests/boss-arena-scene-compat.test.cjs tests/boss-dungeons.test.cjs tests/world-depth.test.cjs
node tools/audit_maps.cjs --map quest-dungeons --full
python tools/build_pages.py --static-demo
python tests/run_honors_hd_browser.py tests/boss_arena_browser.cjs --offline --dist
node --import tsx --test --test-concurrency=1 tests/integration/server-boss-arena-scene.test.mts
```
