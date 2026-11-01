# Talentos HD — Kaizoku Idle

Atualização de 31/10/2026. Branch `feature/talents-hd`, base `003a90cf99ca1b1a0ec6463b4555a7d64c1d4965` (PR #178). Referência fornecida pelo proprietário: “Árvore de Talentos do Espadachim.png”.

## Interface

A tela passa a ter três colunas: identidade da classe, constelação interativa e detalhes do talento selecionado. O cabeçalho “TALENTOS” usa exatamente a textura de madeira do rodapé. O orçamento de PT fica integrado ao cabeçalho, com ramos utilizados e pontos pendentes separados dos confirmados.

O medalhão da classe é centralizado pelo desenho visível, desconsiderando margens transparentes somente durante o desenho. O painel direito centraliza medalhão, nome, descrição, bônus e níveis. Requisitos mantêm a leitura alinhada por linha. Madeira, metal escuro, molduras, fontes e botões reutilizam os materiais aprovados; a árvore preserva seu cenário oceânico.

O plano lógico foi compactado de 1000×1380 para 720×1320. Os ícones continuam com exibição nativa de 96 px, ampliável por zoom. Fontes acompanham o zoom para continuar legíveis. Visão geral, botões, roda, teclado e pinça respeitam 58%–180%. O arraste é limitado aos bounds da constelação. O enquadramento inicial privilegia o tronco; em janelas baixas ou estreitas é necessário arrastar para alcançar os tiers superiores, mantendo o mínimo de 58%.

Em telas menores, a identidade vira uma faixa e, no celular, os três painéis são empilhados. Os controles da árvore quebram linha para não ultrapassar a largura disponível.

## Dados e compatibilidade

Nenhum ID, requisito, valor, classe, custo, passivo ou formato de save foi modificado. Seleção, prévia, confirmação transacional, descarte e redefinição somente no porto continuam nos sistemas existentes.

O painel destaca o bônus total verdadeiro do nó. Exemplo: Esquiva II em 10/10 concede +3%; em 9/10, +2,7%. Valores ainda não confirmados são marcados como prévia e exibem o total confirmado separadamente. O nível atual vem do save; o próximo nível acompanha a prévia.

As descrições dos exclusivos vêm do catálogo canônico. Aparar Perfeito mantém sua passiva de 12% de aparar/contra-atacar; não recebe o bônus de esquiva ilustrativo presente na referência. A informação por ponto fica em “Detalhes do efeito”. O tooltip redundante dos nós é suprimido nesta tela porque o painel já apresenta o conteúdo; os botões de ajuda continuam ativos.

Ao sair da tela, o cabeçalho movido e os observadores/callbacks são removidos. Outras HUDs não recebem os estilos desta tela.

## Artes

Somente `assets/ui/talents-hd/sidebar.png` foi gerado no PixelLab AI Pro: 300×600 nativo, 25 gerações cobradas, job `345ca40a-cb92-4417-94eb-b8035542b0b1`. Origem, prompt e SHA-256 estão no manifesto da mesma pasta.

Todos os PNGs em `assets/ui/talents/` foram preservados. Os medalhões HD de 512 px e os exclusivos de 256 px continuam sendo os mesmos. Os ícones da seleção de classe não foram redesenhados globalmente.

## Arquivos

- `talent-ui.js`: layout, bônus totais, painel de detalhes, centralização óptica e limites do arraste.
- `talents-hd.css`: acabamento responsivo e alinhamento.
- `game.js`: ativação/limpeza do tema e prevenção do tooltip redundante.
- `index.html`, `ui-preview.html`, `tools/build_pages.py`: carregamento e pacote público.
- `tests/talent-hd.test.cjs`, testes de navegador e workflow de talentos: validação do layout, valores reais e compatibilidade.

## Validação

- Node: `talent-system`, `talent-canvas`, `talent-hd`, `achievements-ultimates` e `ui-system` aprovados.
- Chromium real: sete classes, 21 nós por classe, seleção única alinhada, imagens sem cobertura, zoom por botões/roda/teclado/pinça, prévia sem persistência, confirmação/descarte, recarga e falha simulada de armazenamento.
- Responsividade: 1920×1080, 1366×768, 1280×720, 1024×768, 393×852, 360×800 e 320×568, sem transbordamento horizontal.
- Build: `python tools/build_pages.py`; a versão em `dist/` é validada novamente no navegador.
- Capturas ficam fora do versionamento, em diretório temporário. Não incluir saves ou evidências em massa no PR.

Rollback: reverter o commit desta interface; os saves não exigem migração. Não há mudança de balanceamento ou nova mecânica. Aprovação visual permanece a cargo do proprietário.
