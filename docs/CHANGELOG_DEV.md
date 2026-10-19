# Histórico de desenvolvimento

## 19/10/2026 — Redução adicional para 16×16

- Feedback: a proposta 32×32 ainda estava grande. Mundo agora 1024×1024, quatro setores, três casas e 16 props, mantendo o tamanho de sprites/texturas.
- Três escadas, uma ponte real, acessos curtos e retorno no cais fora da faixa do chat. População comum reduzida a cinco, reposição abaixo de quatro.
- Câmera centraliza mundos menores que a viewport, preserva conversão de cliques e mantém clamp nos eixos maiores. Padrão futuro do AGENT.md ajustado a 16×16.
- Proposta substitui a anterior no mesmo PR #4; sem novas gerações, migração ou alteração de economia.
- Passaram todos os testes Node, oito grupos de navegador específicos (quatro resoluções), doze regressões de ilha/HUD e pacote Pages mobile. Medição local: mediana ~16,7ms/p95 ~16,8ms, quatro chunks. Criação no teste de ilha aguarda 300ms no relógio simulado para estabilizar a transição inicial.


## 19/10/2026 — Ruínas compactas e padrão de mapas

- Redução de 64×64 para 32×32 tiles de 64px: mundo 2048×2048, metade da largura/altura, um quarto da área anterior.
- Composição refeita: três níveis, dois paredões com colisão, cinco escadas, oito casas com acessos à rua e uma única ponte diagonal sobre lava, necessária para chegar à fortaleza.
- Cais/estaleiro com carga e mastros, ruínas altas com colunas, fachadas orientadas às ruas e naufrágios na água; 37 elementos de cenário. Sem novas gerações pagas.
- Renderizador e mapa de navegação usam dimensões do modelo, sem limites 64/4096 fixos. Spawn e proximidade do chefe ajustados à escala compacta; economia, combate, saves e artes preservados.
- AGENT.md seção 5.3 fixa 32×32 tiles/64px para mapas futuros e critérios de pontes, elevações e fachadas. Mapas legados exigem tarefa explícita para redimensionar.
- Oito grupos Node específicos e regressões existentes; aceitação desktop/mobile, ponte/escadas, vinte derrotas, retorno/persistência e pacote Pages versionado. Evidências locais fora do Git.
- Checkpoint: branch feature/ruinas-compactas-32, base 86b85c1; rollback por reversão do commit, sem migração de save.


## 19/10/2026 — Atualização de cache no GitHub Pages

- O build agora adiciona hash de conteúdo aos endereços dos 13 scripts e duas folhas de estilo. Um HTML novo não reutiliza o endereço dos scripts de uma publicação antiga.
- Não limpa localStorage, não migra saves e não altera o jogo ou o mapa.
- `tests/pages_cache_browser.py`: pacote estático validado em Chromium mobile 393×852, script antigo disponível no endereço sem versão, mapa embers 4096×4096, quatro monstros carregados, save preservado após recarga e nenhuma exceção.
- Build Pages e seis grupos Node da área passaram. Captura local em docs/evidence-pages-cache/mobile-new-map.png.
- Uma página que já estava aberta precisa ser reaberta; o link com query nova força a busca do documento atualizado no mesmo domínio, preservando o save.


## 19/10/2026 — Ruínas de Brasas 64×64

- Reconstrução em mundo 4096×4096, sete setores, rotas navegáveis, ruínas e quatro monstros com frames 48×48.
- Terrenos Pixen nativos 64px, atlas Pro, fogueiras em quatro quadros e fluxo de água/lava; fontes preservadas.
- Spawn alcançável por distrito, chegada protegida, chefe na fortaleza e retorno pelo cais. Corrigida continuação do tick de caça após retorno ao lobby.
- Cache de terreno limitado a 20 chunks; painel Mapa traça trajetos reais. Save `beach`, economia e mapa da Fenda preservados.
- Todos os testes Node, sete grupos de navegador específicos e doze de regressão da ilha/HUD passaram. Três resoluções, vinte derrotas, retorno e recarga. Build Pages validado.
- Referências, custo informado de 39 gerações e limitações em RUINAS-BRASAS.md e ART_BIBLE.md. Caminhada/ataque dos monstros adiados por orçamento; oito poses estáticas por monstro.
- Branch/checkpoint: feature/ruinas-brasas-64x64; rollback por reversão do commit, sem migração de save.


