# Forja — seleção visual e operações completas

Atualização de 18/10/2026 sobre a Forja 2.0 existente. Referência funcional: https://levelingidle2d.com.br/. Nenhum código, layout exclusivo, marca ou asset foi copiado; o tema náutico e os ícones atuais foram preservados. A especificação textual foi a referência principal: não havia novas capturas anexadas nesta solicitação.

## Interface

Quatro abas: Aprimorar, Imbuir, Fusão, Reforja. Equipamentos escolhidos por ícones reais, com raridade, nível, refinamento, equipado e trava; tooltip nativo traz nome, status e extras. Busca por nome; filtros de raridade, categoria, localização e nível mínimo; grid/lista e páginas de 16. Equipados e mochila separados. Busca, filtros, página e alvo persistem na sessão ao alternar abas. O alvo mantém o destaque quando está na página/filtragem atual. Na fusão de equipamentos, somente a mochila é exibida: equipados nunca entram nos materiais.

Painéis têm rolagem independente em desktop para manter abas e cabeçalho acessíveis. Resultados ficam no fluxo do painel, verdes ou vermelhos, sem toast sobre os controles. Recursos, inventário, atributos e Poder são recalculados após cada operação. Seleções de pérolas também usam grids, agrupando cópias desbloqueadas. Nenhum dropdown seleciona uma instância de equipamento ou pérola; filtros e tipo resultante continuam controles compactos.

## Aprimoramento — mudança econômica explícita

O teto antigo +5 passa para +20. IDs, valores base, raridade, refinos já existentes, extras, sockets e pérolas salvos são preservados. Não há conversão retroativa de status nem compensação por falhas passadas.

- Destinos +1 a +5: 100%.
- Destinos +6 a +20: 85%, 80%, 75%, 70%, 65%, 60%, 55%, 50%, 45%, 40%, 35%, 30%, 25%, 20%, 15%.
- Configuração central: `MareForge.refinement`, em forge-system.js. São parâmetros próprios, não fórmulas copiadas da referência.
- Falha consome os custos, preserva a peça e o refinamento. Não há destruição nem rebaixamento.
- Custo em dobrões: `ceil(50 × (refino + 1)² × (1 + (nívelItem − 1) × 0,04))`.
- Custo de ferro: `ceil((2 + refino × 2) × (1 + (nívelItem − 1) × 0,015))`.
- No nível de item 1, os custos anteriores de +0 a +4 permanecem iguais. A garantia das transições +2→3, +3→4 e +4→5 é uma mudança intencional pedida nesta sprint.

Exemplos no item Nv.10: +0→1 custa 68 dobrões e 3 ferro; +5→6 custa 2.448 e 14; +19→20 custa 27.200 e 46. Custos só são cobrados após confirmação. A tabela de crescimento mostra todos os 21 refinos e chances; histórico preserva as últimas 12 operações globais e a aba mostra as tentativas da peça que ainda constam nessa janela.

Fórmula de status preservada: `round((base × multiplicadorRaridade + refino × bônusFixo) × fatorNível) + extrasDiretos`. Bônus fixos ATQ/DEF/VIDA: 3/2/10. `fatorNível = 1 + min(20, nívelItem−1) × 0,09`. Não se multiplica novamente extras, primários ou pérolas pelo refino. A ampliação até +20 aumenta o poder possível: não foi reequilibrado combate/mapas nesta sprint.

## Imbuimento

As 25 pérolas e os percentuais originais permanecem intactos. Clique no socket e na pérola; prévia mostra os derivados antes/depois, a peça e o Poder. Instalar é gratuito e consome uma unidade. Remover devolve exatamente a pérola ao inventário, cobrando `ceil((20 + nívelItem × 4) × multiplicadorRaridade × (1 + nívelPérola × 0,75))` dobrões. Ações confirmadas; mochila cheia bloqueia a remoção. Peça bloqueada não pode ser alterada. Sockets ocupados mostram os ícones originais das pérolas.

## Fusão de equipamentos

Cinco peças da mesma raridade, da mochila, desbloqueadas e sem pérolas instaladas. Seleção múltipla com contador, desmarcar e seleção automática. O automático respeita busca/filtros, procura uma raridade com cinco candidatos e prioriza refino baixo, depois nível baixo. Peças equipadas nunca são consumidas; travadas e com pérolas são recusadas também no modelo, independentemente da UI.

Progressão garantida: Comum → Incomum → Raro → Épico → Lendário. O jogador escolhe o slot resultante; a arma corresponde à classe atual. Para cada slot, usa-se a definição existente de menor soma de status base, com índice como desempate. Isso impede escolher o nome mais forte de uma variante de drop e ainda multiplicar a raridade novamente. O nível resultante é o menor entre os cinco materiais; refino +0, novos extras sorteados após confirmar, sockets da nova raridade vazios. IDs únicos e capacidade são validados.

Custo próprio proposto e habilitado: `ceil((100 + nívelResultante × 25) × multiplicadorRaridadeDestino)` dobrões e `ceil((3 + nívelResultante / 5) × sqrt(multiplicadorRaridadeDestino))` ferro. Exemplo: cinco comuns com menor nível 1 → incomum: 163 dobrões / 4 ferro.

