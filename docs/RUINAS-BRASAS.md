# Ruínas de Brasas — reconstrução

Mapa atual de **16×16 tiles**, com células de **64px**: mundo de 1024×1024px. A revisão final de 19/10/2026 reduziu novamente a largura e altura da proposta 32×32 (um quarto daquela área), preservando escala dos sprites e resolução das texturas. O ID de save continua `beach`; Fenda da Névoa mantém seu mapa anterior. Nenhum inventário, equipamento ou atributo é migrado por esta atualização.

Quatro setores próximos: Cais das Cinzas, Praça Calcinada, Ruínas das Âncoras e Fortaleza da Caldeira. O painel Mapa traça rotas reais; o retorno fica no ponto de chegada, livre das sobreposições do chat no desktop.

`ember-world.js` concentra terreno, rotas, decoração, colisões e spawns. Três níveis permanecem legíveis, ligados por **três escadas**, com colisões nos paredões. As três construções têm entrada explícita ligada à rua (`frontages`).

Há **uma única ponte**, alinhada à diagonal da arte, cruzando a fenda de lava para a fortaleza. Os dois extremos ficam em terra; o corredor navegável acompanha o tablado e não transforma o rio inteiro em piso. Remover a ponte da geometria torna a fortaleza inalcançável, condição coberta por teste. O cais de chegada usa madeira somente sobre a margem marítima. Casas, carga e ruínas têm colisão, o arco permite passagem entre pilares e os dois naufrágios ficam na água. A chegada conserva o raio de 112px sem spawn.

São 16 elementos de cenário: três construções, carga e mastro no cais, colunas/sepultura nas ruínas, portão e uma ponte na fortaleza. O objetivo é uma área curta com composição própria, não conservar todos os objetos da versão grande.

Spawns comuns a 140–340px, máximo de cinco inimigos comuns (teto total de sete ao incluir chefe), reposição abaixo de quatro. O raio sem spawn na chegada é 112px. Comuns a mais de 550px são retirados sem recompensa. O chefe aparece ao aproximar-se a menos de 300px da fortaleza, mantidos os limiares de derrotas existentes. Status/recompensas e chaves de contratos não mudam.

Quatro monstros com frames **48×48**: Corsário Calcinado, Vigia de Escória, Faroleiro das Cinzas e Capitão da Caldeira. Há oito poses direcionais de cada um. **Clipes de caminhada e ataque ficaram para outra etapa**, conforme a redução do orçamento aprovada pelo usuário. O combate funciona com as poses direcionais atuais.

`ember-renderer.js` carrega quatro pisos nativos 64×64, atlas de cenário e sheets dos monstros. Renderiza apenas chunks visíveis, com cache LRU limitado a 20 canvases de 512×512. Fogueiras usam quatro frames; água/lava têm fluxo de textura e há brasas discretas. Efeitos reduzidos desligam partículas e brilho. A madeira reaproveita pixels do cais existente.

## Gerações e preservação

A compactação e reorganização de 19/10 reutilizam todas as artes existentes: **zero novas gerações pagas**. O histórico abaixo pertence ao lote artístico anterior, não a um novo consumo.

Lote aprovado com teto de 45 gerações. Total informado pelas chamadas: **39** (25 do atlas, seis texturas Pixen e oito anunciadas para os quatro personagens). Os personagens não expuseram um recibo final separado. Duas primeiras texturas foram rejeitadas visualmente e substituídas com aprovação; seus originais continuam preservados. A tentativa inicial de tileset standard 64px foi recusada antes de criar um job; a troca para Pixen foi autorizada. Nenhuma animação de monstro foi gerada neste lote.

Originais em `pixellab-pip-generations/ruinas-brasas-20261018/`; somente fontes PNG e blueprint seguros devem ser versionados. ZIPs, metadados de conta, evidências em massa e saves ficam fora do Git. Consulte também [ART_BIBLE.md](ART_BIBLE.md).

## Verificação e recuperação

- `node tests/ember-world.test.cjs`: dimensões, todos os setores alcançáveis, colisões, pontes, câmera e dimensões/hash dos assets.
- `C:/Python313/python.exe tests/ember_browser.py`: exploração real nas três resoluções desktop e em mobile, chefe, retorno, persistência, vinte derrotas e mapa legado.
- Os demais `tests/*.test.cjs` verificam personagens, combate, mundo, ilha e forja.
- `python tools/build_pages.py`: pacote estático com os módulos e assets novos.

Capturas locais atuais e resultados: `docs/evidence-ruinas-brasas/` (não versionados). Testes utilizam contextos isolados e não acessam o save do usuário. Para desfazer, reverta o commit da atualização; o formato do save permanece compatível. Checkpoint da primeira reconstrução: `feature/ruinas-brasas-64x64`.

A revisão compacta é verificada por oito grupos Node específicos: dimensões, retorno, quatro setores em ida/volta, ponte necessária e alinhada, três escadas, paredões bloqueados, três acessos de casas, câmera e artes preservadas. A aceitação de navegador inclui 1920×1080, 1366×768, 1280×720 e 393×852, vinte derrotas e persistência. O teste do pacote Pages também confirma o mapa compacto em contexto mobile com recursos versionados. Resultados e capturas atuais ficam na pasta local de evidências.

O padrão para todos os mapas futuros está em `AGENT.md`, seção 5.3: 16×16 tiles, células 64px, exceções somente por autorização explícita. Mapas legados não são alterados automaticamente. Branch desta revisão: `feature/ruinas-compactas-32`; rollback por reversão do commit, sem migração de save.

A câmera centraliza eixos menores que a viewport; eixos maiores continuam com acompanhamento e clamp. Conversão entre clique e coordenadas do mundo inclui o deslocamento central. O mar preenche a área externa ao mundo, sem mudar a escala dos personagens. Validação cobre desktop, mobile e ultrawide; métricas/capturas atuais em `docs/evidence-ruinas-brasas/`.
