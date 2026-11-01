# Refinamento final do inventário — 31/10/2026

Estado: implementação e validação local concluídas; acabamento visual aguarda revisão do proprietário. Sem merge automático.

## Escopo e base

Branch feature/inventory-final-components, base 7e24c47 (feature/inventory-pirate-hd, PR #172 em rascunho). A main consultada nesta entrega está em 93368fd, merge do PR #171. O novo PR inclui a base anterior ainda não integrada; não aplicar ambos como entregas independentes.

Preservados: três painéis, 12 slots (Cinto e Acessório distintos), equipamento/visual/estilo, filtros/ordenação/paginação, personalização, ocultação de capacete, HUD, progressão e combate. A pasta de 102 ícones HD de itens não foi alterada nesta etapa. Não houve geração de frutas, armas, armaduras, personagens ou emblemas oficiais.

## Componentes e arte

- Título compacto sem cenário externo; emblema continua associado à facção.
- Abas/categorias preenchidas, estados de seleção/foco/hover/pressionado/desabilitado sem mudança de dimensões.
- Família gráfica para equipamento, olho, roupa, mochila, poder, vida, ataque, defesa, cadeados, forja, âncora, setas, igualdade e busca.
- Poder e atributos em faixas escuras preenchidas, valores reais alinhados.
- Quatro ações 2×2; venda usa recorte da moeda Berry oficial fornecida anteriormente. Venda desabilitada enquanto equipado ou bloqueado; regras existentes mantidas.
- Sombra curta e contorno discreto nas letras de cabeçalhos e controles, sem filtro de nitidez sobre a tela. Texto permanece dinâmico, com fontes locais.
- Em telas compactas o painel mantém rolagem interna; ações permanecem separadas do conteúdo rolável. Rótulo de venda ajustado para caber com preço na segunda área de texto.

Dois trabalhos PixelLab Pro: 25 + 25 = **50 gerações**, saldo verificado 256,68 → 206,68. Fontes PNG e 21 recortes exatos em assets/ui/inventory-final; manifest.json registra trabalhos, proveniência, retângulos, tamanhos e SHA-256. Nenhum recorte foi reamostrado. Placas usam composição em nove partes; ícones usam contain em 18–34 CSS px. A moeda foi recortada do primeiro frame da arte oficial, sem geração nova.

## Comparação e apresentação dos dados

A comparação simula a substituição no mesmo slot numa cópia superficial do equipamento e usa getDerived, a função compartilhada de cálculo do personagem, com entrada de efeitos temporários nula nos dois lados. Não soma atributos como se fossem equivalentes, não compara poder isolado com o poder total e não modifica estado ou persistência.

- delta > 0: verde, MAIOR PODER QUE O EQUIPADO.
- delta < 0: vermelha, MENOR PODER QUE O EQUIPADO.
- delta = 0: vermelha, MESMO PODER QUE O EQUIPADO.
- Slot livre, item equipado, incompatível e dados indisponíveis têm estados próprios.
- Consumíveis, materiais, frutas e pérolas não recebem comparação falsa de equipamento.
- Vermelho não impede equipar um candidato válido.
- Atualização usa a cadência já existente da HUD e assinatura de dados. Não cria outro loop nem substitui o grid a cada atualização.

A filtragem esconde somente valores numéricos exatamente zero nos atributos de item e deltas. Preserva negativos e representa indisponibilidade por travessão. Selos +0 são omitidos; +1/+2 etc. mantidos. Quantidades, sockets, saldo e recursos atuais não são submetidos à filtragem.

Abrir a Forja seleciona o item, sem aprimorar, cobrar ou destruir. Retornar ao inventário restaura seleção, busca, ordenação, filtros, página e posições de rolagem quando os elementos continuam disponíveis. Mercado/Cofre não foram reintroduzidos; não foram criadas ações Comparar/Favoritar.

## Arquivos

- game.js: componentes, atributos, comparação e encaminhamento/retorno da Forja.
- ui-system.js: helpers puros de apresentação para filtragem/estado comparativo.
- ui-tokens.css e ui-screens.css: materiais, layout e acabamento tipográfico restrito ao inventário HD.
- assets/ui/inventory-final/: fontes, recortes e manifest.
- tests/inventory-comparison.test.cjs, inventory-components.test.cjs, inventory-comparison-browser.cjs; atualização de inventory-hd-browser.cjs.
- Este relatório e docs/CHANGELOG_DEV.md.

## Validação executada

- node --check game.js e novo teste de navegador: passaram.
- node --test: 18 resultados, 18 aprovados, em 13 arquivos pertinentes (inventário/componentes, arte de itens, UI, HUD, capacete, forja e frutas).
- tests/inventory-hd-browser.cjs: fonte e dist; 9 viewports (1920×1080, 1672×941, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568, 844×390). Equipar/retirar, quatro ações, bloqueio/venda, Forja, busca/filtros/abas, vazio/cheio, paginação, poção, Equipar Melhores, personalização feminina, reload, toque e atalhos passaram.
- HUD preservada nas quatro facções e níveis 49/50/51; comparação de conteúdo, materiais e dimensões antes/depois de abrir o inventário.
- tests/inventory-layout-browser.py: 7 tamanhos, alinhamento, centralização, labels, raridades, ausência de alterações de save, paginação ao redimensionar: passou.
- tests/inventory-comparison-browser.cjs: maior/menor/igual, cores por estado, vazio/equipado/incompatível, penalidade, zero e +2, item vermelho equipável, resultado idêntico ao cálculo oficial após equipar, seleção/hover sem alteração de save, atualização do item de referência sem substituir grid, seleção rápida, dimensões estáveis no hover, Forja sem custo e retorno com contexto: passou.
- Verificação Pillow: cada recorte RGBA idêntico aos pixels correspondentes da fonte.
- python tools/build_pages.py e git diff --check: passaram.

Chrome real em modo headless, contextos novos com dados descartáveis; nenhum save real vendido ou alterado. Capturas reais locais em tmp/inventory-final, fora do Git: before-1672.png e final-1672.png usam o mesmo estado controlado, mesma resolução e escala; final-1366.png, final-mobile.png e comparison-{better,worse,equal}.png complementam a revisão. Evidências não são imagens conceituais geradas por IA.

Esta rodada é a regressão pertinente à sprint, não uma declaração de que toda a suíte do projeto passou. Falhas históricas amplas da base anterior permanecem documentadas no relatório INVENTORY-PIRATE-HD.md; não houve alteração de seus sistemas nesta etapa.

## Persistência e reversão

Sem migração de schema, exclusão de assets antigos ou alteração de economia. Fontes e componentes anteriores continuam disponíveis. Reversão pelos commits separados desta branch; saves não precisam de conversão. Revisar as capturas antes de autorizar merge. Próximo escopo somente após avaliação do proprietário.
