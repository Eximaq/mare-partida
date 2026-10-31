[Revisão HD do inventário: componentes, ícones e ações contextuais](INVENTORY-HD-REFINEMENT.md).

[Inventário pirata HD e componentes reutilizáveis — sprint em revisão visual](INVENTORY-PIRATE-HD.md).

# Maré Partida — UI 2.0

## Identidade e auditoria

Identidade do navio preservada por orientação do proprietário em 20/10/2026: madeira escura com tábuas discretas, molduras de bronze, cordas na barra de ações, interiores verde-marinho da paleta anterior e pergaminho nas três colunas do inventário. A reestruturação melhora enquadramento, espaçamento e navegação; não autoriza substituir o tema por uma interface moderna genérica. O mundo ocupa a viewport; o centro pertence à exploração. Bahnschrift/Trebuchet nos títulos, Segoe UI no texto, números tabulares; sem fontes externas.

A base cedffb9 tinha seis estilos acumulados e 1.112 ocorrências textuais de `!important` (incluindo shorthands). Foram confirmadas sobreposições do áudio com o menu móvel e um perfil alto com Haki duplicando a barra de ações. Capturas anteriores estão localmente em `docs/evidence-ui-ux-2/before/` (fora do Git).

Os estilos específicos antigos permanecem em `@layer legacy`; as declarações antes importantes ficam em `legacy-priority`, preservando sua precedência interna como declarações normais. `tools/migrate_ui_layers.py` faz essa migração uma única vez via CSSOM, expandindo shorthands conforme o navegador. As camadas são declaradas nessa ordem em todos os arquivos; os componentes novos sem camada têm prioridade. Não adicionar novos overrides aos arquivos legados.

## Arquivos e tokens

- `ui-tokens.css`: paleta semântica `--rpg-*`, espaços 4/8/12/16/24/32, tipos, ícones, campos, slots, bordas, animações e camadas.
- `ui-components.css`: botões, campos, cards, slots, estados, modais, confirmações, foco e mensagens.
- `ui-hud.css`: perfil, alvo, ações, menus, áudio, chat e expedição nas bordas.
- `ui-screens.css`: composição específica de inventário, forja, personagem, criação, viagem e demais janelas.
- `ui-responsive.css`: adaptações tablet/móvel, orientação e movimento reduzido.
- `ui-system.js`: factories de HTML e comportamento DOM compartilhado, sem ler/escrever saves ou regras de jogo.

Camadas: mundo 0, HUD 20, popover 40, modal 100, confirmação 120, notificação 140. Usar os tokens; não inventar z-index isolados. Uma única regra de prioridade global (`.hidden,[hidden]`) protege a visibilidade contra os layouts.

## Componentes e novas janelas

`MareUI.button`, `card`, `tabs`, `slot`, `notice`, `empty`, `window` e `confirmation` fornecem a estrutura compartilhada. Texto e atributos são escapados. `body` de card/window aceita **somente HTML confiável montado pelo código**, nunca texto de jogadores ou HTML remoto. Os atributos permitidos são data/aria, id, title, type, role e tabindex; callbacks ficam no controlador da funcionalidade.

```js
const body = MareUI.card({
  title:'Materiais',
  body:MareUI.notice({text:'Nenhum material disponível.',tone:'info'})
});
// Dentro do roteador existente, reutilizar #panelOverlay e #dialogBody:
dialogBody.innerHTML = body + MareUI.button({
  label:'Ver inventário',attributes:{'data-panel':'inventory'}
});
MareUI.upgrade(dialogBody);
```

Para um modal independente, `MareUI.createWindow` já monta backdrop, cabeçalho, fechamento, foco e atalhos. Preferir o roteador atual para impedir duas janelas principais concorrentes. Não clonar o HTML completo da Forja ou do Inventário.

```js
const janela = MareUI.createWindow({
  id:'resumo-viagem', title:'Resumo da viagem',
  body:MareUI.empty({title:'Sem novas descobertas',description:'Explore uma ilha para registrar sua viagem.'})
});
MareUI.open(janela); // X, Escape e backdrop fecham; foco retorna à origem.
// Ao descartar permanentemente a instância:
MareUI.destroy(janela);
```

`MareUI.window` também expõe só o HTML, para controladores que necessitem montagem própria. `bindModal`, `rememberFocus`, `restoreFocus` e `syncModals` são o contrato de integração usado pelo roteador existente. Não misturar a camada de interface com regras de gameplay.

## Composição e breakpoints

