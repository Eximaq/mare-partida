# Ajustes Zoan — escala e caminhada — 29/10/2026

Branch `fix/zoan-scale-walk-frames`, base `bb564ec` (PR #145 já integrado e publicado com autorização). Publicado após autorização no PR#146. [Hurt South e escalas adicionais](HURT-SOUTH-ESCALAS.md) constituem uma atualização posterior em revisão.

## Resultado

- Cavalo: fator visual de mundo **2×** (+100%), aplicado a Idle, locomoção, ataque, Hurt e especial pelo mesmo caminho de desenho. Altura opaca medida: aproximadamente68→136px.
- Albatroz: fator visual de mundo **1,5×** (+50%), com altura opaca aproximada76→115px.
- Dachshund: frente e costas agora correspondem ao tamanho aparente dos perfis. Usa a maior dimensão opaca do Idle como referência, calibrada pelo perfil leste existente, em vez de reduzir toda pose à mesma altura. Medidas no mundo: sul61×111px, norte55×111px, oeste/leste112×62px. A perspectiva e as proporções de cada desenho continuam originais; não se estica largura/altura separadamente.
- Retratos e prévias mantêm limite de encaixe para a nova referência do Dachshund não cortar a arte. Os aumentos de Cavalo/Albatroz afetam o personagem no mundo, sem ampliar a HUD.
- Nome, barra de vida, indicadores e recorte da silhueta acompanham a altura visual nova. Isso usa uma altura exclusiva do desenho; `combatActorHeight`/`combatChest` permanecem inalterados para não deslocar a referência lógica dos projéteis.

## Causa e correção da caminhada

As folhas novas contêm entradas/saídas próximas do Idle. A Girafa norte tem cinco quadros finais idênticos (24–28); os perfis do Albatroz começam e terminam de pé antes/depois do voo. Repetir a folha inteira fazia essas pausas reaparecerem enquanto o personagem se deslocava. O relógio de movimento do jogo continuava ativo: era a seleção dos quadros, não uma mudança necessária na velocidade ou na navegação.

Os loops agora usam intervalos contínuos de **frames nativos**, inspecionados por direção. Não há cópia/reversão de frames nem nova animação fabricada. Todos os quadros continuam no PNG e podem ser vistos por progresso explícito na inspeção. O Lobo tem um ciclo próprio de8frames e foi preservado integralmente.

| Forma | Sul | Norte | Oeste | Leste |
|---|---|---|---|---|
| Cavalo / Run | 3–26 | 3–26 | 4–26 | 4–26 |
| Albatroz / Walk | 3–13 | 3–13 | 10–23 | 10–23 |
| Dachshund / Run | 3–26 | 3–26 | 3–26 | 3–26 |
| Leopardo / Walk | 3–25 | 3–25 | 3–25 | 3–25 |
| Girafa / Walk | 4–25 | 3–22 | 3–25 | 3–25 |
| Alossauro / Walk | 3–25 | 3–25 | 3–25 | 3–25 |
| Bisão / Walk | 4–25 | 4–25 | 4–25 | 4–25 |
| Lobo / Run | 0–7 | 0–7 | 0–7 | 0–7 |

Índices iniciam em zero; intervalos incluem as duas pontas. O FPS de apresentação já configurado permanece. Duração/cadência de ataque, impacto, especiais, velocidade de deslocamento, colisão e atributos não mudaram.

Cavalo, Albatroz e Dachshund também passam a pré-carregar seus clipes ao equipar, como as Zoans de ranks posteriores já faziam. Isso evita começar a solicitar uma direção de caminhada somente quando ela é desenhada, exibindo Idle enquanto a imagem carrega.

## Arquivos

- `assets/sprites-combat-v2/playback.json`: escalas, referência do Dachshund e intervalos direcionais.
- Metadados de `uma`, `tori`, `inu`, `neko`, `ushi`, `ryu`, `bison` e `sprite-combat-v2-data.js`: dados derivados do importador.
- `sprite-combat-v2.js`: seleção do intervalo nativo e ajuste proporcional/encaixe de prévia.
- `game.js`: multiplicador de mundo, encaixe de retratos e pré-carga das três Zoans iniciais.
- `tools/import_sprite_combat_v2.py`: aplicação reproduzível da configuração.
- `tests/zoan-walk-loop.test.cjs` e `tests/zoan_scale_walk_browser.cjs`: regressões dos intervalos, escalas e estados reais de desenho.

## Validação executada

- Teste Node reproduziu a falha original: frame0 retornado no começo do loop em vez do primeiro frame ativo3; passou após a correção.
- Teste de navegador reproduziu a falta de pré-carga das direções antes da correção; passou após ligar a pré-carga. O teste observa requisições reais, sem depender do buffer de Resource Timing do navegador.
- A regressão de navegador também reproduziu a sobreposição da barra com o Albatroz ampliado, depois confirmou barras acima dos três sprites e a altura lógica original de74px preservada.
- **105 arquivos de teste Node aprovados**, incluindo combate, Zoans, Haki, talentos, saves e mapas; o E2E Supa fica fora desse loop conforme o CI existente.
- Novo E2E no fonte e no `dist`: oito formas × quatro direções ×144 amostras = **4.608 desenhos de caminhada**, sem selecionar folha Idle nem quadro inicial0 nas sequências corrigidas; Girafa norte nunca usa a cauda congelada24–28. Escalas medidas dos pixels realmente desenhados, perfis do Dachshund e encaixe de retrato conferidos.
- E2E `sprite_combat_v2_browser.cjs` no `dist`:1.146 poses,21 conjuntos, sete especiais com contato/dano único,20 abates, nove mapas e reload do save aprovados.
- `python tests/sprite_combat_v2_assets_test.py`: **5.957 frames nativos preservados**. Nenhum PNG mudou no diff e nenhuma geração PixelLab foi solicitada.
- `python tools/build_pages.py`, `python tests/paper_doll_pages_test.py`, sintaxe dos JS alterados e `git diff --check`: aprovados.
- Capturas recentes em `docs/evidence-zoan-scale-walk/`, ignoradas pelo Git: galerias Idle/Walk nas quatro direções e viewports1366×768/390×844, repetidas para o pacote estático. Inspeção visual dos fontes das oito formas e das galerias finais realizada.

## Compatibilidade e limites

Saves, IDs, mecânicas, navegação e PNGs originais permanecem intactos. Reverter o commit do ajuste restaura escalas/loops anteriores. Os Hurt ausentes foram disponibilizados posteriormente pelo proprietário; a integração está documentada na atualização Hurt South. A falha antiga da fixture de cadência humana também não foi alterada nesta tarefa. Este ajuste foi aprovado, integrado e publicado no PR#146.
