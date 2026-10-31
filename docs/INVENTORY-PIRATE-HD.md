# Inventário pirata HD — 31/10/2026

Branch feature/inventory-pirate-hd, base 93368fd. HTML/CSS e JavaScript nativos; mundo Canvas 2D. Não há framework de interface.

## Auditoria inicial

Inventário em game.js (renderInventory/inventoryDetail), primitivas DOM em ui-system.js e tokens/componentes/layout em ui-*.css. 12 slots reais: cabeça, colar, torso, perneiras, pés, arma, capa, mãos, anel, cinto, acessório e Akuma no Mi. Abas Equipamento/Visual/Estilo, visibilidade de capacete e itens, busca, raridade, ordem, sete categorias, paginação responsiva e capacidade persistida de 120. Equipar melhores, equipar/retirar, bloquear/desbloquear, venda, poção, caixas, pérolas e livro têm regras existentes. Comparação de atributos já é automática; Favoritar não existe. Mercado/cofre aparecem desativados. Preservar os controles reais.

Captura antes: tmp/inventory-qa/before.png (fora do Git), 1672×941. HUD aprovada e inventário confirmados na mesma sessão isolada. A apresentação atual deixa a Akuma no Mi no fim da coluna direita; detalhes das frutas repetem nomes de skills. A prévia depende de carregamento assíncrono e precisa de redesenho após readiness. Assets HD da HUD (madeira, pergaminho, moldura), emblemas e slots de raridade são reutilizáveis.

## Plano de entrega

1. Auditoria e captura atual.
2. Amostra de componentes PixelLab e base compartilhada opt-in, sem recolorir outras janelas.
3. Três painéis funcionais, Akuma separada, atributos abaixo da prévia, detalhes estruturados e seleção incremental.
4. Ensaios funcionais/visuais desktop e móvel, HUD, build e publicação em PR.

Nenhum save de usuário ou evidência em massa será incluído. Trabalho local não commitado na pasta original permanece preservado; a sprint usa worktree limpo da main publicada.

## Base artística validada

PixelLab AI Pro gerou uma folha 600×448 com quatro peças isoladas (job a9fd678d-ce76-4aba-bb5f-a7bbe726299c, custo 25 gerações): moldura, slot, botão e aba. Fonte preservado em assets/ui/inventory-hd/source-kit.png; recortes exatos com alfa, sem interpolação ou repintura, verificados pixel a pixel. Dimensões, regiões e SHA256 no manifesto da pasta. Madeira/pergaminho da HUD e quatro emblemas oficiais reaproveitados. Não foram gerados itens nem personagens.

Novos parâmetros --rpg-hd-* estendem ui-tokens.css; componentes opt-in .ui-hd (hd-frame, hd-control, hd-panel-heading, linhas de skill) ficam em ui-components.css e reaproveitam MareUI.upgrade. Nenhum token existente foi redefinido. O inventário aplica pirate-hd no modal; ui-navigator.css conserva o visual anterior somente fora dessa composição, sem modificar a HUD.

## Integração e validação

Três painéis preservam todos os slots e controles; Akuma ganhou uma faixa própria. Atributos ficam abaixo do personagem. Busca, raridade, categorias, ordenação, 120 espaços persistidos e paginação usam as regras anteriores. Detalhes têm conteúdo rolável, ações contextuais e skills ativas com ícones separadas de passivas; descrições que repetiam apenas o nome/rank e o nome de cada skill deixam de ser duplicadas. Bloqueio/venda/caixas/pérolas/livro mantêm os mesmos handlers.

Seleção de item atualiza só os detalhes e estados de seleção, conservando o DOM e a rolagem da mochila. A prévia native96 redesenha após readiness e descarta callbacks de canvases desmontados. Auras de combate são omitidas somente nessa prévia para não encobrir o equipamento; transformações seguem o renderizador já existente. Não há timers ou geração durante gameplay.

- Regressões específicas Node: oito testes/entradas aprovadas (inventário, slots, UI, capacete e HUD).
- Suíte Node ampla: 240/242 passaram na primeira execução. Supa-browser falhou por módulo Playwright fora do caminho e passou em execução dedicada com ambiente/browser/servidor corretos. sprite-south-hurt continua falhando por clip nulo; reproduzido na worktree anterior sem alterações desta sprint. Nenhum sprite ou regra de hurt foi modificado.
- tests/inventory-hd-browser.cjs passou em fonte e dist: slots, abas, busca/filtros, seleção incremental, equipar/retirar, capacete sem alterar atributos, vazio/120 itens, paginação, masculino/feminino, reload, toque/atalhos e aberturas repetidas. Nove resoluções: 1920×1080, 1672×941, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568 e 844×390, sem overflow horizontal. HUD conserva conteúdo, materiais e geometria nas quatro facções nos níveis 49/50/51.
- character_hud_browser.cjs: oito viewports, barras/fontes/cartaz/teclado/toque/reload, sem erros ou assets ausentes.
- Quatro recortes PNG comparados RGBA pixel a pixel ao fonte; alfa real (0–255). Build Pages e diff check aprovados. Evidências locais em tmp/inventory-qa (fora do Git); final-1672.png, final-1366.png, final-mobile.png e inventory-female.png.

## Compatibilidade e próximos usos

Sem migração de save, índices de itens, economia ou atributos. Assets antigos preservados. Rollback por commits desta branch; sem apagar dados. A aprovação artística final depende da revisão do proprietário das capturas reais. Testado em Chrome no Windows; não equivale a teste físico em todos os aparelhos. A comparação da HUD usa conteúdo, geometria e materiais; PNGs brutos podem variar em brilho/antialiasing e não são usados como igualdade binária.

Janelas existentes candidatas à próxima sprint: Forja (slots, painel, botões, atributos); mercador e contratos (cabeçalho, conteúdo em pergaminho e ações); Personagem/Hierarquia/Haki (painéis e tabs); Modos/Mapa/Prisão (controle de seleção e detalhes). Aplicar uma janela por vez. Criação de personagem também existe e mantém tema próprio nesta sprint. Nenhuma dessas telas foi reformulada aqui.

Arquivos: game.js; ui-tokens.css; ui-components.css; ui-system.js; ui-screens.css; ui-navigator.css; assets/ui/inventory-hd/; tests/inventory-hd-browser.cjs; README.md; docs/UI-DESIGN-SYSTEM.md; este relatório. Composição da HUD principal e ui-hud.css permanecem inalterados.
