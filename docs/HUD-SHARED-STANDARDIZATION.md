# Padronização de confirmações, menus e avisos — 01/11/2026

## Estado e base

Branch feature/hud-shared-standardization, base a533f92 (PR #202 incorporado), em worktree isolado. Receitas, chances, valores, progressão, catálogos e IDs dos saves são preservados.

A integração final aguarda o merge do PR #203, conforme decisão expressa do proprietário. Esse PR altera os mesmos fluxos para usar autoridade no servidor. Não substituir seus comandos por execução local nem integrar antecipadamente branches ainda em revisão.

## Auditoria e implementação

- Duas causas do fragmento quebrado: o detalhe fornecia um objeto a itemIcon, que recebe chave/índice; o resolvedor HD não tratava akuma-fragment. Ambos corrigidos. Os seis ranks reutilizam assets/quest-dungeons/akuma-fragment.png, mantendo Raro/Épico/Épico/Lendário/Lendário/Supremo.
- A receita existente foi exposta em MareBossDungeons.recipes.E. A execução e a apresentação leem a mesma quantidade: dez fragmentos, fruta aleatória Rank E, vinculada. D–S continuam sem receita.
- O detalhe permanece no pergaminho e separa nome/rank, pilha, vínculo, disponibilidade desbloqueada, receita e ações. Formação usa o ícone do fragmento.
- A única factory MareUI.confirmation agora apresenta alvo, consumo ou transferência, necessário/disponível/saldo, alterações, resultado, chance e consequência real da falha. Dados dinâmicos são escapados.
- operation-summary.js é um adaptador de leitura sobre os custos, planos e validações existentes. Não sorteia resultados. O comando captura IDs, classe, revisão, encaixe e seleção; a confirmação revalida antes da execução. Mudanças relevantes atualizam o resumo e exigem outra confirmação.
- A Forja local grava a transição completa antes de substituir o estado em memória. Falhas de armazenamento preservam item, recursos e revisão. Compras de poção e vendas locais também gravam antes de alterar item/saldo e anunciar o ganho. Chances, preços e penalidades não mudaram.
- Processamento impede repetição e fechamento por Escape. O foco retorna após conclusão/cancelamento. Escape funciona depois de clicar fora da janela.
- Recebimentos ficam na fila enquanto houver uma confirmação aberta, para não disputar espaço com a decisão nem desaparecer.
- Seletores simples são aprimorados por MareUI, conservando o select original, ID, valor, opções e eventos. A lista aberta usa combobox/listbox, teclado, busca por letras, estados desabilitados, rolagem e ajuste ao viewport. O foco retorna ao filtro mesmo quando sua seleção recria o painel. Clique externo fecha a lista sem atravessar para o cenário. Seletores múltiplos permanecem nativos.
- acquisition-notices.js recebe eventos explícitos; não observa diferenças de inventário. Equipamentos conservam identidade individual. Outros itens agrupam somente propriedades equivalentes, incluindo vínculos.
- Fila limitada a 24 entradas distintas mais resumos limitados de excesso; até três avisos visíveis. Excesso de Berry, XP e unidades de itens diferentes é separado. Histórico de deduplicação limitado a 256 eventos por sessão; as regras originais continuam protegendo resgates únicos.
- Avisos usam o ícone real e a moeda oficial. Caçada, contratos persistidos, marcos, primeira vitória, baús, caixas, compras, vendas e fusões bem-sucedidas emitem recebimentos após concessão. Transferências, ordenação e reabertura não geram ganhos fictícios. Revelações especiais são preservadas.
- ui-finishing.css reúne o acabamento dessas famílias e auxiliares após os estilos antigos: workshop-surface.png, molduras/botões existentes e Alegreya SC/Sans. Cores funcionais de cura, raridade, conclusão e requisitos permanecem.
- Chat, anotações, expedição, XP/h, menus e barras mantêm cálculos, posições e dimensões externas. Fontes já aprovadas que determinam a largura intrínseca de controles foram preservadas.
- Imagens indisponíveis têm estado controlado e diagnóstico; isso não substitui a correção de associação/caminho.
- Nenhuma geração no PixelLab foi necessária ou realizada: os recursos aprovados existentes foram reutilizados sem reduzir resolução.

## Fluxos abrangidos

Formação de Akuma; aprimoramento; instalação e remoção de pérola; fusão de equipamentos e pérolas; reforja individual/completa; aplicação e redefinição de talentos; graduação de Haki; livro de despertar; caixa de pérolas; promoção de hierarquia; confirmações informativas/destrutivas existentes.

Filtros abertos; menus de navegação; tooltip de itens/materiais; Canal do Porto/Sistema/Anotações; expedição, contratos, XP/h, rota e retorno. Não foi criado chat online, recorrência ou nova mecânica.

## Validação

- Node: 146/146 arquivos passaram; sistemas existentes e novos testes de concordância com preços canônicos, transferências, risco, vínculo, IDs distintos, PT por nó, escapes, deduplicação e rajada de 1.000 recibos com memória limitada e totais preservados.
- Typecheck aprovado; 67/67 testes de fundação do servidor passaram, sem mudanças de protocolos/backend.
- tests/hud-standardization-browser.cjs: Chrome real e personagem isolado. Seis ranks; cancelamento; execução de cada tipo de Forja; falha de fusão; gravação recusada; saldo alterado; mochila cheia; clique repetido; Enter de abertura; backdrop/Escape; operação lenta; graduação/livro/caixa; talentos; formação/revelação; menus; recebimentos; falha controlada de imagem. Sete resoluções, tanto na entrada de desenvolvimento quanto no build estático; compras/vendas e promoção de hierarquia executadas e canceladas.
- tests/gameplay_harmony_geometry_browser.cjs comparado com a base desta sprint: 82 estados × 14 superfícies em nove viewports, sem diferenças externas.
- tests/gameplay_harmony_controls_browser.cjs: menus exclusivos, anotações locais, teclado, atalhos, limiar das taxas e estados reais.
- tests/forge-hd-browser.cjs: quatro abas em nove resoluções; ações alcançáveis, nomes longos, inventário vazio, campos texturizados e prévia sem RNG.
- tests/haki_mastery_browser.cjs em modo FAST: livro, bloqueios, investimentos, falha de gravação, revisão obsoleta, progressão persistida, controles, transformações, quatro direções e sete resoluções. Confirmações que permanecem abertas após falha/revisão obsoleta são canceladas explicitamente pelo teste.
- tests/boss_dungeons_browser.cjs passou: dois confrontos, dez fragmentos, resgates únicos, revelação persistida, segunda aba somente leitura e oito painéis compatíveis.
- Teste em dispositivo touch simulado: ações principais com altura mínima de 44 px e sem erros; confirmação rolável por teclado.
- python tools/build_pages.py inclui os novos módulos e acabamento com caminhos relativos. ui-preview.html conserva paridade dos scripts.

Logs, galeria e capturas reais ficam em MARE_QA_DIR, fora do Git, sem saves reais. A matriz de performance do Haki não foi repetida; esta sprint não altera seu renderizador.

## Arquivos principais

- game.js: integração, persistência local da Forja e eventos de recebimento.
- boss-dungeon-system.js e item-art.js: receita compartilhada e associação dos fragmentos.
- operation-summary.js: modelos de leitura.
- ui-system.js e ui-finishing.css: apresentação, foco, listas, imagens e materiais.
- acquisition-notices.js: fila/deduplicação.
- game-tooltips.js e haki-ui.js: identificação e texto do custo.
- index.html, ui-preview.html e tools/build_pages.py: carregamento/build.
- Testes novos/ajustados: hud-standardization.test.cjs, hud-standardization-browser.cjs, item-art.test.cjs, hud-zoom-xph.test.cjs e haki_mastery_browser.cjs.

## Compatibilidade, reversão e pendência

Sem nova migração de saves, mudança de índices ou compensações. Segredos, evidências e saves locais não entram no Git. Reverter somente os commits desta sprint, preservando colaboradores e servidor; sem force-push.

Próximo passo mínimo: após o merge do #203, atualizar a main, reconciliar os pontos online de Forja/inventário/atributos, repetir os testes afetados, conferir novos PRs/commits e então publicar o PR final. Essa integração ainda não está declarada concluída.
