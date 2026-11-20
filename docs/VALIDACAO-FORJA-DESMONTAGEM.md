# Validação da Forja das Correntes

A aba **Desmontar** permite escolher peças da mochila, conferir a devolução de cada uma e confirmar a destruição em lote. O cliente local grava o save antes de exibir o resultado. No servidor, a operação reaproveita propriedade, versão, recibo e transação do inventário. Peças em custódia do mercado ficam fora da mochila. A reserva de trocas é protegida pelo banco.

## Saldo e regras

- **Fragmento de Item** usa a pilha vinculada que já guardava Ferro Salgado. Uma unidade anterior equivale a uma unidade nova, inclusive com a mochila cheia. Não há crédito separado ao abrir o save ou reconectar. Personagens novos começam sem fragmentos.
- A desmontagem passa a ser a fonte normal. A sucata já acumulada antes da conversão do tutorial continua sendo creditada uma vez. O encontro histórico do tutorial mantém uma unidade de recompensa.
- A Espada de Ferro Salgado e o Braço Mecânico de Ferro Salgado mantêm seus nomes e identificadores. Aprimoramento, reforja e fusão de equipamentos usam a mesma pilha.
- O teto permanece **+20** e preserva os refinamentos salvos. Os últimos patamares ficam como objetivos de longo prazo. Falhar até +4 preserva o refino. Falhar a partir de +5 reduz um nível. A tentativa consome Berry e fragmentos.
- O custo em Berry é dez vezes o anterior para a mesma tentativa. O custo em fragmentos é arredondado para cima após multiplicar pelo fator `1 + 0,015 × (nível da peça − 1)`. O rendimento de desmontagem aplica o mesmo fator e arredonda para baixo.

| Tentativa | Sucesso | Fragmentos no Nv. 1 | Berry no Nv. 1 |
| --- | ---: | ---: | ---: |
| +0 → +1 | 100% | 10 | 500 |
| +1 → +2 | 70% | 12 | 2.000 |
| +2 → +3 | 68% | 15 | 4.500 |
| +3 → +4 | 66% | 18 | 8.000 |
| +4 → +5 | 64% | 22 | 12.500 |
| +5 → +6 | 62% | 27 | 18.000 |
| +6 → +7 | 60% | 33 | 24.500 |
| +7 → +8 | 58% | 40 | 32.000 |
| +8 → +9 | 56% | 48 | 40.500 |
| +9 → +10 | 55% | 57 | 50.000 |
| +10 → +11 | 54% | 67 | 60.500 |
| +11 → +12 | 53% | 78 | 72.000 |
| +12 → +13 | 52% | 90 | 84.500 |
| +13 → +14 | 51% | 103 | 98.000 |
| +14 → +15 | 50% | 117 | 112.500 |
| +15 → +16 | 49% | 132 | 128.000 |
| +16 → +17 | 48% | 148 | 144.500 |
| +17 → +18 | 47% | 165 | 162.000 |
| +18 → +19 | 46% | 183 | 180.500 |
| +19 → +20 | 45% | 202 | 200.000 |

| Raridade no Nv. 1 | Fragmentos |
| --- | ---: |
| Comum | 2 |
| Incomum | 5 |
| Raro | 10 |
| Épico | 20 |
| Lendário | 35 |
| Supremo | 60 |

| Refino | Ataque | Defesa | Vida |
| --- | ---: | ---: | ---: |
| +0 | 0% | 0% | 0% |
| +5 | 1,2% | 1% | 1% |
| +10 | 2,5% | 2,5% | 2,5% |
| +15 | 4% | 4% | 4% |
| +20 | 5,5% | 5% | 5% |

O bônus é interpolado linearmente sobre a base refinável da peça. Vida por potencial, extras e pérolas mantêm suas etapas. A desmontagem calcula o retorno pela raridade e pelo nível da peça.

## Comparação medida no motor de combate

Foram executados **1.092 pares em 182 cenários** com seis sementes por cenário, usando `world-battle.cjs` e o catálogo real. Mudou somente a fórmula dos itens. Cobertura de sete classes, perfis ofensivos e defensivos, arma isolada e conjunto de quatro peças, níveis 5, 44, 45, 46 e 77, uma Zoan, elite, masmorras e Impel Down. Potencial de 35, até quatro poções e posição inicial fixa. Cada tentativa terminou em vitória, morte ou 45 segundos. O teste usou um recinto sem obstáculos para isolar o combate.

| Encontro | Pares | Vitórias | DPS causado | DPS recebido | Tempo de abate, s | Poções |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mapa Nv. 5 | 168 | 168 → 168 | 94,8 → 96,5 | 4,3 → 4,2 | 6,6 → 6,5 | 0,0 → 0,0 |
| Mapa Nv. 44–46 | 504 | 504 → 504 | 1644,8 → 1739,7 | 21,1 → 20,2 | 7,7 → 7,4 | 0,0 → 0,0 |
| Mapa Nv. 77 | 168 | 156 → 162 | 3026,5 → 3159,9 | 67,5 → 65,3 | 17,3 → 17,6 | 0,0 → 0,0 |
| Mapa com Zoan | 42 | 42 → 42 | 3715,3 → 3912,9 | 11,4 → 11,5 | 2,3 → 2,2 | 0,0 → 0,0 |
| Elite | 42 | 42 → 42 | 864,7 → 864,7 | 0,0 → 0,0 | 0,7 → 0,7 | 0,0 → 0,0 |
| Masmorras | 84 | 39 → 42 | 687,7 → 718,6 | 75,1 → 73,2 | 19,0 → 19,9 | 0,6 → 0,5 |
| Impel Down | 84 | 0 → 0 | 379,2 → 410,5 | 5285,3 → 5307,7 | — → — | 1,9 → 1,8 |

