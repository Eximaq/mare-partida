# Cidade das Conchas — mapa PixelLab e Helmeppo

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

## Regressão de navegador (23/10/2026)

O teste de chegada agora pausa o relógio durante a viagem e desliga a caça pelo botão antes de avançar a simulação. A falha anterior vinha do deslocamento automático durante a espera do clique, não de um spawn incorreto. A entrada continua na célula `[11, 24]`, coincidente com o setor Areia Sul. O teste confere essa configuração e a posição real do personagem sem alterar o runtime.

Ao já estar em um setor, o teste fecha a janela de rotas antes de tentar abrir a próxima. A data simulada utiliza ISO explícito para evitar confusão entre segundos e milissegundos. O workflow passa a acompanhar os assets/mapa integrados e coleta as capturas na pasta temporária utilizada pelo teste.

Validado no Chromium em 1920×1080, 1366×768, 1280×720, 393×852 e 320×568: entrada, Helmeppo Nv. 8, preservação do save, retorno ao porto e circulação pelos quatro setores sem erros JavaScript. Build Pages e cinco testes Node pertinentes passaram. Capturas continuam locais/artefatos de CI, sem inclusão de saves no Git.

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
