# Desenvolvimento compartilhado no GitHub

O projeto foi preparado para versionamento por Git e publicação opcional de uma demonstração estática no GitHub Pages. **Para começar, leia [docs/COLABORACAO_GITHUB.md](docs/COLABORACAO_GITHUB.md).**

**Importante:** o preview GitHub Pages utiliza `localStorage` individual; multiplayer, sincronização de saves e backend exigem um serviço adicional. Não envie chaves, tokens ou saves ao repositório.

---

# Maré Partida — Versão 1.2 (pacote V12)

## Paper Doll 1.0 — infraestrutura e bancada

Base humana comum para as sete classes e quatro facções, com categorias de ataque independentes da aparência. Compositor por camadas sincronizadas, pivôs, profundidade por direção/pose, cache limitado e associação visual de equipamentos. A bancada permite selecionar as28 combinações, identificando os assets ausentes. A [bancada técnica](tools/paper-doll-inspector/index.html) compara as quatro direções de Idle/Walk/Attack com os sprites originais e recebe pacotes locais para inspeção.

O conjunto modular com todas as ações e direções ainda está incompleto: o jogo mantém os personagens completos por fallback, incluindo o Bento aprovado. A [primeira prévia estática](pixellab-pip-generations/paper-doll-human-pilot-20261020/preview.html) permite alternar cabelo, roupa e espada em uma pose frontal, sem alteração de save. Foram cobradas5 gerações nesse piloto; resultados brutos e extrações de inspeção estão documentados no [relatório](docs/PAPER-DOLL-PILOTO.md). [Contrato, auditoria, assets faltantes e testes](docs/PAPER-DOLL.md) · [Análise anterior preservada](docs/PAPER-DOLL-VIABILIDADE.md). O lote das seis classes continua pausado.

O [piloto Idle frontal](pixellab-pip-generations/paper-doll-human-idle-south-20261021/preview.html) adiciona inspeção de quatro frames e cobertura parcial por direção. O encaixe das peças foi **reprovado**, permanece como diagnóstico e não está ativo no jogo. [Relatório e custos](docs/PAPER-DOLL-IDLE-SUL.md).

O [teste seguinte da espada](pixellab-pip-generations/paper-doll-sword-fit-20261021/preview.html) apresenta quatro camadas nativas com contato na mão e corpo preservado. A identidade visual da lâmina ainda varia; cabelo/roupa continuam pendentes e o conjunto não foi ativado. [Relatório, custo conhecido e limites](docs/PAPER-DOLL-ESPADA.md).

O [lote por atlas](pixellab-pip-generations/paper-doll-layer-batch-20261021/preview.html) tentou uniformizar a espada em uma única chamada. O contato passou, mas a arte foi reprovada pela variação da lâmina. Foram cobradas6 gerações; cabelo e roupa não foram gerados. [Diagnóstico e validação](docs/PAPER-DOLL-LOTE-CAMADAS.md).

A [prévia de arma rígida](pixellab-pip-generations/paper-doll-rigid-weapon-20261021/preview.html) usa uma única espada presa à mão dos quatro frames de Idle/sul, preservando seu modelo sem consumir créditos. A reutilização foi autorizada especificamente para armas; cabelo/roupa e demais ações continuam pendentes. [Contrato e validação](docs/PAPER-DOLL-ARMA-RIGIDA.md).

O [conjunto modular frontal](pixellab-pip-generations/paper-doll-hair-outfit-20261021/preview.html) já reúne corpo, cabelo, roupa e espada nos quatro frames Idle/sul, com controle individual das camadas e importação na bancada. Foram cobradas12 gerações no novo lote. Demais direções e ações continuam no fallback, sem ativação do protótipo no jogo. [Relatório e assets faltantes](docs/PAPER-DOLL-CABELO-ROUPA.md).

A [expansão de Idle](pixellab-pip-generations/paper-doll-expansion-20261021/preview.html) reúne corpo, cabelo, roupa e espada em16 poses de repouso nas quatro direções. O [link direto da bancada](tools/paper-doll-inspector/index.html?pack=expansion-idle) abre o pacote sem importação manual, inclusive no celular. Há edição e exportação de encaixes por frame. Walk/Attack continuam no fallback; nada foi ativado no personagem de produção. [Arte, custos e limites](docs/PAPER-DOLL-EXPANSAO.md).

