# Sprites e animações de combate v2 — 28/10/2026

**Estado: implementação para revisão; aceite integral pendente de assets ausentes e aprovação visual do proprietário.** Branch `feature/pixellab-sprites-combat-v2`, criada de `origin/main` `88dc017b7fca01fccadb62f35183df4948757ef1`. Checkout separado em `../mare-pixellab-combat-v2`; o checkout original e seu trabalho não commitado foram preservados. Sem merge, deploy ou geração paga.

## Auditoria e decisões

O jogo usa Canvas 2D e scripts sem bundler. `combat-animation.js` agenda o ataque básico e compromete seu callback uma única vez. As habilidades usam seus próprios estados em `game.js`: colisão nas investidas, `impactAt` na Girafa e `MareRyu.timing()` no Alossauro. `outputDamage`, `takeDamage` e `receiveEnemyAttack` continuam aplicando dano. Nenhum cálculo passou para o renderizador.

Os 21 conjuntos foram localizados pela listagem/getters PixelLab, baixados pelo export existente e conferidos individualmente. O novo Kuroobi está nomeado **KUROOBI NEWQ** no serviço; Cabaji/Marinheiro/Mr.3/Buchi usam capitalização diferente da tabela do pedido. IDs de jogo, níveis, catálogo de itens, atributos, drops, economia, colisões e saves foram preservados. Os UUIDs de origem ficam nos metadados de cada conjunto; o catálogo funcional conserva seus IDs anteriores.

O adaptador `sprite-combat-v2.js` estende os pontos de desenho existentes: `MareZoanArt`, `MareNeko`, `MareUshi`, `MareWolf`, `MareRyu`, `MareRankCExpansion`, `MareHoya`, `MareNewIslandArt` e `MareRareRenderer`. Não há novo controlador de combate. Retratos/prévias usam esses renderizadores; silhuetas do Compêndio e imagens do Arquipélago também apontam para o novo Idle. Assets anteriores continuam disponíveis para recuperação. Paper Doll e suas flags não foram alterados.

## Os 21 conjuntos

Todos estão integrados no desenho e nas interfaces pertinentes. A tabela descreve recursos **efetivamente exportados**, sem contar animações sugeridas pelo catálogo de templates do PixelLab como se já existissem. Idle é uma pose por direção, em oito direções; não foi fabricado um ciclo de repouso. Ações direcionais usam as quatro direções cardinais, salvo exceção explícita.

| Antigo → novo PixelLab | Pasta | Walk | Run | Attack | Hurt | Especiais |
|---|---|---|---|---|---|---|
| Albatroz dos Ventos → Albatroz New | tori | 29 | — | 28 | 29, sul | — |
| Corcel Zoan → Cavalo NEW | uma | — | 28 sul / 29 demais | 29 | 29, sul | 29 |
| Cão Salsicha de Âmbar → Dachshund NEW | inu | — | 29 | 29 | 29, sul | — |
| Cocox 64X64 → Cocox New | cocox | 25 | — | 25 | 13, sul | — |
| Mr.3 → Mr.3 NEW | mr3 | 6 | — | 29 | 29, sul | — |
| Buchi → Buchi NEW | buchi | 8 | — | 29 | 25, sul | — |
| Helmeppo → Helmeppo New | helmeppo | 29 | — | 29 | 29, sul | — |
| Sham → Sham New | sham | 29 | — | 29 | 29, sul | — |
| Gin → Gin New | gin | 29 | — | 29 | 29, sul | — |
| Pearl → Pearl New | pearl | 29 | — | 29 | 29, sul | — |
| Chew → CHEW NEW | chew | 29 | — | 29 | 29, sul | — |
| Kuroobi → KUROOBI NEWQ | kuroobi | 29 | — | 29, sul/norte/leste | 29, sul | — |
| Marinheiro → Marinheiro NEW | marinheiro | 25 | — | 29 | 29, sul | — |
| Cabaji → Cabaji NEW | cabaji | 29 | — | 29 | 29, sul | — |
| Neko Leopard → Leopard NEW | neko | 29 | — | 29 | 29, sul | 29 |
| Ushi Girafa → Model Giraffa New | ushi | 29 | — | 29 | 29, sul | 29 |
| Inu Lobo → Modelo Lobo NEW | wolf | — | 8 (running-jump) | 29 | **ausente** | 29 |
| Genio Hoya → Genio Hoya New | hoya | 29 | — | 29 | **ausente** | — |
| Ryu Ryu → Model Alossauro | ryu | 29 | — | 29 | 29, sul | 29 + 29 |
| Ushi Bisão → Model Bisao New | bison | 29 | — | 29 | 29, sul | 29 |
| Bananawani → Bananawani NEW | bananawani | 8 | — | 29 | 29, sul | — |

