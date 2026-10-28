## 23/10/2026 — Animação da Katana da Maelstrom e upgrade da Nodachi de Fogo

Branch `feature/katana-maelstrom-slot-animation`, baseada na `main` `ffc9ca2`. A folha RGBA 256×256 fornecida pelo proprietário foi preservada como está; seus 16 quadros 64×64 animam o item na mochila e no equipamento em loop de 0,5 s. A imagem estática continua nos detalhes fora dos slots. A Nodachi de Fogo passa a Lendária pela escala existente; a Forja v4 migra cópias antigas de Épica, conserva os extras anteriores e completa os espaços da nova raridade com valores determinísticos. Sem mudança manual nos atributos base ou no combate.

Validação: 7 arquivos de teste Node passaram (incluindo 16 grupos do modelo da Forja), `node --check` passou em `game.js` e `forge-system.js`, e `python tools/build_pages.py` gerou o pacote estático. A folha no pacote é idêntica byte a byte à enviada. A inspeção automatizada do navegador não iniciou porque o ambiente não tem o módulo Playwright.

## 23/10/2026 — Animação de slot da Ame no Habakiri

Branch `feature/ame-no-habakiri-slot-animation`, baseada na `main` atual `05e714a`. A folha 256×256 RGBA enviada pelo proprietário foi preservada como PNG original e vinculada ao item Ame: 16 quadros 64×64, loop de 0,5 s na mochila e no equipamento. A imagem estática continua nos detalhes fora dos slots; sem alteração de raridade, atributos, combate ou saves.

Validação: teste novo da Ame, regressões de Nodachi, inventário compacto, raridades e quatro espadas (5/5); `python tools/build_pages.py` copiou a folha sem alterar bytes. A prévia local carregou, mas a inspeção visual dos dois slots foi interrompida pelo Escape físico durante o controle do navegador.

## 23/10/2026 — Compactação dos slots de equipamento

Branch `fix/inventory-equipment-slot-size`, base `001dde8`. O layout atual mantém sua composição: slots passam de 59 para 50 px, colunas laterais de 66 para 58 px, molduras de 37 para 31 px e ícones de 31 para 26 px; em telas até 360 px, slots de 46 px e conteúdo proporcional. Mochila, cores, raridades, dados e saves não mudam.

Validação: `node --test tests/inventory-compact.test.cjs` passou (1/1); preview local `http://127.0.0.1:8799/?dev=1` aberto e inspecionado visualmente em 23/10/2026. A captura não foi arquivada. Playwright indisponível no ambiente. Reversão: reverter o commit desta branch.

## 21/10/2026 — Paper Doll: preparação de camadas agrupadas, zero novas gerações

Continuação do PR45. Auditor de atlas por célula, exportação atômica, detecção de sequência estática e oclusão corporal apenas quando explicitamente permitida por máscara para cabelo/roupa.11 testes de camada e5 de lote passaram, além do build e da revisão da espada no Chromium. Entradas nativas, máscaras e contexto preparados a partir de assets existentes, sem novos pixels de personagem. Três chamadas de geração propostas com teto18 continuam aguardando aprovação; nenhuma foi executada. Runtime, catálogo e saves intactos.

## 21/10/2026 — Paper Doll: camadas nativas de espada e contato preservado

Continuação do PR45. Quatro camadas de arma64×64 isoladas pelo MCP Pro Flash, com máscara própria por frame e corpo totalmente congelado. Todos os contatos passaram e houve zero mudança na anatomia; a lâmina ainda varia visualmente e continua sem aprovação final. Um job falhou por sobrecarga; apenas o retry especificamente autorizado foi executado.20 gerações com cobrança confirmada, cobrança do job falho não exposta, sem presumir reembolso.

Auditor reutilizável de saída nativa isolada,10 testes Python, montagem que recusa frames faltantes, comparativo antigo/novo em Canvas2D e GIF com RGBA verificado. Rig de inspeção corpo/arma separado do `human-v1`, sem mudança no catálogo do jogo/save. [Relatório e limites](PAPER-DOLL-ESPADA.md). Sem merge automático.

## 21/10/2026 — Idle frontal Paper Doll: cobertura parcial e inspeção reprovada

Branch `feature/paper-doll-idle-sul`, base `05e935e`. Publicação anterior PR44 concluída e conferida no Pages. Com aprovação de até27 gerações adicionais, foram cobradas11 em duas chamadas MCP: corpo Idle/sul e transferência de peças;5+5 PNGs originais preservados. Encaixe reprovado: braços/roupa e contato mão/espada não acompanham a base. Nenhuma arte nova ativada, retry ou pintura corretiva. Prévia comparativa animada e pacote local de quatro camadas, todos explicitamente não aprovados.

Compositor aceita linhas de direções parciais e mantém fallback atômico nas ausentes; bancada informa cobertura parcial. Testes Node, build, Chromium desktop/mobile, pacotes reais/geométricos,28 perfis, sete classes/Haki/Zoan e saves. O lote não conclui a validação artística modular. [Relatório, custos e pendências](PAPER-DOLL-IDLE-SUL.md). Sem merge automático.

## 21/10/2026 — Publicação da prévia estática Paper Doll

Publicação autorizada pelo proprietário. `tools/build_pages.py` inclui por allowlist a prévia de uma pose frontal e os recursos que ela usa; README e relatório apontam para a página. Não ativa peças no runtime, não altera saves e não publica a pasta de gerações inteira. Validação: build Pages, teste Node Paper Doll, teste Playwright da prévia no pacote estático e cache/saves.

## 20–21/10/2026 — Piloto estático Paper Doll e limites do Pixen

Branch `feature/paper-doll-primeiras-pecas`, base `dc59e4d`. PR43 publicado e conferido no Pages. Executadas5 chamadas Pixen de84×84, cobradas5 gerações pelos getters, após aprovação adicional da correção de rosto. Todos os jobs terminaram. Nenhuma peça modular final foi aprovada: cabelo/roupa/espada mudaram pixels fora da peça, cabelo encobriu o rosto e roupa também alterou o shorts.

Originais, fontes, inspeções, auditorias, manifesto/blueprint e página de revisão preservados em `pixellab-pip-generations/paper-doll-human-pilot-20261020/`. Prévia facial local copia75 pixels gerados e conserva o corpo original fora da cabeça; é rascunho, não arte final. Extrações locais autorizadas produziram rascunhos separados de cabelo/roupa/espada, com zero alterações fora de cada máscara; a montagem estática permite alternar peças, sem simular animação. Auditoria tem modo estrito e modo explicitamente rotulado de inspeção. Sete testes Python, build Pages e página de revisão em navegador passaram; runtime e saves intactos. Revisão artística pendente antes de planejar animações reais; inpaint mascarado é alternativa não autorizada, sem consumo adicional. Ver `docs/PAPER-DOLL-PILOTO.md`.

## 20/10/2026 — Personagem único: base compartilhada

Branch `feature/personagem-unico-base`, base `origin/main a1d68d4`. Evolui a infraestrutura Paper Doll para um corpo/cabelo comum às sete classes e quatro facções. Classe seleciona uma das seis categorias de ataque e arma; facção seleciona roupa padrão. Equipamentos conhecidos têm bindings próprios, sem renumerar itens ou escrever campos no save. Armas incompatíveis, poses ausentes e Zoan preservam o legado.