Desktop: perfil superior esquerdo, alvo superior central apenas em combate, menu superior direito, chat inferior esquerdo, ações inferiores centrais e expedição inferior direita. Madeira deve ser perceptível em cabeçalhos, menus, botões e barra de ações, com molduras de bronze. Interiores usam a paleta náutica anterior; o inventário usa pergaminho e uma bandeja de madeira com slots de madeira escura, inclusive os vazios. Não misturar slots azul-acinzentados com esse fundo. Preservar bordas de raridade e estados de interação legíveis. Ícones existentes não são redimensionados nos arquivos; renderização pixelada.

Breakpoints canônicos: 1180 para colunas compactas do inventário; 1024 para tablet; 760 para smartphone; 480 e 360 para densidade reduzida. CSS custom properties não funcionam nas condições de media queries: usar esses mesmos números. Espaços seguros usam `env(safe-area-inset-*)`; alturas usam `dvh`. Campos e conteúdos devem permitir encolher (`min-width:0`), e os corpos de janelas têm rolagem vertical. Nunca expandir slots para ocupar vazios.

## Interação

Personagem e Modos continuam com acesso direto pelos menus suspensos e atalhos P/M. Modal lembra a origem do foco, restringe Tab ao conteúdo, fecha por Escape/clique no backdrop e devolve o foco. Confirmações mantêm o cancelamento como primeiro foco e ficam acima da janela principal. A criação inicial não pode ser dispensada para entrar sem personagem. Fundos ficam `inert` durante um modal; não remover funcionalidades para esconder sobreposições.

Estado selecionado usa `aria-pressed`/`aria-selected`; bloqueios usam `disabled` e explicação. Sucesso é verde e falha vermelha, sempre acompanhados de texto. Tooltips devem aparecer também por foco. Usar `MareUI.empty` e `notice` para orientar a próxima ação; não inventar números, recompensas ou botões ativos para recursos futuros.

O painel de notificações é um nó estável: fora das janelas fica na borda; com modal/confirmacão entra no fluxo da janela, nunca sobre os botões. `MareUI` conserva sua referência ao desmontar confirmações. Chat móvel e detalhe da expedição são exclusivos; em horizontal baixo o chat temporariamente recolhe o perfil para manter a área de digitação acessível. As preferências de áudio e suas regras continuam no módulo original, sem alteração.

## QA e limites

Validar 1920×1080, 1366×768, 1280×720, 1024×768, 393×852, 360×800 e 320×568, mais orientação horizontal, viewport reduzida por zoom e `prefers-reduced-motion`. Conferir capturas, foco, mouse, teclado, toque, scroll e dados do save em contextos isolados. Evidências ficam em `docs/evidence-ui-ux-2/`, fora do Git. Não atribuir alterações de balanceamento, dados, mapas, áudio ou persistência a esta atualização: o escopo é apresentação e interação DOM.


## Validação da entrega — 20/10/2026

- 20 suítes `tests/*.test.cjs` e sintaxe de todos os scripts raiz: aprovadas.
- `python -X utf8 tests/ui_ux2_browser.py`: criação, HUD e 13 janelas nas sete resoluções, toque, horizontal, movimento reduzido, Tab/Escape/backdrop, confirmação e persistência em saves isolados.
- Regressões reais: `tests/forge_browser.py`, `tests/haki_quickcast_browser.py` e `tests/item_icons_browser.py` aprovadas. O mercador também foi aberto caminhando até o NPC no mundo.
- `python tools/build_pages.py` e `tests/pages_cache_browser.py`: aprovados; 39 recursos JS/CSS com hash e caminhos relativos.
- Comparativo local: `docs/evidence-ui-ux-2/index.html`, com antes/depois de HUD, inventário e forja; demais capturas e relatório `results.json` na mesma pasta ignorada pelo Git.

As notificações mostram apenas a mensagem mais recente e entram no fluxo do modal ou do chat móvel aberto, evitando cobrir ações. A referência do contêiner é preservada ao desmontar confirmações.

Limites: validação automatizada em Chromium, com viewport reduzida equivalente à área disponível sob zoom. Não substitui teste físico em todos os aparelhos, leitores de tela, Safari ou Firefox. Não houve migração de save. Rollback: reverter os commits da interface na branch, preservando dados locais. O build de Pages só será publicado após merge e workflow; este trabalho não faz merge automático.


## Correção de direção visual — tema de navio

O proprietário rejeitou a mudança de tema da primeira entrega UI 2.0. As cores anteriores (`#49301f` madeira, `#152d34` verde-marinho, `#e1cd9f` pergaminho, `#b58b4b` bronze) voltam a ser a referência. Os tokens `--rpg-planks`, `--rpg-frame`, `--rpg-recess`, `--rpg-paper-light` e `--rpg-gold-button` centralizam os materiais, sem novas imagens ou gastos. Novas funcionalidades devem manter essa identidade e reutilizar o layout responsivo, o foco e os contratos DOM existentes.

