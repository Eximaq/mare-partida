# Auditoria e refatoração da HUD — 04/11/2026

## A. Diagnóstico e base

Pedido: aproximar o acabamento da HUD da referência fornecida, com arte náutica, texto real, responsividade e os controles existentes. A referência é direção artística; seus pixels não foram copiados para assets.

A pasta original estava em `bcb0b10`, branch `feature/paper-doll-shared-locomotion`, com alterações locais de Paper Doll e arquivos de arte não versionados. Foi preservada. O trabalho ocorre em `feature/hud-reference-audit`, worktree separado, baseado na `main` atualizada `25cd9d05`. Isso conserva os menus HD, personagem96, cartaz, emblemas, backend e comandos online que não existiam na pasta antiga. A restrição expressa desta sessão autoriza push/PR e **não autoriza merge automático**.

Capturas reais anteriores: `docs/evidence-hud-reference/before/`, sete resoluções. Estado comparável: personagem de teste, nível 53, Haki desbloqueado, mesmo equipamento e porto. Os dados pertencem a contextos descartáveis do Chromium, não ao navegador do proprietário. Capturas e logs ficam fora do Git.

### Inventário de implementação

| Área | Origem e dependências | Diagnóstico anterior |
|---|---|---|
| Perfil | `index.html`, `character-hud.js`, final de `ui-hud.css`; `game.js` atualiza valores e retrato | Moldura HD existente, mas barras dependentes de posições percentuais, números de 10 px e fontes concorrentes. Cartaz e promoção já funcionam. |
| Navegação | `index.html`, `game.js`, menus Personagem/Modos/Central, `notification-system.js` | Ícones exibidos a 28 px dentro de alvos de 42 px; estilos por botão competem com a moldura externa; indicadores reais de pendências. |
| Localização e alvo | `.location-heading` movida por `MareUI.mountHUD`; `game.js` atualiza mapa, relógio e alvo | Local pequeno (aprox. 230×38), título e relógio comprimidos. Alvo precisa respeitar a altura do local. |
| Chat | `game.js` cria `#floatingChat` e move `.journal-block`; `ui-system.js` monta filtros; `toggleFloating` controla L/X | 294×184, mensagens pequenas e pouca área útil. Sistema e Anotações são locais, sem inventar canal online. |
| Hotbar | `.action-panel` em `index.html`; montagem por `ui-system.js`; preenchimentos em `game.js`, Haki e frutas | Slots 44 px e contadores pequenos; Haki/terceira habilidade/transformação alteram a largura. IDs de recarga não podem ser substituídos. |
| Contratos e ação | `#journeyHud` criado em `game.js`, `journeyToggle`, `journeyAction`, `huntRoute`, `enterHunt`, `returnLobby` | Widget 244 px, faixa de progresso fina e CTA 38 px; várias âncoras históricas. Altura depende do contrato e estado da caçada. |
| Telemetria | `hud-telemetry.js`, `hud-zoom-expedition.css`, `updateUI` em `game.js` | XP/h ancorado pela altura real do widget; precisa de posição própria no celular horizontal. |
| Janelas | `MareUI`, `ui-components.css`, `ui-screens.css` e folhas HD específicas | Inventário, forja, personagem, talentos, frutas, conquistas e Central já possuem arte HD. Preservar essas composições, foco, Escape e transações. |
| Responsividade | `ui-responsive.css`, `ui-art-direction.css`, `ui-navigator.css`, `gameplay-harmony.css` | Breakpoints e seletores repetidos. `#miniXPText` ganha de uma regra por classe; grupos `:is()` com IDs elevam a especificidade de todos os ramos. |
| Fontes e assets | Alegreya Sans local/OFL; Georgia do sistema; fonte Alabasta Pirate e manifests de arte existentes | Não requer download de fontes ou geração em runtime. Pixel art do mundo não deve herdar suavização da UI. |

Não há movimentação por arraste das janelas principais; elas usam posicionamento fixo, abertura/fechamento e rolagem. Os modais usam `MareUI` para foco, backdrop, Escape e retorno ao acionador. `ResizeObserver` publica medidas reais em propriedades CSS, inclusive `--profile-bottom`, `--rpg-action-height` e `--journey-reserved-bottom`.