A bancada recebeu seleção de classe/facção, armas por categoria e aviso explícito quando só existe referência original em repouso. Pacotes locais `swordsman-v1` continuam aceitos; novo manifesto `human-v1` contém apenas definições ausentes, sem PNG. Não houve geração PixelLab nem editor de aparência; o conjunto modular real continua pendente.

Verificação: suites Node, build Pages, bancada desktop/mobile,28 perfis×3 ações e28 carregamentos de save isolados, regressão de composição/equipamentos/Haki/Zoan e combate das sete classes. Capturas novas em `docs/evidence-paper-doll/`, fora do Git. Rollback por revert do commit desta branch; não há migração de saves a desfazer. Publicação/merge somente após aprovação.

# Histórico de desenvolvimento

## 20/10/2026 — Pés do Dachshund na forma Zoan

- Branch `fix/inu-zoan-grounding`, sobre o `main` remoto `8625aa6`. Corrigida a altura de cada quadro e direção do Cão Salsicha de Âmbar em `zoan-art.js`: margens transparentes diferentes entre idle, caminhada e ataque faziam a forma flutuar. Os PNGs, as outras Zoans, os atributos e os saves não mudam.
- Cobertura em `tests/zoan-grounding.test.cjs`; 29 suítes Node e `python tools/build_pages.py` aprovados. Inspeção visual na transformação e caminhada lateral do laboratório DEV. Detalhes em [ZOAN-RANK-E.md](ZOAN-RANK-E.md).

## 20/10/2026 — Paper Doll 1.0, Fase1: infraestrutura com fallback

- Branch `feature/paper-doll-fase-1`, base `5047eea`; checkpoint anterior de animações incorporado sem modificar main. Novo `paper-doll.js` sincroniza pose/frame e compõe camadas RGBA, valida rig/folhas/células, resolve profundidade por direção/pose e mantém LRU de4MiB/96 composições. Falhas não desenham camadas parciais.
- `paper-doll-assets.js` prepara bindings puros de equipamento e o rig de Espadachim; placeholders ausentes não carregam URLs fictícias. Mundo, retrato e prévias consultam a mesma configuração. Zoan tem prioridade; físicas, saves e eventos de impacto mantidos. Carregador de imagens compartilhado usa a raiz do script para funcionar também na bancada em subpasta/Pages.
- Bancada estática em `tools/paper-doll-inspector/`: quatro direções, ações, frames, zoom, pivôs, visibilidade, comparação e importação local de manifestos/PNGs em rascunho, sem upload ou alteração de save. Contrato e manifesto-template em `docs/PAPER-DOLL.md`/`assets/paper-doll/`.
- Auditados80 frames anteriores. O job hurt/leste antes incerto foi confirmado como falho por travamento; não reenviado. Zero gerações novas. Faltam320 frames/12 folhas de quatro peças reais; a entrega é infraestrutura/prévia com fallback, **não validação artística de Espadachim modular**.
- Validação:31 suítes Node, sintaxe/build; Chromium no projeto e no dist,80 poses por viewport desktop/mobile idênticas ao fallback; conformance geométrica em80 poses, pacote local, LRU, troca/retirada de itens, reload, Haki e Zoan passaram. Medição local do fallback:10.000 resoluções em7–11ms nas execuções locais; amostra de combate1,8s com109 frames, intervalo mediano de16,7ms e p95 de16,7–16,8ms, zero composições modulares. Esses números não avaliam arte modular real ou multidão de personagens.
- Capturas e JSON em `docs/evidence-paper-doll/`, fora do Git. Sem merge ou publicação automática. [Contrato e relatório detalhado](PAPER-DOLL.md).

## 20/10/2026 — Checkpoint de animações 2.0 e pausa para estudo Paper Doll

- Branch `feature/class-combat-animations-v2`, base remota `5047eea`. Preservado o trabalho iniciado: registro de conjuntos por metadados, carregamento sob demanda, estados especializados e efeitos de habilidade agendados uma única vez. Nenhum conjunto novo ativado como produção; Bento Espadachim e artes anteriores preservados byte a byte.
- O proprietário pausou novas gerações antes de autorizar as correções do piloto. As chamadas aceitas informaram13 gerações; seus recibos, frames originais e jobs pendentes foram preservados em `pixellab-pip-generations/class-combat-v2-20261020/pirate-brawler/`. Guarda/soco/combo sul não foram aprovados artisticamente. Sem retries novos, cancelamentos ou exclusões.
- 30 suítes Node, sintaxe, build e amostras reais de combate das sete classes no Chromium passaram. Capturas locais em `docs/evidence-class-combat-v2/`, fora do Git; esses testes são regressão da infraestrutura, **não aceite das seis classes com arte completa**.
- [Viabilidade, impactos técnicos, estimativas e proposta de migração](PAPER-DOLL-VIABILIDADE.md). Não houve implementação modular, alteração de saves, merge ou publicação. Aguarda nova especificação do proprietário.

## 20/10/2026 — Escala visual do Cocox

- Branch `fix/cocox-sprite-scale`, integrada ao `main` remoto `8625aa6`. O Cocox parecia pequeno porque os frames PixelLab têm margens transparentes amplas. A renderização agora usa escala uniforme de 2,25×, nearest-neighbor e âncora dos pés por animação/direção; a barra de vida foi elevada para não cobrir a cabeça. Os PNGs, dados de combate e saves permanecem iguais.
- Validação: `node --check` nos dois scripts, 28 suítes Node após integração com o `main`, `python tools/build_pages.py` e inspeção visual no navegador local durante a caçada na ilha.

## 20/10/2026 — Ilha dos Animais Raros e Cocox

- Branch `feature/rare-animals-cocox`, baseada no `main` remoto `ffe6f05`. Mapa 32×32 com células nativas 64×64, quatro clareiras conectadas, floresta densa, retorno ao porto e caçada Cocox Nv.35.
- Reutilizados água, árvores e recortes 64×64 da Ilha Dawn; sprites idle/corrida/ataque recuperados do personagem Cocox já salvo no PixelLab, sem nova geração. Definição persistida em SQLite pelo backend Python e exposta em `/api/monsters/catalog`; perfil do cliente confere com o catálogo.
- 27 suítes Node, teste Python, endpoint HTTP e build Pages validados. Consulta técnica, balanceamento e origem dos assets em [ILHA-ANIMAIS-RAROS.md](ILHA-ANIMAIS-RAROS.md).

## 20/10/2026 — Ilha Dawn manual do proprietário

- Branch `feature/dawn-mapa-manual`, base `bb2c87d`, preservando os tooltips do colaborador. Importado o ZIP PixelLab:56×40 tiles64, PNG e42 objetos originais preservados. Cais, floresta, praias e vila substituem o visual vulcânico no destino inicial.
- Máscara lógica de chão, footprints originais, chegada/retorno, sete setores e oclusão de atores integrados. Navegação16px com verificação exata opcional apenas para Dawn. IDs `beach`/setores, progressão1–10, chefe, economia e saves mantidos; zero gerações novas.
- 26 suítes Node, build/cache51 recursos e navegador em cinco resoluções aprovados.81 rotas, combate/recompensa/rollback/reload, oclusão e pixels originais verificados; sem costuras/cobertura ausente. [Fonte, arquitetura e resumo para o colaborador](DAWN-MAPA-MANUAL.md). Revisão por PR, sem merge/publicação automática.

