# Rebalanceamento de monstros e missões diárias

## Regras aplicadas

- Ataque inimigo com intervalo ÷1,5 e 100% de precisão quando o golpe é válido. Alcance, obstáculos, escudos e invulnerabilidade explícita continuam valendo.
- Orçamento teórico de 15 pontos por nível acima do primeiro. A distribuição Vida/Ataque/Defesa é 35/30/35 no arquétipo equilibrado, 50/20/30 no resistente e 25/50/25 no ofensivo. Cada ponto acrescenta 4 de Vida, 0,45 de Ataque ou 0,24 de Defesa à base. Aplicam-se os modificadores próprios do chefe e depois +30% de Defesa física.
- XP por morte ×0,1 e dano ofensivo de jogador contra monstro ×0,5 uma vez por contribuição. XP independente de baús e contratos tem a base anterior. O Boost de XP atua sobre a XP pessoal creditada.
- Respawn comum de 30s para 20s nos mesmos pontos. O César regional conserva o desbloqueio e passa de 90s para 60s. Monstros comuns ficam no ponto até sofrer um ataque válido, perseguem pela navegação do mapa e largam alvos inválidos na posição atual, com a vida restante. Em Party, o servidor controla o alvo e a provocação.
- Chance de equipamento 12%. Chances efetivas de 7,2% Comum, 3% Incomum, 1,2% Raro e 0,6% Épico. O loot normal não sorteia Lendário nem Supremo.
- Os cinco monstros provisórios foram retirados dos catálogos ativos. IDs e resgates históricos dos contratos foram preservados. Encontros antigos de Impel Down são conciliados com monstros existentes, com o mesmo token e andamento.
- Diárias online persistem por personagem e ciclo, com reset às 00h UTC. A caçada usa alvos acessíveis e o objetivo de Berry usa somente os créditos de abate. O terceiro objetivo usa o próximo andar viável de Impel Down ou reforços sequenciais na caçada. O resgate completo concede um único Boost de XP (1h), vinculado, com expiração pelo relógio do servidor.
- Ícone do boost gerado no PixelLab Image Pro, 128 × 128 RGBA. Job `2cc29121-1dab-489a-9277-184d3f8d315f`, galeria `e5df9e18-2923-5ee9-b551-d36cd93ef933`, variante 1. A distribuição segue os termos da conta PixelLab.

## Simulação de caçada

Uma execução de oito minutos por faixa no motor autoritativo e com navegação real. Espadachim Pirata, pontos investidos em Força (45%), Destreza (30%) e Vitalidade (restante), equipamento de referência que escala por faixa, habilidades automáticas, sem poções, frutas ou grupo. A primeira queda é o primeiro evento de morte. Abates, XP, Berry e equipamentos por hora são projeções. Equipamentos usam a chance configurada, sem estimar lotação da mochila.

| Nível | Alvo | Abates/h | XP/h | Berry/h | Equip./h | Dano recebido/min | Tempo médio até o abate | Mortes em 8 min | Primeira queda | Diárias estimadas |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 | César | 548 | 3.833 | 16.872 | 66 | 336 | 8,4s | 7 | 66,3s | 5,98h |
| 20 | Cocox | 458 | 6.405 | 28.504 | 55 | 615 | 7,7s | 6 | 88,7s | 6,01h |
| 40 | Marinheiro | 353 | 16.215 | 72.511 | 42 | 1.628 | 13,2s | 10 | 42,6s | 6,00h |
| 75 | Mr. 1 | 83 | 24.420 | 107.285 | 10 | 8.203 | 93,4s | 30 | 9,7s | 6,00h |
| 100 | Satori | 143 | 6.983 | 202.192 | 17 | 4.648 | 23,0s | 12 | 32,3s | 6,00h |

O tempo médio começa no primeiro dano e inclui interrupções até o abate. A movimentação medida foi de 163s, 230s, 122s, 111s e 66s, respectivamente. As metas foram calibradas com essas amostras e variam conforme a classe, equipamento, rota e atividade. O tempo diário inclui uma reserva de 15 minutos para o terceiro objetivo. É uma estimativa baseada na atividade, sem exigência de tempo conectado.

Mr. 1 concentrou o maior risco. Satori no nível 100 rendeu menos XP/h que os alvos dos níveis 40 e 75 devido à diferença de nível e à taxa de abates. Os multiplicadores solicitados foram mantidos. A curva de Mr. 1 e a experiência disponível após Skypiea são candidatos a um ajuste separado com mais builds e amostras.

## Arquivos e ativação

- Combate e drops: `character-system.js`, `hunt-system.js`, `monster-behavior.js`, `monster-game-catalog.js`, `prison-system.js`, `boss-dungeon-system.js`, `world-battle.cjs`, `party-battle.cjs`, `talent-combat.js`, `forge-system.js` e `game.js`.
- Quadro e consumível: `contract-system.js`, `contracts-board.js`, `item-catalog.js`, cliente de conta, validações compartilhadas e `assets/ui/contracts-hd/xp-boost.png`.
- Servidor: contratos, inventário, batalhas, baús, worker de Party e migração `0040_daily_contracts.sql`. A demonstração local recebe as regras de combate e mantém os contratos únicos. Ciclo diário e boost exigem o backend autoritativo atualizado.
- Validação local: compilação, tipos, 227 testes de base, 167 arquivos de testes legados, neutralidade, perseguição e respawn nas 15 áreas de caça no navegador, quadro de contratos com respostas de servidor simuladas e exportação estática. A integração com PostgreSQL passou no CI, incluindo migração, permissões, resgate concorrente e expiração do boost.
