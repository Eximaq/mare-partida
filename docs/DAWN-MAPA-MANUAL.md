# Ilha Dawn — mapa manual do proprietário

Importação de20/10/2026, branch `feature/dawn-mapa-manual`, base `bb2c87d` (inclui os tooltips dinâmicos do colaborador). Revisão por PR, sem publicação automática desta branch.

## O que mudou

O destino inicial usa o **Mapa - Ilha Dawn** montado pelo proprietário no PixelLab, fornecido em `Mapa_-_Ilha_Dawn-export.zip`. O PNG composto foi copiado byte a byte, incluindo a pintura/overlay manual. Não foram redesenhados o terreno, os caminhos, as transições ou os objetos.

Preservados **56×40 tiles de64px, mundo3584×2560**, conforme o export, sem reduzir para32×32 ou alterar a escala dos personagens. A dimensão é uma exceção específica desta importação solicitada; o padrão geral para mapas futuros continua32×32. Coordenadas negativas do editor foram transladadas por +1344,+640 para o mundo positivo do jogo, mantendo as distâncias e a composição.

Os42 objetos exportados são seis barcos,22 árvores, duas casas,11 postes e um baú. Seus PNGs, bounding boxes, posições e áreas de apoio permanecem registrados. Níveis1–10, tipos/arte dos monstros, chefe, drops, contratos, inventário e saves foram preservados. Os sete IDs de setor continuam iguais; nomes e centros foram adaptados aos caminhos desta ilha.

## Fontes e organização

- Originais extraídos em `pixellab-pip-generations/dawn-manual-20261020/`. `source-archive.json` registra o nome/SHA256 do ZIP e o hash de cada membro original. Sem saves, credenciais ou caminhos pessoais no recibo.
- `map.json`: dimensões, origem, materiais, tilesets e overlay. `objects/manifest.json`: posições e footprints originais. Os metadados não trazem flags de terreno caminhável nem a grade de células.
- `terrain-cells.json`: consulta somente leitura pelo MCP `get_map` do mesmo mapa, usada como limite espacial para a derivação de navegação;56×40 e2141 células pintadas conferem com a fonte. Nenhuma edição ou geração foi enviada ao PixelLab.
- `assets/dawn-manual/`: composto original, água original e cinco PNGs únicos de objetos (duplicatas compartilham os mesmos bytes), mais proveniência.
- `tools/import_dawn_manual.py`: empacota os pixels originais e gera `dawn-map-data.js`. A ferramenta usa Pillow/NumPy apenas para leitura, comparação, cópia e derivação da máscara lógica; não pinta a arte.
- `dawn-world.js`: colisões, navegação, chegada/retorno e setores. `dawn-renderer.js`: chunks e oclusão dos atores. Build Pages inclui os três scripts novos, com URLs relativas e hash dos recursos.

**Custo desta integração: zero gerações novas.** O projeto remoto do proprietário permanece inalterado.

## Navegação e profundidade

Como a exportação não define caminhabilidade, uma máscara lógica de4px foi derivada das cores do composto e limitada pela vizinhança dos terrenos originais. Esta máscara não altera o PNG. Barcos usam seus bounding boxes como obstáculo completo; árvores, casas, postes e baú usam os `groundBounds` fornecidos pelo export. A máscara e os colliders são avaliados com o raio do ator.

O mapa usa células de navegação16px. Os pontos de chegada e de setor são ajustados a centros livres dessa grade. O hook opcional `segmentBlocked` valida interseções exatas com footprints e faz travessia completa das células da máscara, evitando cortes de caminho nas quinas estreitas da costa/árvores. O hook é usado somente quando o mapa o fornece; os outros mapas continuam com o comportamento anterior.

O composto já contém a arte dos42 objetos. Para evitar duplicá-los, o renderer só reaplica a região mascarada de um objeto quando um ator está atrás dele e sobrepõe sua silhueta. A cor vem do próprio composto; a transparência vem do PNG original desse objeto. Isso permite passar atrás das copas e casas mantendo o mapa sem atores igual ao export.

Chunks512px, limite20. Coordenadas e recortes inteiros, nearest-neighbor, sem filtros, espelhamentos ou recoloração. Áreas transparentes/não pintadas fora da composição recebem o tile de água original como fundo. A água do composto permanece estática, como no export; esta etapa não inventa animações ausentes. O anel de retorno é uma indicação de gameplay sobre a arte.

Os setores jogáveis ficam na ilha principal. A casa da ilhota ao norte, barcos e baú permanecem cenário, conforme a composição; não foram criadas pontes, lojas ou recompensas novas.

## Compatibilidade

- ID de save/caçada continua `beach`; ilha do Arquipélago continua `dawn`; mapa de runtime agora `dawn`. O mundo antigo `embers` e sua arte foram preservados como código legado/rollback, sem reset de dados.
- Setores `cais`, `corsarios`, `estaleiro`, `mercado`, `ancoras`, `farol`, `caldeira`: mesmos níveis e papéis. Chefe Nv.10, requisito12 abates, respawn90s, recompensa rara tier2/+300 dobrões e resgate único permanecem iguais.
- Coordenadas transitórias do personagem não são persistidas como posição antiga; entrar/recarregar usa a chegada da região. Contadores e recompensas existentes continuam pelos mesmos IDs.
- Diário prioriza os contratos da ilha atual; Haki, talentos, Akuma/Zoans e tooltips do colaborador foram mantidos.

## Verificação executada

- 26 suítes Node, sintaxe dos scripts raiz e build; cache Pages com51 recursos versionados e save preservado.
- `tests/dawn-world.test.cjs`: hashes de todos os membros do ZIP, PNG de runtime idêntico ao original, posições/footprints dos42 objetos e81 rotas reais de ida/volta entre chegada, sete setores e retorno.
- `tests/dawn_manual_browser.py`: Chromium em1920×1080,1366×768,1280×720,393×852 e320×568; viagem, chegada, UI de sete setores e compatibilidade com save antigo. Caminhada real pelos sete setores, aviso/vitória do chefe e resgate com falha de storage, rollback, resgate único e reload no DEV isolado.
- Comparação de8.380.416 pixels opacos do composto: zero componentes RGBA diferentes. Recortes atravessando chunks/câmera: zero erros e zero pixels sem cobertura. Oclusão atrás da árvore confirmada; ator à frente não é coberto. Cache limitado a20,42 máscaras carregadas, nenhum asset ausente.
- Capturas reais inspecionadas no cais, bosque, passarelas, praias, vila e celular. Galeria em `docs/evidence-dawn-manual/index.html`, fora do Git. O workflow `Dawn manual — jogo e capturas` valida o pacote estático e exporta as capturas para revisão.

Os testes históricos `ember_browser.py`/`ember_perf.py` descrevem o mapa vulcânico anterior e não são o aceite desta importação; sua geometria continua coberta pelos testes Node legados. O aceite atual de Dawn é a suíte manual acima.

## Resumo para o colaborador

Importamos a Ilha Dawn feita manualmente pelo proprietário, sem editar sua arte. Chegada, colisões e sete setores foram conectados à composição de56×40/células64, com profundidade correta nas árvores/casas. Os IDs persistidos e o balanceamento continuam iguais. Integrar por PR e incorporar main antes de editar `game.js`, `world-system.js` ou o build. Rollback por reversão do PR, sem apagar saves ou assets originais.
