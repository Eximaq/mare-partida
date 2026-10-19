# Impel Down — prévia e origem exclusiva de pérolas

Atualização de UI/UX em 19/10/2026. **M** e o botão correspondente da HUD abrem **Modos de jogo**, uma lista suspensa de ícone + texto. Escolha **Mapa do Arquipélago** para as viagens ou **Impel Down** para a prisão. Impel Down não aparece mais dentro do mapa geográfico. NPC de expedição e comandos de viagem convergem para a lista. Os seis ícones da HUD são mantidos.

## Seleção de fases

A janela própria do Impel Down segue a estrutura das duas referências enviadas: cabeçalho de progresso; setas Anterior/Próximo, andar selecionado e botão **ENTRAR NO ANDAR X**; informações de nível e ondas; quadro **Monstros do Andar**; primeira conquista; opções de subida e **Marcos** no painel inferior direito. No celular, os painéis inferiores passam a uma coluna, com rolagem vertical.

As setas percorrem somente andares concluídos e o próximo liberado: `1..min(100,cleared+1)`. Sem progresso, apenas Andar 1 pode ser inspecionado. O modo continua indisponível para partidas e resgates; o botão de entrada permanece desativado em qualquer andar. Selecionar, voltar ou alternar de modo não muda a cena, o inventário ou o progresso.

A composição prevista reutiliza nomes, imagens e atributos-base reais de `monsterTypes`: Corsário de Brasa e Sentinela Cinzenta nos andares normais; Corsário e Guardião da Caldeira nos andares de chefe, a cada dez andares. A prévia usa três ondas, seis corsários e três sentinelas, ou seis corsários e um chefe; o nível exibido acompanha o andar. Vida e ataque apresentados vêm das regras internas de balanceamento. Não foram gerados sprites novos nem habilitado um motor de ondas/combate da prisão. O painel identifica os encontros como composição prevista em desenvolvimento.

Os multiplicadores, fórmula e tabela de dificuldade foram **removidos da interface**. `floorDetails` retorna apenas os dados de apresentação dos encontros, sem campo de fator ou fórmula. O projeto é um jogo estático/offline e ainda não possui backend remoto; a matemática permanece no módulo lógico `prison-system.js`, sem exposição na HUD. A tabela abaixo é documentação técnica e não entra no pacote público Pages.

**Recompensa da Primeira Conquista** mostra uma caixa nos andares 5,10…50. Nos demais, informa a progressão ou recompensa ainda indefinida, sem conceder itens inventados. A lista **Marcos** exibe os dez prêmios e seu status salvo. A opção de entrada e qualquer concessão seguem bloqueadas.

**Configuração da Subida:** `impelDown.options.autoAdvance` (padrão falso) e `pauseBeforeBoss` (padrão verdadeiro) podem ser alteradas e persistidas. Falha ao salvar restaura o controle ao valor anterior. A base `completeFloor` retorna `next` com andar e decisão de avanço; pausa antes de chefes quando configurado. Com disponibilidade falsa, `nextAction` retorna nulo e não existe avanço automático ou início de partida. As preferências ficam prontas para a integração futura do loop real.

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

`MarePrison` mantém `available:false`, sem botão, atalho ou evento que inicie partidas. A base pura de regras possui uma fábrica para testes e integração futura: entrada somente no andar `cleared + 1`, avanço apenas por vitória e rejeição de andares inválidos, saltos, derrotas e conclusões repetidas. A HUD atual nunca chama as transações de entrada, conclusão ou concessão de prêmio. Liberar o modo exige uma atualização de código e a integração dos encontros reais; não basta habilitar um botão visual.

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

## Validação do rework de navegação

Base `b760c14`, branch `feature/modos-impel-down-ui`. Todos os comandos abaixo passaram nesta atualização:

- Dez arquivos `tests/*.test.cjs` e sintaxe dos JS. Treze grupos específicos de prisão: regras originais, inspeção restrita por progresso, dados de apresentação sem fator e decisão de avanço/pausa.
- `tests/prison_browser.py`: onze grupos; cinco resoluções de 320×568 a 1920×1080, tecla M, lista de modos, separação do mapa, imagens/status/ondas, ausência de multiplicadores, setas nos limites, preferências após recarga, bloqueio de entrada, caixas e loot exclusivo.
- `tests/voyage_browser.py`: nove grupos de viagens, detalhes e previews, foco/teclado, cache de imagens e água animada.
- `tests/polish_feedback_browser.py`: inventário/atributos e acesso por teclado em três resoluções.
- `tests/island_browser.py`: doze grupos de HUD, serviços de NPC, movimentação, viagens, recompensas e saves.
- Build Pages e `tests/pages_cache_browser.py`: 17 recursos versionados, mapa mobile e save preservado.

Capturas atuais em `docs/evidence-impel-down/`. Os outros scripts de personagem, combate, fusão e captura foram adaptados ao passo de escolha do modo, sem execução integral nesta atualização. Nenhum teste usa o save do usuário. Sem novas gerações pagas.