Continuação Paper Doll: a [caminhada frontal modular](pixellab-pip-generations/paper-doll-walk-fit-20261021/preview.html) reúne oito passos reais das quatro peças. O [estudo de costas](pixellab-pip-generations/paper-doll-walk-north-20261021/preview.html) valida corpo/espada, mas mantém o cabelo reprovado apenas como diagnóstico e não gerou roupa. A [bancada do pacote parcial](tools/paper-doll-inspector/index.html?pack=walk-north) demonstra o fallback norte sem alterar o personagem publicado. [Custos, reversibilidade das margens e assets pendentes](docs/PAPER-DOLL-CAMINHADA-NORTE.md).

A [continuação da caminhada norte](pixellab-pip-generations/paper-doll-north-finish-20261021/preview.html) reúne as oito poses de costas com as quatro camadas; o [GIF transparente](pixellab-pip-generations/paper-doll-north-finish-20261021/walk-north.gif) abre no celular. Idle cobre quatro direções e Walk frente/costas; perfis e ataques seguem no fallback. Arte ainda em inspeção, sem ativação em produção. [Fontes, limitações, custo18 e validação](docs/PAPER-DOLL-NORTE-COMPLETO.md).

## Interface UI/UX 2.0

A identidade de navio foi preservada na revisão: madeira, cordas, bronze e pergaminho, com a organização responsiva e a navegação acessível da UI 2.0. O inventário voltou a ter três colunas de pergaminho e slots harmonizados em madeira escura.

Tokens e componentes compartilhados, HUD nas bordas com Haki na barra de ações, menus compactos, chat local com filtros e janelas padronizadas. Navegação mantém os sistemas existentes e adiciona controle uniforme de foco, Escape e confirmações. [Guia para novas funcionalidades e validação](docs/UI-DESIGN-SYSTEM.md).

## Ícones de itens — PixelLab

Os 64 ícones existentes agora usam PNGs transparentes de 32×32, seguindo o estilo da espada 45 escolhida: equipamentos, pérolas, caixas, Livro da Vontade, poção e material. Integrados no inventário, forja, drops, criação e prisão, preservando os dados dos saves. [Origem, reduções aprovadas, consumo e testes](docs/ICONES-ITENS-PIXELLAB.md).

## Orange Town — Caçada regional 21–30

O terceiro destino do Arquipélago recebe um porto próprio de 32×32 tiles de 64px, cinco setores conectados, quatro inimigos originais e caminhadas nas quatro direções. Entrada no nível 21, chefe Capitão Fagulha no nível 30, equipamentos tier 5–6, dois contratos e recompensa única da primeira vitória. [Arquitetura, arte PixelLab, validação e resumo para o colaborador](docs/ORANGE-TOWN.md). Ilhas a partir do nível 31 permanecem em prévia.

## Caçadas regionais 1–20

Ilha Dawn agora usa o mapa feito manualmente pelo proprietário no PixelLab:56×40 tiles nativos de64px, com bosque, praias e cais. Arte preservada, colisões/rotas integradas e progressão1–10 mantida. [Importação, fontes e validação](docs/DAWN-MAPA-MANUAL.md).

Cidade das Conchas recebe uma ilha própria de32×32 tiles, com ruas conectadas, mercados, cais, navios e bairro antigo. Níveis11–20, chefe, recompensas e saves preservados. Reutiliza os tilesets de terreno existentes, sem novas gerações. [Reconstrução, testes e resumo para o colaborador](docs/CIDADE-DAS-CONCHAS.md).

Dawn agora tem encontros fixos Nv.1–10, e Conchas Nv.11–20 (entrada no nível 11). **Rota & recompensas**, junto ao retorno ao porto, guia a caminhada pelos setores e permite resgatar uma arma da classe na primeira vitória contra cada chefe. Especiais têm avisos no chão; a auto-caçada tenta desviar quando há saída. XP e equipamentos vêm do nível do inimigo. Saves e itens existentes preservados. [Regras, limites, testes e resumo para o colaborador](docs/CACADAS-1-20.md).

## Prévia — Akuma no Mi

**Personagem → Akuma no Mi** mostra abas E–S, com Kuku-Kuku e Beri-Beri no Rank E. Registre as frutas no Compêndio e equipe uma no slot exclusivo para usar a habilidade e a aura. [Regras e arquitetura](docs/AKUMA-NO-MI.md) · [Modo de criação de novas frutas](docs/AKUMA-CREATION-MODE.md).