O problema não era ausência de arte: a biblioteca já continha moldura dourada com corda em resolução suficiente. Ela estava sendo usada nas janelas, enquanto a HUD herdava materiais estreitos de botões e fontes menores de versões anteriores.

## B. Auditoria por componente

| Componente | Problema observado / severidade | Solução implementada | Imagem ou CSS | Prioridade |
|---|---|---|---|---|
| Perfil | Números pequenos, composição percentual rígida / alta | Grid interno, valores 12–13 px, HP/EN/XP 24 px, identidade/promoção/cartaz preservados | Moldura PNG em 9-slice + Grid e barras CSS | Alta |
| Navegação | Alvos 42 px, ícones pequenos / alta | Alvos 44–48 px, ícones 32–36 px, faixa única, estados e tooltips | PNGs originais + flex/scroll e foco CSS | Alta |
| Mapa | Título espremido / média | Bússola existente a 40 px, título com hierarquia, relógio separado; reposição em tablet | PNG + flex/quebra | Média |
| Chat | Área útil pequena, fonte diminuta / alta | 344×248 no desktop, corpo 14 px, cabeçalho claro, mensagens com quebra e input fixo | Moldura/material + flex e scroll | Alta |
| Hotbar | Pouco destaque, estados adicionais disputam espaço / alta | Slots 56/48/44 px, gap 8/4, recarga e quantidade independentes, quebra por espaço real | Ícones existentes + moldura + layout CSS | Alta |
| Missão | Leitura pequena e altura variável / alta | Coluna 320/300/272 px, título legível, progresso 10 px, conteúdo natural e rolagem limitada no compacto | Moldura + barra dinâmica CSS | Alta |
| Exploração | Ação principal de 38 px / alta | 56 px desktop, 44 px horizontal curto; mesma coluna da missão | Moldura PNG + texto real | Alta |
| XP/h | Sobreposição com retorno em 844×390 / alta | Coluna intermediária acima das ações; métricas continuam reais | Moldura e posicionamento CSS | Alta |
| Modais HD | Risco de regressão ao trocar tema global / alta | Composições preservadas e verificadas por navegação real | Assets e componentes existentes | Alta |

### Medidas e referência

Referência: imagem anexada **1672×941**. Valores abaixo são **estimativas visuais** dos limites exteriores, incluindo decoração, não medidas de CSS nem reprodução literal. Baseline: **medidas DOM** do jogo real em **1600×900**. A contagem de slots varia com habilidades desbloqueadas; não são inventadas habilidades para imitar a imagem.

| Elemento | Referência (estimativa) | Antes, DOM 1600×900 | Decisão |
|---|---:|---:|---|
| Perfil | 360×260 | 300×243 | Largura 320 e texto maior, mantendo cartaz existente |
| Navegação | 410×60 | 364×52 | 408×68 no desktop amplo |
| Localização | 530×90 com bússola externa | 230×38 | Altura 64, largura pelo conteúdo; alvo separado abaixo |
| Chat | 390×260 | 294×184 | 344×248, redução por breakpoint |
| Hotbar | 530×100, ornamentos incluídos | 341×58, Haki disponível | Slots 56 px e padding 14/18, largura por conteúdo |
| Missão | 370×185 | 244×144 | 320 px, altura natural |
| Explorar | 370×64 | 244×38 | 320×56 |
| Margem externa | 12–20 | 18 | 16 desktop, 12 tablet, 8 celular + safe areas |
| Barras HP/EN | 22–26 | 22 (fontes 10) | 24 desktop, 22–24 compacto, fontes mínimas 12 |
| Slots / gap | 64 / 12 | 44 / 5 | 56 / 8 amplo; 48 / 8 notebook; 44 / 4 celular |
| Cabeçalho de painel | 40–48 | 30–32 | Pelo menos 44 para controles principais |

Medição final no mesmo viewport **1600×900**, em CSS px: perfil **320×262** em (16,16); navegação **408×68** em (1176,16); localização **323,61×64**; chat **344×248** em (16,636); hotbar com Haki **485×84**; missão **320×204,98**; exploração **320×56**. A largura da localização e a altura da missão continuam dependentes do texto real. Os JSONs junto às capturas registram as medidas por estado/resolução.

## C. Design System

