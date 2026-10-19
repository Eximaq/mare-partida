# Impel Down — prévia e origem exclusiva de pérolas

Atualização de 19/10/2026. Acesse **Mapa → Impel Down**. A nova aba mantém os seis ícones compactos da HUD. A prisão tem 100 andares numerados, detalhes inspecionáveis, escala de dificuldade e marcos de recompensa. Todos os andares estão **temporariamente indisponíveis para entrada**; selecionar um andar não viaja, não conclui fases e não concede itens.

## Escala e progressão preparada

| Andares | Multiplicador de vida, ataque e defesa |
|---|---|
| 1–10 | 0,5× |
| 11–20 | 2× |
| 21–30 | 3× |
| 31–40 | 4× |
| 41–50 | 5× |
| 51–60 | 6× |
| 61–70 | 7× |
| 71–80 | 8× |
| 81–90 | 9× |
| 91–100 | 10× |

Fórmula: `f <= 10 ? 0.5 : ceil(f / 10)`. É crescimento linear por blocos, sem capitalizar multiplicadores. `scaleMonster` aplica a escala a `hp`, `atk` e `def`, arredondando para inteiro e mantendo atributos positivos em pelo menos 1. Não acelera movimento/ataques nem multiplica recompensas. Espécies, atributos base, encontros e mapas da prisão ainda não foram configurados; o balanceamento de combate real depende dessa etapa futura.

`MarePrison` mantém `available:false`, sem botão, atalho ou evento que inicie partidas. A base pura de regras possui uma fábrica para testes e integração futura: entrada somente no andar `cleared + 1`, avanço apenas por vitória e rejeição de andares inválidos, saltos, derrotas e conclusões repetidas. A HUD atual nunca chama essas transações. Liberar o modo exige uma atualização de código e a integração dos encontros reais; não basta habilitar um botão visual.

## Loot e compatibilidade

Monstros dos mapas normais, inclusive chefes, deixam de fornecer Pérolas. A antiga rolagem de 5% foi removida e o sorteio de equipamentos aceita somente definições de equipamento. Gemas, Pérolas e Caixas de Pérolas são reservadas à origem `impel-down` pela política `canDrop`.

Gemas não existiam como item, moeda ou tabela de drops no projeto. Sua origem foi reservada, mas atributos, tipos e recompensas não foram inventados nesta etapa. A interface informa que essas regras serão definidas futuramente.

Pérolas já possuídas ou instaladas continuam intactas. Imbuimento, remoção e fusão permanecem disponíveis, usando o estoque existente; a fusão transforma pérolas já obtidas e não é uma nova fonte de drop. Nenhum equipamento, percentual de pérola, refino ou saldo antigo é convertido. Enquanto a prisão estiver fechada, não há nova fonte jogável de Pérolas.

## Caixas e marcos

- Andares **5, 10, 15, 20, 25, 30, 35, 40, 45 e 50**: uma **Caixa de Pérolas Nível 1**, na primeira vitória de cada marco. Total: dez caixas ao concluir os 100 andares.
- Sem prêmios automáticos acima do 50 nesta entrega. Definições de caixas Nível 2 e 3 e sorteio correspondente já existem para extensão futura; nenhuma faixa de recompensa adicional foi habilitada.
- O livro de marcos impede recebimento duplicado. A transação de conclusão concede a caixa quando há espaço. Se a mochila estiver cheia, mantém a vitória e deixa a recompensa pendente; `claimMilestone` permite conceder uma única vez quando houver espaço. Essas APIs também recusam ações enquanto `available:false`.
- A caixa é um consumível individual na mochila, filtrável por **Consumíveis**. Pode ser bloqueada/desbloqueada. Abrir pede confirmação, consome uma caixa e entrega uma pérola do mesmo nível.
- Sorteio uniforme entre **Força, Destreza, Vitalidade, Inteligência e Espírito**, 20% por atributo. A caixa não sorteia o nível. Os IDs canônicos das 25 pérolas continuam os mesmos.
- Abertura troca um item por outro, funcionando inclusive em mochila cheia. Item ausente/bloqueado, RNG inválido, catálogo incompleto ou identidade duplicada não consomem a caixa. Salvar ocorre antes de alterar o estado em memória; falha de armazenamento preserva a caixa.
- Caixas não são equipáveis, vendáveis ou elegíveis para aprimoramento, reforja, imbuimento e fusão de equipamentos. Não possuem atributos de equipamento. `MareForge.isGear` é usado nos filtros e nas transações para garantir essa separação.

O catálogo é append-only: os 33 equipamentos e 25 índices de pérolas antigos permanecem estáveis; caixas ocupam os índices 58–60. A migração adiciona `impelDown:{version:1,cleared:0,claimed:[]}` sem conceder itens e é idempotente. Antes de migrar um save antigo, preserva seu JSON em `mare-partida-save-v1-before-impel-v1`. Importação/exportação conserva a nova seção.

## Arquivos e testes

`prison-system.js` centraliza regras, disponibilidade, escala, marcos, migração e abertura de caixas. `game.js` integra a prévia e o inventário; `forge-system.js`/`forge-ui.js` excluem consumíveis. Ícones novos em `assets/ui/items/pearl-box-1.svg` a `pearl-box-3.svg` são vetores locais. Não há gerações pagas ou edição dos sprites existentes.

`index.html`, `tools/dev_server.py` e `tools/build_pages.py` incluem o módulo. O build Pages mantém caminhos relativos e hashes de conteúdo, agora com 17 recursos JS/CSS versionados. Documentos anteriores sobre drops descrevem o histórico; esta regra substitui a obtenção por caçadas.

Validação específica: `node tests/prison-system.test.cjs` e `python tests/prison_browser.py`. A primeira verifica os 100 andares, bloqueio de produção, sequência de vitórias, dez marcos únicos, mochila cheia, cinco resultados em cada nível de caixa, falhas sem consumo, migração e exclusão da forja. A segunda usa saves isolados, desktop/celular, navegação de abas, entrada bloqueada, caixas reais no inventário e rolagens forçadas de loot nos dois mapas. Resultados e capturas locais ficam em `docs/evidence-impel-down/`, fora do Git.

Branch `feature/impel-down-drops`, base `5bf162e`. Publicação por commit/push e PR para `main`. Nenhuma partida de Impel Down está habilitada nesta entrega.

## Execução validada

- Dez arquivos `tests/*.test.cjs`, incluindo os dez grupos novos de prisão/caixas, e sintaxe de todos os scripts JS: passaram.
- `tests/prison_browser.py`: dez grupos; cinco resoluções (1920×1080, 1366×768, 1280×720, 393×852 e 320×568), entrada bloqueada, caixas com persistência/erro de armazenamento e loot forçado nos dois mapas: passaram.
- `tests/voyage_browser.py`: nove grupos de navegação e viagens existentes: passaram.
- `tests/fusion_slots_browser.py`: sete grupos de fusão/estoque, incluindo ausência de pérolas novas durante caçada: passaram.
- `tests/polish_feedback_browser.py`: três resoluções de inventário/atributos: passaram.
- Build Pages e `tests/pages_cache_browser.py`: 17 recursos versionados, mapa mobile e save preservado: passaram.

As rolagens forçadas do teste específico se limitam ao loot, mantendo os spawns e a navegação aleatórios. Nenhum teste usa o save do usuário. Testes de mundo/câmera/combate Node permanecem verdes; os demais scripts de navegador não foram repetidos integralmente nesta sprint.