## Histórico — Haki na HUD de combate
## Akuma no Mi — Lote 1 Rank E

Personagem → Akuma no Mi apresenta Kuku-Kuku e Beri-Beri como silhuetas até o registro. Cada registro dá +0,1% de HP máximo e Força base; o slot exclusivo aplica os bônus da fruta. Kuku transforma o cadáver mais próximo em comida curativa (tecla 1); Beri divide o personagem em seis esferas, concede 1,5 s de invulnerabilidade e afasta inimigos (tecla 2). Ícones HUD 32×32 e VFX ativos em quadros 48×48 seguem o fluxo PixelLab documentado.

Para usar o serviço Python local com SQLite: python server/app.py e abra http://127.0.0.1:8123/. O pacote estático do Pages continua disponível com python tools/build_pages.py. [Regras, arquitetura e testes](docs/AKUMA-NO-MI.md).

## Entrega atual — Haki na HUD de combate

Após despertar, três ícones aparecem junto às barras do perfil: **H** alterna Armamento, **J** alterna Observação e **K** dispara o Rei. O chat passa para **L**. Os botões mostram estado ativo, falta de Vontade e recarga do Rei (8s, persistente após reload). Novos ícones PixelLab nativos32 e VFX transparentes estão integrados. [Regras, arte e validação](docs/HAKI.md).

## Histórico — Laboratório DEV temporário

Clique em **DEV**, acima das habilidades, ou pressione **F8** → **Abrir laboratório**. Teste níveis, sete classes, talentos finais, conquistas, Haki, itens/forja e inimigos em uma cópia separada do personagem. **Voltar ao jogo normal** recupera sua aventura original. [Controles, limites e remoção do recurso temporário](docs/DEV-TOOLS.md).

## Histórico — Despertar (Haki)

**Personagem → HAKI** exige nível 50 e consumo do Livro da Vontade (5% em chefes de mundo aberto/diários Nv.30+). Armamento/Observação têm ativação manual ou automática exclusiva, reserva de 100 Vontade, drenagem/recuperação de 5/s. O Rei usa 50, atordoa comuns e enfraquece chefes. O atalho original R foi substituído por K na atualização da HUD. Saves, itens antigos, talentos e resgates de conquistas preservados.

Lógica, HUD, três spritesheets do PixelLab Workbench e quatro ícones Pro **nativos de 32×32** estão integrados e testados. Os PNGs dos ícones foram preservados sem redimensionamento. Chefes Diários e treinamento de Haki continuam futuros. [Regras, decisões, arquitetura, arte e testes](docs/HAKI.md).

## Histórico — Constelações, Conquistas e Talentos Finais

**Personagem → Talentos** agora abre uma constelação conectada, com zoom/arraste, tronco central, rotas que acendem, ponte intermediária e três opções finais por classe. Mantidos dois ramos simultâneos e um intermediário; o final também tem escolha única e exige 50 PT comuns, um intermediário e cinco pontos em um último tier, custando 3 PT.

A nova aba **Conquistas** reúne 31 marcos, resgate único e progresso persistente: abates, riqueza, níveis, BP, exploração e a estrutura futura de Impel Down, frutas, Haki e Bounty Bosses. O orçamento combina 1 PT por nível com os pontos resgatados; sistemas futuros ficam Em breve. Os 21 finais entram no combate, com recursos de HUD, escudos, revive, clone, ricochetes e campos de dano/controle. Senhor do Submundo é a exceção explícita para caixas Nv.1 nas caçadas.

Migração v2 preserva as builds atuais. Efeitos de grupo usam contratos para aliados reais; o jogo permanece solo. [Regras, valores, disponibilidade e testes](docs/TALENTOS.md).

## Histórico — Árvores de Talentos

O menu **Personagem** agora abre a seleção **Personagem / Talentos**. Cada uma das sete classes tem três ramos com cinco tiers, limite de dois ramos investidos e três talentos exclusivos dos quais apenas um pode ser escolhido. O jogador recebe 1 PT por nível, incluindo o primeiro, separado dos pontos de atributos.