- Superfície: marinho `#071d29` com a textura de madeira/metal aprovada da Forja sob veladura azul. Dourado `#d6ad61`, texto marfim `#fff0d0`, secundário `#c8c3ad`. Vermelho HP, violeta EN, âmbar XP; raridades e facções mantêm suas cores.
- Títulos: Georgia para leitura de RPG; corpo/números: Alegreya Sans local. As telas HD conservam suas fontes próprias. Alabasta Pirate permanece no nome do cartaz. Números tabulares e rótulos reais.
- Espaços: 4/8/12/16/24/32 px; ajustes de 14/18 px reservam o interior das molduras. Alinhamento da barra e contadores separado das bordas ornamentais.
- Moldura: PNG 386×386 com cantos de 104 px de origem, renderizados a 24 CSS px nos painéis principais. Centro não é esticado; fundo repetido a 512×512. Molduras compactas 14–20 px conforme a área útil.
- Estados: hover com realce contido, pressionado e selecionado via estado real, foco 2 px, disabled preservado. Nenhuma animação decorativa nova. Redução de movimento respeitada.
- UI usa interpolação normal para arte HD; sprites e ícones pixelados conservam `image-rendering:pixelated`. O canvas do mundo não foi alterado.
- Desktop usa três zonas superiores/inferiores. Tablet desloca localização abaixo do menu. Celular usa menu acima da hotbar e informações em duas colunas; chat aberto ocupa a área de leitura e recolhe visualmente os widgets concorrentes. Abaixo de 375 px, navegação tem rolagem horizontal acessível, sem encolher os botões.

## D. Plano de assets e custo

| Recurso reutilizado | Dimensão nativa / bytes | Uso e tratamento |
|---|---:|---|
| `assets/ui/inventory-hd/frame-v2.png` | 386×386 / 44.434 | Molduras de HUD por 9-slice; não esticar a imagem inteira |
| `assets/ui/forge-hd/workshop-surface.png` | 512×512 / 100.301 | Material de fundo, tamanho nativo e veladura para contraste |
| `assets/ui/honors-hd/button-dark.png` | 480×96 / 5.175 | Controles pequenos redimensionáveis |
| `assets/ui/honors-hd/button-gold.png` | 480×96 / 2.634 | Estado de interação/seleção |
| `icones_menu_pirata/png/48/mapa.png` | 48×48 / 3.890 | Bússola a 24/40 CSS px, sem ampliar |
| Ícones atuais de menu, habilidades, Haki, frutas e poção | Conforme manifests existentes | Nenhuma substituição ou edição dos arquivos |
| Emblemas, placas de hierarquia e cartaz | Manifests de personagem e honrarias | Dados canônicos e retrato atual preservados |

**Novos assets necessários: nenhum para esta implementação. Custo de geração: zero chamadas.** Proveniência e licenças permanecem nos manifests originais. Não há duplicação de arquivos binários. Um medalhão de retrato circular e âncora pendente como na referência exigiriam uma nova decisão de composição/arte; não se simulou um retrato fictício nem se removeu o cartaz aprovado.

## E. Implementação

`gameplay-harmony.css` passa de camada apenas de materiais a proprietária da composição de gameplay. Substitui as regras anteriores no próprio arquivo, sem adicionar mais uma folha. Não adiciona `!important`, framework, dependência de produção, handler, endpoint, campo de save ou modificação de combate. Os CSS históricos continuam necessários a telas legadas e não foram apagados globalmente.

A reserva antiga de altura de `#journeyHud` foi removida de `ui-responsive.css`: seu seletor com `:has(.parchment-profile)` prevalecia sobre a nova regra e colocava a rota atrás da navegação em 320×568. O cálculo agora considera a altura real da hotbar, inclusive com Haki. O teste de cache também foi atualizado para incluir `dungeon-boss-art-data.js`, já usado pelo empacotador antes desta tarefa, escolher Dawn desde o porto e aceitar os diagnósticos adicionais de navegação sem afrouxar a verificação de mapa/dimensões.

`tests/hud_reference_browser.py` exercita bounds, colisões, fontes, toque mínimo, recursos, chat, cartaz, seis menus, viagem, Haki e preservação dos dados. `tests/character_hud_browser.cjs` continua cobrindo títulos, barras reais, extremos, retratos, teclado/toque e reload; o fechamento do chat usa seu X visível. A verificação de tamanho legível dos títulos foi acrescentada.

