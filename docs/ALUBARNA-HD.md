# Alubarna HD e prévia sul dos equipamentos — PR #394

Os cinco destinos `alubarna-01` a `alubarna-05` compartilham uma nova pintura de Alubarna. A integração permanece no PR #394, em rascunho e sem merge. O Deserto de Alabasta e os mapas anteriores desse PR permanecem preservados.

## Arte e referências

Fonte: `assets/alubarna-city/royal-capital/scene-hd.png`, PNG RGB original de **1448 × 1086 pixels**, **3.983.291 bytes**, copiado byte a byte. O mundo usa **3072 × 2304 unidades de jogo**; essas unidades não representam pixels adicionais na fonte. A câmera e as silhuetas de profundidade recortam a pintura integral com nearest-neighbor, sem substituir a fonte por miniatura.

SHA-256: `0f790a1381b0fe18cb7c8d8ed85f4722d81cc66892b68cbe26ddd177ba1bff63`.

Referências oficiais consultadas:

- [Bandai Namco — ONE PIECE ODYSSEY, história de Alabasta](https://en.bandainamcoent.eu/one-piece/news/one-piece-odyssey-the-full-story-of-alabasta): capital, palácio, praça, torre do relógio e mausoléu.
- [ONE PIECE ODYSSEY — Alabasta](https://opflag.bn-ent.net/world/world01.php): direção visual do cenário.
- [ONE PIECE — arco de Alabasta](https://one-piece.com/story/alabasta/index.html): resumo oficial consultado por indexação; a abertura direta retornou 403.

A disposição é uma adaptação jogável original: palácio ao norte com cúpula dourada e cúpulas verdes, praça circular ampla, torre do relógio a leste, mercado a oeste, escadaria nordeste e acesso pelo portão sul. Não pretende reproduzir uma planta canônica exata. Não há personagens ou HUD pintados na textura.

O prompt, a proveniência e o registro do asset acompanham a imagem. O PNG anterior de Alubarna, a projeção exportada, as máscaras de profundidade, as cinco capas de viagem e os sprites dos monstros foram mantidos.

## Navegação e encontros

`alubarna-city-map-data.js` instala a geometria em `MareMapExportData.alubarna`. Cliente e servidor usam o mesmo piso e as mesmas bases. `alubarna-city-world.js` desenha o cenário e as silhuetas. O catálogo, navegador, build estático, Docker e auditor carregam o novo módulo.

A chegada fica em **(1536, 1536)**, dentro da praça. O retorno fica em **(1536, 2112)**, com raio 48, na ponte de acesso. Os cinco setores continuam `entrada`, `mercado`, `praca`, `bairro` e `palacio`.

| Destino | Acesso / recomendação | Monstro | Nível | Encontros |
| --- | --- | --- | --- | --- |
| Alubarna 01 | 50 / 50–55 | Puppu | 53 | 10 |
| Alubarna 02 | 55 / 55–60 | Miss Valentine | 58 | 10 |
| Alubarna 03 | 60 / 60–65 | Miss Merry Christmas | 63 | 10 |
| Alubarna 04 | 65 / 65–70 | Miss Double Finger | 68 | 10 |
| Alubarna 05 | 70 / 70–75 | Mr.1 | 75 | 10 |

IDs dos encontros, perfis, atributos, loot, respawns e progresso de cada destino permanecem independentes. Não foram acrescentados chefes nem recompensas. A máscara côncava do portão encobre o personagem atrás da arquitrave e deixa a abertura transparente. A navegação permite atravessar o arco e subir ambas as escadarias; jardineiras, pilares, muralhas e a base da torre são sólidos.

## Compatibilidade dos saves

A migração aditiva `0076_alubarna_city_hd_map.sql` reposiciona uma vez os personagens dos cinco mapas cuja assinatura anterior é conhecida. Não altera inventário, progresso, recibos ou recompensas. Os outros mapas mantêm posição, direção, rota e relógios. Assinaturas desconhecidas continuam rejeitadas.

O motor reancora os encontros por ID e preserva HP, mortos, cadáveres e prazos de respawn. A compatibilidade cobre também leituras individuais/em lote e a simulação de salas compartilhadas, incluindo monstros extras de party. Ações dependentes da geometria antiga são encerradas somente em Alubarna.

- Assinatura de mundo: `efc2eb76ac5f608179bfd25a1b796ee0b975ca21a62a9c45fd1beb482c088d87`.
- Assinatura de batalha: `c9607a8978503a6a30677f041a6c8f24a932be20932e322da0f80366b0e35d32`.

As migrações históricas permanecem imutáveis. Fixtures antigos que usavam Alubarna como controle inalterado passam a usar Enies Lobby. O teste histórico das portas continua exercitando a projeção original em um contexto isolado.

## Personagem na HUD de equipamentos

A prévia do inventário usa o mesmo bundle e a mesma pose **idle/south** do personagem no mapa, acompanhando seu relógio e ancorando os pés na base do painel. O ajuste substitui a centralização pelos limites opacos da imagem. O tamanho se limita à área disponível para manter o corpo inteiro visível.

A composição continua refletindo equipamento, aparência, capacete oculto/visível e Visual Completo. A skin Zoro usa seu frame sul e o pivô nativo; seu idle permanece no frame 0, com escala constante. Os outros retratos mantêm a apresentação existente. Nenhum sprite original foi editado.

Release do personagem: `native96-f2b7dcd807e7d32c`, regenerada e validada pelo script do projeto.

## Verificação executada

| Gate | Resultado |
| --- | --- |
| Layout novo e contratos/histórico de Alubarna | 8/8 |
| Compatibilidade das 11 cenas | 38/38 |
| PostgreSQL real das 11 cenas | 33/33 |
| Consumidores históricos de migração | 6/6 |
| Cadeia de migrações até 0076 | 1/1 |
| Auditoria geométrica | 50/50 rotas, um componente transitável |
| Sondas visuais independentes | 12/12 em cliente e servidor |
| Avatar sul, fontes reais masculino/feminino e Zoro | 2/2 |
| Encaixe HD existente | 4 casos aprovados |
| Build TypeScript, typecheck, build estático e diff check | Aprovados |

O navegador percorreu os cinco destinos pelo catálogo, confirmou os 50 encontros e os limites de nível, e caminhou pelos cinco setores em **1366 × 768/DPR 1** e **393 × 852/DPR 2**, sobre o build estático. Verificou combate real, progresso após reload, transferência do save para o contexto móvel e retorno por clique nos dois viewports. Não houve erro de página nem asset pertinente ausente.

Três recortes de câmera tiveram diferença exata zero em relação à fonte integral. A pedra do portão substituiu **1.639 pixels** do corpo atrás da estrutura; a amostra da abertura permaneceu com **zero pixels opacos**. O PNG servido é byte a byte idêntico à fonte.

O teste da HUD, executado também no build estático com **8/8 cenários aprovados**, compara a prévia com uma renderização independente da pose sul. Cobre oito cenários de equipamento, ocultar/mostrar capacete, Visual Completo e restauração, em computador e celular.

`npm test` amplo terminou em **247/251** na foundation, com as mesmas quatro falhas reproduzidas na base exata `f2c3c5d`:

- `current-game-catalog.test.mts`: expectativa antiga de 189 definições diante do catálogo de 229.
- `docker-context.test.mts`: dois casos existentes, envolvendo `sword-compendium.js` e `daily-sword-boss-specials.json` no contexto Docker.
- `visual-completo.test.mts`: expectativa anterior de comando de inventário.

O comando geral para antes da suíte legada; os gates focados desta integração foram executados separadamente. Não se declara aprovação de toda a suíte nem publicação em produção. Os conflitos preexistentes do PR com `main` não foram resolvidos nesta inclusão.

Reprodução visual: `tests/alubarna_city_browser.cjs` e `tests/inventory_south_world_browser.cjs`, servidos pelo runner `tests/run_honors_hd_browser.py` com `--offline --dist`. O workflow `alubarna-city.yml` cobre a cena, a HUD de equipamentos e a persistência.
