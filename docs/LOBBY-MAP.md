# Lobby do PixelLab

O mapa `Lobby` atual do PixelLab (`5cf16074-4d27-437e-acd5-869fe9339f26`) foi reexportado em 22/10/2026, com 60×41 tiles de 64 px. Os 20 recortes nativos foram montados em `assets/lobby-map.png`, incluindo os 97 objetos atuais; áreas sem terreno mantêm a textura de água existente. A grade em `lobby-map-data.js` foi conferida com o mapa do PixelLab e permaneceu igual. Nenhuma arte foi gerada.

`lobby-world.js` define o spawn na estrada central sul, piso transitável (areia, grama, estrada e madeira), colisores dos edifícios, monumento, carga e árvores, posições dos quatro NPCs e portal de saída no cais. Clicar no portal abre o mapa do mundo pelo fluxo de Modos de Jogo. O servidor Python continua responsável pela Hierarquia; o mapa é um asset estático do cliente.

O PixelLab informa seis junções de terreno sem tileset correspondente e um objeto cujo arquivo original não decodifica. A exportação mantém a imagem renderizada pelo serviço; não foram solicitados tilesets, sprites ou objetos novos.