Números são frames por direção. Run real é o fallback de locomoção onde não existe Walk; onde não existe Run, continua a caminhada. Não foram espelhadas direções nem reaproveitadas animações antigas no lugar de novas equivalentes. Kuroobi/oeste usa o novo Idle/oeste, sem simular um ataque ausente. Hurt indisponível conserva a orientação e usa um breve realce, identificado como fallback, sem alegar animação nativa.

## Sete habilidades

| Forma / habilidade existente | Recurso novo | Validação |
|---|---|---|
| Cavalo / Arrancada, tecla 2 | Special Ataque | Executada; contato visual na colisão real |
| Leopardo / investida, tecla 1 | Special Attack | Executada; orientação, deslocamento e colisão preservados |
| Girafa / cabeçada, tecla 1 | Special ATTACK | Executada; contato no `impactAt` existente |
| Lobo / Avanço, tecla 1 | Special atack | Executada; contato na fase finish existente |
| Alossauro / habilidade 1 | Ataque special haki 1 | Executada; clip independente e impacto original |
| Alossauro / habilidade 2 | Ataque especial 2 | Executada; clip independente, sem misturar com a mordida |
| Bisão / habilidade 1 | Ataque especial 1 | Executada; contato na colisão real |

O teste específico executou as sete habilidades contra alvo vivo, verificou o caminho PNG realmente enviado ao Canvas e o frame de contato, com tolerância de um quadro no passo de simulação. Desenhar várias vezes não muda o HP. Os testes existentes das frutas conferiram custos, recargas, multiplicadores, movimento, colisão, alvos, controle, cancelamento e persistência. As sete verificações específicas de contato foram executadas orientadas para leste; as direções restantes tiveram reprodução/renderização de frames, além dos cenários direcionais cobertos nas regressões existentes.

`playback.json` registra poses de contato inspecionadas. O progresso visual é remapeado para esses quadros no instante lógico antigo; metadados antigos de timing continuam autoritativos. Investidas guardam apenas um timestamp visual no ponto de colisão existente. Nos monstros cujo golpe já era instantâneo, a apresentação começa no contato e segue a recuperação: não se acrescentou preparação com atraso de dano. Ajustes artísticos finos de contato por direção permanecem sujeitos à revisão humana.

## Hurt

Após a mutação de HP, somente perda positiva registra uma reação no ator. No herói, usa-se a diferença efetiva de HP, depois das defesas/escudos; esquiva, invulnerabilidade, parry e dano nulo não a acionam. Morte, transformação, especiais Zoan e avisos especiais de monstros têm prioridade. A reação não é enfileirada para aparecer atrasada depois de uma habilidade.

Uma `WeakMap` guarda timestamps transitórios, fora do save. Janela fixa de **180 ms**, quatro quadros reais escolhidos da faixa de recuo/impacto, sem editar PNGs. Os índices por personagem estão em `assets/sprites-combat-v2/playback.json`. Golpes dentro da janela não a reiniciam nem a prolongam. Após 180 ms, o desenho consulta novamente o estado atual: Idle, locomoção ou ataque. Os relógios de ataque continuam avançando; Hurt não cancela callbacks nem duplica dano. Reset do relógio da cena invalida uma reação antiga.

Lobo e Hoya não exportaram Hurt; essa ausência foi reconfirmada no serviço antes do fechamento. Os outros 19 só exportaram sul. Portanto **não foi atingido o critério de animação Hurt nativa para todos os personagens/direções**. O realce é somente fallback visual.

## Pixels, escalas e carregamento

- 5.957 frames nativos, 382 folhas PNG e 21 arquivos de metadados. Cocox Idle é 92×92; demais Idle 96×96; ações podem usar canvases 124, 128, 132, 136 ou 144 px. As dimensões reais por clipe estão nos metadados.
- Importação preserva a ordem e cada pixel RGBA original, inclusive alfa; só organiza frames em tiras horizontais e compensa padding transparente. Hashes por frame permitem verificar a reversibilidade. Sem interpolação, pintura, espelhamento ou redimensionamento dos arquivos de arte.
- Escala proporcional calibrada pela altura opaca do Idle anterior. Um mesmo fator é usado em todas as ações da direção; canvases grandes não são espremidos nas dimensões antigas.
- Pivô estável por clipe, com compensação da margem inicial dos pés. Não se recentraliza a bounding box a cada quadro: saltos e efeitos da arma conservam o movimento original e não deslocam artificialmente o corpo.
- Canvas com `imageSmoothingEnabled=false`, destinos arredondados, cache de imagens por URL. Nenhum serviço PixelLab é chamado pelo jogo.
- **FPS nativo não veio no export nem no getter.** Playback configurado em 12 FPS para sequências curtas e 24 FPS para longas; básicos e especiais continuam subordinados aos tempos originais do combate. Hurt usa os 180 ms acima. Não apresentar esses valores como FPS autoral confirmado.

## Arquivos e testes

