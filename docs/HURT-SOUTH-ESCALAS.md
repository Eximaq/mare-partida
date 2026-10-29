# Hurt South e escalas — 29/10/2026

Branch `fix/south-hurt-character-scales`, baseada em `origin/main` `ce262cf` (PR#146 publicado). Atualização para revisão, sem merge/deploy automático. Checkout original preservado.

## Comportamento

Os 21 conjuntos agora usam **Hurt South** quando recebem dano, independentemente de estarem voltados para norte, sul, leste ou oeste. A referência de escala/pivô também é South durante a reação; a orientação do ator não é alterada e volta a aparecer ao terminar a janela visual existente de 180 ms. Coalescência de golpes, prioridade de morte/especiais/transição, dano, relógios de ataque e saves continuam nos caminhos existentes.

Foram baixados novamente somente os exports alterados do PixelLab: Lobo, Gênio Hoya e Kuroobi. Lobo/Hoya agora incluem Hurt South com 29 frames nativos cada. Hurt usa os quadros3–6 inspecionados, preservando todos os29 na folha original. O Hoya deixou de receber o realce substituto sobre essa animação nativa. O Kuroobi recebeu ataque oeste e as novas versões norte/leste; ataque sul e demais clipes existentes permanecem idênticos. Poses de contato configuradas: sul18, norte14, oeste/leste16, sem alterar o instante de dano antigo.

Nenhuma geração paga, edição de pixels, espelhamento ou alteração remota no PixelLab. São6.044 frames nativos em 385 folhas; hashes RGBA completos nos metadados permitem verificar cada frame.

## Tamanhos no mundo

O multiplicador incide proporcionalmente sobre Idle, caminhada, ataque e Hurt. Retratos/prévias continuam usando o encaixe próprio. O crescimento temporário do Hoya multiplica a nova escala. Cabeçalhos e status usam altura visual separada; `combatActorHeight`/`combatChest` e a autoridade dos projéteis não foram alterados.

| Personagem | Aumento | Fator | Altura Idle medida nas quatro direções |
|---|---|---|---|
| Marinheiro | +100% | 2× | 150px |
| Gênio Hoya | +40% | 1,4× | 126–127px |
| Mr.3 | +50% | 1,5× | 113px |
| Cabaji | +50% | 1,5× | 113px |
| Kuroobi | +30% | 1,3× | 122–123px |
| Chew | +30% | 1,3× | 106px |
| Buchi | +50% | 1,5× | 144–145px |
| Sham | +20% | 1,2× | 100px |
| Gin | +20% | 1,2× | 100px |
| Pearl | +40% | 1,4× | 133px |

Arredondamento de destino e amostragem nearest-neighbor podem variar até 2 px. Cavalo, Albatroz e Dachshund conservam os ajustes já publicados.

## Arquivos e verificação

- `sprite-combat-v2.js`: resolução de Hurt South e escala de monstros/Hoya.
- `game.js`: cabeçalhos visuais ampliados, sem modificar alturas lógicas.
- `assets/sprites-combat-v2/playback.json`, metadados e `sprite-combat-v2-data.js`: parâmetros reproduzíveis pelo importador; três PNGs adicionados e dois atualizados.
- `tools/import_sprite_combat_v2.py`: aceita contato visual específico por direção, além do valor comum já suportado.
- `tests/sprite-south-hurt.test.cjs`: 21 conjuntos/oito aliases, Hurt nativo e quatro ataques Kuroobi. Antes da alteração falhou com Idle norte em vez de Hurt South.
- `tests/south_hurt_scales_browser.cjs`: dimensões reais e cabeçalhos de 40 poses, escala proporcional de caminhada/ataque, 84 desenhos Hurt, 32 reações reais das oito Zoans com retorno após 180 ms, dano real no Hoya/monstros e quatro ataques Kuroobi. Antes da alteração reproduziu Marinheiro 74 px em vez de 150 px. Fixtures existem somente na resposta interceptada do teste.
- 106 arquivos Node aprovados, excluindo somente o E2E Supa conforme o workflow existente. Comparação dos 6.044 frames RGBA, build Pages e integridade Pages aprovados.

- `node tests/south_hurt_scales_browser.cjs`: aprovado no fonte e no `dist`, incluindo Hoya ampliado pelo buff. A primeira carga em massa de todos os conjuntos teve falha transitória de uma imagem no servidor HTTP local; a fixture agora carrega por personagem e falha imediatamente com o clipe identificado, sem retentar ou ignorar erro.
- `node tests/sprite_combat_v2_browser.cjs` no `dist`: 1.155 poses, 21 conjuntos, sete especiais com contato/dano único, 20 abates, nove mapas e reload aprovados.
- `node tests/zoan_scale_walk_browser.cjs` no `dist`: 4.608 amostras de caminhada, oito formas e escalas já publicadas preservadas.
- `python tools/build_pages.py`, `python tests/paper_doll_pages_test.py`, sintaxe dos JS alterados e `git diff --check`: aprovados.

Capturas locais em `docs/evidence-south-hurt/` (ignorado pelo Git), incluindo galeria das 40 poses, fontes das animações novas e telas 1366×768/390×844. Sem saves, caches ou evidências em massa no commit.

## Limites e revisão

Hurt norte/leste/oeste próprios deixam de ser pendência: South em todas as direções é a decisão explícita do proprietário. Nenhum Hurt falta nos 21 conjuntos; o ataque oeste do Kuroobi também está disponível. Permanecem FPS autoral não informado pelo export, revisão visual humana, ensaio prolongado de desempenho e teste em celular físico. A falha antiga de cadência humana documentada no relatório original está fora deste ajuste e não foi mascarada.

Para rollback, reverter o commit deste PR e reconstruir Pages. Merge e publicação desta atualização aguardam autorização específica após revisão.
