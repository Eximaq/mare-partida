# Chefes de nível 130 a 170: arte e perfis preparados

Nenhum encontro, skill automática, masmorra, rotação, recompensa, XP ou Berry foi ativado. Os perfis de referência e nomes de ações estão em `prepared-dungeon-bosses.js`; os clipes em `prepared-dungeon-boss-art-data.js`; o desenho independente de VFX em `prepared-dungeon-boss-fx.js`. Os arquivos do Akainu semanal não são alterados.

| ID | Nível | Ataque básico (`attack`) | Habilidade (`special`) | VFX independentes |
|---|---:|---|---|---|
| hancock | 130 | Perfume Femur | Mero Mero Mellow | `area.png`: cone rosa, ápice no pivô, voltado Sul |
| magellan | 140 | Golpe de Veneno | Hydra | `projectile.png`: cabeça de Hydra voltada Leste; `area.png`: poça de veneno |
| ace | 150 | Hiken | Entei | `projectile.png`: esfera de fogo voltada Leste; `area.png`: impacto de chamas |
| aokiji | 160 | Ice Saber | Ice Age | `area.png`: expansão radial de gelo |
| akainu | 170 | Punho de Magma | Ryusei Kazan | `projectile.png`: magma descendo em diagonal para baixo/direita; `area.png`: impacto de magma |

Perfis preparados pela mesma curva de chefe acima de Kizaru 120, sem novas recompensas:

| Chefe | PV | Ataque | Defesa física | Defesa mágica |
|---|---:|---:|---:|---:|
| Hancock | 213.413 | 5.392 | 3.681 | 1.368 |
| Magellan | 241.886 | 5.801 | 3.960 | 1.467 |
| Ace | 272.149 | 6.221 | 4.248 | 1.575 |
| Aokiji | 304.088 | 6.630 | 4.527 | 1.674 |
| Akainu | 337.815 | 7.040 | 4.797 | 1.773 |

**Atores:** `assets/sprites-combat-v2/dungeon-<id>/{idle,walk,hurt,attack,special}-{south,north,east,west}.png`. Tiras de quatro quadros de 256×256, pivô de pés (128,213); o terceiro quadro é o contato ilustrado (índice 2). Não troque os arquivos de básico e especial. O especial inclui o lampejo de conjuração perto do ator.

**VFX:** `assets/vfx/prepared-dungeon-bosses/<id>/{projectile,area}.png` quando especificado acima. Tiras de quatro quadros de 256×256, pivô visual (128,128); não desenhe o efeito de área inteiro por cima do lançador. `MarePreparedDungeonBossFx.prepare(id,kind)` carrega sob demanda; `draw(ctx,id,kind,x,y,{frame,scale,rotation})` desenha na posição informada. Projétil, área e pose de conjuração são componentes independentes; nenhum deles concede dano.

**Próximo commit, somente quando autorizado:** manter o básico em `boss-dungeon-combat.js:begin/step/cancel` e `dungeon-timing.cjs`; criar estado e relógio discriminados para a habilidade no fluxo local de `game.js` e no autoritativo `world-battle.cjs`. O compositor V2 já resolve e desenha o clipe especial, mas a seleção automática não usa esse clipe nesta entrega. Use ação especial explícita, valide alvo/linha/interruptor no impacto, desenhe telegraph e carregue VFX sem atribuir dano no canvas. O contato da pose é o ponto de soltura; para um projétil que viaja, o acerto autoritativo é na chegada, uma única vez. Cancelamentos invalidam qualquer acerto pendente. Não altere cadência, dano ou VFX do básico nem regras, arte ou ações do Akainu semanal. Não ative mapas ou recompensas por consequência da importação.

Validação: `node --test tests/prepared-dungeon-bosses.test.cjs` e teste do cliente local em `tests/prepared-dungeon-bosses-browser.cjs` com build estático de Pages e `MARE_TEST_URL` apontado para o build servido localmente. Gameplay novo não é testável nesta entrega, pois deliberadamente ainda não existe uma luta jogável com esses cinco.