Capturas da revisão: `docs/evidence-tema-nautico/after/` (ignoradas no Git). A suíte de navegador aceita `MARE_UI_EVIDENCE` para separar evidências de cada sprint.

Revisão validada pelas 20 suítes Node, matriz completa de sete resoluções, Forja transacional e build/cache. No inventário móvel, o shell não cria um scroll-container intermediário: o cabeçalho sticky acompanha a rolagem de `dialogBody`, mantendo o fechamento acessível. Contraste adicional inspecionado em pergaminho, rótulos de equipamentos e cartões dos monstros.


## Inventário — fundos e densidade

**Revisão de inventário — 24/10/2026:** slots equipados, inclusive Akuma no Mi, têm base escura uniforme e contorno da cor da raridade; não recebem mais a imagem de moldura de raridade como fundo completo. Os itens na mochila continuam usando as molduras PNG aprovadas, sem distorcer sprites. A grade ocupa toda a largura da bandeja, com sete linhas e colunas por viewport: acima de 1180px, 9×7 (63 por página); 1025–1180px, 8×7 (56); 761–1024px, 7×7 (49); 390–760px, 6×7 (42); até 389px, 5×7 (35). A capacidade **continua 120 itens salvos**; os slots vazios são apenas visuais. O tamanho de página e o índice inicial são recalculados ao cruzar breakpoints enquanto o painel está aberto, preservando busca, filtros, seleção, operações de itens e compatibilidade de saves. O corpo do inventário continua rolável no celular.

## Notificações de pendências — 27/10/2026

`notification-system.js` deriva um snapshot imutável e notifica observadores somente quando os contadores mudam. O objeto global `NotificationManager` é a instância da HUD; não é persistido e não concede recompensas. `game.js` alimenta o snapshot no ciclo existente de atualização da interface (cerca de 270 ms), depois de observar conquistas, além das atualizações imediatas das transações. Usa os contratos atuais:

- Personagem/status: `game.attributePoints`.
- Talentos: `MareTalents.available(game)`, considerando investimentos e recompensas reais.
- Hierarquia: um alerta apenas quando `MareHierarchy.next(...).state === 'ready'`; promoções futuras bloqueadas por itens não contam.
- Conquistas: quantidade de entradas `ready` de `MareAchievements.list(game)`, sem contar feitos resgatados ou sistemas indisponíveis.

O ícone principal Personagem soma as quatro seções. Seu clique e o atalho P abrem a primeira pendência na ordem atributos → talentos → promoção → conquistas. A seta separada mantém acesso manual a todas as seções; sem pendências, o próprio ícone abre o menu. Abrir ou fechar uma janela nunca elimina o badge: somente o estado real altera o contador. Atributos recebem foco no controle de distribuição, e conquistas pendentes abrem a categoria Todas para evitar um filtro anterior esconder o resgate.

Badges rosa-escuro com texto branco ficam no canto superior direito do botão, somem com zero e exibem 99+ acima de 99. A fonte local `assets/ui/notifications/pixel-digits.ttf` contém desenhos originais 3×5 de dígitos e sinal +; o script opcional `tools/build_badge_font.py` reproduz o arquivo com fonttools. Não há geração de arte ou requisição de fonte externa. Textos acessíveis conservam o número completo; o resumo usa status polite e as áreas de toque do ícone e da seta não se sobrepõem. Estilos compartilhados em `ui-hud.css`, composição compacta em `ui-responsive.css`.

Validação: 122 testes Node passaram. `tests/notification_browser.cjs` verifica as quatro prioridades, prévia e confirmação real de atributos, investimento de PT, promoção, resgate com geração de PT, zero/99+, reload, oito dimensões (desktop/móvel/paisagem), toque e movimento reduzido. `tests/pages_cache_browser.py` passou com 106 recursos versionados e save preservado. O personagem no modo normal passou em criação, aparência, equipamento, reload e isolamento DEV.

Limitação de regressão ampla: `tests/ui_ux2_browser.py` passou nas quatro dimensões desktop e parou no inventário a 393 px por overflow horizontal. A comparação com origin/main sem badges reproduziu exatamente clientWidth 371 / scrollWidth 1053; em paisagem 640 px, ambos tiveram 618 / 1053. Uma execução complementar conferiu as demais janelas, atributos/talentos/conquistas e navegação em 393, 360 e 320 px, passando essas três matrizes antes de reencontrar o mesmo problema do inventário em paisagem. Essa falha preexistente não foi corrigida nem teve sua asserção removida nesta atualização. Capturas/relatórios ficam em diretório temporário local, fora do Git.

Sem mudança de schema/chaves de save, custos, recompensas ou regras de promoção. O pacote Pages inclui o novo módulo e a fonte; build/push/PR não significam merge ou deploy em produção.
