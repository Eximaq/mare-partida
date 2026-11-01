# Conquistas e Hierarquia dos Mares HD

Sprint de 01/11/2026 · branch feature/achievements-hierarchy-hd · base 0897d9f (PR #181).

## Auditoria e composição

As duas janelas continuam nos acessos existentes de Personagem. A implementação anterior tinha conquistas agrupadas em listas sem a composição aprovada, placas de promoção com texto rasterizado e somente o Top 10 geral. O código atual continua sendo a fonte das regras.

Referências: duas imagens aprovadas pelo proprietário, 1448×1086. A composição usa cabeçalho de cerca de 14% da altura, moldura contínua, resumo de Conquistas em três blocos, categorias em uma faixa e cards de pergaminho em duas colunas. A Hierarquia mantém aproximadamente 60% da largura para facções/apresentação/promoção e 40% para ranking. Em dimensões menores há rolagem interna e reorganização; a janela não é uma captura reduzida.

A comparação no navegador conferiu proporções, hierarquia de textos, emblemas, molduras, botões, margens e leitura. O acabamento reutiliza madeira/metal escuro, ouro e pergaminho aprovados; os títulos/valores são fontes locais reais. Não se afirma reprodução pixel a pixel da arte conceitual. As capturas finais são do jogo, com personagem de teste isolado.

## Conquistas permanentes

- achievement-system.js conserva catálogo, IDs, objetivos, flags de disponibilidade, progressão e ledger de resgate. O catálogo atual contém 31 conquistas; o resumo conta somente as elegíveis, sem ativar recursos futuros.
- PT significa **pontos de talento**. O total resgatado é MareAchievements.bonus(game), independente dos pontos livres ou já investidos.
- Concluídas, resgatadas e prontas para resgate são contadas separadamente. O filtro não modifica o resumo global.
- O destaque é uma conquista real pronta ou pendente. Não há baú/marco especial inventado.
- Resgatado e Em progresso são estados sem ação repetida; só Resgatar é um botão de recebimento. O ledger já resgatado mantém a barra completa inclusive em saves antigos com métricas incompletas.
- A gravação continua acontecendo antes da troca do estado em memória. Clique repetido não repete PT; falha de armazenamento não marca o prêmio.
- O catálogo atual concede somente PT. Nenhum item, moeda adicional, recorrência ou Resgatar tudo foi introduzido.
- achievement-ui.js apresenta os dados; MareTalentUI delega a esse componente. Refresh atualiza somente campos/card alterados, preservando a lista e sua rolagem após resgate.

## Consulta de facções e promoção

hierarchyView armazena somente consulta temporária: faction, tier, scope, status e board. Nunca é salvo como facção do personagem. A abertura inicia na facção e título reais.

Os quatro seletores usam os emblemas oficiais sem recoloração. Setas e seletor consultam todos os oito patamares. Seu título atual/Próximo título identificam a posição real; a consulta de outro patamar/facção usa Patamar consultado/Próximo patamar e bloqueia a ação de promover.

Níveis canônicos: 1,20,50,75,100,135,170,200. Patamares 6–8 continuam bloqueados pelos itens especiais ainda indisponíveis. Uma barra completa de nível não remove esse bloqueio.

Enquanto o serviço valida o cargo, a promoção fica temporariamente bloqueada. A confirmação revalida o patamar esperado. O servidor rejeita uma segunda confirmação do cargo anterior; o cliente protege chamadas concorrentes, mudança de personagem e falha de gravação local. A promoção atualiza imediatamente o título compartilhado da HUD. Não há novas regras, níveis, bônus nem alteração de classe.

## Ranking por facção

GET /api/hierarchy/ranking?faction=pirate|marine|revolutionary|government aplica WHERE faction=? **antes** de ORDER BY e LIMIT 10. Sem faction, preserva a classificação geral. Facções inválidas retornam 400.

Ordem existente preservada: patamar DESC, nível DESC, poder DESC e player_id ASC. Não há nova pontuação nem jogador atual fixado acima de jogadores melhor colocados.

São usados nome, título, classe, nível, poder e retrato PNG sincronizado reais do serviço. Se o retrato não foi sincronizado, o emblema oficial identifica explicitamente essa ausência; não se inventa avatar. Filtragem não altera o registro do jogador.

Requisições antigas são canceladas e respostas recebem número de consulta. Uma resposta atrasada não substitui a facção atual. Carregando, vazio e indisponível são estados distintos; a consulta geral continua acessível pelo controle Geral.

**Limite de infraestrutura preservado:** o servidor Python existente é uma demonstração local em loopback, sem autenticação/autoridade sobre XP/poder. Este trabalho não cria um ranking de contas online. GitHub Pages é estático e mostra Ranking indisponível quando não há API; não transforma o jogador local em ranking global confirmado.

## Arte e referência compartilhada

PixelLab AI Pro produziu 32 insígnias novas, oito por facção, além de quatro placas reutilizáveis com nomes renderizados pelo jogo. MareHierarchy.art(faction,tier) centraliza as referências da janela, confirmação e HUD principal.

| Família | Tema | Arquivo das oito insígnias | Placa |
|---|---|---|---|
| Pirata | Vermelho, caveira e lâminas | pirate-insignias.png | pirate-plaque.png |
| Marinha | Azul, âncora | marine-insignias.png | marine-plaque.png |
| Exército Revolucionário | Verde, estrela | revolutionary-insignias.png | revolutionary-plaque.png |
| Governo Mundial | Marfim/prata, sol | government-insignias.png | government-plaque.png |

Arquivos em assets/ui/honors-hd/. Folhas de insígnias 512×256: 4 colunas × 2 linhas, células 128×128; ordem de leitura corresponde aos patamares 1–8. Placas 480×96, cabeçalho 792×168, faixa de apresentação 688×192, oito ícones de categorias 512×256, medalhas 384×128 e dois botões 480×96.

Amostra das quatro famílias validada antes da expansão. Variantes com ornamentos encostando nas bordas foram rejeitadas; as famílias verde e marfim finais mantêm detalhes dentro dos círculos. Originais aceitos conservados em PNG nativo, sem reamostragem/exportação com perdas. Ícones possuem alfa real. Interiores transparentes das molduras são preenchidos intencionalmente com os materiais aprovados, sem remover pixels legítimos.

Reutilizados: quatro emblemas oficiais, madeira, metal escuro, pergaminho, molduras, fontes e retratos do jogo. Nenhum talento, equipamento, habilidade, fruta de gameplay ou moeda oficial foi substituído. Ícone ilustrado da categoria de frutas é somente navegação.

Manifesto com jobs, dimensões, hashes e custo: assets/ui/honors-hd/manifest.json. **US$2,465 em créditos**, incluindo amostras e variantes rejeitadas; nenhuma geração da franquia consumida. Saldo consultado após concluir: US$5,74 e 2,68 gerações. Não há chamadas PixelLab no gameplay.

### Relação dos 32 títulos

A chave abaixo documenta o par estável facção/patamar; não cria um novo campo persistido.

| Chave | Nome canônico | Nível declarado | Célula (coluna,linha) | Estado |
|---|---|---|---|---|
| pirate:1 | Pirata Novato | 1 | 1,1 | Inicial |
| pirate:2 | Pirata Promissor | 20 | 2,1 | Promoção manual |
| pirate:3 | Capitão Pirata | 50 | 3,1 | Promoção manual |
| pirate:4 | Supernova | 75 | 4,1 | Promoção manual |
| pirate:5 | Shichibukai | 100 | 1,2 | Promoção manual |
| pirate:6 | Comandante Yonkou | 135 | 2,2 | Bloqueado por itens especiais |
| pirate:7 | Yonkou (Imperador) | 170 | 3,2 | Bloqueado por itens especiais |
| pirate:8 | Rei dos Piratas | 200 | 4,2 | Bloqueado por itens especiais |
| marine:1 | Recruta | 1 | 1,1 | Inicial |
| marine:2 | Marinheiro | 20 | 2,1 | Promoção manual |
| marine:3 | Sargento | 50 | 3,1 | Promoção manual |
| marine:4 | Capitão | 75 | 4,1 | Promoção manual |
| marine:5 | Comodoro | 100 | 1,2 | Promoção manual |
| marine:6 | Vice-Almirante | 135 | 2,2 | Bloqueado por itens especiais |
| marine:7 | Almirante | 170 | 3,2 | Bloqueado por itens especiais |
| marine:8 | Almirante de Frota | 200 | 4,2 | Bloqueado por itens especiais |
| revolutionary:1 | Simpatizante | 1 | 1,1 | Inicial |
| revolutionary:2 | Guerrilheiro | 20 | 2,1 | Promoção manual |
| revolutionary:3 | Oficial Revolucionário | 50 | 3,1 | Promoção manual |
| revolutionary:4 | Executivo | 75 | 4,1 | Promoção manual |
| revolutionary:5 | Comandante de Tropa | 100 | 1,2 | Promoção manual |
| revolutionary:6 | Comandante de Exército | 135 | 2,2 | Bloqueado por itens especiais |
| revolutionary:7 | Chefe de Gabinete | 170 | 3,2 | Bloqueado por itens especiais |
| revolutionary:8 | Líder Supremo | 200 | 4,2 | Bloqueado por itens especiais |
| government:1 | Agente Menor | 1 | 1,1 | Inicial |
| government:2 | Agente Oficial | 20 | 2,1 | Promoção manual |
| government:3 | Inspetor do Governo | 50 | 3,1 | Promoção manual |
| government:4 | Agente Cipher Pol | 75 | 4,1 | Promoção manual |
| government:5 | Elite Cipher Pol (CP9) | 100 | 1,2 | Promoção manual |
| government:6 | Agente Aegis (CP0) | 135 | 2,2 | Bloqueado por itens especiais |
| government:7 | Comandante Aegis Zero | 170 | 3,2 | Bloqueado por itens especiais |
| government:8 | Diretor Geral | 200 | 4,2 | Bloqueado por itens especiais |


## Arquivos e compatibilidade

- Novos: achievement-ui.js, honors-hd.css, assets/ui/honors-hd/ e testes/rotina de validação.
- Integração: game.js, talent-ui.js, hierarchy-ui.js, hierarchy-system.js, character-hud.js, ui-hud.css, index.html, ui-preview.html, tools/build_pages.py.
- Serviço: server/hierarchy.py e server/app.py; mesma tabela existente, sem nova base de ranking.
- Sem mudança no schema de save, IDs de conquistas, saldo, inventário ou regras de progressão.
- Materiais e títulos antigos permanecem no repositório para compatibilidade; estas duas telas e a placa da HUD já usam a família nova.
- Rollback: reverter os commits desta branch, sem apagar saves. Não excluir dados do servidor.

## Validação

- 42 testes Node pertinentes: conquistas/finais, PT, árvores, hierarquia, HUD, notificações, menu, aparência, componentes e fonte única de sprites.
- 6 testes Python de hierarquia, incluindo filtro antes do limite e confirmação duplicada.
- tests/honors_hd_browser.cjs com serviço Python e SQLite temporários: categorias, resumo independente do filtro, recebimento único, storage cheio, persistência, promoção real, 32 títulos, consulta externa sem mutação, ranking geral/facção, dez posições, nomes longos, poder elevado, respostas atrasadas e serviço indisponível.
- O teste usa fixtures somente no banco temporário. Capturas de apresentação mostram somente o personagem de teste criado naquele ambiente; registros adicionais de estresse não são jogadores de produção.
- Matriz de layout: 1920×1080,1366×768,1280×720,1024×768,393×852,360×800,320×568,844×390, mais a resolução 1448×1086 das referências.
- Build Pages, conferência de hashes/caminhos relativos e teste da distribuição estática. honors_cache_browser.cjs valida os recursos versionados e navega pelas duas telas por toque sem injetar controles de QA. O teste legado pages_cache_browser.py ainda para no seletor de mapa [data-island][data-current=true], anterior ao PR #181; não foi apresentado como aprovado nem teve suas asserções removidas.
- Regressão da HUD: 32 títulos, recursos, nome, Bounty vazia, oito dimensões, toque, movimento reduzido, teclas e reload. O ensaio antigo apresentou instabilidade de carregamento em execuções concorrentes; a execução final isolada passou sem erros e sem recursos ausentes.
- Workflow honors-hd em Ubuntu 24.04, Chromium/Playwright 1.56.1, capturas como artefato temporário externo ao Git.

Capturas e relatórios de QA permanecem fora do repositório. Nenhum save pessoal, credencial, banco temporário ou evidência em massa é versionado. O PR é enviado pronto para revisão; o proprietário confirma o merge no site.

### Execução reproduzível

- node --test tests/honors-hd.test.cjs tests/hierarchy.test.cjs tests/character-hud-hierarchy.test.cjs
- python tests/test_hierarchy.py
- python tools/build_pages.py
- python tests/run_honors_hd_browser.py tests/honors_hd_browser.cjs --dist
- python tests/run_honors_hd_browser.py tests/honors_offline_browser.cjs --dist --offline
- python tests/run_honors_hd_browser.py tests/honors_cache_browser.cjs --dist --offline

Playwright/Chromium devem estar instalados. NODE_PATH, CHROME_PATH e MARE_QA_DIR podem ser definidos pelo ambiente. O runner cria e remove seu próprio banco temporário; não acessa a base pessoal do usuário.