Investimentos usam prévia e confirmação, persistem por classe e podem ser redefinidos gratuitamente no porto. Os bônus e exclusivos entram nos gatilhos de combate, sem botões de ativação. Saves antigos recebem o orçamento correspondente ao nível sem perder equipamentos ou progresso. O jogo permanece solo: efeitos sobre outros aliados dependem de uma futura integração de grupos reais; a aura já beneficia o próprio suporte.

[Regras, valores dos 21 exclusivos, arquitetura e limites](docs/TALENTOS.md).

## Histórico — Menu de modos e seleção de fases

**Atualização do acesso rápido:** a tecla **M**, o ícone da HUD e o botão de modos do porto abrem um menu suspenso junto à HUD, sem exibir a antiga janela intermediária. **Mapa do Arquipélago** e **Impel Down** abrem suas respectivas telas diretamente; voltar a Modos retorna ao menu suspenso. Escape e clique externo fecham a lista. O menu Personagem permanece independente.

**M** e o botão da HUD agora abrem **Modos de jogo**, uma lista suspensa com ícones e texto. Escolha **Mapa do Arquipélago** para viajar ou **Impel Down** para abrir sua janela própria. A entrada da prisão foi removida de dentro do mapa geográfico.

Impel Down apresenta setas limitadas aos andares já liberados, nível/ondas, monstros previstos com imagem e atributos, recompensa da primeira conquista, preferências de subida e Marcos. Os multiplicadores de dificuldade ficam somente nas regras internas; a HUD não exibe fórmula, fator ou tabela. A prisão permanece **Em breve**, sem partidas ou resgates.

As caixas, marcos, exclusividade dos drops e estoque antigo de pérolas continuam preservados. Preferências de avanço automático e pausa antes de chefes são salvas para a liberação futura. Sem novas gerações pagas.

[Regras, composição prevista, limitações e validação](docs/IMPEL-DOWN.md).

## Histórico — Regiões e detalhes do Arquipélago

O Mapa do Arquipélago agora organiza oito ilhas em **East Blue**, com faixas recomendadas de 1–10 até 71–80. **Alabasta** aparece bloqueada abaixo do título. Clicar em uma ilha abre seus detalhes: faixa de nível, descrição, chefe, drops e botão separado para viajar.

Ruínas de Brasas passa a **Ilha Dawn** e Fenda da Névoa a **Cidade das Conchas**; os mapas existentes, IDs de save e requisitos Nv. 1/Nv. 8 continuam preservados. As outras seis ilhas podem ser inspecionadas, mas aguardam mapas e monstros. Sem monstro ou com imagem ausente, o preview mostra **Indisponível**. Não há taxa de sucesso calculada: o painel informa **Não estimada**.

Água animada, seis ícones na HUD, hover/foco e atalhos mantidos. No celular, os detalhes ocupam a janela e oferecem retorno à lista. Sem novas gerações pagas.

[Catálogo, regras e validação](docs/ARQUIPELAGO-REGIOES.md) · [Navegação e HUD](docs/MAPA-NAVIOS.md).

## Histórico — Ruínas de Brasas compacta

Ilha reorganizada em **32×32 tiles de 64px** (2048×2048px): metade da largura/altura anteriores. Três níveis com paredões e cinco escadas, ruas ligadas às oito fachadas, uma ponte real sobre a fenda de lava e sete pontos de interesse próximos. Cais, bairro queimado, estaleiro e fortaleza têm composições próprias; monstros continuam com frames **48×48**.

