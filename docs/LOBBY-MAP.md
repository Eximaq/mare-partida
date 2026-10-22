# Lobby do PixelLab

O mapa `Lobby` já existente no PixelLab (`5cf16074-4d27-437e-acd5-869fe9339f26`) foi exportado em recortes sem geração nova. A grade original de 60×41 tiles de 64 px está em `lobby-map-data.js`; a imagem montada e servida ao Canvas está em `assets/lobby-map.png`. As áreas vazias da exportação foram preenchidas com a própria textura de água existente no mapa, mantendo todos os objetos originais.

`lobby-world.js` define o spawn na estrada central sul, piso transitável (areia, grama, estrada e madeira), colisores dos edifícios, monumento, carga e árvores, posições dos quatro NPCs e portal de saída no cais. Clicar no portal abre o mapa do mundo pelo fluxo de Modos de Jogo. O servidor Python continua responsável pela Hierarquia; o mapa é um asset estático do cliente.

As árvores de frutas usam colisores de 48×32 px alinhados às raízes. Ao entrar no Lobby ou retornar após uma derrota, o cliente resolve o spawn para o ponto transitável mais próximo, evitando que uma posição inválida deixe o jogador sobre um objeto.

O PixelLab informa seis junções de terreno sem tileset correspondente e um objeto cujo arquivo original não decodifica. A exportação mantém a imagem renderizada pelo serviço; não foram solicitados tilesets, sprites ou objetos novos.