## 20/10/2026 — Tooltips dinâmicos de itens e habilidades

- Branch `feature/dynamic-tooltips`, base `93ca616`, atualizada para `4425a67` do `main` remoto. A mochila e os slots equipados mostram caixa escura ao passar o mouse ou focar pelo teclado; itens do mesmo slot são comparados em duas colunas com diferenças de atributos e Poder. Valores numéricos zero não geram linhas.
- Atalhos de classe, Zoan, Akuma no Mi e Haki, transformação e nós de talento exibem nome, efeito e recarga/custo pertinentes. Metadados de habilidade das frutas são publicados pelo catálogo Python. As cores usam os tokens náuticos da HUD e as raridades existentes. Sem migração de save ou mudança de combate.
- Validação: 25 suítes Node, 6 testes Python de Akuma no Mi, `python tools/build_pages.py`, inspeção no navegador local de item, comparativo e habilidade antes e depois da integração com `main`. Capturas recentes foram vistas na sessão, sem inclusão no Git. Para desfazer, reverta o commit desta branch.

## 20/10/2026 — Cidade das Conchas reconstruída

- Branch `fix/cidade-conchas-rework`, base `93ca616`, preservando Zoans Rank E do colaborador. Ilha própria32×32/células64 no lugar do cenário legado: cais, mercados azuis, praça de vigília, bairro antigo e bastião. Sete fachadas com acesso, circuito de ruas, navios na água, carga nas docas e arco atravessável.
- Reutilizados o compositor compartilhado e PNGs existentes, sem gerações pagas. Água animada, variantes determinísticas e cache512/20. IDs `swamp`/setores/contratos, níveis11–20, chefe, drops e saves preservados; diário prioriza os contratos da região. Corrigida a inclusão de `zoan-art.js` no build, sem alterar a mecânica do colaborador.
- 24 suítes Node, sintaxe, build/cache46 recursos e navegador real em cinco resoluções; caminhada, chefe, recompensa/rollback/reload e isolamento DEV. Sem lacunas/costuras observadas nas capturas; revisão visual em `docs/evidence-conchas/`, fora do Git. Entrega por PR, publicação mediante aprovação. [Arquitetura e resumo](CIDADE-DAS-CONCHAS.md).

## 20/10/2026 — Orange Town terreno V2 (candidato para aprovação visual)

- Branch `fix/orange-town-terrain-v2`, base main/PR29 `9529a4d`. Removidos contornos aleatórios, recortes evenodd e espelhamentos; sprites Wang completos, grade dual, núcleo reutilizável com suporte validado a47 estados blob quando houver47 sprites próprios.
- Mundo/física/spawns/rotas/props/saves preservados por comparação exata. Cache512/20 mantido;23 suítes Node, build/cache43 recursos e capturas reais de antes/depois passaram tecnicamente, sem costuras entre chunks.
- Lote autorizado até19, consumo observado10 gerações. Harmonização local explicitamente autorizada e aplicada sem custo: dois verdes de transição compatibilizados com a base; bordas originais4px restauradas nas variantes grama/areia. Variante de pedra rejeitada por alterar juntas; originais preservados. Capturas recapturadas e inspecionadas,23 suítes Node e build/cache43 aprovados. **Não publicar/mesclar antes da aprovação visual do proprietário.** Limites artísticos e diagnóstico em `docs/ORANGE-TERRAIN.md`, revisão pelo PR30.

## 20/10/2026 — Orange Town 21–30

- Branch `feature/orange-town-21-30`, base `1d8157a`. Implementados mapa 32×32, cinco setores, oito fachadas conectadas, navegação/câmera, entrada Nv.21, região 21–30, contratos e primeira vitória. Preservadas as alterações do colaborador e mapas anteriores.
- Arte própria integrada: quatro construções, piso64, quatro monstros48 e caminhadas cardeais com nove quadros (referência +8), mantendo os pixels/canvases transparentes originais. Consumo35 de teto40. Retrato do Capitão Fagulha no Arquipélago; manifesto `ready:true`; diário mostra os contratos da ilha.
- 22 suítes Node, sintaxe, build/cache41 recursos, cinco resoluções, carregamento da arte em dist, combate real do chefe em DEV, resgate/rollback/reload e amostras30s das sete classes passaram. Regras, fontes e limites em `docs/ORANGE-TOWN.md`. Capturas e originais completos preservados localmente; sem evidências em massa no Git. Revisão via PR28, sem merge automático.


## 20/10/2026 — Mochila limitada a sete fileiras

- Branch `fix/inventario-grade-sete`, base `e674d6c`. Grade desktop 7×7 (49 por página), tablet 6×7 (42) e móvel 5×7 (35). Removida a rolagem interna da bandeja; demais itens ficam nas páginas. Capacidade de 120 e fundos anteriores preservados.
- Mudança de breakpoint com inventário aberto recalcula a página pelo índice anterior, sem alterar itens, filtros, economia ou saves. Evidências em `docs/evidence-inventario-sete/`; rollback por reversão do commit.
- Teste Node de inventário, sintaxe, build e cache aprovados. Chromium nas sete resoluções e 1181×768: sete fileiras, grade sem rolagem própria, paginação dos 112 itens sem perda/duplicação, busca e fechamento móvel. Redimensionamento com janela aberta confirmado; sem erros JavaScript observados.


## 20/10/2026 — Inventário: fundo único e mochila mais densa

- Branch `fix/inventario-slots-espacamento`, base `4b902b9`, preservando as alterações de Akuma do colaborador. Removido o fundo azul herdado de `.op-slot-frame`; moldura interna e ícone transparentes deixam um único fundo nos equipamentos.
- Mochila de 35 para 64 posições por página; capacidade total de 120 preservada. Até oito colunas desktop sem esticar slots, altura da bandeja flexível, rolagem interna e paginação acessível. Tablet/móvel mantêm seis/cinco colunas.
- Sem mudanças de itens, economia, equipamentos ou estrutura dos saves. Evidências locais em `docs/evidence-inventario-slots/`; rollback por reversão do commit.
- Validação: Node de inventário compacto e Forja, sintaxe de game.js, build e cache aprovados. Chromium nas sete resoluções e 1181×768: 64 slots, páginas sem repetição/perda de 112 itens de teste, busca, fundos internos transparentes, fechamento móvel e ausência de overflow horizontal; sem erros JavaScript observados.


## 20/10/2026 — PNGs do menu Personagem

- Branch `feature/icones-menu-personagem`, base `b6e392a`, incluindo a atualização de Akuma Rank E do colaborador. Talentos, Conquistas e Akuma no Mi receberam PNGs nativos transparentes 24×24; Personagem e Haki preservados.
- PixelLab Pixen: três chamadas aprovadas, 3 gerações cobradas, sem retries ou processamento dos originais. Proveniência e prompts em `docs/MENU-PERSONAGEM-ICONES.md`. Sem mudanças em gameplay/saves/layout.
- Testes Node de menu/UI e build aprovados; PNGs idênticos no build. Menu e navegação conferidos nas sete resoluções em Chromium, sem erros JS observados ou mudança de progresso. API de catálogo de Akuma pendente no preview estático: disponibilidade do backend fora do escopo desta checagem.


