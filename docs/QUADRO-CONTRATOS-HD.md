# Quadro de Contratos HD — 31/10/2026

Implementação e validação local concluídas; avaliação visual e merge permanecem com o proprietário.

Branch feature/contracts-board-hd, base c03d607 (main após o PR174). A referência anexada foi usada para acabamento e para a arte lateral; a disposição explícita do prompt prevalece: duas colunas e Nami à direita, dentro de uma única moldura externa.

## Decisão do proprietário e dados preservados

Esclarecimento recebido nesta sprint: “Por enquanto, coloque os atuais em ‘Diários’, foque na apresentação, os direcionamentos darei posteriormente.”

Os dez contratos atuais estão apresentados em Diários:

| IDs canônicos | Apresentação | Regra preservada |
|---|---|---|
| crab, bandit, boss | Diários | Resgate manual único |
| dawn-patrol, dawn-clear | Diários | Resgate manual único |
| conchas-patrol, conchas-clear | Diários | Resgate manual único |
| orange-patrol, orange-clear | Diários | Resgate manual único |
| rare-patrol | Diários | Resgate manual único |

Semanais e Mensais estão configuradas, vazias. A classificação visual não transforma contratos únicos em recorrentes. recurrence permanece once para os atuais; resetPolicy é null. Não há relógio de reinício, contador fictício, expiração ou limpeza de progresso. O proprietário definirá depois as associações e regras de recorrência.

questDefs, questProgress e claimQuest continuam sendo as fontes de objetivos, progresso e entrega. Os IDs, contagens, objetivos, valores Berry/XP e proteção de resgate já existente não foram substituídos. Progresso usa os contadores reais de stats e hunts.areas; recebimento usa game.claimed, por personagem.

## Apresentação integrada

- Moldura externa contínua em madeira e metal dourado envolvendo cabeçalho, navegação, cards, arte e rodapé.
- Cabeçalho QUADRO DE CONTRATOS, com fonte local e símbolo gráfico; fechamento e atalhos do modal compartilhado.
- Abas com seus próprios estados e conteúdo; seleção é preservada entre aberturas na sessão, sem gravar o save ao navegar.
- Cards de pergaminho em duas colunas nas resoluções principais, com ícone, nome, descrição, barra, contagem e recompensas reais.
- Estados em andamento, objetivo concluído/recompensa disponível e recompensa recebida. A ação de resgate usa o handler existente; não há coleta automática.
- Rodapé fixo da categoria: contratos concluídos / contratos configurados. Não soma abates de objetivos diferentes. IDs repetidos são deduplicados.
- Categoria vazia fica 0/0 com preenchimento zero e não se torna concluída.
- Reserva RECOMPENSA FINAL — A DEFINIR, com símbolo gráfico. Configuração contém itemId:null e quantity:null por categoria. Nenhum item ou resgate final é implementado, inclusive em 10/10.
- Nami é um recorte exato da arte fornecida, reposicionado à direita, sem espelhamento ou redesenho. A arte não recebe eventos de ponteiro. Não há diálogo, loja ou bônus.
- A lista tem rolagem interna. Na faixa compacta ela usa uma coluna; no telefone, a decoração é ocultada para preservar a leitura e as ações. A composição não é reduzida como uma fotografia.

## Arte e componentes

Reutilizados: frame-v2, heading-v2, madeira, pergaminho, placas de botões aprovadas, placa verde, moeda Berry oficial e fontes locais do inventário/HUD.

PixelLab Pro:
1. Amostra de quatro ícones, validada no navegador: carapaça ígnea, corsário, chefe e sol diário.
2. Expansão com oito ícones: calendário semanal, bússola mensal, conclusão do conjunto, interrogação, patrulha, resgate, recompensa recebida e XP.

Total: **35 gerações** (10 + 25). Saldo verificado: 206,68 → 171,68. Nenhuma chamada de geração durante o gameplay.

Fontes, recortes, prompts, trabalhos, hashes e dimensões estão em assets/ui/contracts-hd/manifest.json. Os 12 ícones preservam RGBA; exportação por recorte exato com margem transparente, sem reamostragem. Nami usa o retângulo [20,107,384,921] do arquivo fornecido, preservando seus pixels e proporção. Textos, números, barras e botões são componentes vivos, separados da ilustração.

