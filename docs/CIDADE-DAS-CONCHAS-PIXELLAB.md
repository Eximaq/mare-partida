# Cidade das Conchas — mapa PixelLab e Helmeppo

Atualização de 23/10/2026. O jogo carrega os recursos já existentes no PixelLab; nenhum pedido de geração foi enviado.

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