## 20/10/2026 — Restaurar o tema de navio

- Branch `fix/tema-nautico-madeira`, base `fe1fc66`. O proprietário rejeitou a troca visual da UI 2.0; restaurados madeira escura, bronze, cordas, verde-marinho e pergaminho, preservando layout, foco e responsividade.
- Tokens de materiais reutilizáveis e estilos existentes ajustados diretamente. Inventário com três colunas de pergaminho, bandeja/slots de madeira escura, pesquisa legível e destaque de raridades; menus, barra de ações, Forja, personagem e demais janelas harmonizados.
- Sem mudanças em gameplay, assets, saves ou regras. Evidências locais separadas em `docs/evidence-tema-nautico/`; rollback por reversão do commit visual.
- Validação: 20 suítes Node, matriz Chromium nas sete resoluções (13 janelas + criação/HUD, toque/horizontal/movimento reduzido), operações reais da Forja e build/cache aprovados. Verificação adicional de contraste em pergaminho e cartões de monstros; cabeçalho/fechar do inventário acessíveis após rolagem nas três larguras móveis. Sem erros JavaScript observados.


## 20/10/2026 — UI/UX 2.0

- Fundação com tokens, componentes e factories DOM, camadas isoladas para o legado e uma única prioridade global de visibilidade. Os 1112 usos textuais anteriores de `!important` foram migrados sem excluir as regras de funcionalidades.
- HUD nas bordas: Haki junto às ações, perfil menor, menus diretos, áudio em área própria, filtros locais do chat, expedição recolhível e rota junto ao progresso. Superfícies fixas compartilham o mesmo contexto de empilhamento.
- Janelas de inventário/forja/personagem/talentos/conquistas/Haki/frutas/viagem/prisão/contratos/mercador/ajuda e criação usam a base comum; contraste dos atributos e notificações em fluxo revisados. Foco, Escape, backdrop, confirmação e abertura no início do conteúdo padronizados.
- `docs/UI-DESIGN-SYSTEM.md` e `AGENT.md` orientam futuras janelas. QA em Chromium nas sete resoluções, toque/horizontal/movimento reduzido, regressões de Forja/Haki/ícones, build e cache. Nenhuma geração de arte ou alteração de regras de gameplay/saves.

## 20/10/2026 — Ícones de itens PixelLab

- 64 PNGs transparentes32×32, espada45 selecionada pelo proprietário; 35 reduções nearest-neighbor aprovadas e29 fontes nativas32.
- Caminhos atualizados no inventário, forja, drops, criação das classes, Livro da Vontade e recompensas da prisão. SVGs antigos preservados; catálogos, stats e saves sem mudança.
- Consumo54 na produção e10,1 na amostra; duas correções Pixen adicionais aprovadas. Documentação e teste visual em `docs/ICONES-ITENS-PIXELLAB.md` e `tests/item_icons_browser.py`.

## 19/10/2026 — Caçadas regionais 1–20

- Níveis fixos por setor: Dawn 1–10 e Conchas 11–20; entrada de Conchas passa para Nv.11.
- Chefes Nv.10/Nv.20 com arena final, 12 abates locais e espera de 90s persistida após derrota.
- Avisos no chão, mira travada, interrupção por controle e tentativa de desvio automático.
- Rota por caminhada, quatro contratos locais e arma rara/épica de primeira vitória, com resgate transacional protegido contra mochila cheia.
- Módulo `hunt-system.js`; sem mudanças de terreno/dimensões ou gerações pagas. Integração e resumo para o colaborador em `docs/CACADAS-1-20.md`.
## 19/10/2026 — Integração de Akuma no Mi com trilhas sonoras

- Branch `feature/akuma-no-mi-release` atualizada por merge de `origin/main` (`508733f`), preservando o compêndio, slot, bônus e VFX das frutas e o novo módulo de áudio com as duas trilhas.
- Conflito em `tools/build_pages.py` resolvido incluindo `akuma-system.js`, `audio-system.js` e `audio-system.css`. `index.html` carrega ambos os módulos; o build copia as músicas em caminhos relativos.
- Validação: 15 suítes Node passaram; sintaxe de `game.js`, `akuma-system.js` e `audio-system.js` passou; `python tools/build_pages.py` gerou os três módulos com hash de cache e copiou as duas músicas. No navegador local, controle de música, abas e slots de Akuma no Mi foram conferidos.
- Saves permanecem isolados: Akuma no Mi usa o save do personagem existente; preferências de áudio usam `mare-partida-audio-v1`. Para desfazer, reverter o merge na branch, sem alterar `main`.

## 19/10/2026 — Constelações, conquistas e finais passivos

- Árvore conectada com tronco, ponte, finais, arraste/zoom e foco; removido o grid independente.
- Nova aba Conquistas com 31 metas e até 72 PT extras quando todos os sistemas forem liberados; histórico observado, resgate único, orçamento derivado e hooks futuros.
- 21 finais das sete classes integrados aos eventos reais de combate. Recursos na HUD, clone, campos, rebotes, escudos, CC e reviver com recargas persistidas.
- Dois ramos, um intermediário e um final por build; finais custam 3 PT e exigem 50 comuns mais ponta avançada. Migração v2 mantém ranks antigos e saves.
- Senhor do Submundo autoriza caixas Nv.1 nas caçadas, sem liberar gemas/pérolas diretas globalmente.
- Sem novas gerações pagas. Grupos reais e sistemas de frutas/Haki/Bounty continuam futuros; estado e testes documentados em docs/TALENTOS.md.

## 19/10/2026 — Árvores de Talentos das sete classes

- Personagem passa a apresentar seleção entre status e Talentos, com árvore responsiva e inspeção dos efeitos.
- 1 PT por nível, builds independentes, dois ramos simultâneos, cinco tiers e escolha única entre três exclusivos por classe.
- Integração passiva com dano, precisão, crítico, veneno, controle, quebra de defesa, abates, energia, escudo letal, contra-ataque e drops; efeitos secundários sem recursão.
- Prévia e confirmação atômica, recarga persistida, migração idempotente com backup e reset no porto. Inventário, equipamentos, atributos e exclusividade dos drops preservados.
- Suporte usa somente destinatários reais; a versão permanece solo, sem grupo fictício. Contratos de cura em corrente e controle preparados para a integração futura.
- Arquitetura, parâmetros iniciais e limitações em docs/TALENTOS.md. Nenhuma geração paga.

## 19/10/2026 — Modos de jogo e rework da seleção de fases

- M/HUD, NPC e comandos de viagem abrem lista de modos com ícone + texto. Arquipélago e Impel Down independentes; removida a aba da prisão do mapa.
- UI da prisão com navegação por andares liberados, entrada bloqueada, nível/ondas, monstros previstos com imagem/nome/quantidade/vida/ataque, primeira conquista e Marcos no painel inferior direito.
- Retirados os fatores, fórmula e tabela de escala da interface. Matemática preservada no módulo lógico, sem backend remoto novo.
- Composição prevista reutiliza os monstros existentes, três ondas e nível por andar, com chefes a cada dez. Nenhuma partida/onda real habilitada.
- Opções de avanço automático e pausa antes de chefes persistidas. A base de conclusão fornece a próxima ação quando disponível; em produção permanece indisponível.
- Regras de caixas, drops e saves preservadas. SVG original da prisão, sem consumo pago. Detalhes e testes em docs/IMPEL-DOWN.md.

