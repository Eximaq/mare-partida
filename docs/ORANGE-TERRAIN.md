# Orange Town — terreno V2 em revisão

Base: main/PR29, `9529a4d`. Branch exclusiva `fix/orange-town-terrain-v2`, 20/10/2026.

## Estado

Correção técnica implementada e testada. **Acabamento artístico ainda parcial: não fazer merge/publicar.** Aguarda autorização explícita para harmonizar dois verdes de transição ao tile-base e restaurar bordas de variantes alteradas pela IA. Os assets de desenvolvimento permanecem identificados como `draft-palette-review`; não chamar o resultado de aprovado ou profissional antes da revisão das capturas finais.

O lote PixelLab autorizado tinha teto19, sem tentativas extras. Sete chamadas concluídas, consumo observado10 gerações. Nenhuma nova tentativa executada. A variante de pedra foi rejeitada por alterar as juntas em vez de acrescentar desgaste discreto. As três variantes falharam na preservação exata da moldura4px; nenhuma foi ativada enquanto a correção local está pendente. Originais intactos em `pixellab-pip-generations/orange-terrain-v2-20261020/`.

## Causas encontradas no PR29

- A máscara N/E/S/W/diagonais era numericamente correta, mas não selecionava sprites do tileset. Era usada para desenhar um polígono novo por célula. Confundir esses bits com os bits de cantos Wang também seria incorreto: Wang usa NW8/NE4/SW2/SE1.
- `edgeJitter` escolhia deslocamentos independentes de até12px por lado/segmento. Os lados de fronteiras não tinham uma única regra geométrica compartilhada. `lineTo` criava diagonais suavizadas, mesmo com interpolação de imagens desligada.
- As incisões com `clip('evenodd')` revelavam camadas intermediárias: areia sob madeira, grama sob rua. O modelo visual não garantia pares de materiais compatíveis nos encontros.
- Espelhamentos independentes de quadrantes e tiles quebravam a fase das texturas e suas juntas. Contornos contínuos não podem ser obtidos com mais decoração sobre esses problemas.
- O halo de chunks não resolve limites desenhados independentemente, fases incompatíveis ou composição local divergente.
- O comparador anterior reconstruía manualmente um “antes” anterior ao próprio PR29 e aceitava qualquer mudança acima de5% dos pixels. Isso não valida acabamento artístico. O novo comparador executa os scripts do commit-base e exige inspeção humana.

## Arquitetura

`terrain-autotile.js`: núcleo sem DOM/física/save. Compila metadados de sprites completos, valida os16 estados Wang e oferece normalização de oito vizinhos e carregamento de **47 sprites blob realmente fornecidos**. Um conjunto incompleto é rejeitado; o motor não fabrica47 peças com recortes.

O conjunto gerado nesta etapa é **Wang16**, não um atlas47. A grade visual dual usa quatro cantos compartilhados por sprite; as quatro células visuais ao redor de uma célula lógica abrangem seus oito vizinhos. Os limites são os próprios pixels dos sprites, sem máscaras procedurais, espelhamentos, blur ou quartos artificiais. `bounding_box` e `corners` determinam a seleção; nomes e `original_position` não são coordenadas no atlas.

`orange-terrain.js`: adaptador/planejamento visual, somente leitura do mundo. Uma praia estreita e uma faixa de grama separam encontros incompatíveis; solo junto à taverna e área de trabalho do cais são planejados por coordenadas. Nenhum encontro de três materiais é disfarçado: configuração inválida lança erro. Os piers mantêm bordas retas arquitetônicas sobre água e usam a transição nativa madeira/areia no encontro com a margem. Não se recorta areia de um sprite para fingir uma transição com água.

`assets/terrain/harbor-v2/manifest.json`: catálogo reutilizável de água/areia, areia/grama, grama/pedra, terra/grama, areia/terra e areia/madeira, bases compartilhadas e variantes aprovadas. PNGs nativos32 são exibidos2× em células do mundo64, sem modificar resolução dos originais. O conjunto antigo16px de água/madeira foi auditado e não usado por diferença de escala/paleta.

Camadas: base do oceano → sprites de solo/transição → variantes compatíveis nas regiões homogêneas → objetos/construções existentes → animação ambiental. A ordem não depende de clipes arbitrários. Regiões de mar dos chunks são transparentes sobre uma base de água sempre preenchida; o resultado composto não possui buracos. O oceano usa pixels nativos com fase inteira global, e a preferência de movimento reduzido fixa a fase. A espuma do litoral vem dos sprites, sem retângulos aleatórios sobre a costa.

Cache512px, limite20 chunks, invalidação por carregamento de assets. Coordenadas de seleção, variação e textura são globais; o movimento da câmera não altera o terreno. O núcleo aceita outros mapas sem alterar física ou inventar outro algoritmo; esta sprint só conecta Orange Town.

## Compatibilidade

`orange-world.js`, `world-system.js`, `game.js`, combate, atributos, economia, spawns, navegação e saves não foram editados. O teste compara exatamente terrain, colliders, bounds, spawns, safe zones, rotas, fachadas e props com a captura anterior. Fingerprint antes/depois: `123580cdb258188b6dd9f597c262d2c33346d041b93ec306baa66eb26a6e7aed`.

Nenhum objeto foi acrescentado ou reposicionado. O planejamento de materiais é visual; não altera as células de colisão. Rollback por reversão do commit, sem migração ou perda de save.

## Capturas e testes executados

23 suítes `tests/*.test.cjs`, sintaxe dos scripts raiz e `python tools/build_pages.py` passaram. Cache Pages:43 recursos versionados, save preservado, sem script antigo carregado.

`python -X utf8 tests/orange_terrain_v2_browser.py --phase before` e `--phase after`: Chromium real, sete câmeras fixas de terreno, quatro ampliações2×, mapa completo e cenas reais de chegada/rua/praça/arena. A caminhada usa a UI existente e testa terreno navegável; as duas fases usam contextos isolados, relógio e RNG de teste fixos, sem tocar no save do usuário.

Comparação técnica de raster contínuo2048 contra16 chunks: zero diferenças RGBA. Cinco recortes de câmera atravessando limites511/512 e1023/1024: zero diferenças e zero pixels sem cobertura. Cache16/20. Uma amostra local registrou133ms para a verificação com readback e0,067ms de submissão Canvas quente; isto não é medição de FPS, GPU nem garantia de desempenho em outros dispositivos.

`tools/capture-orange.mjs`: usa `git show` para carregar os scripts reais do commit-base e produzir comparações nas mesmas posições. Sem gate de porcentagem de pixels alterados. Executado localmente com Chromium. Workflow do PR exporta as capturas para revisão; resultado verde não substitui aprovação visual.

Evidências locais em `docs/evidence-orange-terrain-v2/index.html`, fora do Git. Os PNGs `before` registram a main/PR29; os PNGs `after` são **diagnóstico sem harmonização aprovada**, incluindo os remendos de verde conhecidos. Não usar estas imagens para anunciar conclusão artística.

## Próxima ação desta mesma sprint

Obter a autorização pendente para o pós-processamento sem custo, harmonizar somente os preenchimentos/bordas aprovados, reavaliar variantes adequadas e repetir as capturas nas mesmas posições. Corrigir outros defeitos visuais identificados, concluir regressões necessárias e entregar o PR para aprovação antes de qualquer merge ou deploy.
