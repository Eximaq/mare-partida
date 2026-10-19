# Porto compacto — 18/10/2026

O lobby passou de 3000 × 2000 para 2400 × 1700: 20% menos largura, 15% menos altura e 32% menos área. As oito colocações de casas foram reorganizadas em seis. Mercado e forja ficam no eixo sul da praça; navegação ao norte; expedições junto à capitania e ao cais. Os quatro NPCs mantêm seus serviços reais.

Cinco seções de píer formam uma área caminhável conectada. Dois navios, cargas com barris e cordas e quatro grupos de palmeiras dão ao lugar aparência de porto. Os caminhos usam transições de terreno e ligam os serviços à praça. Novas texturas deixam a água, a areia e o gramado menos carregados.

![Praça e serviços](evidence-compact-harbor/lobby-1920x1080.png)

![Cais e navios](evidence-compact-harbor/harbor-coast.png)

## Implementação e preservação

- `island-world.js`: dimensões, costa, ruas, casas, NPCs, cais e obstáculos.
- `game.js`: montagem dos tiles e dos sprites, madeira do cais reaproveitada do cenário original e rótulos de serviço.
- `world-system.js`: dimensões do lobby e correção do movimento diagonal junto a quinas durante rotas A*.
- `tools/build_island_assets.py` e `island-assets.js`: montagem reproduzível dos metadados dos atlas locais.
- Os 52 arquivos anteriores em `assets/` foram comparados por SHA256 com o checkpoint e permanecem idênticos. Os PNGs PixelLab foram mantidos sem pintura ou alteração; a montagem usa recortes das células originais.

Checkpoint anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-compact-harbor-20261018`.

## Arte PixelLab

Foram observadas **30 gerações nesta etapa**, dentro do lote aprovado de 27–33. Foram produzidos dois atlas de transição de terreno de 32 px e um atlas transparente de 512 × 512 com quatro células de 256 px. O atlas de edifícios anterior serviu de referência de estilo. Um erro de busca da referência ocorreu antes da criação de trabalho; a mesma referência foi enviada em base64, sem trabalho pago adicional. Não há gerações pendentes nem consumo ao jogar.

Prompts, parâmetros, IDs, custos e arquivos: [manifesto](../pixellab-pip-generations/porto-compacto-20261018/manifest.json) e [blueprint](../pixellab-pip-generations/porto-compacto-20261018/porto-compacto.blueprint.json).

Limitação visual: os navios vieram em perspectiva diagonal, apesar do pedido de proa ao norte. Foram integrados como retornados. Embarque e interiores não fazem parte desta alteração.

## Verificação

- `node tests/world-system.test.cjs`: 39 verificações.
- `node tests/island-world.test.cjs`: oito rotas completas, acesso aos quatro NPCs, costa, cais e seis edifícios.
- `python tests/island_browser.py`: 12 cenários, incluindo cinco resoluções, caminhada e câmera, serviço após deslocamento, inventário, combate, recompensa, persistência e acesso ao cais; sem erros JavaScript.

Os testes de navegador usam um personagem isolado e relógio virtual. Resultados completos em [results.json](evidence-compact-harbor/results.json). O preview em http://127.0.0.1:8123/ recarrega ao salvar arquivos.