## 19/10/2026 — Impel Down e rework de drops

- Aba em Mapa com 100 andares, detalhes de dificuldade e marcos, todos bloqueados para entrada. HUD continua com seis ícones.
- Base pura de progressão por vitória sequencial e escala HP/ATQ/DEF de 0,5×, 2×, 3×…10× por blocos. Encontros e mapas da prisão não habilitados.
- Removida a rolagem global de Pérolas de monstros, inclusive chefes. Gemas/Pérolas/Caixas reservadas à origem Impel Down; gemas ainda sem item ou regras.
- Dez marcos, nos andares 5 a 50, de uma Caixa de Pérolas Nível 1. Livro de concessões e prêmio pendente com mochila cheia; APIs bloqueadas em produção.
- Caixas Nível 1/2/3 preparadas como consumíveis; abertura confirmada, pérola do mesmo nível, cinco atributos equiprováveis e persistência transacional. Níveis superiores sem marcos habilitados.
- Estoque de pérolas, itens, sockets e progresso preservados. Migração idempotente com backup local; caixas excluídas de equipamento/forja. Build Pages com módulo e hashes de cache.
- Documentação: docs/IMPEL-DOWN.md. Sem consumo pago.

## 19/10/2026 — Regiões e detalhes do Arquipélago

- Abas abaixo do título: East Blue padrão, Alabasta bloqueada. Oito ilhas com faixas sequenciais de dez níveis.
- Ilha Dawn e Cidade das Conchas renomeiam as áreas existentes; IDs beach/swamp, entrada Nv. 1/Nv. 8, terrenos, combate e saves preservados.
- Clique inspeciona; botão separado realiza a viagem. Seis destinos futuros inspecionáveis com viagem bloqueada.
- Preview dos chefes existentes e fallback Indisponível para ausência de configuração ou erro de imagem. Drops reais nas duas áreas; sem porcentagens fictícias.
- Catálogo archipelago.js incluído no preview ao vivo e no build Pages com hash de cache. HUD por ícones e água animada preservadas.
- Regras e verificação: docs/ARQUIPELAGO-REGIOES.md. Sem consumo de gerações pagas.

## 19/10/2026 — Metas de nível nos navios

- Ruínas de Brasas exibe Meta 1–10; Fenda da Névoa, Meta 10–20. São faixas recomendadas, com requisitos reais Nv. 1/Nv. 8 preservados.
- Destinos futuros mostram Meta a definir e continuam bloqueados. Sem alteração de progressão, mapas, saves ou consumo pago.


## 19/10/2026 — Mapa de viagens por navios e menu de ícones

- Unificação Mapa/Caçadas em janela de água animada, seis navios em círculo e bússola central; sem novo mapa de jogo.
- Navios 1 e 2 usam os mapas existentes, com os requisitos Nv. 1/Nv. 8 preservados. Navios 3–6 bloqueados como Em breve.
- Seis ícones no menu, rótulos por hover/foco, nomes acessíveis; sem hambúrguer e sem expansão que voltava a exibir textos. Preferências antigas preservadas no save, sem aplicação ao novo menu.
- NPC/atalho M/botão de expedição convergem para Mapa; escolha faz a viagem real. Removida a duplicação com a lista antiga e o mapa local no mesmo menu.
- Testes de integração adaptados para escolher o navio, com navegação, requisitos, destinos futuros, foco/teclado/toque, animação real/reduzida e persistência. Artes/saves/mapas preservados; nenhum consumo pago.
- Validação: todos os testes Node/sintaxe, oito grupos de viagens (cinco resoluções + bloqueios + água em relógio real + ausência de exceções), oito da área, doze de ilha/HUD, três de inventário/atributos e pacote Pages mobile passaram.
- Base e4e405b, branch feature/mapa-navios-menu-icones; rollback por reversão, sem migração de save.


## 19/10/2026 — Ruínas compactas e padrão de mapas

- Redução de 64×64 para 32×32 tiles de 64px: mundo 2048×2048, metade da largura/altura, um quarto da área anterior.
- Composição refeita: três níveis, dois paredões com colisão, cinco escadas, oito casas com acessos à rua e uma única ponte diagonal sobre lava, necessária para chegar à fortaleza.
- Cais/estaleiro com carga e mastros, ruínas altas com colunas, fachadas orientadas às ruas e naufrágios na água; 37 elementos de cenário. Sem novas gerações pagas.
- Renderizador e mapa de navegação usam dimensões do modelo, sem limites 64/4096 fixos. Spawn e proximidade do chefe ajustados à escala compacta; economia, combate, saves e artes preservados.
- AGENT.md seção 5.3 fixa 32×32 tiles/64px para mapas futuros e critérios de pontes, elevações e fachadas. Mapas legados exigem tarefa explícita para redimensionar.
- Oito grupos Node específicos e regressões existentes; aceitação desktop/mobile, ponte/escadas, vinte derrotas, retorno/persistência e pacote Pages versionado. Evidências locais fora do Git.
- Checkpoint: branch feature/ruinas-compactas-32, base 86b85c1; rollback por reversão do commit, sem migração de save.


## 19/10/2026 — Atualização de cache no GitHub Pages

- O build agora adiciona hash de conteúdo aos endereços dos 13 scripts e duas folhas de estilo. Um HTML novo não reutiliza o endereço dos scripts de uma publicação antiga.
- Não limpa localStorage, não migra saves e não altera o jogo ou o mapa.
- `tests/pages_cache_browser.py`: pacote estático validado em Chromium mobile 393×852, script antigo disponível no endereço sem versão, mapa embers 4096×4096, quatro monstros carregados, save preservado após recarga e nenhuma exceção.
- Build Pages e seis grupos Node da área passaram. Captura local em docs/evidence-pages-cache/mobile-new-map.png.
- Uma página que já estava aberta precisa ser reaberta; o link com query nova força a busca do documento atualizado no mesmo domínio, preservando o save.


## 19/10/2026 — Ruínas de Brasas 64×64

- Reconstrução em mundo 4096×4096, sete setores, rotas navegáveis, ruínas e quatro monstros com frames 48×48.
- Terrenos Pixen nativos 64px, atlas Pro, fogueiras em quatro quadros e fluxo de água/lava; fontes preservadas.
- Spawn alcançável por distrito, chegada protegida, chefe na fortaleza e retorno pelo cais. Corrigida continuação do tick de caça após retorno ao lobby.
- Cache de terreno limitado a 20 chunks; painel Mapa traça trajetos reais. Save `beach`, economia e mapa da Fenda preservados.
- Todos os testes Node, sete grupos de navegador específicos e doze de regressão da ilha/HUD passaram. Três resoluções, vinte derrotas, retorno e recarga. Build Pages validado.
- Referências, custo informado de 39 gerações e limitações em RUINAS-BRASAS.md e ART_BIBLE.md. Caminhada/ataque dos monstros adiados por orçamento; oito poses estáticas por monstro.
- Branch/checkpoint: feature/ruinas-brasas-64x64; rollback por reversão do commit, sem migração de save.


## 18/10/2026 — Slots de fusão e inventário de pérolas

