# Orange Town — mapa PixelLab Nv.11–15

## Estado atual · 22/10/2026

O mapa anterior foi substituído pelo mapa `Orange Town` do PixelLab (`1e54e217-5ae7-48ed-aa9e-43bbb58b88b6`), 61×44 células de 64 px. Mr. 3 (`115d5400-e87f-4990-96d5-39605ee0311c`) e Cabaji (`30284edc-eb47-475b-9019-c84ef902e164`) são patrulhas comuns de Nv.13; não há chefe nem respawn de chefe. A área usa navegação por tiles transitáveis, colliders AABB nas bases dos objetos do mapa e saída para o Lobby no cais. Os detalhes abaixo registram a versão antiga e não representam o conteúdo ativo.

Branch: `feature/orange-town-21-30`, base `1d8157a`.

## Entrega

Terceira ilha implementada na branch, com cenário próprio, quatro monstros e caminhadas reais. Lote PixelLab aprovado com teto40, consumo confirmado de **35 gerações**, sem novas tentativas pagas. Uma requisição recusada por capacidade não iniciou geração; o mesmo pedido autorizado foi enviado quando havia vagas. O manifesto registra `ready:true`, e os quatro personagens carregaram no navegador e no build estático sem imagens ausentes. Revisão pelo PR28 antes de merge; esta entrega não publica automaticamente na main/Pages.

## Composição

Grade 32×32, tiles de 64px, mundo 2048×2048. Cais de retorno e chegada com respiro contra spawns, avenidas conectadas por um circuito secundário, oito edifícios com fachada/colisão/acesso à rua demonstráveis. Não há pontes decorativas. A câmera e a navegação usam os mesmos contratos do projeto.

Cinco setores: Cais das Laranjeiras 21–22, Rua dos Navegantes 23–24, Praça dos Toldos 25–26, Armazéns da Enseada 27–28 e Pátio do Capitão 29–30. Três papéis: Saqueador dos Toldos (perseguidor), Brutamontes do Cais (pesado), Artilheiro da Praça (ranged com aviso). Chefe: Capitão Fagulha, Nv.30; gate de 12 abates e respawn de 90s, mantendo as proteções existentes.

## Progressão

Entrada pelo Mapa do Arquipélago em Nv.21. Drops de equipamentos de tier 5–6, chance comum de 22%, ferro 55%, poção 14%; chefe garante equipamento/14 ferros/2 poções se aplicável. Raridade comum até épica; chefe mantém a tabela existente até lendário. Primeira vitória: arma épica tier6 da classe +1800 dobrões, com resgate único e proteção de mochila cheia/storage. Contratos: 40 abates (+900 ouro/+1600 XP) e um chefe (+1800 ouro/+2800 XP).

Fórmulas de HP/ataque/defesa e XP existentes mantidas, usando nível do encontro, sem acompanhar o jogador. O chefe Nv.30 pode satisfazer a regra existente do Livro da Vontade (5%); despertar ainda exige Nv.50. Sem pérolas/gemas novas fora das regras existentes. Dawn/Conchas, itens, frutas e saves preservados.

## Arquitetura

- `orange-world.js`: terreno, rotas, colliders e fachadas, sem DOM.
- `orange-renderer.js`: composição/caches de terreno, props e sprites direcionais; animação de água e retorno com movimento reduzido.
- `hunt-system.js`: região/encontros/economia; migração inclui progresso novo zerado sem atribuir abates antigos.
- `archipelago.js`, `world-system.js`, `game.js`: entrada, cenas, spawns, rota, nomes, contratos e retorno.
- `assets/orange-town/manifest.json`: arte aprovada, âncoras e folhas de quatro direções. Carregamento dos overrides ocorre depois das fontes de fallback, evitando corrida; diagnóstico informa imagens ausentes.
- Laboratório DEV recebeu viagem Nv.21+ sem alterar isolamento de save.

O diário da HUD prioriza os contratos próprios enquanto o jogador está em Orange Town. Não mostra objetivos antigos de magma sob o nome da nova ilha. IDs e resgates anteriores continuam preservados.

## Arte e origem

