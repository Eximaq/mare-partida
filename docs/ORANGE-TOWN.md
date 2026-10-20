# Orange Town — implementação em andamento

Branch: `feature/orange-town-21-30`, base `1d8157a`.

## Estado e próximo passo

Geometria, regras e integração implementadas como rascunho. **Não publicar/mesclar ainda:** novos cenários, sprites e caminhadas aguardam autorização do lote PixelLab de 35–40 gerações (teto 40, sem retries). Nenhuma geração consumida nesta etapa. O renderer usa arte existente provisoriamente, e o preview do chefe fica Indisponível até haver imagem válida. O manifesto registra `ready:false`.

## Composição

Grade 32×32, tiles de 64px, mundo 2048×2048. Cais de retorno e chegada com respiro contra spawns, avenidas conectadas por um circuito secundário, oito edifícios com fachada/colisão/acesso à rua demonstráveis. Não há pontes decorativas. A câmera e a navegação usam os mesmos contratos do projeto.

Cinco setores: Cais das Laranjeiras 21–22, Rua dos Navegantes 23–24, Praça dos Toldos 25–26, Armazéns da Enseada 27–28 e Pátio do Capitão 29–30. Três papéis: Saqueador dos Toldos (perseguidor), Brutamontes do Cais (pesado), Artilheiro da Praça (ranged com aviso). Chefe: Capitão Fagulha, Nv.30; gate de 12 abates e respawn de 90s, mantendo as proteções existentes.

## Progressão

Entrada pelo Mapa do Arquipélago em Nv.21. Drops de equipamentos de tier 5–6, chance comum de 22%, ferro 55%, poção 14%; chefe garante equipamento/14 ferros/2 poções se aplicável. Raridade comum até épica; chefe mantém a tabela existente até lendário. Primeira vitória: arma épica tier6 da classe +1800 dobrões, com resgate único e proteção de mochila cheia/storage. Contratos: 40 abates (+900 ouro/+1600 XP) e um chefe (+1800 ouro/+2800 XP).

Fórmulas de HP/ataque/defesa e XP existentes mantidas, usando nível do encontro, sem acompanhar o jogador. O chefe Nv.30 pode satisfazer a regra existente do Livro da Vontade (5%); despertar ainda exige Nv.50. Sem pérolas/gemas novas fora das regras existentes. Dawn/Conchas, itens, frutas e saves preservados.

## Arquitetura

- `orange-world.js`: terreno, rotas, colliders e fachadas, sem DOM.
- `orange-renderer.js`: composição/caches de terreno, props e futuros sprites; animação de água e retorno com movimento reduzido.
- `hunt-system.js`: região/encontros/economia; migração inclui progresso novo zerado sem atribuir abates antigos.
- `archipelago.js`, `world-system.js`, `game.js`: entrada, cenas, spawns, rota, nomes, contratos e retorno.
- `assets/orange-town/manifest.json`: futura arte aprovada, ainda não final.
- Laboratório DEV recebeu viagem Nv.21+ sem alterar isolamento de save.

## Validação e limites

21 suítes Node e sintaxe de todos os scripts raiz passaram, incluindo novos testes de dimensões, caminhos reais nas duas direções, fachadas, colisões e câmera. Catálogo/entrada Nv.21, perfis Nv.21–30, primeira vitória/rollback e migração seguem testes de caçada expandidos. A suíte `tests/orange_browser.py` verifica viagem, chegada, cinco rotas, HUD responsiva e persistência em contextos isolados. Viagem/rota/persistência passaram em 1920×1080, 1366×768, 1280×720, 393×852 e 320×568; sem erros JavaScript observados. Build e cache passaram com 41 recursos versionados e saves preservados. Capturas locais em `docs/evidence-orange-town/` (rascunho visual, fora do Git).

Ainda faltam: aprovação/geração/inspeção de arte, integração dos quatro personagens/caminhadas e cenário, revisão visual final, combate real com o chefe e medição da progressão 21–30. Não chamar a ilha de finalizada antes desses passos.

## Resumo para o colaborador

Nova área canônica `orange`, sem renomear `beach`/`swamp`. O mapa tem módulo próprio e mantém os contratos de navegação; game.js recebeu apenas os ganchos necessários. A branch inclui a main vigente com as frutas Rank E e os ajustes recentes do inventário. Evitar editar simultaneamente os blocos de regiões/renderer/contratos em game.js sem sincronizar as branches. Arte final e publicação ainda pendentes; não habilitar mapas 31+ ou Impel Down nesta sprint.
