# Ruínas de Brasas — reconstrução

Mapa de **64×64 tiles**, com células de **64px**: mundo de 4096×4096px. O ID de save continua `beach`; Fenda da Névoa mantém seu mapa anterior. Nenhum inventário, equipamento ou atributo é migrado por esta atualização.

Sete setores conectados por rotas principais e alternativas: Cais das Cinzas, Rua dos Corsários, Mercado Calcinado, Estaleiro Partido, Pátio das Âncoras, Mirante do Farol Quebrado e Fortaleza da Caldeira. O painel Mapa oferece rotas reais até esses pontos, sem teletransporte. O cais tem interação de retorno ao porto.

`ember-world.js` concentra terreno, rotas, praças, decoração, colisões e distritos de spawn. Mar e lava são bloqueados; travessias de madeira são transitáveis. Casas, carga e ruínas têm colisão, arcos permitem passagem entre pilares. Os naufrágios ficam na água. A chegada tem um raio de 150px sem spawn.

Os encontros surgem em solo alcançável próximo do jogador, com distribuição por distrito e limite de 11 inimigos. Inimigos comuns distantes são retirados sem recompensa para permitir a exploração de outros setores. O Capitão da Caldeira aparece na fortaleza quando o jogador chega à região, após o limiar existente de dez derrotas. Valores de combate, recompensas e contadores legados são preservados.

Quatro monstros com frames **48×48**: Corsário Calcinado, Vigia de Escória, Faroleiro das Cinzas e Capitão da Caldeira. Há oito poses direcionais de cada um. **Clipes de caminhada e ataque ficaram para outra etapa**, conforme a redução do orçamento aprovada pelo usuário. O combate funciona com as poses direcionais atuais.

`ember-renderer.js` carrega quatro pisos nativos 64×64, atlas de cenário e sheets dos monstros. Renderiza apenas chunks visíveis, com cache LRU limitado a 20 canvases de 512×512. Fogueiras usam quatro frames; água/lava têm fluxo de textura e há brasas discretas. Efeitos reduzidos desligam partículas e brilho. A madeira reaproveita pixels do cais existente.

## Gerações e preservação

Lote aprovado com teto de 45 gerações. Total informado pelas chamadas: **39** (25 do atlas, seis texturas Pixen e oito anunciadas para os quatro personagens). Os personagens não expuseram um recibo final separado. Duas primeiras texturas foram rejeitadas visualmente e substituídas com aprovação; seus originais continuam preservados. A tentativa inicial de tileset standard 64px foi recusada antes de criar um job; a troca para Pixen foi autorizada. Nenhuma animação de monstro foi gerada neste lote.

Originais em `pixellab-pip-generations/ruinas-brasas-20261018/`; somente fontes PNG e blueprint seguros devem ser versionados. ZIPs, metadados de conta, evidências em massa e saves ficam fora do Git. Consulte também [ART_BIBLE.md](ART_BIBLE.md).

## Verificação e recuperação

- `node tests/ember-world.test.cjs`: dimensões, todos os setores alcançáveis, colisões, pontes, câmera e dimensões/hash dos assets.
- `C:/Python313/python.exe tests/ember_browser.py`: exploração real em três resoluções, chefe, retorno, persistência, vinte derrotas e mapa legado.
- Os demais `tests/*.test.cjs` verificam personagens, combate, mundo, ilha e forja.
- `python tools/build_pages.py`: pacote estático com os módulos e assets novos.

Capturas locais atuais e resultados: `docs/evidence-ruinas-brasas/` (não versionados). Testes utilizam contextos isolados e não acessam o save do usuário. Para desfazer, reverta o commit da atualização; o formato do save permanece compatível. Branch de recuperação: `feature/ruinas-brasas-64x64`.

Execução concluída em 19/10/2026: seis grupos específicos Node e todos os demais testes Node passaram. O navegador passou sete grupos específicos e doze de regressão da ilha/HUD, com capturas nas três resoluções solicitadas. `tests/ember_perf.py` mediu 180 intervalos reais de requestAnimationFrame em Chromium headless 1366×768: mediana 16,7ms, p95 16,8ms, nove chunks em cache. São medidas locais, sem promessa para outros dispositivos.
