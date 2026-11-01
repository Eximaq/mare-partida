# Personagem e Aparência HD — 31/10/2026

A sprint adapta a tela de Personagem e reutiliza uma única apresentação da aparência na criação (Etapa 03) e na edição posterior. O padrão continua sendo madeira e metal escuro da Forja, molduras douradas, botões HD, títulos Alegreya SC e nome em Alabasta Pirate.

## Integração

- \`character-studio.js\`: apresentação, textos de ajuda, grupos de resultados e resolução dos ícones das sete classes. Não calcula combate, migra dados nem salva.
- \`game.js\`: conserva o orçamento e o rascunho de atributos, os cálculos de \`getDerived\`, as transações e os handlers existentes. Personagem apresenta valores reais; prévias mostram a seta somente quando há diferença.
- \`character-studio.css\`: tema restrito a status/aparência e criação. Outras abas do personagem continuam com seus componentes.
- \`character-appearance.js\`: continua sendo a única fonte de opções, normalização e persistência. Os novos ícones dos controles são apenas apresentação.
- \`game-tooltips.js\`: ajuda escapada, hover/foco/clique e fechamento por Escape antes de fechar a janela.
- \`index.html\`, \`ui-preview.html\`, \`player-hub.js\`: marca visível Kaizoku Idle; os IDs legados de saves e código permanecem compatíveis.
- \`tools/build_pages.py\`: inclui e versiona o novo JS/CSS. A assinatura do release nativo foi regenerada porque a apresentação dos campos está em um módulo do release.

O título da aparência usa a facção atual: Pirata, Marinha, Revolucionário ou Governo Mundial, com o emblema oficial correspondente. A criação e a edição chamam a mesma função \`MareCharacterStudio.appearance\`, usam os mesmos controles e o compositor atual de 96px. O fluxo de confirmação e o botão de retorno permanecem específicos de cada contexto.

A identidade de Personagem mostra o equipamento atual sem efeitos de aura sobrepostos, para preservar a leitura do corpo e da arma. Não cria um segundo renderizador. Habilidades e custos vêm do catálogo ativo da classe, incluindo descontos existentes. Os ícones também são usados nos slots de combate quando não há uma habilidade de fruta naquele slot; frutas mantêm sua arte e recargas.

## Opções preservadas

- Dois gêneros; 14 escolhas de cabelo, incluindo original e sem cabelo.
- Dez cores de cabelo; cinco modelos de olhos e seis cores.
- Pele natural (única variante artística suportada), com oito tonalidades.
- Norte, Sul, Leste e Oeste.
- Rascunho independente até confirmar; cancelamento, recarga e falha de persistência não gastam pontos nem sobrescrevem a aparência salva.
- Capacetes continuam ocultando/restaurando o cabelo pela política atual.

Os resultados de combate são agrupados em Sobrevivência, Ofensiva, Precisão e Crítico e Regeneração. Não foi inventado um atributo de resistência elemental: o jogo atual não o expõe separadamente.

## Arte e origem

Fontes, dimensões, prompts, cortes exatos, hashes e IDs de geração: \`assets/ui/character-studio/manifest.json\`.

- Dois ícones do Espadachim recortados diretamente da referência aprovada, sem ampliação do arquivo (71×70 e 71×71).
- Cinco ícones de atributos e sete ícones de controles recortados das mesmas referências.
- PixelLab AI Pro: atlas nativo 512×384 com 12 ícones em células 128×128 para as outras seis classes; exports por célula preservam os pixels originais.
- PixelLab AI Pro: porto vazio ao entardecer, nativo 600×448, atrás do personagem real.
- Custo confirmado dos dois jobs: **50 gerações** (25 + 25). As molduras, botões, fonte, emblemas e madeira/metal foram reutilizados.

As referências completas e capturas de QA ficam fora do versionamento. Nenhum novo sprite corporal, penteado ou rosto foi gerado nesta sprint.

## Validação

Executados nesta atualização:

- Node: \`character-system.test.cjs\`, \`character-appearance.test.cjs\`, \`paper-doll-96-appearance.test.cjs\`, \`headgear-visibility.test.cjs\`, \`game-tooltips.test.cjs\`, \`character-quick-menu.test.cjs\`, \`character-hud-hierarchy.test.cjs\`, \`ui-system.test.cjs\`, \`ui-foundation-contract.test.cjs\`, \`ui-mobile-preview.test.cjs\`.
- Chromium: \`character_appearance_browser.cjs\` — criação, navegação de rascunho, confirmação, direções, persistência, rollback e seis viewports.
- Chromium: \`character_studio_browser.cjs\` — quatro facções, sete classes e ícones nos slots, orçamento/confirmar/limpar/cancelar atributos, ajuda por teclado/clique, aparência compartilhada e sete viewports, também no pacote \`dist\`.
- Chromium: \`headgear_visibility_browser.cjs --game-only\` — dois corpos, bandana/capacete, alternância rápida, recarga, falha de storage, slot vazio e isolamento DEV. A primeira execução expirou na espera após reload; a execução diagnóstica e a reexecução completa passaram.
- Chromium: \`character_appearance_materials_browser.cjs\` — **480 poses, zero ocorrências** na auditoria de testa/cabelo, capacetes, restauração e pixels nas bordas.
- \`python tools/player96_release.py --write\`, \`python tools/build_pages.py\`, verificações de sintaxe e \`git diff --check\`.

Viewports do aceite: 1920×1080, 1448×1086, 1366×768, 1280×720, 393×852, 320×568 e 852×393. Em janelas baixas as colunas têm rolagem; em celular o layout fica vertical. Não há rolagem horizontal nos painéis auditados.

## Limites e aprovação

Não altera progressão, atributos base, balanceamento, equipamento ou saves. Não adiciona variantes de pele inexistentes, nem novas mecânicas sugeridas nas referências. O acabamento aguarda avaliação visual do proprietário; não fazer merge automático.

O ajuste local anterior do retrato da Forja permanece separado em \`fix/forge-portrait-fill\`, sem publicação, conforme solicitado.