- Cinco slots reais em ambas as modalidades, com clique, drag, remoção individual e limpeza; seleção sem consumo.
- Pérolas agrupadas somente pelo estoque atual, com filtros, quantidade livre e unidades bloqueadas identificadas.
- Fusão de pérolas valida exatamente cinco IDs selecionados; incompatibilidade, repetição e itens ausentes são recusados antes do pagamento.
- Estoque aberto atualiza após loot/consumo; custos e probabilidades preservados.
- Confirmações listam materiais e consequências. Testes/capturas em evidence-fusion-slots; regras em FUSAO-SLOTS.md.

## 18/10/2026 — Refatoração da Forja

- Seleção visual de equipamentos e pérolas, busca/filtros/paginação/lista e painéis com rolagem independente.
- Refino até +20, garantia até +5, custos por nível e histórico, mantendo fórmula de status e sem destruição/rebaixamento.
- Fusão de cinco equipamentos por raridade, nível mínimo, tipo escolhido e arma da classe; Supremo desabilitado.
- Reforja por linha ou total, contador de custo +30%, confirmação sem RNG antecipado.
- Confirmação para imbuimento, remoção, fusões e aprimoramento; revisão transacional e trava contra clique repetido.
- Migração v3 com backup original; ícones, mapas, câmera, personagens e combate preservados.
- Regras em FORJA-REFATORACAO.md; testes e capturas em evidence-forge-refactor.

## 18/10/2026 — Forja 2.0 e preservação do polimento em andamento

Implementados modelo transacional independente e quatro abas reais. Aprimoramento mantém preço/chance/+5 e usa área reservada de resultados.25 pérolas têm catálogo/ícones, instalação, remoção com custo e fusão. Seis raridades aplicam multiplicador na base, extras escaláveis sem repetição e sockets. Reforja troca apenas extras após confirmação. Extras e percentuais passam pelo cálculo central do personagem e são exibidos no inventário; equipamentos antigos têm migração determinística com backup do JSON original.

Mantidos os ajustes já implementados no pedido anterior: menu compacto/expandido com preferência, HUD com nome/nível separados, grade7×5, comparação/feedback de equipamento, resultado de atributos e notificações compactas. As seções removidas do menu Personagem continuam ausentes. Nenhuma nova alteração de mapa/câmera/sprite ou geração paga.

Arquivos: novos `forge-system.js`, `forge-ui.js`, `assets/ui/pearls/`, `tools/forge_economy.cjs`, `tests/forge-system.test.cjs`, `tests/forge_browser.py`, relatório/catálogo/evidências. Alterados `game.js`, `character-system.js`, `index.html`, `ui-nautical.css`, `tools/dev_server.py`, README e regressões. A sprint anterior em andamento também adicionou auxiliares de captura/feedback e `tools/simulate_initial_balance.cjs`; seu diagnóstico está em `BALANCEAMENTO-INICIAL.md`, sem aplicar a curva de inimigos candidata.

Testes:11 grupos Node da forja;25 combinações de pérolas,1.000 resultados de raridade,6 raridades e7 classes. Cinco grupos da forja no Chromium, operações reais nos três tamanhos, persistência e migração. Mais12 grupos de personagens,12 de ilha/HUD,7 de UI náutica e3 de feedback/menu, além das regressões Node existentes. Simulação econômica:2.000 jornadas até Nv.5; custo exato esperado4.800.000dobrões, média simulada4.884.105.

QA encontrou e corrigiu: resultado antigo fora da dobra, movido para região própria no início da operação; menu móvel sobre a HUD, separado verticalmente; teste de cancelamento que comparava relógio/regen, ajustado para conferir dados persistentes de progresso/recursos; alvo da forja atualizado ao equipar item pela mochila. Nenhuma fórmula de nascimento ou proposta de curva de monstros foi aplicada.

Checkpoint da Forja: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-forge2-20261018-202127`. Checkpoint anterior ao polimento: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-polish-20261018-183306`. Restauração deve respeitar edições posteriores; os backups de código não são cópias do LocalStorage. A cópia anterior à migração fica no próprio navegador, chave `-before-forge-v2`.

Limite econômico registrado: chances prescritas tornam Nv.5 um objetivo extremamente longo; não se inventou pity, Supremo ou comércio. O protótipo continua local, sem servidor.

## 18/10/2026 — Interface náutica, atributos e ícones

Base: pasta corrente V12 sem Git. Auditoria e checkpoint realizados antes das edições. Não foram importados arquivos de versões antigas.

Antes: nascimento 5×5, distribuição unitária, símbolos como itens/menu, inventário com imagem antiga e janelas com estilos divergentes. Depois: tabela de nascimento total50 por classe, transações de pontos por quantidade, menu com assets fornecidos, renderer atual na prévia, 35 ícones próprios e sistema visual comum nas janelas.

Arquivos alterados: `character-system.js`, `game.js`, `index.html`, `README.md`, `tools/dev_server.py`, `tests/character-system.test.cjs`. Arquivos adicionados: `ui-nautical.css`, `assets/ui/items/` (35 SVGs e manifesto), `tools/create_item_icons.py`, `tests/ui_nautical_browser.py`, `docs/UI-ATRIBUTOS-AUDITORIA.md`, `docs/UI-HUD-ATRIBUTOS.md`, esta entrada e evidências. O servidor observa também o CSS compartilhado para recarregar a prévia ao salvar.

Verificação executada:

- `node --check game.js` e `node tests/character-system.test.cjs`: sintaxe e 12 cenários de atributos/migração.
- `node tests/world-system.test.cjs`: 39 verificações; `node tests/island-world.test.cjs`: 8 rotas e serviços.
- `node tests/combat-animation.test.cjs`, `node tests/combat-sprites.test.cjs`, `node tests/bento_directions.test.cjs`: estados, impacto, direção, pivô e playback passaram.
- `C:/Python313/python.exe tests/ui_nautical_browser.py`: 7 grupos; criação das sete classes, todos os incrementos, cancelamento, insuficiência, confirmação, saves v1→v2, troca de classe, 35 artes, onze slots e todas as janelas nos três tamanhos pedidos.
- `tests/characters_browser.py` com `MARE_CHARACTER_EVIDENCE_DIR=evidence-ui-character-regression`: 12 grupos passaram; combate/progressão das sete classes, migração antiga, inventário/forja e cura reais.
- `tests/island_browser.py` com `MARE_EVIDENCE_DIR=evidence-ui-island-regression`: 12 grupos passaram; HUD sem sobreposição, NPC após mover câmera, mais de 20 derrotas, contrato, retorno/recarga e caminho ao cais. Também verificou 768×740 e 390×844.
- SHA256 de 132 arquivos protegidos contra o checkpoint: nenhuma diferença. Resultado em `evidence-ui-nautical/protected-files.json`.

Correções durante QA: a primeira versão usava `data-panel` no contêiner e capturava cliques destinados a fechar/equipar; substituído por `data-view`, validado pelas ações reais. Compactados painel de atributos e seleção de classes após inspeção das capturas. O teste de confirmação compara dados de progresso, sem exigir que o relógio de tempo jogado pare durante a captura. Testes finais concluídos sem erros JavaScript nos contextos isolados.

Capturas reais desta entrega em `evidence-ui-nautical/`, com galeria `index.html`; as evidências de regressão têm pastas próprias e não substituem o histórico artístico anterior.