| Arquivos | Finalidade |
|---|---|
| assets/sprites-combat-v2/** | Arte nativa empacotada, proveniência, hashes, dimensões, pivôs e playback |
| sprite-combat-v2-data.js | Metadados públicos para o runtime |
| sprite-combat-v2.js | Extensão dos renderizadores, seleção de clipes, fallback e reação transitória |
| game.js | Gatilhos no HP, timestamps de colisão e apresentação da forma atual |
| akuma-system.js / archipelago.js | Silhuetas e prévias novas, sem mudar regras do catálogo |
| index.html / ui-preview.html / tools/build_pages.py | Mesmos scripts nos dois entry points e pacote estático com cache por hash |
| tools/import_sprite_combat_v2.py | Importador reproduzível dos exports existentes, sem geração |
| tests/sprite-combat-v2.test.cjs | Dano efetivo, coalescência, prioridade, reset, direções e contato visual |
| tests/sprite_combat_v2_assets_test.py | Comparação independente de todos os pixels nativos e faixas válidas |
| tests/sprite_combat_v2_browser.cjs | Teste real de integração, sete especiais, superfícies, caçada, mapas e save |

Validações executadas em Windows, Node 24.15.0, Python 3.13.7 e Chromium headless:

- **104 arquivos de teste Node aprovados**, incluindo combate, velocidade, Zoans, Haki, talentos, conquistas, mapas e saves. `supa-browser.test.cjs` é E2E e não integra o loop Node, conforme o workflow existente.
- Sintaxe dos **97 scripts JS de raiz** e `git diff --check`: aprovados.
- `python tests/sprite_combat_v2_assets_test.py`: 5.957 frames RGBA idênticos aos originais.
- `node tests/sprite_combat_v2_browser.cjs`: passou no fonte e em `dist/`; 1.146 poses (início/meio/fim), 21 conjuntos, 26 chamadas de renderizadores existentes, zero erros JS/404 dos novos assets, sete especiais e contato real, dano único, golpes consecutivos, oito formas Zoan e reload do save.
- No mesmo E2E: 20 abates consecutivos pela auto-caçada com HP/recompensas reais em fixture isolada, entrada/saída dos nove mapas e spawn navegável. Renderização em 1920×1080, 1366×768, 1280×720 e 390×844. As fixtures são inseridas apenas na resposta interceptada pelo teste; não existem hooks de teste no jogo distribuído.
- `neko_browser.cjs`, `ushi_browser.cjs`, `wolf_browser.cjs`, `ryu_browser.cjs`, `rank_c_expansion_browser.cjs` e `hoya_browser.cjs`: aprovados no fonte.
- `python tools/build_pages.py` e `python tests/paper_doll_pages_test.py`: aprovados. O pacote foi servido e testado localmente; **não houve publicação remota**.
- Amostra curta de 120 frames: mediana 16,7 ms, heap JS 11 MB no fonte / 13 MB no dist. Esses números não incluem memória gráfica/decodificação de PNG e não substituem teste prolongado nem teste em celular físico.

**Falha preexistente observada:** `node tests/attack_speed_browser.cjs` passa pelos cenários de impactos, mas falha na asserção final de cadência humana: três intervalos esperados de 0,5 s incluem um intervalo de 0,79 s. Reproduzido também interceptando `game.js` e `index.html` de `88dc017` sem o adaptador novo. Não foi alterada a asserção nem reconstruído o combate para mascará-la. Requer ticket próprio de investigação da fixture/estado de perseguição.

## Pendências, revisão e rollback

Faltam exatamente:

1. `wolf/hurt-{south,north,east,west}.png` e `hoya/hurt-{south,north,east,west}.png`: animações inexistentes nos respectivos exports novos.
2. `hurt-{north,east,west}.png` nos demais 19 conjuntos: somente sul foi disponibilizado.
3. `kuroobi/attack-west.png`: direção inexistente no novo ataque.
4. FPS autoral e aprovação visual dos pivôs, poses de contato e fallbacks. Não se geraram assets para preencher lacunas.
5. Falha preexistente de cadência humana; ensaio prolongado de memória/FPS e teste em aparelho móvel físico não executados.

Capturas recentes ficam somente em `docs/evidence-sprites-v2/` (ignorado pelo Git), incluindo galerias dos 21 em Idle/Walk/Attack/Hurt/Special e telas desktop/móvel; há repetição em `dist/` para conferir o pacote. Data local: 28/10/2026. Nenhuma evidência em massa, ZIP, save, credencial ou inventário privado PixelLab entra no commit.

Saves mantêm formato, chaves e índices de itens; não há migração. Para reverter, reverter os commits deste PR e reconstruir Pages. Assets antigos e renderizadores anteriores foram preservados. O checkout original permanece intocado. **Merge e produção dependem de autorização expressa do proprietário, após revisão visual e funcional.** Próximo passo mínimo: fornecer os clipes/direções ausentes e revisar visualmente este candidato; nenhuma nova geração paga está autorizada.