| Encontro | Cura efetiva por tentativa | Regeneração base por segundo | Abates por hora de contato simulado |
| --- | ---: | ---: | ---: |
| Mapa Nv. 5 | 13,7 → 13,5 | 4,0 → 4,0 | 545,0 → 550,9 |
| Mapa Nv. 44–46 | 112,0 → 104,7 | 45,6 → 47,0 | 465,4 → 488,9 |
| Mapa Nv. 77 | 921,3 → 888,4 | 108,3 → 111,9 | 173,4 → 187,1 |
| Mapa com Zoan | 21,6 → 19,2 | 50,3 → 52,2 | 1571,7 → 1663,4 |
| Elite | 0,0 → 0,0 | 12,6 → 12,9 | 4877,4 → 4877,4 |
| Masmorras | 1735,0 → 1621,7 | 31,2 → 31,7 | 50,8 → 55,5 |
| Impel Down | 4826,4 → 4749,5 | 75,2 → 77,4 | 0,0 → 0,0 |

- A fórmula original proposta ultrapassou 25% de DPS em vários casos. A curva final ficou dentro desse valor em 181 dos 182 cenários. No Ciborgue defensivo do andar 40, o DPS foi de 89,7 para 129,7, com zero vitórias nas duas versões.
- Entre mortes observadas no mesmo par, o maior aumento da duração média de um cenário foi 18,2%. A média das 72 mortes em Impel Down passou de 14,8 para 15,7 s.
- O Ciborgue defensivo com conjunto +15 passou de 3 para 6 vitórias contra Kuro. A elite testada já caía rapidamente antes e seu tempo permaneceu igual.
- A medida de abates por hora exclui deslocamentos e respawn. Terreno real, Haki, talentos avançados, outras transformações e grupos ficaram fora desta matriz.

## Simulação da progressão

Foram simuladas 25.000 progressões por nível de peça, com sucessos, falhas, regressões e novas tentativas. Resultados para uma peça Nv. 1.

| Meta | Tentativas médias | Berry média / p50 / p90 | Fragmentos média / p50 / p90 |
| --- | ---: | ---: | ---: |
| +1 | 1,0 | 500 / 500 / 500 | 10 / 10 / 10 |
| +2 | 2,4 | 3.347 / 2.500 / 4.500 | 27 / 22 / 34 |
| +5 | 7,0 | 41.684 / 39.500 / 60.500 | 111 / 104 / 152 |
| +7 | 13,0 | 151.860 / 125.000 / 263.500 | 275 / 235 / 450 |
| +10 | 28,2 | 628.326 / 515.000 / 1.152.500 | 875 / 726 / 1.568 |
| +15 | 76,0 | 3.477.540 / 2.799.000 / 6.670.000 | 4.043 / 3.284 / 7.657 |
| +20 | 202,8 | 15.602.296 / 11.889.000 / 31.664.500 | 16.840 / 12.887 / 33.938 |

A projeção por faixa assume 12% de equipamento por abate com espaço na mochila e raridades de 60%, 25%, 10% e 5% para Comum, Incomum, Raro e Épico. Todas as peças da amostra são desmontadas. A renda usa o ponto médio da faixa do monstro com bônus da facção Pirata.

| Peça | Monstro | Berry por abate | Fragmentos por abate | Venda de peça comum +0 | Berry média até +5 | Fragmentos médios até +5 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Nv. 1 | César | 31 | 0,534 | 21 | 41.684 | 111 |
| Nv. 10 | Helmeppo | 37 | 0,558 | 84 | 56.604 | 129 |
| Nv. 45 | Bananawani | 264 | 0,846 | 329 | 114.884 | 186 |
| Nv. 77 | Satori | 1.462 | 1,092 | 553 | 167.851 | 241 |

No cenário Nv. 1, +1 equivale a cerca de 19 abates pelo rendimento médio de fragmentos e 17 pela renda média de Berry. Até +5, as estimativas passam a 208 e 1.345 abates. A desmontagem abre mão do valor de venda das peças. Missões, outros prêmios e tempo de caçada ficam fora dessa projeção.

## Implementação e testes

- `forge-system.js`, `forge-ui.js`, `operation-summary.js` e `game.js` implementam os fluxos e a apresentação.
- `apps/game-server/src/gameplay/inventory.ts`, o cliente de sessão e o schema de inventário implementam o comando online. O teste de integração cobre o reenvio do recibo e dois pedidos concorrentes pela mesma peça.
- `paper-doll-96-lobby.js`, `game.js`, os renderizadores de skin e Zoan e o registro de recursos desacoplam o carregamento visual da simulação. Os avisos do personagem foram retirados da HUD e da cena. O mapa preserva sua própria preparação.
- As regressões focadas cobrem as seis raridades, lote, mochila cheia, bloqueios, migração 1:1, sequência anterior, custos e refino. A simulação visual controlada cobre cache, recurso com falha, nova tentativa e A → B → C fora de ordem.
- Os checks do PR são a referência para execução de Chromium, PostgreSQL e build. Nenhum teste usou saves reais.

## Opção de ajuste por monstro

`ataqueNovo = arredondar(ataqueBase × (1 + bônusAtaque))`

`defesaNova = arredondar(defesaBase × (1 + bônusDefesa))`

Use bônus separados por monstro ou faixa de nível. Um bônus de ataque de 5% leva 200 a 210. Um bônus de defesa de 8% leva 150 a 162. Para um encontro com dano elemental, o mesmo fator pode ser aplicado à defesa mágica se esse for o atributo a calibrar. A implementação da forja usa os atributos atuais dos monstros.