Compatibilidade: investimentos permanecem separados da base e do orçamento. A migração é idempotente e preserva cópia anterior no navegador. Checkpoint de arquivos em `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-ui-attributes-20261018`; restauração deve respeitar trabalho posterior. Nenhum save do usuário foi acessado pelos testes.

Limites: sem paperdoll por peça de equipamento, sem mercado/cofre funcional; os botões existentes permanecem indisponíveis. Não foi feito balanceamento final do novo ritmo inicial. Próxima avaliação recomendada: playtest dos 50 pontos por classe e do tamanho dos textos, antes de expandir recursos.


## 19/10/2026 — Despertar (Haki), branch feature/haki-despertar

Base e2abfcb (PR #10). Adicionadas regras, estado persistente/efêmero, aba bloqueada com requisitos, livro consumível no fim do catálogo, drops de chefes Nv.30+, barra de Vontade, toggles manual/auto exclusivos e Rei/R com stun/debuff. Integração real em combate, conquistas e save transacional; preserva estoque e builds. Correção de foco da árvore ao redimensionar e da automação que não deve sobrescrever escolha manual. Três VFX do Workbench PixelLab preservados em RGBA, com export, metadados e blueprint; ícones 32×32 pagos ainda aguardam aprovação.

Validação: 13 suítes Node, Haki end-to-end em cinco resoluções e 20+ abates, sete classes de talentos, UI/transações da constelação, build e Pages/cache (25 recursos). Capturas em `%TEMP%/mare-haki-qa/`, excluídas do Git. Regras, compatibilidade e rollback em `docs/HAKI.md`. Estado: desenvolvimento concluído para lógica/HUD/VFX; sprint artística parcial pelos ícones pendentes. Nenhuma nova geração paga ou liberação da prisão/chefes diários.


### 19/10/2026 — Conclusão dos ícones Haki nativos32

Primeira chamada Pro aprovada: 10 gerações; retornou 16 ícones individuais64 em vez da grade solicitada. O proprietário recusou a redução e aprovou uma nova chamada32 (10 gerações). As 64 alternativas nativas32 foram inspecionadas; seleção delegada 33/16/23/61, copiada sem alteração para Armamento, Observação, Rei e Livro. Ícones no painel, mochila e botão Rei/R; `iconsReady:true`. Originais preservados, nenhum asset64 reduzido entrou no jogo. Custo total confirmado desta etapa: 20 gerações. Manifestos/blueprints registram ambos os resultados. Suíte de navegador Haki verifica imagens realmente carregadas e dimensões nativas32, cinco resoluções, transações e combate; build/cache mantêm 25 recursos versionados. PR #11 deixa de depender de arte pendente e fica pronto para revisão/merge após validação.

## 25/10/2026 — Hoya e aura Beta

Branch feature/hoya-genie-beta-aura sobre f6d1232. Gênio existente de 96px, buff 144px, controle por clique, proteção do invocador, atributos e duas habilidades Rank B. Nova aura Beta de 37 frames na passiva e prisão. Implementação, origem e testes em [HOYA-RANK-B.md](HOYA-RANK-B.md). Saves e índices anteriores preservados; sem novas gerações PixelLab.

Validação: 77 arquivos Node, 91 testes Python; Hoya em três resoluções com 20 abates, Beta/Hana e Supa no navegador, build Pages e diff check aprovados. Capturas fora do repositório; nenhuma geração paga.

## 25/10/2026 — Cancelamento Hoya e aura de energia Beta

Branch fix/hoya-controls-beta-orb sobre becbb85 (merge PR114). Botão/tecla 1 alterna para Cancelar Gênio durante a invocação. Cancelamento encerra todas as mecânicas temporárias e restaura o personagem, preservando energia e os prazos originais de recarga; botão Reconjurar inicia outra invocação somente após a recarga. Rota hoya-cancel valida a instância e invalida o ataque antigo. Skill 2 do Gênio subiu 16px vezes a escala, alinhando a base da folha aos pés. Beta passa a usar energy-orb-take-3 original (25×83ms), em primeiro plano, com a base cobrindo os pés, na passiva e prisão; tether preservado. Fontes anteriores de gosma removidas por não serem mais usadas. Nenhuma geração paga; saves e passivos preservados. Para reverter, reverter o commit desta branch.

Validação desta correção: 77 arquivos Node e 92 testes Python aprovados. Hoya no navegador em 1920×1080, 1366×768 e 1280×720; cancelamento real pelo botão, sem energia, preservação exata dos cooldowns, remoção da proteção, bloqueio da Skill 2 e reconjuração após recarga no relógio de teste. Beta/Hana na API local com nova aura e prisão, tether, mitigação, multihit e stun aprovados. Build Pages, preview estático e diff check aprovados; capturas locais de 25/10/2026 fora do Git.

## 26/10/2026 — Transição comum Zoan

Branch feature/zoan-transform-transition sobre 9d227ad. explosion-take-2 original em toda mudança de forma Zoan; 17×71ms, overlay frontal seguindo o personagem e revelação gradual da nova forma. Observador comum por identidade atende novas frutas sem lista de IDs e permite envelope visual maior por metadados. Reload/mapa/morte limpam a transição. Formas, combate, saves e recargas preservados. Origem, reprodução e reversão em [ZOAN-TRANSICAO.md](ZOAN-TRANSICAO.md). Nenhuma geração paga.

Validação: 81 arquivos Node, 92 testes Python; navegador nas sete Zoans em ambos os sentidos, três resoluções, API e Pages, morte/mapa/reload e recusa da API aprovados. Build Pages e diff check sem erros. Capturas recentes fora do Git.

## 26/10/2026 — Jiki Jiki Rank B

Branch feature/jiki-rank-b sobre 89ecb2d. Catálogo/lore/ícones/passivos, Grande Devorador com carga 6s e reconjuração gratuita, barra e partículas seguindo o jogador, dano 200–450%, raio de 2 tiles e explosão original; Punho Foguete homing com loop estrito 1–12 e despedaçamento 13–17, 250% no alvo. Backend valida tempo de carga/voo, energia/recargas, alcance, dono/instância e tokens únicos. Nove arquivos originais importados sem geração paga. Limpeza de carga, projéteis e VFX em transições/morte/retirada, recargas preservadas. Descrição dos itens de fruta conectada ao tooltip da mochila. Documentação e reversão em [JIKI-RANK-B.md](JIKI-RANK-B.md).

Validação: 82 arquivos Node e 99 testes Python; navegador em três resoluções, API local (inclusive 6s reais até lançamento automático), 20 abates e limpeza de estados. Build Pages, preview estático e diff check aprovados. Evidências e banco de QA fora do Git.

## 26/10/2026 — Árvores de talentos: Canvas e ícones HD

Base: 2f034b2; branch feature/talent-node-icons-dependencies.

Refatoração interna das sete árvores, preservando os 147 talentos, investimentos e regras. Canvas para conexões/ícones; configuração por classe, estados bloqueado/disponível/máximo, clique para investir na prévia e confirmação transacional existente. Nove ícones PixelLab 512×512 substituem os glifos da árvore; conquistas e HUD externo preservados. Requisitos comuns declarados nos dados e compartilhados por validação/normalização.

Arquivos: talent-system.js, talent-ui.js, game.js, ui-screens.css, assets/manifest e testes/documentação específicos. Nenhum save, credencial ou evidência em massa incluído. Evidências locais de 26/10 na pasta temporária de QA, fora do Git. Sem migração nova ou mudança de balanceamento; rollback por revert do commit.

Validação desta entrega: 83 suítes Node, 99 testes Python de backend/artes e 4 de hierarquia aprovados. Novo teste de navegador aprovado nas sete classes e sete resoluções, incluindo toque, falha de storage, saves v1, confirmação/reload, máximo, dependências e fontes HD. Mesmo fluxo principal aprovado no preview estático. Build Pages aprovado; 100 hashes JS/CSS e cópia dos assets conferidos. O teste legado pages_cache_browser.py falhou na asserção MareEmberRenderer.stats().monsters == 4 ao visitar Dawn; o renderizador do mapa não foi alterado nesta tarefa. Nenhum merge automático.

## 26/10/2026 — Revisão dos talentos aprovada pelo proprietário

Branch fix/talent-tree-96px-special-icons, a partir de main e302c09 (PR #120 já incorporado). Preservadas as alterações recentes do pacote Paper Doll do outro colaborador.

Ícones em 96px reais no zoom inicial, nove recortes transparentes, fundo oceânico enviado, janela responsiva com cabeçalho compacto e inspector sob seleção. Criados e integrados 42 ícones PixelLab específicos (21 intermediários + 21 finais), com transparência e manifestos de proveniência. Junção visual dos requisitos dos finais reduz cruzamentos. Sem mudança de save ou balanceamento.

Validação inicial: 83 suítes Node; navegador nas sete classes e sete resoluções; mesmo fluxo no pacote Pages; build aprovado. Revalidação sobre main atual registrada no PR. Capturas e auditoria de alpha ficam somente na pasta temporária local de revisão, fora do Git. O proprietário confirmou o visual e autorizou o envio. Rollback por revert do commit, preservando armazenamento local.

Validação final sobre e302c09: 84 suítes Node aprovadas; teste específico de assets repetido após conferir unicidade dos 42 PNGs e hash do fundo. Navegador aprovado nas sete classes e sete resoluções, também no pacote Pages atualizado, sem erros de página.

## 27/10/2026 — Impel Down jogável

- Branch feature/impel-down-map-progression, base58988dc. Solicitação explícita substitui a prévia bloqueada: um monstro por andar, HP/ATQ/DEF ×1,30 composto e chefes a cada5.
- Importado o mapa original PixelLab (34×21 células64), sem gerações ou mudanças na arte. Celas/perímetro sólidos, terreno/lava separado de colisão de tiros; mapa inteiro atrás dos atores. Procedência e SHA em assets/impel-down/provenance.json.
- Controlador independente em prison-system.js/game.js, navegação e combate existentes, spawns opostos, avanço automático, cura entre andares e recargas preservadas. Derrota reinicia o mesmo duelo. Andar100 encerra no porto.
- Gravação antes do avanço, retry visível em falha, ledger de marcos preservado, prêmio pendente com mochila cheia. Sem novo loot/XP/ouro regional. Savev1 e índices de itens mantidos. Preferências antigas preservadas no JSON, substituídas na execução pela subida automática pedida.
- Registro do mapa em world-system.js/HTML/Pages; auditoria aceita --map. Documentação consolidada em IMPEL-DOWN.md. Testes antigos Node ajustados apenas nas expectativas das regras substituídas.
- Validação:127 testes Node passaram; navegador real no código-fonte e pacote Pages, combate e subida, chefe5, hits duplicados, morte/respawn, reload, falha de storage, mochila cheia, resgate único e andar100. Quatro tamanhos:1920×1080,1366×768,1280×720,393×851; painel sem overflow horizontal.
- Regressão combat_vfx_browser.cjs: sete classes,20 abates cada, impactos e HP sincronizados. Auditoria completa:12 mapas,134/134 rotas válidas; no Impel624 células abertas,um componente e2/2 rotas,zero colisores inválidos/duplicados. As29 duplicações dos demais mapas são normalizadas pelo auditor existente, sem editar as fontes.
- Build Pages executado; sintaxe e git diff --check sem erros. Capturas locais temporárias impel-map-*.png e impel-panel-*.png, fora do repositório.
- Limites:chefes específicos e prêmios acima do50 ainda indefinidos; progressão estática/offline, sem servidor autoritativo. Reverter o commit restaura a prévia mantendo backup do save e ledger.

## 28/10/2026 — Deserto de Alabasta

- Branch feature/alabasta-desert,base c9ccaaa. Região Alabasta liberada:Deserto de Alabasta,Nv.40–50,entrada40. Mapa original81×72 tiles64 e111 objetos preservados; muros terreno2 e transições/cantos sólidos, água/exterior com colisão contínua, máscaras alpha no Y-sorting.
- Bananawani45:4244HP,212ATQ,89DEF,25DEF mágica; caminhada e ataque originais,56 frames alinhados sem reamostragem. Ampliação final de50% solicitada, constante em idle/walk/attack; pegada física preservada. Catálogo Python/JS e regras de região integrados. Sem gerações pagas.
-131 testes Node e2 testes Python passaram. Navegador:gate39/40,atributos reais,20 abates com XP/ouro,retorno/reload,24 verificações de muros com ambos atores e80 máscaras com429844 pixels transparentes sem vazamento de chão. Quatro viewports desktop/móvel. Auditoria:12/12 rotas,um componente,zero colisores inválidos/duplicados. Build Pages e diff check passaram. Falhas transitórias do servidor HTTP local padrão foram reproduzidas como scripts não carregados; a execução final passou em HTTP1.1 com backlog128,sem relaxar asserções.
- Procedência e hashes:assets/alabasta/provenance.json; regras,arquivos e reversão:docs/ALABASTA.md. Capturas temporárias fora do Git; saves e índices preservados. Push/PR não significam merge/deploy.

## 28/10/2026 — Respawns fixos e monstros reativos em todos os mapas

- Branch feature/fixed-neutral-monsters,base368cfea.82 pontos comuns fixos nas nove regiões,dois por setor;chefe de Dawn com ponto separado e requisitos preservados. Impel Down mantém um inimigo por andar e passa a reagir apenas a dano.
- Proximidade não provoca ataques;dano alerta somente o alvo atingido. Leash260px,retorno por navegação,proteção durante retorno,vida restaurada na origem e desengajamento após morte do jogador. Inimigos não são removidos ao mudar de setor.
- Respawn após pelo menos30s,no mesmo ponto,com prazo salvo por região para impedir reset por viagem/reload. Migração idempotente preserva progressão e ignora prazos inválidos. Catálogos Python/JS usam reactive_homebound;XP,ouro,drops e arte não mudam.
- Verificação:135 testes Node e2 Python passaram;83 pontos navegáveis e setores corretos;navegador nas nove regiões confirmou neutralidade,retaliação isolada,leash,morte,respawn,persistência/viagem/reload. Impel Down passou progressão/chefes/marcos/storage;Alabasta passou20 abates com o relógio de teste avançando o novo prazo. Build Pages e diff check passaram. Sem gerações pagas.
- Arquivos/reversão em docs/MONSTER-SPAWNS.md. Saves mantêm as mesmas chaves e índices de itens;campo adicional de prazos. Sem merge/deploy automático.