[Decisões, compatibilidade e validação](docs/RUINAS-BRASAS.md) · [Bíblia visual](docs/ART_BIBLE.md) · [Capturas locais atuais](http://127.0.0.1:8123/docs/evidence-ruinas-brasas/index.html).

O `AGENT.md`, seção 5.3, define **32×32 tiles de 64px como padrão para todos os mapas futuros**, com exceções só por autorização explícita. Lobby e Fenda da Névoa existentes mantêm seus tamanhos. O save conserva o ID `beach`; nenhum item ou progresso é migrado.

Reorganização sem novas gerações pagas. O lote artístico anterior informou 39 gerações; caminhada/ataque dos monstros seguem adiados conforme o orçamento aprovado. Água/lava têm fluxo de textura e fogueiras usam quatro quadros reais. A publicação Pages mantém scripts e CSS versionados para evitar cache antigo.

Validação: oito grupos Node específicos, demais regressões Node, oito grupos de navegador nas quatro resoluções e pacote Pages mobile com cache versionado. Vinte derrotas, retorno e persistência passaram; viewport ultrawide tratada com mar ao redor do mapa.

## Histórico — Forja com seleção visual

Grids de equipamentos e pérolas substituem dropdowns, com pesquisa, filtros, paginação, tooltip e destaque do alvo. Aprimorar até +20 (garantido até +5), imbuir/remover, fundir cinco equipamentos ou cinco pérolas, reforjar uma linha ou todos os extras. Operações confirmadas, custos/riscos explícitos, resultados no painel, histórico e persistência transacional.

**Fusão atualizada:** cinco slots interativos nas duas modalidades, com clique/arrastar, remoção individual e limpeza. Pérolas exibidas apenas quando possuídas; quantidades, bloqueios, busca e filtros refletem o inventário real. Custos e chances mantidos. [Regras e testes dos slots](docs/FUSAO-SLOTS.md) · [Capturas atuais](http://127.0.0.1:8123/docs/evidence-fusion-slots/index.html).

Migração idempotente `forgeVersion:3`, com JSON original em `mare-partida-save-v1-before-forge-v3`; preserva IDs, refinos e progressão. Custos de aprimoramento agora escalam com o nível da peça; reforja fica 30% mais cara por tentativa. Chances das pérolas mantidas. Nenhuma geração paga ou alteração de mapa/câmera/sprites. Supremo por fusão, reparação, desmontagem e transferência aguardam as regras documentadas.

[Jogar](http://127.0.0.1:8123/) · [Regras, fórmulas, migração, testes e pendências](docs/FORJA-REFATORACAO.md) · [Capturas reais](http://127.0.0.1:8123/docs/evidence-forge-refactor/index.html) · [Histórico Forja 2.0](docs/FORJA-2.0.md).

Verificação: 15 grupos do modelo e aceitação em Chromium nas três resoluções (1920×1080, 1366×768, 1280×720), incluindo cancelamento, falhas, bloqueios, consumo exato e recarga sem duplicação. Evidências e resultados: `docs/evidence-forge-refactor/`.

## Histórico — HUD, interface náutica e atributos por classe

Sete botões com os arquivos originais de `icones_menu_pirata`, identidade compartilhada nas janelas, inventário com os onze slots alinhados e a prévia atual do personagem. Os 33 equipamentos, a poção e o ferro salgado agora têm artes próprias em `assets/ui/items/`, reutilizadas na mochila, equipamentos, forja, loja e loot. Sem novas gerações pagas.

Todas as classes nascem com **50 pontos base**, conforme a tabela de classe, separados de equipamentos, facção e investimentos. A distribuição oferece **+1, +5, +10, +25 e MÁX**, prévia, confirmação, cancelamento e limpeza. Continuam sendo 5 pontos livres por nível a partir do nível 2. A migração v2 preserva investimentos antigos e guarda o JSON original em uma chave de backup do navegador.

[Jogar com atualização ao vivo](http://127.0.0.1:8123/) · [Capturas reais de todas as janelas](http://127.0.0.1:8123/docs/evidence-ui-nautical/index.html) · [Tabela, distribuição, arquivos, assets e recuperação](docs/UI-HUD-ATRIBUTOS.md) · [Auditoria inicial](docs/UI-ATRIBUTOS-AUDITORIA.md).

Validação: 7 grupos de aceitação da UI + 12 de personagens + 12 de ilha/HUD em Chromium isolado; testes de nascimento das sete classes, quantidades, migração, persistência, inventário/forja, navegação, 20 derrotas e resgate de contrato. Capturas em **1920×1080, 1366×768 e 1280×720**. Passaram também os testes Node de atributos (12), mundo/câmera (39), ilha (8), controle de animações e renderização dos sprites. Ver resultados em `docs/evidence-ui-nautical/results.json`, `docs/evidence-ui-character-regression/results.json` e `docs/evidence-ui-island-regression/results.json`. Foram comparados 132 arquivos protegidos ao checkpoint: nenhum mapa, câmera, sprite ou ícone fornecido foi alterado.

Limites: equipamentos ainda não trocam as roupas do sprite; mercado/cofre continuam indisponíveis. O aumento da base anterior de 25 para os 50 pontos pedidos muda o ritmo inicial, sem alterações nos coeficientes de combate. Rolagem vertical permanece disponível para conteúdo extenso. Checkpoint: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-ui-attributes-20261018`.

## Histórico — combate do Espadachim Pirata

Bento recebeu guarda, ataque, Corte de Maré, reação ao dano e queda, com controle de estados e dano no impacto. A integração é exclusiva de Pirata + Espadachim. O ataque para a esquerda e as quatro animações de costas com braços sobre o dorso foram substituídos por versões inspecionadas; as 20 combinações de ação/direção têm animação ativa. A queda e os sprites-base foram preservados. Os demais detalhes artísticos estão registrados nos relatórios.

As chamadas informaram **23 gerações na produção + 4 no piloto + 5 nas correções = 32 nesta etapa**. Os 144 frames originais e as versões anteriores foram preservados; 36 frames de substituição foram verificados pixel a pixel. Combate, morte/renascimento e isolamento de facção/classe passaram novamente após os ajustes. [Correções e verificação atual](docs/BENTO-CORRECOES-DIRECIONAIS.md) · [Histórico da produção](docs/BENTO-ESPADACHIM-COMBATE.md) · [Galeria das quatro direções](http://127.0.0.1:8123/pixellab-pip-generations/bento-combat-production-20261018/preview.html) · [Jogar](http://127.0.0.1:8123/). Conserve também `combat-animation.js`, `combat-assets.js` e `assets/classes/pirate-sword/` ao transportar a versão.

## Histórico — sprites-base das quatro facções

Iara do Levante, Bento Maré-Livre, Cecília da Vigília e Dário do Conselho foram gerados no PixelLab e integrados à seleção, ao perfil e ao lobby. Cada um possui idle e caminhada em frente, costas, esquerda e direita. Em **Personagem → Inspecionar sprites das facções no lobby**, veja os quatro juntos e alterne os ciclos. As sete classes continuam independentes das facções.

Arte nativa 48×48, folhas com células 56×56 por padding transparente e escala calibrada junto aos NPCs. Iara usa quatro frames frontais de caminhada, conforme aprovação expressa; os outros ciclos de caminhada têm oito. Custo desta etapa: **77 gerações**, incluindo a correção adicional autorizada. Os 52 assets anteriores e os sistemas de mapa, câmera e balanceamento foram preservados.

[Relatório, arquivos, capturas, custos e refinamentos](docs/SPRITES-BASE-FACCOES.md) · [Preview ao vivo](http://127.0.0.1:8123/). Para transportar a versão, conserve também `faction-sprites.js`, `faction-assets.js` e `assets/factions/`. Nenhuma nova geração é consumida ao jogar.

Verificações: seis cenários de facções em navegador, 188 frames de entrega, 12 cenários de regressão das classes e 12 de mundo/HUD. Execute `python tests/factions_browser.py` com Playwright e `python tests/faction_artwork.py` com Pillow para reproduzir os testes específicos.

## Histórico — classes, atributos e progressão (1.3.0)

Sete classes jogáveis: as seis anteriores e o novo Suporte/Curandeiro. Ciborgue agora prioriza tanque, e Estrategista Elemental usa dano mágico. FOR, DES, VIT, INT e ESP influenciam o combate, com cinco pontos livres por nível a partir do nível 2. Abra **Personagem**, clique no contador de pontos ou pressione **P** para distribuir com prévia e confirmação. O Curandeiro pode configurar o limite de vida para cura automática.

Saves antigos recebem o saldo correspondente ao nível e são preservados em cópia local antes da migração. Equipamentos, facções, mapas, câmera e sprites foram conservados. Nenhuma geração PixelLab foi realizada nesta etapa.

[Fórmulas, habilidades, migração e limites de balanceamento](docs/CLASSES-ATRIBUTOS-PROGRESSAO.md) · [Preview ao vivo](http://127.0.0.1:8123/).

Verificações: `node tests/character-system.test.cjs`, `python tests/characters_browser.py`, `node tests/world-system.test.cjs`, `node tests/island-world.test.cjs` e `python tests/island_browser.py`. O preview carrega `character-system.js` antes de `game.js`; conserve esse arquivo junto aos demais ao transportar a versão.

## Histórico — porto compacto

Lobby reduzido de 3000 × 2000 para 2400 × 1700 (32% menos área), com seis casas, serviços agrupados, caminhos curtos e um cais conectado com dois navios. Areia, água e gramado receberam texturas PixelLab mais suaves; cargas e palmeiras completam a ambientação. A HUD náutica e o progresso continuam preservados.

Atualização de preferência visual: água, areia e grama voltaram aos atlas mais detalhados de `ilha-porto-20261018`, preservando o layout compacto e os navios. Nenhuma nova geração foi necessária. Para reconstruir essa combinação: `python tools/build_island_assets.py pixellab-pip-generations/ilha-porto-20261018 pixellab-pip-generations/porto-compacto-20261018`.

[Preview ao vivo](http://127.0.0.1:8123/) · [Relatório e capturas](docs/ENTREGA-PORTO-COMPACTO.md). Arte desta etapa: **30 gerações observadas**, dentro das 27–33 aprovadas. Testes: 39 verificações do mundo, oito rotas de navegação e 12 cenários de navegador.

## Histórico — ilha portuária e HUD náutica

O Porto das Correntes agora tem costa de ilha, praia, gramado, ruas, cais e oito colocações de quatro edifícios PixelLab. A HUD segue a disposição da gravação recebida em 18/10: perfil vertical no alto esquerdo, menu no alto direito, canal local no rodapé esquerdo, cinto central e diário de bordo com contratos reais no rodapé direito. O acabamento usa madeira, cordas e latão, seguindo a imagem de inventário enviada.

[Abrir preview ao vivo](http://127.0.0.1:8123/). Se o servidor não estiver ativo, execute `python tools/dev_server.py` nesta pasta. Ao salvar os arquivos, o preview recarrega automaticamente. Continua sendo possível abrir `index.html` sem servidor; nesse modo não há atualização automática. A origem do preview e a do arquivo no Opera são independentes; use exportação/importação do próprio jogo para transportar o save.

O inventário, as seis classes, os quatro NPCs e os 52 assets anteriores foram preservados. Custo observado de arte PixelLab: **30 gerações**, incluindo a tentativa adicional aprovada após um timeout. O jogo usa os PNGs locais e não gasta gerações ao iniciar ou jogar.

- [Entrega atual: arquivos, capturas, testes e limitações](docs/ENTREGA-ILHA-HUD.md)
- [Comparação com a gravação, timestamps e direção visual](docs/REFERENCIA-E-DIRECAO-ILHA.md)
- [Manifesto de arte](pixellab-pip-generations/ilha-porto-20261018/manifest.json)
- [Blueprint](pixellab-pip-generations/ilha-porto-20261018/ilha-porto.blueprint.json)

Verificações atuais: `node tests/world-system.test.cjs` (35 verificações), `node tests/island-world.test.cjs` (rotas e costa/cais/edifícios) e `python tests/island_browser.py` (12 cenários). A entrada `tests/sprint1_browser.py` encaminha para a aceitação atual. Foram verificadas as três resoluções solicitadas, mais duas menores; combate com pelo menos 20 derrotas, resgate de contrato e preservação do save após retorno/recarga passaram em navegador isolado com relógio virtual.

## Histórico — Sprint 1: mundo, câmera e navegação

O workspace V12 foi preservado e recebeu mapas com dimensões independentes da tela: porto 3000 × 2000 e caçadas 3200 × 2200. A câmera acompanha caminhadas e combate com suavização e limites. Cliques são convertidos para coordenadas do mundo; WASD/setas e navegação A* respeitam água, edifícios, bancas e obstáculos cadastrados. O terreno existente foi estendido com seus próprios tiles, mantendo o núcleo original e todos os 52 assets sem alteração. A expansão visual dos distritos ainda pertence à Sprint 2.

**Para acompanhar alterações ao vivo:** abra um terminal nesta pasta, execute `python tools/dev_server.py` e visite [http://127.0.0.1:8123/](http://127.0.0.1:8123/). HTML, JS e CSS recarregam automaticamente após cada gravação; o personagem é salvo e reaparece no porto. Não execute um segundo servidor se o preview já estiver aberto. Também é possível abrir `index.html` diretamente, como antes, sem Python; nesse caso não há recarga automática.

O preview HTTP e o `index.html` aberto como arquivo no Opera usam origens diferentes e não compartilham saves. Para trazer seu personagem ao preview, exporte pelo menu Ajuda no jogo original e importe no preview. A chave e o formato de save foram preservados; o servidor de preview não lê o save do Opera.

Testes atuais: `node --check game.js`, `node --check world-system.js`, `node tests/world-system.test.cjs` (41 verificações) e `python tests/sprint1_browser.py` (11 cenários). Os testes de navegador usam contexto isolado e relógio virtual; cobrem deslocamento gradual, câmera, água/edifícios, desvio de banca por clique, interação com Ryuma após mover a câmera, 21 derrotas consecutivas na última execução e preservação de recompensas após retorno/recarga. Capturas em 1920×1080, 1366×768 e 1280×720.

- [Auditoria inicial](docs/AUDITORIA-SPRINT-1.md)
- [Entrega, evidências, resultados e pendências da Sprint 1](docs/ENTREGA-SPRINT-1.md)

**A comparação com o vídeo permanece pendente:** o MP4 citado nas instruções não foi recebido. A implementação funcional não equivale à homologação visual contra essa referência. Novas animações direcionais completas, distritos, seleção de caçadas e reorganização ampla da HUD seguem nas próximas sprints. Não foram consumidos créditos PixelLab.

As seções abaixo descrevem o pacote V12 original, anterior a esta sprint.

## O que mudou

Esta entrega refatora a HUD sem substituir os sistemas de combate, progressão e inventário.

- Mapa ocupa o navegador inteiro, com canvas central livre.
- Topo esquerdo: logo, avatar da facção, nome/nível, vida, energia e dobrões.
- Topo direito: menu único com Inventário, Forja, Personagem, Mapa, Contratos e Ajuda.
- Barra de alvo central apenas quando existe alvo vivo.
- Rodapé central: habilidades [1] e [2], poção [Q] e Auto-caçada; botão de compra de poção foi removido do cinto, permanece disponível no mercador.
- Rodapé esquerdo: Canal [J], Expedição/voltar ao porto sem se sobrepor ao cinto.
- Rodapé direito: status da expedição minimizado, expansível com clique ou [O].
- Painéis adicionais fechados por padrão. Atalhos [P], [J], [O] os abrem.
- NPCs do porto distribuídos em pares simétricos, com sprites normalizados e rótulos consistentes.
- Inventário conserva as três colunas, com altura e rolagem corrigidas.

## Como iniciar

Extraia o ZIP e abra o `index.html` no Chrome, Edge ou Opera. Não há necessidade de instalar servidor para esta demonstração offline.

## Como atualizar preservando o personagem

1. Abra a sua V11, vá a **Ajuda → Exportar Save** e guarde o arquivo.
2. Extraia `MARE_PARTIDA_V12_ATUALIZACAO.zip`.
3. Copie `index.html`, `styles.css`, `game.js` e a pasta `assets/npcs` para dentro da pasta do seu jogo, ao lado do `index.html` atual.
4. Permita a substituição e mesclagem dos arquivos.
5. Abra pelo mesmo navegador e pela mesma localização do arquivo. Não limpe os dados do site.

**O identificador de salvamento permanece `mare-partida-save-v1`.** Como o navegador pode associar o `localStorage` ao caminho ou origem do arquivo, mantenha o arquivo `index.html` no local anterior ou use o recurso de importação do save se necessário.

## Testes nesta entrega

- `node --check game.js`: passou.
- Criação de personagem, entrada em caçada, dano, inventário e widget de expedição: executados em navegador automatizado sem erros JavaScript.
- Capturas e geometria verificadas em 1920×1080, 1366×768, 1080×720, 768×740, 390×844.
- Não ocorreram interseções entre os módulos principais visíveis nas resoluções testadas.
- Inspeção visual também feita com as imagens reais incorporadas ao teste.

## Limitações conhecidas

- O jogo continua offline e ainda não tem servidor MMORPG real.
- A maior parte dos cenários é procedural, e sua qualidade visual ainda está abaixo da referência enviada para o projeto.
- O teste automatizado foi feito em ambiente de navegador isolado com os recursos gráficos incorporados. Por isso, a persistência do save após reiniciar o navegador não foi validada ponta a ponta; o formato foi preservado no código.
- Em telas pequenas, os painéis de detalhes são janelas sobrepostas quando abertos. A disposição padrão é livre de sobreposições entre HUDs principais.
