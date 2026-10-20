# Modo de criação de Akuma no Mi

Este fluxo reúne o Lote 1 Rank E e o rework visual de Kuku-Kuku e Beri-Beri. Use-o como padrão para novos lotes, preservando os IDs e saves existentes. As referências originais do proprietário servem à geração em PixelLab e não entram no Git.

## Evolução do Lote 1

1. **Referências e regras:** `Kuku_Kuku_no_Mi.webp` e `beri beri.jpeg` guiaram a forma das frutas. O primeiro lote definiu Rank E, Compêndio, slot exclusivo, bônus, teclas 1/2, servidor Python e aura contínua na UI.
2. **Primeiro passe de pixel art:** `16-bit clean pixel art, 48x48 frame, crisp pixels, sharp edges, no blur, no anti-aliasing, 100% transparent background`. Esta etapa estabeleceu silhuetas e os primeiros efeitos.
3. **Passe HD:** `HD 16-bit pixel art, crisp pixels, perfectly clean outlines, high contrast, vivid color palette, professional game-ready VFX asset, sharp detail, 100% transparent background`; negativos `--no blur, anti-aliasing, muddy colors, gradients, noisy pixels, low resolution`. O resultado trouxe ícones de fruta 48×48, auras em cinco quadros e bursts estáticos. Os bursts foram aposentados no rework atual.
4. **Rework de habilidades:** os parâmetros e prompts da seção acima geraram ícones HUD dedicados e folhas animadas. Kuku passa por corte, fumaça e carne; Beri usa seis fragmentos arredondados do próprio personagem, com energia PixelLab atrás. Toda prévia e o mapa compartilham o mesmo loop.

**Proveniência PixelLab do rework:** ícones Kuku `468d3e66-4ff7-4028-bb27-c915ab08227d`, Beri `c7ba2282-7804-40e4-86e0-0687ae725586`; quadros iniciais Kuku `fb5f4ec9-0a14-4418-a68d-9ecfed434611`, Beri `ac41928b-5a2d-43a4-bcfe-d2f7243cc9cc`; animações Kuku `55b6bc5c-4a8f-4511-b230-a9a7fe6ca508`, Beri `9be69443-30cb-4180-b409-4e50e12a0f42`. O trabalho anterior gerou as frutas e auras: Kuku ícone `e7db97fb-644b-4378-8509-e7ecbacd253f`, aura `952e868e-738c-4c56-a4c1-df175cddb183`, animação `bc065df3-3ff7-45e4-a133-9525e9735775`; Beri ícone `6c59038f-64f6-4fd4-a949-ea86a9c17ece`, aura `a5be62fb-4c32-41e2-858f-82bd51eb2abe`, animação `d27d1848-eaea-4328-bf2b-6144b9e4d6e2`.

## 1. Dados e regras

1. Registre a fruta em `akuma-system.js` e em `server/akuma.py` com ID estável, `type = akuma_no_mi`, rank, bônus, tecla e recarga. Acrescente itens ao fim de `itemDefs` para manter índices antigos.
2. A contagem do Compêndio usa IDs únicos desbloqueados e concede +0,1% de HP máximo e +0,1% de Força base por fruta, independentemente do equipamento. O slot exclusivo aplica somente os bônus da fruta equipada.
3. O Python valida equipamento, instância, alvos, duração, recarga e persistência. O cliente envia comandos e reproduz os resultados visuais. O preview estático continua com as mesmas regras locais.
4. Defina `icon_path` (fruta, 48×48), `vfx_sprite_sheet` (aura, quadros 48×48), `skill_icon_path` (HUD, 32×32) e `skill_sprite_sheet` (habilidade, quadros 48×48). Mantenha transparência real em todos os PNGs.

## 2. Direção de arte e PixelLab

Use a imagem de referência da fruta como guia de forma e identidade visual quando gerar a fruta. Gere ícone de habilidade separado do ícone do Compêndio. Priorize fidelidade visual mesmo com maior custo de geração. Inspecione o resultado em tamanho nativo antes de integrar.