## 18/10/2026 — Slots de fusão e inventário de pérolas

- Cinco slots reais em ambas as modalidades, com clique, drag, remoção individual e limpeza; seleção sem consumo.
- Pérolas agrupadas somente pelo estoque atual, com filtros, quantidade livre e unidades bloqueadas identificadas.
- Fusão de pérolas valida exatamente cinco IDs selecionados; incompatibilidade, repetição e itens ausentes são recusados antes do pagamento.
- Estoque aberto atualiza após loot/consumo; custos e probabilidades preservados.
- Confirmações listam materiais e consequências. Testes/capturas em evidence-fusion-slots; regras em FUSAO-SLOTS.md.

## 18/10/2026 — Refatoração da Forja

- Seleção visual de equipamentos e pérolas, busca/filtros/paginação/lista e painéis com rolagem independente.
- Refino até +20, garantia até +5, custos por nível e histórico, mantendo fórmula de status e sem destruição/rebaixamento.
- Fusão de cinco equipamentos por raridade, nível mínimo, tipo escolhido e arma da classe; Supremo desabilitado.
- Reforja por linha ou total, contador de custo +30%, confirmação sem RNG antecipado.
- Confirmação para imbuimento, remoção, fusões e aprimoramento; revisão transacional e trava contra clique repetido.
- Migração v3 com backup original; ícones, mapas, câmera, personagens e combate preservados.
- Regras em FORJA-REFATORACAO.md; testes e capturas em evidence-forge-refactor.

## 18/10/2026 — Forja 2.0 e preservação do polimento em andamento

Implementados modelo transacional independente e quatro abas reais. Aprimoramento mantém preço/chance/+5 e usa área reservada de resultados.25 pérolas têm catálogo/ícones, instalação, remoção com custo e fusão. Seis raridades aplicam multiplicador na base, extras escaláveis sem repetição e sockets. Reforja troca apenas extras após confirmação. Extras e percentuais passam pelo cálculo central do personagem e são exibidos no inventário; equipamentos antigos têm migração determinística com backup do JSON original.

Mantidos os ajustes já implementados no pedido anterior: menu compacto/expandido com preferência, HUD com nome/nível separados, grade7×5, comparação/feedback de equipamento, resultado de atributos e notificações compactas. As seções removidas do menu Personagem continuam ausentes. Nenhuma nova alteração de mapa/câmera/sprite ou geração paga.

Arquivos: novos `forge-system.js`, `forge-ui.js`, `assets/ui/pearls/`, `tools/forge_economy.cjs`, `tests/forge-system.test.cjs`, `tests/forge_browser.py`, relatório/catálogo/evidências. Alterados `game.js`, `character-system.js`, `index.html`, `ui-nautical.css`, `tools/dev_server.py`, README e regressões. A sprint anterior em andamento também adicionou auxiliares de captura/feedback e `tools/simulate_initial_balance.cjs`; seu diagnóstico está em `BALANCEAMENTO-INICIAL.md`, sem aplicar a curva de inimigos candidata.

Testes:11 grupos Node da forja;25 combinações de pérolas,1.000 resultados de raridade,6 raridades e7 classes. Cinco grupos da forja no Chromium, operações reais nos três tamanhos, persistência e migração. Mais12 grupos de personagens,12 de ilha/HUD,7 de UI náutica e3 de feedback/menu, além das regressões Node existentes. Simulação econômica:2.000 jornadas até Nv.5; custo exato esperado4.800.000dobrões, média simulada4.884.105.

QA encontrou e corrigiu: resultado antigo fora da dobra, movido para região própria no início da operação; menu móvel sobre a HUD, separado verticalmente; teste de cancelamento que comparava relógio/regen, ajustado para conferir dados persistentes de progresso/recursos; alvo da forja atualizado ao equipar item pela mochila. Nenhuma fórmula de nascimento ou proposta de curva de monstros foi aplicada.

