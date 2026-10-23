# Cidade das Conchas — mapa PixelLab e Helmeppo

## Bloqueio do forte e portão (23/10/2026)

Os seis prints marcados mostram muros, quinas e o portão Marine fechado; não são as seis junções de terreno sem tileset (estas ficam nas transições entre areia, madeira e água). Os antigos colisores de placements não acompanhavam a silhueta da projeção aprovada.

`conchas-structures.js` acrescenta 56 retângulos sólidos contínuos sobre os muros e o portão, extraídos da paleta das estruturas na projeção existente por `tools/build_conchas_structures.py`. Portas pintadas na fachada são sólidas. A entrada aberta ao sul permanece acessível. O script fecha lacunas pequenas de argamassa/portas na máscara física e filtra componentes pequenos/embarcações; não altera nenhum PNG. O hash da projeção fica associado aos dados de colisão para detectar geometria desatualizada.

O bloqueio usa a navegação compartilhada por personagens e monstros, incluindo validação por eixo e subpassos contra transposição em deslocamentos grandes. Testes cobrem travessias nas seis estruturas, três tipos de entidade, colisão de segmentos e ida/volta pela entrada aberta. Saves e arte não são modificados.

Validação executada: testes do forte, Conchas, navegação e caça; build Pages. No Chrome isolado 1366×768, personagem de QA caminhou da areia até o interior pela entrada aberta. Ao manter a seta para baixo contra a fachada, parou em `(2144, 2149.4275)`, antes da faixa sólida que começa em `y=2152`, em posição walkable e sem exceções. Captura local: `C:/Users/Cristian/AppData/Local/Temp/conchas-solid-wall-input-20261023.png`. A resistência elevada do personagem de QA serviu apenas para impedir mortes durante a validação; nenhum atributo de produção foi alterado.

## Projeção integral do PixelLab (23/10/2026)

A renderização anterior recompunha objetos isolados e alterava encaixes, margens e sobreposições. Foi substituída por `assets/world-maps/conchas/projection.png`: exportação nativa de `view_map` em 20 trechos, reunidos sem redimensionamento nem pintura. A projeção contém todos os 105 placements e a ordem de camadas resolvida pelo próprio PixelLab. `projection.json` registra origem, dimensões e hashes. `tools/import_conchas_projection.py` permite reunir novamente os trechos exportados.

O runtime desenha essa projeção e uma máscara de primeiro plano derivada dos mesmos pixels, excluindo a paleta dos terrenos existentes. A máscara usa fechamento de 3 px para reduzir furos de cores compartilhadas, mantendo os pixels RGB da fonte e sem mover objetos. Personagens ficam atrás do cenário opaco; não há recomposição de sprites individuais. A navegação mantém os dados físicos de objetos/terreno. A arte da fonte não foi editada. O próprio PixelLab sinaliza seis junções sem tileset; essas limitações da fonte foram preservadas, sem inventar preenchimentos.

Um novo recorte do PixelLab em `(-3,13)`, 5×4 células, foi comparado ao mesmo retângulo da projeção: nenhum pixel diferente, incluindo a emenda entre trechos. A projeção mede 4480×3456.

Helmeppo agora usa quadro de renderização 128×128 para idle/walk/attack (sprites originais 80×80). Na pose parada, o conteúdo de 52 px passa a ocupar aproximadamente 83 px visíveis, comparável ao personagem. Demais monstros e atributos não foram alterados.

Validação desta revisão: testes Conchas, navegação, caça, mapas PixelLab, ilhas e profundidade; build Pages. No Chrome isolado 1366×768, chegada e caminhada real até Ruas do Porto concluídas em terreno walkable, sem exceções. Amostras da máscara mantiveram a areia transparente e cobriram o personagem na fachada. Captura: `C:/Users/Cristian/AppData/Local/Temp/conchas-authoritative-city-foreground-20261023.png`.

As seções abaixo registram a implementação anterior; a projeção integral acima substitui sua composição visual de objetos.

Atualização de 23/10/2026. O jogo carrega os recursos já existentes no PixelLab; nenhum pedido de geração foi enviado.

## Correção da integração (23/10/2026)

Consulta renovada a `list_maps`, `get_map`, `list_map_objects` e `view_map`: a fonte atual continua sendo o UUID abaixo, com 105 colocações. A correção usa essa fonte existente. A célula `stands_on` agora ancora a base inferior do objeto, em vez de posicionar o topo da imagem. Margens transparentes são medidas uma vez por asset e o desenho preserva a proporção da arte. Muros recebem colisores contínuos; decorações pequenas não bloqueiam um tile inteiro. As 105 colocações compartilham apenas 11 imagens.

O travamento vinha da chamada a `MarePixelMapRenderer.actorOverlapsProp`, que não havia sido exportada. A função agora está disponível no renderer público e tem cobertura de regressão junto ao alinhamento entre base visual e física.

Validação: testes Conchas, mapas PixelLab, navegação e caça; build estático; Chrome isolado 1366×768, sem erros JavaScript. Sessão observada com 78 eliminações e amostra de 90 frames com média/máximo arredondados de 17 ms. Captura local: `C:/Users/Cristian/AppData/Local/Temp/conchas-map-fixed-20261023.png`. Esses números descrevem a sessão local, não uma garantia para todo dispositivo.

## Mapa

- PixelLab map ID: `a12956e6-c961-499a-8242-ca264fcfc39a`.
- Grade de 70×54 células, 64 px por célula, dimensão de runtime 4480×3456.
- Terreno e objetos da ilha vêm da composição do mapa publicado. Os objetos mantêm renderização Y-sorted e colisores sólidos de base.
- Ponto de entrada: célula `[11, 24]`, na faixa walkable de areia ao sul.
- O ID de save `swamp` e o ID de mapa `conchas` foram preservados para compatibilidade com progresso existente.

## Helmeppo

- PixelLab character ID: `411318d7-6ee7-43ea-ba8a-11b0fc0ce182`.
- Nv. 8, usando a progressão de atributos já adotada pelo backend a partir do baseline César; stats finais são mantidos iguais no catálogo de servidor e navegador.
- Idle, caminhada e animação `Throw_Object` são os quadros publicados, empacotados sem redesenho em frames 80×80 para o renderer existente.
- Os quatro setores usam apenas Helmeppo. O Guardião e os antigos spawns comuns foram retirados desta versão; a missão antiga de chefe foi convertida em objetivo de uma derrota de Helmeppo, preservando seu identificador salvo.

## Arquivos de integração

- `conchas-pixellab-data.js`: terreno e placements publicados.
- `pixellab-world-maps.js`: mapa, spawn, setores, colisão, draw dos objetos e retorno.
- `assets/world-maps/conchas/`: composição do terreno e sprites dos 105 placements.
- `assets/new-islands/helmeppo/`: sprites de idle, walk e ataque.