O modal lista as cinco peças, níveis/refinos, custo e destino; avisa que seus extras/refinos serão perdidos. Cancelar não sorteia, não consome e não salva uma transação.

### Supremo: proposta documentada, desabilitada

Não há fusão comum de Lendário para Supremo nem drop de Supremo. Proposta para uma etapa futura: cinco lendários Nv.30+, 50.000 dobrões, 250 Ferro Salgado e um catalisador de chefe de alto nível, com resultado +0 e nível do material menor. O catalisador não existe no catálogo atual: antes de habilitar, definir seu nome/origem, taxa de aquisição e testar o tempo econômico. A proposta não adicionou moeda, item fictício ou botão sem função. Supremos já salvos continuam preservados e utilizáveis nas demais operações.

## Fusão de pérolas

Grids apenas com as combinações possuídas, quantidade disponível/bloqueada, origem/destino, custo e risco. Cinco slots de unidades iguais, com confirmação antes do consumo. [Atualização dos cinco slots, inventário dinâmico e testes](FUSAO-SLOTS.md). Chances e dobrões mantidos: Nv1→2: 80%/40; Nv2→3: 50%/160; Nv3→4: 10%/650; Nv4→5: 5%/2.500. Falha consome as cinco e o ouro. Nv.5 não funde para Nv.6. As expectativas econômicas documentadas na Forja 2.0 permanecem válidas.

## Reforja individual e total

Cada linha pode ser escolhida por seu próprio botão. Só essa linha é sorteada; demais extras mantêm exatamente seus valores. O novo tipo não duplica os demais tipos da peça; respeita exclusões de armas físicas/mágicas e faixas por nível/raridade. É possível sortear o mesmo tipo/valor da linha anterior. Reforjar todos mantém o sorteio original de todas as linhas.

Custo base total: `ceil((30 + nívelItem × 12) × mult × (1 + quantidadeExtras × 0,35))` dobrões; `ceil((1 + nívelItem / 8) × sqrt(mult) + quantidadeExtras)` ferro. A partir desta atualização, calcula-se cada custo com o fator `1,3 ^ tentativasDaPeça` antes do arredondamento. Individual usa 45% do custo bruto total. O contador é compartilhado pelos dois modos e sobe só após uma reforja executada. Começa em zero nos saves antigos; carregar nunca rerrola uma peça existente. Valores não representáveis com precisão segura são recusados, sem cobrança.

Modal obrigatório informa peça, linhas e valores atuais, ambos custos e possibilidade de resultado inferior. Somente a confirmação executa RNG, pagamento e persistência. Não antecipa sorteios. Comparação anterior/nova é mostrada após concluir. Base, raridade, refino, slots, sockets e pérolas não mudam.

## Transações e migração

`forgeVersion:3`; antes da primeira migração, JSON original fica em `mare-partida-save-v1-before-forge-v3`. Backups anteriores continuam intactos. Checkpoint completo antes das edições: `C:/Users/Marcos/Desktop/MARE/backups/mare-partida-v12-before-forge-refactor-20261018-212159`.

Modelo puro clona o estado, valida materiais/saldos/IDs/locks, aplica e retorna a nova cópia. Revisão `forgeSeq` impede replay; callback da confirmação tem trava contra clique repetido. Exceção de RNG ou comando inválido descarta a cópia. Não existe servidor fictício: estado ainda é local.

## Outras mecânicas avaliadas — não habilitadas

- Reparar: inexiste durabilidade; precisa definir desgaste, efeito e preço antes de adicionar reparação.
- Desmontar: falta tabela por nível/raridade, rendimento e tratamento de refino/pérolas; não inventar conversão silenciosa em ferro.
- Transferir aprimoramentos: falta regra de slots/classes, níveis, destruição da origem, custo e tratamento dos extras/sockets; não existe equivalência atual segura.

## Verificação

`node tests/forge-system.test.cjs`: 14 grupos; chances nos 20 níveis, 1.000 resultados de raridade, 25 pérolas, 6 raridades, 4 tiers de fusão de equipamento, 4 de pérolas, sete classes, migração idempotente, proteção de materiais, RNG abortado, custo progressivo e revisão obsoleta.

`C:/Python313/python.exe tests/forge_browser.py`: fluxos reais em Chromium isolado em 1920×1080, 1366×768 e 1280×720. Seleção, filtros, paginação, lista, troca de abas, upgrade garantido/falho/+20, imbuir/remover, fusões, reforja individual/total, cancelamentos, locks, saldos e recarga. Evidências em `docs/evidence-forge-refactor/`. Regressões complementares: personagens, UI náutica, atributos e mundo.

Arquivos de produção: forge-system.js, forge-ui.js, game.js, ui-nautical.css. Ícones, tiles, câmera, mundo e sprites não foram editados. Nenhuma geração paga.

Resumo final: 14 grupos do modelo, 25 grupos de navegador (6 forja, 12 personagens, 7 UI), 59 verificações Node adicionais (12 atributos, 39 mundo, 8 ilha). Smoke adicional de seleção de socket ocupado, cancelamento da remoção e troca de resolução da galeria. Comparação SHA256: 197 arquivos protegidos, zero alterações. Ver verification-summary.json e protected-files.json na pasta de evidências.