## Arquitetura e atualização

contracts-board.js é uma camada de apresentação e configuração de categorias. Recebe o catálogo, o leitor de progresso e a lista de resgates existentes; não possui um segundo motor de missões, persistência ou relógio.

refresh atualiza barras, contagens e estados alterados na cadência já existente de updateUI. A lista só é substituída ao mudar categoria ou metadados. Um WeakMap vincula referências ao quadro vivo, sem reter painéis descartados. Não há listener, intervalo ou loop de renderização novo no componente. O clique das abas utiliza a delegação já existente de game.js.

O resgate deixou de reconstruir o painel inteiro; updateUI já atualiza o quadro. Moeda, ganho de XP, nível, conquistas e save continuam no fluxo original. A falha de armazenamento do sistema antigo não foi redesenhada nesta sprint; não foi introduzido um novo protocolo transacional.

## Arquivos

- contracts-board.js: configuração de categorias, snapshot de apresentação, componentes e atualização incremental.
- game.js: integração no painel atual, abas e atualização após progresso/resgate.
- ui-screens.css: composição e responsividade restritas a contracts-mode.
- index.html, ui-preview.html, tools/build_pages.py: entrada compartilhada e empacotamento/versionamento.
- assets/ui/contracts-hd/: fontes, 12 ícones, ilustração aprovada e manifest.
- tests/contracts-board.test.cjs, contracts-art.test.cjs, contracts-board-browser.cjs.
- .github/workflows/contracts-visual.yml: regressão e capturas temporárias no CI.
- README.md, este relatório e CHANGELOG_DEV.md.

## Verificação executada

- Sintaxe de game.js e contracts-board.js aprovada.
- Quinze resultados Node aprovados em oito arquivos pertinentes: contratos, artes, UI, paridade de preview, componentes/comparação do inventário e Canvas de talentos.
- Chrome real, fonte e dist: catálogo com dez contratos, abas independentes, vazios, proporções de barras, progresso agregado de toda a categoria, estados distintos, resgate dos valores reais uma única vez, persistência após reload, ausência de prêmio final e ausência de reinício por mudança do relógio.
- Progresso atualiza mantendo o mesmo card; trocar categoria preserva a lista externa e a imagem. MutationObserver registrou zero alterações do quadro numa atualização sem dados novos.
- Doze ciclos de abrir/fechar mantiveram um único quadro e uma única imagem lateral.
- Nove viewports: 1920×1080, 1672×940, 1366×768, 1280×720, 1024×768, 393×852, 360×800, 320×568, 844×390. Moldura, rodapé e arte contidos; sem rolagem horizontal. Duas colunas nas dimensões principais.
- Regressão do inventário em dist passou: nove viewports, 12 slots, ações, filtros, persistência, personalização e HUD das quatro facções nos níveis 49/50/51.
- Pillow verificou igualdade dos pixels de cada recorte com sua fonte. Testes Node conferem hashes, dimensões e transparência.
- python tools/build_pages.py e git diff --check aprovados.
- Dados descartáveis, sem venda ou alteração de personagem real. Não é uma medição de FPS ou de uso de memória em sessão prolongada.

Capturas reais fora do Git em tmp/contracts-hd: before-1672.png e contracts-final.png (mesma viewport e escala), mais capturas das nove dimensões. A prévia final vem do pacote estático efetivamente integrado, não de uma imagem gerada da tela.

## Pendências e compatibilidade

Definir posteriormente contratos e políticas dos ciclos semanais/mensais e reinício dos diários, conforme a orientação recebida. Definir identificador, quantidade e regra de resgate da recompensa final; nenhum prêmio provisório foi concedido. Esses pontos estão preparados e não são anunciados como funcionalidades existentes.

Sem migração de saves, exclusão de artes antigas ou alteração de balanceamento. Reversão pelos commits separados da branch; os dados antigos permanecem compatíveis. A próxima etapa depende das definições do proprietário e da revisão visual desta entrega.
