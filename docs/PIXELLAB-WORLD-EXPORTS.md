# Mapas exportados do PixelLab

A arte original dos 11 mapas fica em `assets/exported-maps/`. Alubarna 01–05 compartilham a imagem e a geometria. Cada entrada conserva seu identificador, nível e catálogo de monstros. Quest Dungeons usa a mesma arena para os chefes e o baú do export como interação de recompensa.

O export inclui a composição, os retângulos de apoio e as máscaras dos objetos visíveis. Como não há grade de colisão completa, o importador compara os tiles da composição com os terrenos e tilesets exportados. Ajustes de passagens ficam no importador. As coordenadas de jogo ficam em `tools/world-map-export-layout.json`. O cenário de Arlong referencia um tileset que não veio no ZIP. Nesse mapa a reconstrução usa os tiles básicos disponíveis e mantém a composição original.

Para atualizar um export, rode `python tools/import_world_map_exports.py <pasta-dos-zips>` com NumPy e Pillow. Revise as coordenadas e a migração do servidor se a geometria mudar. O jogo usa os PNGs com o sistema existente de profundidade e silhueta. Nenhum dos ZIPs contém frames de animação decorativa.

Marineford está registrado como `marineford` no catálogo de mapas. O Boss Semanal ainda está desativado em `apps/game-server/src/characters/crew-profession-rules.ts`. Quando o modo for ativado, sua entrada deverá selecionar esse mapa e o encontro da semana.

A migração 0052 reposiciona personagens no ponto de entrada do mapa atualizado ao reconectar e encerra o caminho anterior. Os dados de progressão e as recompensas da masmorra continuam no save.

## Vila Syrup — contorno e chegada (11/11/2026)

O ZIP fornecido pelo proprietário, `Mapa Vila Syrup.zip`, atualiza somente Syrup.
O PNG composto é copiado sem alterações. Seus 65 objetos, máscaras e retângulos
de apoio são preservados; a nova origem do export exige apenas +384 px em Y
nas coordenadas relativas à imagem. Nenhuma colisão de objeto é removida ou reduzida.

`tools/syrup-boundary.json` registra o contorno vermelho da referência e os
pontos de navegação. A máscara de terreno bloqueia água e qualquer célula de
16 px que ultrapasse esse contorno. A chegada fica em (2296, 3144), dentro
do círculo ciano, com folga para os pés. Retorno, setores e pontos de patrulha
permanecem dentro da área permitida. IDs e tipos dos monstros não mudam.

Reprodução: `python tools/update_syrup_boundary.py <zip>`. O importador dedicado
confere a preservação de todos os objetos e atualiza apenas a entrada Syrup
nos dados compartilhados. Regressão: `node --test tests/syrup-boundary.test.cjs`;
rotas: `node tools/audit_maps.cjs --map syrup --full`.
A migração 0053 invalida caminhos antigos de Syrup e preserva posições e
caminhos dos demais mapas. Sua execução no banco de produção não faz parte do PR.