Checkpoint da Forja: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-forge2-20261018-202127`. Checkpoint anterior ao polimento: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-polish-20261018-183306`. Restauração deve respeitar edições posteriores; os backups de código não são cópias do LocalStorage. A cópia anterior à migração fica no próprio navegador, chave `-before-forge-v2`.

Limite econômico registrado: chances prescritas tornam Nv.5 um objetivo extremamente longo; não se inventou pity, Supremo ou comércio. O protótipo continua local, sem servidor.

## 18/10/2026 — Interface náutica, atributos e ícones

Base: pasta corrente V12 sem Git. Auditoria e checkpoint realizados antes das edições. Não foram importados arquivos de versões antigas.

Antes: nascimento 5×5, distribuição unitária, símbolos como itens/menu, inventário com imagem antiga e janelas com estilos divergentes. Depois: tabela de nascimento total50 por classe, transações de pontos por quantidade, menu com assets fornecidos, renderer atual na prévia, 35 ícones próprios e sistema visual comum nas janelas.

Arquivos alterados: `character-system.js`, `game.js`, `index.html`, `README.md`, `tools/dev_server.py`, `tests/character-system.test.cjs`. Arquivos adicionados: `ui-nautical.css`, `assets/ui/items/` (35 SVGs e manifesto), `tools/create_item_icons.py`, `tests/ui_nautical_browser.py`, `docs/UI-ATRIBUTOS-AUDITORIA.md`, `docs/UI-HUD-ATRIBUTOS.md`, esta entrada e evidências. O servidor observa também o CSS compartilhado para recarregar a prévia ao salvar.

Verificação executada:

- `node --check game.js` e `node tests/character-system.test.cjs`: sintaxe e 12 cenários de atributos/migração.
- `node tests/world-system.test.cjs`: 39 verificações; `node tests/island-world.test.cjs`: 8 rotas e serviços.
- `node tests/combat-animation.test.cjs`, `node tests/combat-sprites.test.cjs`, `node tests/bento_directions.test.cjs`: estados, impacto, direção, pivô e playback passaram.
- `C:/Python313/python.exe tests/ui_nautical_browser.py`: 7 grupos; criação das sete classes, todos os incrementos, cancelamento, insuficiência, confirmação, saves v1→v2, troca de classe, 35 artes, onze slots e todas as janelas nos três tamanhos pedidos.
- `tests/characters_browser.py` com `MARE_CHARACTER_EVIDENCE_DIR=evidence-ui-character-regression`: 12 grupos passaram; combate/progressão das sete classes, migração antiga, inventário/forja e cura reais.
- `tests/island_browser.py` com `MARE_EVIDENCE_DIR=evidence-ui-island-regression`: 12 grupos passaram; HUD sem sobreposição, NPC após mover câmera, mais de 20 derrotas, contrato, retorno/recarga e caminho ao cais. Também verificou 768×740 e 390×844.
- SHA256 de 132 arquivos protegidos contra o checkpoint: nenhuma diferença. Resultado em `evidence-ui-nautical/protected-files.json`.

Correções durante QA: a primeira versão usava `data-panel` no contêiner e capturava cliques destinados a fechar/equipar; substituído por `data-view`, validado pelas ações reais. Compactados painel de atributos e seleção de classes após inspeção das capturas. O teste de confirmação compara dados de progresso, sem exigir que o relógio de tempo jogado pare durante a captura. Testes finais concluídos sem erros JavaScript nos contextos isolados.

Capturas reais desta entrega em `evidence-ui-nautical/`, com galeria `index.html`; as evidências de regressão têm pastas próprias e não substituem o histórico artístico anterior.

Compatibilidade: investimentos permanecem separados da base e do orçamento. A migração é idempotente e preserva cópia anterior no navegador. Checkpoint de arquivos em `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-ui-attributes-20261018`; restauração deve respeitar trabalho posterior. Nenhum save do usuário foi acessado pelos testes.

Limites: sem paperdoll por peça de equipamento, sem mercado/cofre funcional; os botões existentes permanecem indisponíveis. Não foi feito balanceamento final do novo ritmo inicial. Próxima avaliação recomendada: playtest dos 50 pontos por classe e do tamanho dos textos, antes de expandir recursos.
