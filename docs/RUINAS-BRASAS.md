# Ruínas de Brasas — reconstrução

Mapa atual de **32×32 tiles**, com células de **64px**: mundo de 2048×2048px. A revisão de 19/10/2026 reduziu pela metade a largura e a altura do mapa anterior (um quarto da área), preservando escala dos sprites e resolução das texturas. O ID de save continua `beach`; Fenda da Névoa mantém seu mapa anterior. Nenhum inventário, equipamento ou atributo é migrado por esta atualização.

Sete setores conectados por rotas principais e alternativas: Cais das Cinzas, Rua dos Corsários, Mercado Calcinado, Estaleiro Partido, Pátio das Âncoras, Mirante do Farol Quebrado e Fortaleza da Caldeira. A circulação entre esses pontos continua pelo cenário. O menu Mapa agora abre a janela de viagens por navios (ver MAPA-NAVIOS.md), substituindo a antiga lista de rotas locais. O cais tem interação de retorno ao porto.

`ember-world.js` concentra terreno, rotas, praças, decoração, colisões e distritos de spawn. A composição atual tem três níveis: cais baixo, bairro central e ruínas altas. Dois paredões de contenção têm colisão; cinco escadas/rampas são as passagens entre níveis. Ruas chegam às oito fachadas, cada uma com entrada e acesso explícitos em `frontages`.

Há **uma única ponte**, alinhada à diagonal da arte, cruzando a fenda de lava para a fortaleza. Os dois extremos ficam em terra; o corredor navegável acompanha o tablado e não transforma o rio inteiro em piso. Remover a ponte da geometria torna a fortaleza inalcançável, condição coberta por teste. O cais de chegada usa madeira somente sobre a margem marítima. Casas, carga e ruínas têm colisão, o arco permite passagem entre pilares e os três naufrágios ficam na água. A chegada conserva o raio de 150px sem spawn.

São 37 elementos de cenário, agrupados por função: depósitos e mastros junto ao cais/estaleiro, fachadas voltadas às ruas, colunas e sepulturas nas ruínas altas, portão e guardiões na fortaleza. Sem espalhamento aleatório de pontes ou casas.

Os encontros surgem entre 170 e 500px do jogador, em solo alcançável, com distribuição por distrito e limite de 11 inimigos. Inimigos comuns a mais de 900px são retirados sem recompensa para permitir a exploração de outros setores. O Capitão da Caldeira aparece na fortaleza quando o jogador se aproxima a menos de 550px do centro, após o limiar existente de dez derrotas. Valores de combate, recompensas e contadores legados são preservados.

Quatro monstros com frames **48×48**: Corsário Calcinado, Vigia de Escória, Faroleiro das Cinzas e Capitão da Caldeira. Há oito poses direcionais de cada um. **Clipes de caminhada e ataque ficaram para outra etapa**, conforme a redução do orçamento aprovada pelo usuário. O combate funciona com as poses direcionais atuais.

`ember-renderer.js` carrega quatro pisos nativos 64×64, atlas de cenário e sheets dos monstros. Renderiza apenas chunks visíveis, com cache LRU limitado a 20 canvases de 512×512. Fogueiras usam quatro frames; água/lava têm fluxo de textura e há brasas discretas. Efeitos reduzidos desligam partículas e brilho. A madeira reaproveita pixels do cais existente.

## Gerações e preservação

A compactação e reorganização de 19/10 reutilizam todas as artes existentes: **zero novas gerações pagas**. O histórico abaixo pertence ao lote artístico anterior, não a um novo consumo.

Lote aprovado com teto de 45 gerações. Total informado pelas chamadas: **39** (25 do atlas, seis texturas Pixen e oito anunciadas para os quatro personagens). Os personagens não expuseram um recibo final separado. Duas primeiras texturas foram rejeitadas visualmente e substituídas com aprovação; seus originais continuam preservados. A tentativa inicial de tileset standard 64px foi recusada antes de criar um job; a troca para Pixen foi autorizada. Nenhuma animação de monstro foi gerada neste lote.

Originais em `pixellab-pip-generations/ruinas-brasas-20261018/`; somente fontes PNG e blueprint seguros devem ser versionados. ZIPs, metadados de conta, evidências em massa e saves ficam fora do Git. Consulte também [ART_BIBLE.md](ART_BIBLE.md).

## Verificação e recuperação

- `node tests/ember-world.test.cjs`: dimensões, todos os setores alcançáveis, colisões, pontes, câmera e dimensões/hash dos assets.
- `C:/Python313/python.exe tests/ember_browser.py`: viagem por navio, movimentação manual, retorno, persistência, vinte derrotas e mapa legado nas três resoluções desktop e em mobile.
- Os demais `tests/*.test.cjs` verificam personagens, combate, mundo, ilha e forja.
- `python tools/build_pages.py`: pacote estático com os módulos e assets novos.

Capturas locais atuais e resultados: `docs/evidence-ruinas-brasas/` (não versionados). Testes utilizam contextos isolados e não acessam o save do usuário. Para desfazer, reverta o commit da atualização; o formato do save permanece compatível. Checkpoint da primeira reconstrução: `feature/ruinas-brasas-64x64`.

A revisão compacta é verificada por oito grupos Node específicos: dimensões, retorno, sete setores em ida/volta, ponte necessária e alinhada, cinco escadas, paredões bloqueados, oito acessos de casas, câmera e artes preservadas. A aceitação de navegador inclui 1920×1080, 1366×768, 1280×720 e 393×852, vinte derrotas e persistência. O teste do pacote Pages também confirma o mapa compacto em contexto mobile com recursos versionados. Resultados e capturas atuais ficam na pasta local de evidências.

O padrão para todos os mapas futuros está em `AGENT.md`, seção 5.3: 32×32 tiles, células 64px, exceções somente por autorização explícita. Mapas legados não são alterados automaticamente. Branch desta revisão: `feature/ruinas-compactas-32`; rollback por reversão do commit, sem migração de save.

Medição local atual, Chromium headless 1366×768: 180 intervalos rAF, mediana/p95 de aproximadamente 16,7ms e seis chunks em cache. Uma viewport ultrawide 2560×1440 também foi verificada: a câmera respeita os limites e o mar preenche o espaço além do mapa compacto, sem canvas transparente. Métricas locais não são garantia para outros dispositivos.
