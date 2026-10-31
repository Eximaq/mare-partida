# Refino do inventário e ícones HD — 31/10/2026

Estado: implementação validada localmente, aguardando aprovação artística do proprietário. Branch feature/inventory-pirate-hd; continuação do PR 172. Base desta revisão: 06c4a12. A imagem anterior foi reprovada; a referência aprovada enviada pelo proprietário é a direção obrigatória.

## Diferenças corrigidas

A base técnica anterior usava ícones de 32px ampliados, equipamentos pequenos nos slots, molduras finas, textos pouco legíveis, botões pouco destacados e títulos sem a presença da referência. A revisão mantém a composição em três painéis e todos os 12 slots, com madeira escura, molduras douradas com corda e cantoneiras, pergaminho, cabeçalhos náuticos, prévia enquadrada e faixa de nome. Títulos usam Alegreya SC Bold local (SIL OFL); corpo usa Alegreya Sans local já existente. A HUD principal não recebe esses estilos.

Os atributos, a comparação, os custos e as descrições receberam tamanhos legíveis. Rótulos não se sobrepõem aos ícones na apresentação compacta. Nome e cor de raridade refletem o item; skills ativas continuam separadas das passivas reais. Busca, filtros, ordem, capacidade, páginas, abas e dados reais permanecem.

## Arte dos itens

102 ícones reconstruídos no PixelLab AI Pro a partir das artes anteriores: 33 itens básicos, 8 armas especiais, 30 frutas, 25 pérolas, 3 caixas, livro, poção e material. São desenhos em canvases de 128×128 com novos detalhes de material; o termo HD descreve o tratamento artístico, não uma promessa de resolução 4K. A primeira amostra (Gura, espada, casaco e botas) foi inspecionada antes da expansão. 32 ícones que permaneceram pequenos passaram por nova reconstrução a partir de referências normalizadas; essa preparação não foi entregue como arte final.

Os PNGs entregues recebem apenas recorte por alfa e margem transparente de 4px, sem redimensionamento do bitmap final. Todos conservam ao menos 80px no eixo maior. O registro por arquivo inclui fonte anterior, job, índice, região, tamanho e hash em assets/ui/items-hd/manifest.json. 102 ícones somam 693746 bytes. Não há geração durante gameplay nem carregamento antecipado do catálogo inteiro: apenas os ícones montados pelo inventário são requisitados e aproveitam o cache normal do navegador.

MareItemArt resolve IDs existentes sem alterar a ordem de itemDefs. As artes HD entram somente no inventário; sprites do personagem, armas no mundo, VFX e animações de combate não foram redesenhados. Ícones do inventário são estáticos para manter o novo detalhe; os arquivos e o suporte anteriores de animação foram preservados.

Custos confirmados pelo saldo PixelLab: 340 gerações nos ícones (26 lotes iniciais e 8 de correção) + 50 em moldura e folha de controles = **390 gerações**, sem uso de créditos em dólar. Saldo antes/depois: 646,68 → 256,68. Novos jobs e recortes de UI estão no manifesto de assets/ui/inventory-hd. Fontes anteriores e componentes antigos preservados.

## Ações contextuais

Equipamentos na mochila: Equipar (ou Incompatível), Bloquear/Desbloquear, Vender diretamente e Forja. Item equipado: Retirar, Bloquear/Desbloquear e Forja; venda não aparece enquanto equipado. Mochila cheia desativa Retirar, item bloqueado desativa a venda. Forja abre o sistema existente no aprimoramento do item exato escolhido, limpando filtros de navegação; não executa uma operação nem cobra recursos ao abrir.

Mercado e Cofre saíram do markup do inventário, sem apagar subsistemas. Frutas mantêm Equipar/Retirar; não foi inventada forja de frutas. Pérolas abrem a Forja no imbuimento. Materiais, poções, caixas e livros conservam suas ações específicas existentes. Nenhum botão novo de comparação manual ou favoritos foi criado.

## Validação

- Node: 10 entradas pertinentes passaram (arte/hash/resolução/mapeamento, inventário, slots/raridades, UI, capacete e HUD); sintaxe de game.js/item-art.js e diff check aprovados.
- Navegador do inventário em fonte e dist: 12 slots, abas, seleção incremental, busca/filtros/ordem, páginas, inventário vazio e 120 itens, Equipar Melhores, equipar/retirar, capacete, poção, toque/atalhos, reload e persistência. Ações novas: quatro botões na mochila, três ao equipar, venda bloqueada, valor real creditado, item removido e alvo correto na Forja.
- Nove resoluções: 1920×1080, 1672×941, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568 e 844×390. Sem overflow horizontal; fechamento visível. Teste legado passou nas sete resoluções e no resize, com verificação explícita de rótulos sem corte ou sobreposição, ícones centrados, raridades e save preservado.
- HUD: oito viewports, fonte, barras, teclado, toque, reload; sem erros ou assets ausentes. O teste de inventário também preserva conteúdo, geometria e materiais nas quatro facções nos níveis 49/50/51.
- Build Pages aprovado, item-art.js incluído com hash no HTML e todos os PNGs relativos no pacote. Capturas recentes do dist: tmp/inventory-refine/final-gura.png, final-actions.png, final-1366.png e final-mobile.png; evidências/saves fora do Git.

Duas esperas pelo estado ready do personagem excederam o prazo nas sequências longas de capturas; a causa não foi isolada nesta revisão. As capturas finais foram feitas com um servidor novo por sessão e carregamento confirmado; isso não é apresentado como medição de estabilidade de produção. Testes em Chrome no Windows; sem teste físico em Safari/Firefox ou benchmark de memória/FPS nesta sprint. A suíte completa não foi reexecutada nesta revisão: a fase anterior registrou sprite-south-hurt preexistente e checks de Rank S/Haki e facções pendentes. CI remoto deve ser avaliado no PR; não declarar todos os checks verdes sem observá-los.

## Arquivos e recuperação

Arte: assets/ui/items-hd/*; assets/ui/inventory-hd/* (novos componentes, fonte e licença); item-art.js. Integração: game.js, index.html, ui-tokens.css, ui-components.css, ui-screens.css, tools/build_pages.py. Testes: tests/item-art.test.cjs, tests/inventory-hd-browser.cjs, tests/inventory-layout-browser.py, .github/workflows/inventory-visual.yml. Documentação: este relatório, INVENTORY-PIRATE-HD.md, UI-DESIGN-SYSTEM.md, CHANGELOG_DEV.md e README.md.

Sem migração de save, alteração de economia, classe, atributos ou índices de itens. Preservar dados e trabalho local do repositório original. Reverter os commits desta revisão recupera a apresentação anterior; nenhum asset antigo foi apagado. Próximo passo: revisão visual do proprietário antes de qualquer merge. Após aprovação, aplicar os componentes reutilizáveis à Forja em sprint separada.
