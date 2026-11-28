# Deserto de Alabasta — dunas, oásis e ruínas em HD

O destino `alabasta-desert` usa uma nova pintura em `assets/alabasta-desert/sand-sea/scene-hd.png`. A região, a área persistida e o mapa continuam `alabasta`. Esta integração pertence ao PR #394, mantido em rascunho e sem merge.

## Arte e referências

A imagem original tem **1448 × 1086 pixels nativos**, PNG RGB, **2.945.060 bytes**. O mundo mede **3072 × 2304 unidades de jogo**. O arquivo gerado foi copiado byte a byte, sem redimensionamento ou recompressão; a câmera usa recortes do PNG e nearest-neighbor.

SHA-256 da pintura:

`bc71344d7e02c689c889760c9279e9e2316d9e3671f3672b1316043bf80738ac`

A composição apresenta dunas douradas, arenito rosado, um pequeno oásis no oeste, um templo aberto em ruínas ao norte e um santuário menor ao sul. Os corredores de areia formam laços largos para exploração e combate. É uma adaptação jogável original do deserto de Alabasta, sem pretensão de reproduzir uma planta canônica exata.

Referências pesquisadas:

- [ONE PIECE oficial — episódio 97](https://one-piece.com/anime/97/index.html): travessia do deserto rumo a Yuba.
- [ONE PIECE oficial — episódio 102](https://one-piece.com/anime/102/index.html): ruínas encontradas durante a jornada.
- [Imagem do episódio em fonte secundária](https://www.imdb.com/title/tt0982401/): referência visual de dunas, formações rochosas e oásis.

As sinopses oficiais foram consultadas pelos resultados indexados, pois a abertura direta retornou HTTP 403. O prompt, as imagens de referência efetivamente inspecionadas e suas limitações de atribuição estão registrados em `provenance.json` e `generation-prompt.txt`, junto da pintura. Nenhuma imagem externa de referência foi distribuída.

O mapa PixelLab anterior, suas máscaras e dados, a capa regional, a capa de viagem e os sprites de Bananawani permanecem preservados.

## Geometria e contratos do jogo

`alabasta-desert-map-data.js` define o piso, a água, as bases de cenário, as silhuetas de profundidade, os destinos e os encontros. `alabasta-desert-world.js` desenha a pintura original. `world-map-exports.js` instala a mesma geometria no cliente e no servidor e atualiza também os setores e o retorno consumidos por `MareAlabasta` e pelo HUD de caçadas.

| Setor persistido | Local na pintura | Encontros |
| --- | --- | --- |
| `entrada` | Clareira de areia no sudeste | Dois Bananawani |
| `oeste` | Arena junto ao oásis | Dois Bananawani |
| `norte` | Pátio aberto do templo | Dois Bananawani |
| `leste` | Dunas e arenito | Dois Bananawani |
| `sul` | Arena do santuário | Dois Bananawani |

Os dez IDs seguem `alabasta-<setor>-0/1`, todos com Bananawani no nível 45. O acesso permanece no nível 40 e a recomendação em 40–50, sem limite superior de entrada. Não foi criado chefe nem prêmio de primeira vitória. Atributos, XP, Berry, loot, respawns e animações mantêm as regras anteriores.

A chegada é **(1536, 1728)** e o retorno é **(1840, 1920)**, com raio 48. Ambos ficam em areia seca, separados e afastados da borda inferior. O oásis bloqueia pés inclusive na água rasa esverdeada; as raízes e pedras da margem possuem bloqueios próprios. Os pés das colunas são separados, preservando a entrada do templo, a arcada do santuário e os caminhos em volta. As rochas e faces externas dos penhascos também são sólidas.

## Saves e servidor

A migração `0075_alabasta_desert_hd_map.sql` reconhece o world hash anterior e reposiciona somente personagens em Alabasta para a nova chegada. Ela promove a assinatura conhecida sem reiniciar caçadas, inventário, recompensas ou progresso. Reexecutar a migração não reposiciona personagens já migrados.

A compatibilidade em `world-battle.cjs` reancora os encontros por ID e preserva tipos, nível, HP, estado vivo/morto, respawns e progresso. Ações espaciais ligadas à geometria anterior são canceladas. As projeções de leitura e o worker também tratam salas compartilhadas e encontros extras de grupo, sem gravar durante a leitura. Assinaturas desconhecidas permanecem rejeitadas.

As migrações históricas ficam imutáveis. Os testes que precisavam de uma área de controle inalterada usam agora `alubarna-01`; o runtime e os mapas de Alubarna não foram modificados.

Assinaturas desta integração:

- Mundo: `7e090041bb19f26696d9b145542265638a36b4b19f3ecb0796d7d5cc1491fdf4`.
- Batalha: `6a3e08adcb2eec3da5122e2eaba5ef0f5898bdf180fdd49b34f30298d86adc65`.

## Verificação

O gate dedicado está em `.github/workflows/alabasta-desert.yml`. A fonte PixelLab preservada continua sendo exercitada pelo teste histórico; o novo layout tem seu próprio teste de rotas, bases e piso. O browser histórico permanece intacto, enquanto `tests/alabasta_desert_browser.cjs` cobre a pintura atual na versão estática servida.

Os testes geométricos usam a navegação real do cliente e do servidor, com deslocamento até os destinos exatos. Os pontos literais da água rasa, pedras, raízes e bases foram comparados à pintura e revisados independentemente. A auditoria final encontrou **54/54 rotas válidas e um único componente transitável**. Os nove testes focados de layout, fonte histórica e profundidade passaram; build, typecheck e build estático também passaram.

| Gate executado | Resultado |
| --- | --- |
| Layout atual, mapa histórico e profundidade | 9/9 |
| Compatibilidade das dez cenas | 31/31 |
| Integração PostgreSQL das dez cenas | 30/30 |
| Consumidores PostgreSQL históricos | 6/6 |
| Cadeia de migrações até 0075 | 1/1 |
| Auditoria de rotas | 54/54; um único componente transitável |
| Build, typecheck e build estático | Aprovados |
| Browser desktop e celular | Aprovado; nenhum erro de página ou asset ausente |

O browser final foi executado em 1366 × 768/DPR 1 e 393 × 852/DPR 2, sobre o build estático servido. Percorreu os cinco setores em ambos os tamanhos, confirmou os dez Bananawani nível 45 com 8.346 HP, 352 de ataque e 212 de defesa, e verificou o bloqueio no nível 39 e a entrada no nível 40. Um abate real concedeu 360 XP e 233 Berry nesta execução, sem prêmio de chefe. XP, Berry, itens, consumíveis, progresso e respawn persistiram após recarregar o save e abri-lo no contexto móvel.

Três recortes de câmera, com 22.080 pixels cada, coincidiram exatamente com a pintura original. A coluna cobriu 1.222 pixels do personagem atrás e nenhum à frente. Duas amostras de água e sete pontos de sólidos, margem e raízes bloquearam o movimento; a entrada do templo, o vão do santuário e seus dois contornos foram alcançados. O retorno por clique no canvas funcionou em 12 passos no desktop e 13 no celular. A inspeção visual das capturas confirmou o templo, a chegada no celular, a coluna e o vão do santuário.

O `npm test` geral terminou com **247/251 testes aprovados e as mesmas quatro falhas preexistentes**: contagem do catálogo (229 contra a expectativa antiga de 189), exclusão de `sword-compendium.js` no contexto Docker, ausência de `daily-sword-boss-specials.json` nesse contexto e expectativa antiga de inventário no teste de Visual Completo. A etapa geral interrompe a cadeia antes da suíte legada; os gates específicos acima foram executados separadamente. Não se declara a suíte geral aprovada.