MCP `create_image_pro`: atlas transparente256, quatro construções em células128, 10 gerações. MCP `create_image_pixen`: calçamento nativo64, 1 geração. Quatro `create_character` v3: poses nativas48, oito direções entregues pelo custo previsto de 8 gerações no total. Quatro `animate_character` v3: quatro direções cardeais, 8 quadros gerados + referência inicial por direção, 16 gerações. Total35, confirmado também pela diferença de saldo do lote; nenhum valor de saldo armazenado no repositório.

Caminhadas do Saqueador têm canvas64; os outros três,68, com margem transparente ao redor do corpo48. Pixels originais e ordem dos nove quadros preservados; não houve redimensionamento, espelhamento, corte temporal ou retoque. Verificada a igualdade do quadro de referência com a pose48 centralizada e das folhas montadas com cada PNG fonte. GIFs transparentes locais usam loop infinito, descarte explícito e comparação dos quadros recompostos; grades coloridas são apenas auxiliares de inspeção. Ataques usam pose direcional/avisos de combate, sem afirmar que foram geradas animações de ataque.

Solicitações e recibos exatos: `pixellab-pip-generations/orange-town-20261020/calls.json`. Manifesto de origem, traduções e consumo: `manifest.json` na mesma pasta; receita portátil: `orange-town.blueprint.json`. Originais completos e prévias ficam preservados localmente nessa pasta; o Git recebe o atlas, os pisos, folhas de poses e caminhadas, receita e registros necessários, sem centenas de PNGs/GIFs de inspeção. Todos os prompts foram elaborados a partir do pedido e aprovados antes do consumo; seed omitido, sem imagem de referência externa.

## Validação e limites

22 suítes Node e sintaxe de todos os scripts raiz passaram, incluindo dimensões, caminhos reais nas duas direções, fachadas, colisões, câmera e as quatro folhas de animação completas. Catálogo/entrada Nv.21, perfis Nv.21–30, primeira vitória/rollback e migração seguem testes de caçada expandidos.

`python -X utf8 tests/orange_browser.py`: viagem/rota/diário/persistência em 1920×1080,1366×768,1280×720,393×852 e320×568; caminhada real até a arena, chefe Nv.30, aviso de ataque, vitória com invencibilidade DEV, resgate único, rollback após falha de storage, reload e isolamento do save normal. Sem erros JavaScript observados. A invencibilidade valida o fluxo, não a dificuldade do chefe.

`python -X utf8 tests/orange_art_browser.py`: composição completa, quatro monstros carregados e nenhuma imagem ausente, inclusive servindo `dist/`. Inspeção visual dos quatro conjuntos de poses, todos os quadros/direções, fachadas e HUD desktop/móvel. Build e cache passaram com41 recursos versionados e saves preservados. Capturas/resultados locais em `docs/evidence-orange-town/`, fora do Git.

`python -X utf8 tests/orange_classes_browser.py`: amostras reais de30s nas sete classes em Nv.21, arma épica tier4, 100 pontos70/30, armadura inicial, 30 poções, sem talentos atribuídos/Haki. Obtiveram4–15 abates e572–2253 XP, permanecendo com vida. Não mede duração da campanha21–30, nem afirma igualdade de desempenho entre funções. `node tools/measure_hunt_balance.cjs` incluiNv.21/25/30: TTK básico analítico1,31–10,65s, chefe5,86–73,01s, com atributos70/30 e equipamento inicial ATQ6/DEF7/HP24, sem skills/talentos/deslocamento/poções. Esses números têm fixtures distintas e não devem ser somados como tempo real de progressão.

## Resumo para o colaborador

Entregamos Orange Town Nv.21–30: mapa32×32, cinco setores, oito construções posicionadas, três inimigos e Capitão Fagulha, arte PixelLab e caminhada em quatro direções, drops tier5–6, dois contratos e prêmio único de primeira vitória. Nova área canônica `orange`, sem renomear `beach`/`swamp`; mapa e renderer em módulos próprios. Saves, frutas Rank E e inventário do colaborador preservados. Validado em22 suítes Node, cinco resoluções, combate/recompensas e buildPages. Revisão no PR28; evitar editar simultaneamente regiões/renderer/contratos de game.js sem sincronizar branches. Mapas31+ e Impel Down seguem bloqueados.
