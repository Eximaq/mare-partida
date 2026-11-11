# Mapas exportados do PixelLab

A arte original dos 11 mapas fica em `assets/exported-maps/`. Alubarna 01–05 compartilham a imagem e a geometria. Cada entrada conserva seu identificador, nível e catálogo de monstros. Quest Dungeons usa a mesma arena para os chefes e o baú do export como interação de recompensa.

O export inclui a composição, os retângulos de apoio e as máscaras dos objetos visíveis. Como não há grade de colisão completa, o importador compara os tiles da composição com os terrenos e tilesets exportados. Ajustes de passagens ficam no importador. As coordenadas de jogo ficam em `tools/world-map-export-layout.json`. O cenário de Arlong referencia um tileset que não veio no ZIP. Nesse mapa a reconstrução usa os tiles básicos disponíveis e mantém a composição original.

Para atualizar um export, rode `python tools/import_world_map_exports.py <pasta-dos-zips>` com NumPy e Pillow. Revise as coordenadas e a migração do servidor se a geometria mudar. O jogo usa os PNGs com o sistema existente de profundidade e silhueta. Nenhum dos ZIPs contém frames de animação decorativa.

Marineford está registrado como `marineford` no catálogo de mapas. O Boss Semanal ainda está desativado em `apps/game-server/src/characters/crew-profession-rules.ts`. Quando o modo for ativado, sua entrada deverá selecionar esse mapa e o encontro da semana.

A migração 0052 reposiciona personagens no ponto de entrada do mapa atualizado ao reconectar e encerra o caminho anterior. Os dados de progressão e as recompensas da masmorra continuam no save.
