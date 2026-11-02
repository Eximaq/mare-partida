# Personagem original no servidor

> Estado consolidado posterior: [aceite integrado do servidor atual](FINAL-SERVER-ACCEPTANCE.md). As pendências e contagens abaixo registram o momento de cada incremento, não o estado atual agregado.

Este incremento migra as fórmulas básicas das sete classes e quatro facções,
equipamentos, atributos extras e percentuais de pérolas para o backend. O catálogo
foi extraído de `game.js` sem rebalanceamento; navegador e servidor usam
`character-catalog.js`, `character-system.js` e `forge-system.js`.

## Autoridade e persistência

O cliente envia somente a distribuição desejada de pontos. Conta, personagem,
classe, facção, nível, equipamentos e pontos já gastos vêm do PostgreSQL. O comando
exige sessão, propriedade, controlador atual, versão e chave de idempotência.
Não aceita XP, saldo, bônus, resultados de dano ou orçamento fornecidos pelo jogador.
Ledger, versão e recibo são gravados na mesma transação; replays não gastam novamente.

A curva continua `round(80 + 25 * (level - 1)^1.55)`, com cinco pontos por nível.
Sai o teto artificial de nível 20. Cada recompensa avança no máximo 20 níveis,
como `gainXP` original; XP excedente permanece íntegro para a próxima recompensa.
XP total continua BIGINT decimal e os cálculos cumulativos usam BigInt. A origem
do nível é persistida em `level_start_experience`, evitando percorrer todos os
níveis em cada leitura. Não há avanço ou concessão de pontos em GET.

A migração `0015_original_character.sql` preenche esse campo a partir da tabela
histórica, preservando XP, ouro, níveis, personagens, alocações e recibos. Não
importa saves. A tabela de níveis antigos permanece como histórico. HP passa de
smallint para integer; checks de fase, dano, turno e recompensa permanecem.
Recibos gerados pelo servidor passam de 2 KiB para 16 KiB para comportar o snapshot
completo. Os limites de entrada HTTP não aumentam e recibos continuam imutáveis.

Personagens com inventário original recebem `original-character-v1`, com stats,
classe/facção e hash do catálogo/fórmulas. O encontro guarda esse snapshot: investir
pontos depois não reescreve HP nem atributos do combate em andamento. Recibos e
encontros `online-combat-v2`/legados continuam legíveis e com suas regras anteriores.

## Interface e limite do aceite

O painel original Personagem/Status agora distribui pontos pelo servidor, com
prévia, confirmação, bloqueio durante pedido pendente e recuperação do controle.
A HUD lê as fórmulas autorizadas; prévias da forja e atributos usam as mesmas regras
básicas. Nenhum comando online executa o commit de atributos do save local.

O encontro do cais ainda é o piloto: inimigo, recompensa, duração e orçamento de
encontros continuam seus contratos existentes. Ataques novos usam as fórmulas
originais de dano/defesa do personagem e RNG do servidor. Isto **não** conclui o
loop original de mundo, IA, alcance/colisão, habilidades, evasão, energia corrente,
regeneração, talentos, frutas ou Haki. Energia máxima é um atributo calculado;
o recurso consumível de energia ainda não foi migrado. O manifesto permanece
parcial para esses domínios. Não houve merge, deploy, e-mail ou alteração no Supabase.

## Verificação

Os testes reproduziram antes da correção o teto de nível 20, o cálculo simplificado,
HP acima de 300 e a execução indevida do commit local de atributos. A regressão
também identificou o recibo pequeno demais para uma recompensa com o novo snapshot.

- PostgreSQL real isolado: 28 combinações classe/facção, curva além do nível 20,
  concorrência/replay de 100 pontos, recusa de gasto excedente e combate congelado.
- Regressão: migrações históricas, limites de BIGINT, rollback, privilégios mínimos,
  acesso entre contas, restauração de backup e recompensa do inventário original.
- Chromium no CI: painel nativo, intenção estrita, persistência após reload e HUD,
  além dos cenários de inventário/forja. A API desse teste de interface é simulada;
  os testes de transação usam PostgreSQL real, sem o provedor hospedado.

Build/typecheck, 98 testes de fundação e 121 integrações PostgreSQL/HTTP passaram,
incluindo dump/restore real. Build estático e os quatro testes de portal/exportação
Paper Doll passaram. O navegador local automatizado permanece indisponível pela
configuração da ferramenta; a validação Chromium/Docker ocorre no GitHub Actions.

A instalação local recebeu backup antes da migração; os hashes dos dados de todas
as 27 tabelas anteriores permaneceram iguais, excluindo apenas a coluna nova de
origem do nível. Foram preservadas quatro contas/três personagens, com 15 migrações.
Após reiniciar API/gateway, HTTPS foi validado com o certificado de localhost e o
catálogo recusou acesso sem sessão (401). PostgreSQL permaneceu ligado.

## Compatibilidade com o trabalho do colaborador

Durante a entrega, a main avançou para `a533f92` com o PR#202. Seus ajustes de câmera,
navegação, masmorras e proteção de gravação da demonstração foram preservados.
Todos os assets permanecem idênticos à main. Os seis fragmentos foram acrescentados
no fim do catálogo compartilhado (109 definições); um teste verifica o hash dos
103 índices anteriores, sem rebalancear nem renumerar saves.

Os comandos novos das masmorras da demonstração recusam execução online; o modo
online não adquire o gravador dos saves locais. A autoridade de masmorras/fragmentos
continua pendente e está explícita no manifesto (27 grupos). A inclusão das
respectivas definições no catálogo não autoriza criação/uso de instâncias online.

A revisão prossegue no Draft PR#203, branch `feature/server-character-parity`,
com base na main atual e árvore consolidada. O Draft#201 e a branch anterior
permanecem preservados. Não houve merge, force-push ou reescrita da main.
