# Ilha portuária e HUD náutica — 18/10/2026

## Resultado

O Porto das Correntes agora fica numa ilha tropical de 3000 × 2000 unidades, com mar turquesa, costa curva, praia, gramado e ruas ligando a praça aos edifícios e ao cais. A HUD segue a distribuição observada na gravação recebida: perfil vertical à esquerda, menu à direita, canal local embaixo à esquerda, cinto central e jornada à direita. Madeira, latão, cordas e painéis escuros seguem a direção da imagem de inventário enviada pelo usuário.

O preview [http://127.0.0.1:8123/](http://127.0.0.1:8123/) permanece com recarga automática. Não foi criado outro jogo ou substituído o workspace. Checkpoint anterior: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-nautical-hud-20261018`.

## Referência e decisões

[Análise da gravação e plano de design](REFERENCIA-E-DIRECAO-ILHA.md). O vídeo de 25,27 segundos foi decodificado de ponta a ponta e inspecionado através de quadros de toda a duração em intervalos de um segundo. O relatório explicita o limite dessa amostragem e separa observações de propostas. Não foram presumidas cenas de combate, caçadas ou inventário ausentes do trecho.

Evidências da referência: [00:00](reference-20261018/frame-01.png), [00:22](reference-20261018/frame-23.png) e [contato 00:00–00:11](reference-20261018/contact-1.jpg).

## Implementação

- Dois terrenos Wang PixelLab de 32 × 32: oceano→areia e areia→grama, com a base de areia conectada. Cada tile usa `corners` e a região `bounding_box` reais da metadata, sem inferir posição pelo nome `wang_N`.
- Atlas Pro 512 × 512 com quatro edifícios em células nativas de 256 × 256: taverna, mercado, forja e capitania. Os originais não foram repintados, redimensionados ou recortados em novos assets; o renderizador lê as regiões do atlas diretamente. A vista produzida é de três quartos de RPG, não ortográfica estritamente vertical.
- Oito colocações desses quatro edifícios em torno de ruas e serviços; cada base tem colisão. Há repetição de construções, identificada como tal, sem afirmar que são oito artes únicas.
- Navegação acompanha a costa e impede entrada em tiles parcialmente aquáticos. O cais é uma região explicitamente navegável, ligada à terra. As quatro aproximações aos NPCs originais foram verificadas.
- Herói, NPCs, edifícios e objetos usam a mesma câmera e ordem de profundidade; prédios podem ocultar quem passa atrás. O zoom passou a 1 pixel lógico por pixel CSS, deixando mais cidade visível e mantendo escala uniforme.
- Perfil com XP, poder, HP, energia, nível, classe e moeda reais. Diário de bordo mostra contratos reais, permite minimizar e resgatar recompensa quando concluídos. Nenhum contador ou chat online simulado foi introduzido.
- Canal local abre em desktop; telas menores começam recolhidas. Caçadas ganha comando no menu superior, usando as regiões já disponíveis. Inventário conserva suas três colunas, dados e funções.
- O bloco efetivo de CSS da HUD foi substituído no lugar, mantendo as regras de inventário e evitando acrescentar outra geração de overrides ao fim do arquivo. A consolidação global das regras históricas da V12 não está sendo declarada concluída.

## Capturas da implementação atual

### Praça e HUD — 1920 × 1080

![Praça e HUD náutica](evidence-island/lobby-1920x1080.png)

### Costa e cais alcançados por caminhada

![Costa e cais](evidence-island/harbor-coast.png)

### 1366 × 768 e 1280 × 720

![1366 × 768](evidence-island/lobby-1366x768.png)

![1280 × 720](evidence-island/lobby-1280x720.png)

### Inventário existente preservado

![Inventário](evidence-island/inventory.png)

### Caçada — teste de regressão

![Caçada](evidence-island/hunt.png)

## Testes

Comandos:

```text
node --check game.js
node --check world-system.js
node --check island-world.js
node --check island-assets.js
node tests/world-system.test.cjs
node tests/island-world.test.cjs
python tests/island_browser.py
```

- 35 verificações no módulo geral de navegação/câmera, ajustadas à nova topologia da ilha.
- Oito trajetos completos na ilha, incluindo os quatro serviços dos NPCs e o cais; teste de mar bloqueado, limite do cais e oito bases de edifícios.
- 12 cenários de aceitação no navegador: dados reais da HUD; geometria em três resoluções; caminhada/câmera; Ryuma; recolher/expandir HUD; inventário; pelo menos 20 derrotas; recompensa pelo diário; save; telas menores; caminhada pela costa/cais; ausência de erros JavaScript.
- Capturas e geometria em 1920×1080, 1366×768, 1280×720, mais 768×740 e 390×844. Nenhuma interseção entre os módulos visíveis testados. Capturas desktop/mobile são de lobby; não se afirma que todos os estados de janelas foram cobertos.
- Navegador isolado com relógio virtual do Playwright. Mortes e recompensas vêm do loop real do jogo, não de contadores injetados. Isso não comprova desempenho em uma sessão prolongada do Opera.
- Comparação SHA-256: todos os 52 assets anteriores permanecem sem alterações. Os saves do navegador pessoal não foram lidos ou substituídos.

[Resultados de aceitação em JSON](evidence-island/results.json).

## PixelLab: arquivos, rotas e custo

Arte gerada e verificada: [oceano/areia](../pixellab-pip-generations/ilha-porto-20261018/ocean-sand.png), [areia/grama](../pixellab-pip-generations/ilha-porto-20261018/sand-grass.png), [edifícios](../pixellab-pip-generations/ilha-porto-20261018/port-buildings.png).

Rotas: MCP `create_topdown_tileset` em modo `standard`, 32×32, `high top-down`, `transition_size: 0.0`; MCP `create_image_pro`, 512×512, `no_background: true`. Sementes omitidas. Não foram usadas imagens de referência em chamadas pagas; a imagem de inventário orientou o código da HUD, e as descrições de arte foram elaboradas a partir do pedido em português, com tradução apresentada antes da aprovação.

Estrutura: dois tilesets gerenciados com metadata e atlas PNG 4×4; uma imagem Pro com quatro regiões. Os mapas do jogo são composições desses pixels em coordenadas do mundo, não uma imagem esticada do tamanho da janela.

**Consumo observado: 30 gerações da assinatura.** A chamada Pro reportou 25 gerações; o total do fluxo foi medido pela diferença de gerações disponíveis, sem gravar saldos em arquivos. A primeira transição areia→grama falhou por timeout. A nova tentativa foi executada somente após aprovação específica do usuário. Não houve outra tentativa extra.

Prompts exatos enviados:

1. `lower_description`: `Clear turquoise tropical ocean, subtle small pixel ripples, colorful pirate adventure RPG.`
   Tradução: oceano tropical turquesa, pequenas ondulações em pixel art, RPG de aventura pirata colorido.
2. `upper_description`: `Warm pale sand of a tropical pirate island, fine grain, scattered tiny shells.`
   Tradução: areia clara e quente de uma ilha pirata tropical, grãos finos e pequenas conchas.
3. `lower_description`: `Warm pale tropical island sand.`
   Tradução: areia tropical clara e quente.
4. `upper_description`: `Lush emerald tropical island grass, tiny flowers and soft worn patches, colorful pirate adventure RPG.`
   Tradução: grama tropical verde-esmeralda, pequenas flores e áreas gastas, RPG pirata colorido.
5. `description`: `Four separate tropical pirate port buildings in a precise 2 by 2 sprite sheet, one complete building per 256 by 256 cell, transparent margins between cells: red tiled seaside tavern, blue roof nautical market, stone and timber forge, small harbor office with a navigation flag. Orthographic high top-down RPG view with visible front facades, colorful adventurous island architecture inspired by One Piece, weathered wood, white plaster, brass, ropes, barrels, lush small plants, crisp detailed pixel art, consistent scale and lighting, no characters, no text.`
   Tradução: quatro edifícios separados em grade 2×2, um por célula 256×256 com margens transparentes: taverna vermelha, mercado azul, forja de pedra/madeira e escritório do porto com bandeira; vista superior com fachadas, arquitetura de ilha inspirada em One Piece, madeira, reboco, latão, cordas, barris e plantas; sem personagens ou texto.

[Manifesto exato de chamadas, parâmetros, verificação e falha](../pixellab-pip-generations/ilha-porto-20261018/manifest.json). [Blueprint para recriação](../pixellab-pip-generations/ilha-porto-20261018/ilha-porto.blueprint.json).

Os arquivos com sufixo `inspection-grid` são cópias de inspeção com guias; não fazem parte da arte do jogo. O atlas original passou nas verificações de PNG RGBA, dimensões, transparência e conteúdo contido nas quatro células. Os tiles foram decodificados e seus metadados inspecionados.

## Arquivos e pendências

Alterados: `index.html`, `game.js`, `styles.css`, `world-system.js`, `tools/dev_server.py`, `tests/world-system.test.cjs`, `tests/sprint1_browser.py`, `README.md`.

Novos: `island-world.js`, `island-assets.js`, `tests/island_browser.py`, `tests/island-world.test.cjs`, artes/metadata/manifests em `pixellab-pip-generations/ilha-porto-20261018/`, análise da referência e capturas em `docs/`.

A ilha e HUD desta entrega são funcionais, mas não encerram todas as sprints originais. Permanecem: variedade maior de flora e construções, navios detalhados próprios, habitantes em rotas, interiores, animações direcionais completas, portal de retorno físico, transições de viagem e diferenciação da segunda caçada. O vídeo atual não oferece comparação para combate. Não foram inventados sistemas multiplayer, mercado online ou cofre remoto.