**Estilo obrigatório:** `16-bit HD clean pixel art, game-ready sprite sheet, smooth animation sequence, crisp pixels, clean outlines, rich shading and highlights, 100% transparent background`.

**Negativos:** `--no monochrome blocks, flat squares, blur, muddy textures, noise, low-detail pixelation`.

| Fruta | Ícone HUD 32×32 | Habilidade 48×48 |
|---|---|---|
| Kuku-Kuku | `HD 16-bit pixel art icon, 32x32, a golden chef knife slicing through a glowing roasted meat leg, golden sparkles and warm aura #FFD700, sharp outline, dark UI frame, clean pixel art, transparent background` | `HD 16-bit pixel art animation sequence, 48x48 frame, golden knife slash energy arc descending into a puff of brilliant golden smoke #FFD700 and revealing a detailed roast meat item, fluid motion, crisp pixels, 100% transparent background` |
| Beri-Beri | `HD 16-bit pixel art icon, 32x32, three highly detailed 3D-shaded magenta energy spheres #8A2BE2 connected by electric arcs, vivid lighting, sharp outline, dark UI frame, clean pixel art, transparent background` | `HD 16-bit pixel art animation sequence, 48x48 frame, a character sprite smoothly splitting into 6 glossy 3D-shaded berry-like magenta spheres #8A2BE2, expanding in a fluid circular wave with energy trails and reassembling back to center, crisp pixels, vibrant lighting, 100% transparent background` |

Anexe os parâmetros de estilo e negativos a cada prompt. Para auras contínuas, preserve a paleta e as instruções do lote inicial: Kuku tem brilhos dourados e vapor suave; Beri tem três esferas roxas em órbita. Gere e exporte a grade de quadros diretamente do PixelLab. Preserve o PNG original sem redimensionar ou recomprimir os pixels; informe no catálogo a quantidade de quadros e colunas. O Canvas calcula a célula 48×48 por linha e coluna.

## 3. Animação e renderização

- O `requestAnimationFrame` global move o mundo e todas as prévias. O relógio da aura é o mesmo no mapa, retrato, Inventário, Personagem e Compêndio; a silhueta bloqueada escurece somente a fruta, com aura colorida atrás.
- A habilidade Kuku dura 0,75 s: corte descendente, fumaça dourada, carne no chão. Exiba os 9 quadros da grade 3×3 no local do cadáver a 12 FPS. O último quadro passa a representar a Comida no chão e permanece integralmente visível até a coleta. A coleta começa depois da transformação.
- A habilidade Beri dura 1,5 s: desenhe diretamente os 17 quadros úteis da grade PixelLab 5×4, com as seis esferas refinadas em primeiro plano. Durante esse período, `world.hero.visible = false`; restaure o sprite ao terminar, inclusive se um menu estiver aberto. A composição por fragmentos do personagem fica apenas como fallback se a folha não carregar.
- Desenhe todas as folhas com `imageSmoothingEnabled = false` e coordenadas inteiras. O quadro discreto avança a 12 FPS; o movimento das esferas pode interpolar em cada `requestAnimationFrame` para manter fluidez.
- A HUD usa os ícones temáticos 32×32 nas teclas 1/2 somente quando a fruta correspondente ocupa a tecla. O tempo restante aparece sobre uma máscara cinza circular proporcional à recarga.

## 4. Critérios de aceitação

Inspecione folha e jogo no navegador: sem arte estourada, bordas borradas, fundo opaco ou blocos monocromáticos; transição completa e retorno do personagem; ícones legíveis a 32×32; cooldown circular e auras contínuas nas quatro superfícies. Execute os testes Node pertinentes, o teste Python do backend, `python tools/build_pages.py` e confira o preview estático. Faça commit somente dos arquivos do lote e abra ou atualize o PR.

## Lote 1 Rank E

Kuku: +5% cura recebida, +3% HP máximo, Banquete Relâmpago (15 s), Comida +15% HP. Beri: +15% resistência a impacto, Divisão Esférica (18 s), 1,5 s de invulnerabilidade e knockback. Veja [detalhes da implementação](AKUMA-NO-MI.md).