O antigo teste de harmonização proibia qualquer mudança de largura/posição: era o contrato da tarefa anterior, apenas de materiais. Esse contrato é explicitamente substituído pelo pedido atual de refatoração. `creation-selection.test.cjs` mantém todas as verificações funcionais da criação. O workflow de criação passa a executar a nova matriz real em vez de exigir coordenadas idênticas à base do PR. O teste histórico de comparação permanece no repositório para reproduzir a entrega anterior.

## F. Comparação visual

Antes e depois são screenshots do navegador, com cenário, personagens e valores reais de fixture. As imagens não foram retocadas. A pasta local `docs/evidence-hud-reference/` contém baseline, iterações e resultado final; não será enviada em massa ao Git. `index.html` nessa pasta apresenta a galeria comparativa das sete resoluções, com links para imagens em tamanho original.

A comparação demonstra maior legibilidade, molduras compartilhadas, superfície marinha e maior presença da hotbar e da ação de exploração. Não é uma cópia do layout da imagem: preserva título de hierarquia, facção, cartaz e conteúdo real dos contratos. A referência possui ornamentos escultóricos mais complexos; não se afirma equivalência artística integral só por passar testes geométricos.

## G. Validação, compatibilidade e pendências

Validação local concluída em 04/11/2026:

| Execução | Resultado observado |
|---|---|
| `npm test` | **223/223 testes de fundação e 152/152 arquivos legados** aprovados. O runner exclui o harness separado `supa-browser.test.cjs`. |
| `python tools/build_pages.py` | Pacote estático atual gerado com caminhos relativos. |
| `python tests/production_pages_test.py` | **6 testes** aprovados, dependências e recursos publicados preservados. |
| `python tests/hud_reference_browser.py --serve-dist` | Sete resoluções, lobby/chat/caçada, seis menus por resolução, Haki H/J, retorno/reload, texto e valores, bounds e colisões: aprovado; erros JS vazios. Inclui Mera e Uma em sete tamanhos. |
| `python tests/hud_reference_browser.py --serve-dist --slots-only --phase optional` | Mera, Uma e Fênix: **21 estados**, incluindo três habilidades + transformação + Haki, aprovados. A matriz combinada cobre **42 estados distintos** da HUD. |
| `python tests/run_honors_hd_browser.py tests/character_hud_browser.cjs --offline` | Oito resoluções até **320×568**, 32 títulos, barras 0/25/100%, ouro extremo, aparências, cartaz, rota, teclado, toque, movimento reduzido e reload: aprovado. |
| `python tests/run_honors_hd_browser.py tests/gameplay_harmony_controls_browser.cjs --dist --offline` | Menus exclusivos, notas locais, proteção ao digitar, L, XP/h, atividade/pausa e minimizar: aprovado. |
| Harness acima com `original-inventory-online-browser.cjs`, `online-world-browser.cjs` e `online-battle-browser.cjs` | Três regressões aprovadas no pacote: inventário/forja, movimento/viagem e combate/rota/mobile. Provider simulado; não representa teste PostgreSQL de ponta a ponta. |
| `python tests/pages_cache_browser.py` | **156 recursos versionados**, script obsoleto não requisitado, viagem Dawn e save preservado, sem erros JS. |
| Sintaxe do teste CJS e `git diff --check` | Aprovados. |

Resoluções da matriz principal: **1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, 844×390 e 390×844**. Foram inspecionadas capturas renderizadas de desktop, tablet, celular vertical/horizontal, chat e hotbar completa. `after/` contém o jogo empacotado; `optional/` contém as variações de frutas; `controls/` contém os extremos de personagem. Galeria local: `docs/evidence-hud-reference/index.html`.

O workflow de criação executa a matriz nova e os contratos online existentes; o workflow de personagem passa a reagir também a `gameplay-harmony.css`. README e changelog apontam para este relatório. O build e o push não equivalem a merge ou deploy; a entrega permanece em PR para revisão.

Saves, catálogos, moedas, habilidades, servidor e comandos autoritativos não mudam. Rollback: reverter o commit visual e seus testes; não remover dados locais. Validação automatizada usa Chromium em contextos isolados; Safari, Firefox e aparelhos físicos não estão homologados. Não há alegação de melhoria de FPS sem medição.
