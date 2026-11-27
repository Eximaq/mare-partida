# Progressão até o nível 185

Atualização do PR #393 sobre a revisão v4 `e9531b6f`. A meta é pelo menos 630 horas de jogo, equivalentes a 45 dias de 14 horas, em uma rota eficiente de referência. O começo tem meta de cerca de 30 horas para o perfil normal chegar ao nível 50.

## Resultado

A mediana normal até o nível 50 foi de 30 h. O mais rápido dos sete perfis otimizados de classe fixa foi Estrategista, com 663,6 h até o 185, ou 47,40 dias. O teto de eficiência entre as taxas medidas, que escolhe a classe mais rápida a cada nível e portanto é mais favorável que uma classe fixa, rendeu 650 h.

A mediana dos tempos normais para o 185 foi de 1.218,4 h (87,03 dias). Há diferença importante entre classes. O Ciborgue normal levou 2.105,3 h na projeção. A meta de duração mínima da rota eficiente tem prioridade sobre a aproximação das marcas para todas as classes.

| Nível | Referência inicial em h | Normal de mediana ao 185 | Otimizado mais rápido | Teto de eficiência amostrado |
|---|---:|---:|---:|---:|
| 50 | 30 | 29,8 | 14,7 | 14,2 |
| 75 | 60 | 73,9 | 39,9 | 38,9 |
| 100 | 109 | 157,4 | 99,1 | 97,1 |
| 125 | 187 | 284,1 | 190 | 182,5 |
| 150 | 314 | 506,4 | 330,4 | 316,7 |
| 175 | 517 | 944,8 | 543,4 | 529,8 |
| 185 | 630 | 1.218,4 | 663,6 | 650 |

| Classe | Normal até 50 (h) | Normal até 185 (h) | Otimizado até 50 (h) | Otimizado até 185 (h) | Dias otimizados na v5 |
|---|---:|---:|---:|---:|---:|
| Espadachim | 29,8 | 62,5 → 1.218,4 | 16,4 | 38,9 → 767,8 | 54,8 |
| Lutador | 33,5 | 76,8 → 1.484,3 | 21,5 | 49,9 → 966 | 69 |
| Atirador | 30 | 75 → 1.457,6 | 16,8 | 45,6 → 912,2 | 65,2 |
| Gatuno | 23,4 | 59,5 → 1.168,9 | 14,3 | 38,4 → 760,6 | 54,3 |
| Ciborgue | 49 | 106,6 → 2.105,3 | 25,1 | 60,7 → 1.205,1 | 86,1 |
| Estrategista | 25,7 | 48,4 → 943,1 | 14,7 | 32,7 → 663,6 | 47,4 |
| Curandeiro | 35,1 | 57 → 1.103,2 | 19,3 | 33,5 → 683,4 | 48,8 |

Os tempos são de jogo ativo. O calendário decorre com 14 horas de jogo e 10 inativas por dia. A referência de 10% é aplicada ao esqueleto das faixas de tempo após o nível 50. O custo de cada nível segue a taxa amostrada e o crescimento é suavizado em até 13% por nível a partir do 21. A XP exigida continua crescente em 180→185. Para o nível 185 são 6.640.279 XP e, depois dele, a exigência por nível aumenta linearmente em 132.806 XP.

## Medição, projeção e regras usadas

- **Combate simulado.** Foram 644 sessões do motor autoritativo em 46 níveis, sete classes e dois perfis. Houve 196 sessões nas sete transições de mapa e mais 28 sessões de 180 s em Conchas e Dawn. A medição inclui caminho, colisões, ataques básicos e de área, respawn, cura, energia, poções e mortes. Distribuição de atributos, equipamento, aprimoramento, pérolas e talentos mudam por faixa. A aquisição de itens e a manutenção de equipamento são representadas por perfis plausíveis em cada faixa. O modelo não simula um inventário único nem cada sorteio de loot durante toda a campanha.
- **Validação dos efeitos.** O simulador envia a fruta, os atributos sem bônus duplicado e as preferências reais ao motor. 232 das 322 amostras normais e 238 das 322 otimizadas registraram lançamentos de Akuma. O perfil normal desbloqueia Haki sem maestria ativa. O otimizado usa Armamento a partir do nível 151 com 46 fragmentos negociados, uma hipótese de acesso ao mercado. O Haki ficou ativo em 56 amostras otimizadas. No nível 184, as taxas de base variaram entre 115.920 e 331.200 XP/h normal e 165.600 a 364.320 XP/h otimizado, antes do bônus de XP de tripulação.
- **Calendário e XP extra.** A projeção inicia numa segunda-feira UTC. Objetivos diários e semanais usam a meta real da classe no primeiro acesso do ciclo, acumulam os abates e o Berry elegíveis e resgatam no máximo uma vez por ciclo. Cada resgate dá um boost diário ou dois semanais, de 1 hora real e 2× XP, sem empilhar a duração. O normal reserva 4% do tempo para ações fora da caçada. O otimizado usa as taxas de caçada sem desconto adicional, até dois boosts negociados por dia e +10% de XP de combate de tripulação. Os contratos únicos e os baús de Alvida e Morgan entram uma única vez. A projeção concede os baús elegíveis sem cobrar o tempo da luta, o que favorece a rota eficiente. Impel Down e os eventos examinados não dão XP direta de nível. Não há avanço por combate desconectado na projeção.
- **Party.** XP é dividida entre os participantes elegíveis e a densidade aumenta. No ensaio único de Marineford 1, o Estrategista otimizado obteve 290.400 XP/h solo e 204.600 XP/h por integrante na dupla equivalente. A projeção principal é solo. Um grupo muito coordenado ou ajuda de personagens de nível alto pode mudar o resultado.
- **Conchas.** A janela de 90 s mostrou que a transição ainda era desfavorável para parte das classes iniciais. Em 180 s, 6 das 7 normais e as 7 otimizadas já ganhavam mais que em Dawn com os 26 XP antigos. Com a recompensa recalibrada para 32 XP, as taxas da janela longa projetam vantagem para as sete classes nos dois perfis. A projeção compara a alternativa anterior medida e usa a melhor taxa disponível em cada faixa. Ao liberar Orange Town, Helmeppo passa a render 16 XP, preservando um único fator de 50%. Os atributos, as tabelas de drops e as recompensas de masmorras permanecem os do PR.
- **Alcance da meta.** Nenhuma classe fixa otimizada das rotas testadas, com estoque limitado de boosts, chegou em menos de 630 h. Com boost comprado disponível para todas as horas ativas, o teto de eficiência projeta 402,3 h (28,74 dias). Builds e rotas mais eficientes que as medidas, ajuda de grupo e mercado muito abastecido ainda podem encurtar o percurso.

## Auditoria por faixa

Todos os pares abaixo são **v4 → v5**. A XP/h e a XP por abate nas tabelas são de caçada sem boost consumível e incluem o bônus regular de tripulação quando aplicável. A coluna de resgates inclui o boost se estivesse ativo na hora do resgate. A coluna de boosts contabiliza apenas o adicional da caçada. A projeção transporta a sobra de XP ao próximo nível, inclusive entre blocos. Os dias são calculados sobre as horas jogadas e não arredondados para dias inteiros.

### Perfil normal de mediana ao 185 Espadachim

Total estimado de abates 31.109 → 622.266.

| Faixa | Mapas e monstros | XP da faixa | XP/abate | XP/h de combate | XP de resgates | XP extra de boosts | Abates estimados | Horas da faixa | Horas acumuladas | Dias de 14 h |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1→5 | Ilha Dawn · César | 197 → 2.292 | 14 → 14 | 3.537 → 3.683 | 65 → 265 | 0 → 0 | 9 → 145 | 0,04 → 0,57 | 0,04 → 0,57 | 0,00 → 0,04 |
| 5→10 | Cidade das Conchas · Helmeppo | 936 → 7.541 | 26 → 32 | 4.561 → 5.753 | 340 → 1.140 | 0 → 0 | 23 → 200 | 0,14 → 1,16 | 0,17 → 1,73 | 0,01 → 0,12 |
| 10→15 | Cidade das Conchas · Helmeppo, Orange Town · Mr. 3 e Cabaji | 1.580 → 15.070 | 28,3 → 30,4 | 6.430 → 6.488 | 1.767 → 2.567 | 0 → 0 | 22 → 411 | 0,10 → 2,01 | 0,27 → 3,74 | 0,02 → 0,27 |
| 15→20 | Orange Town · Mr. 3 e Cabaji, Ilha dos Animais Raros · Cocox | 2.660 → 30.460 | 40 → 38,5 | 13.764 → 12.263 | 2.200 → 2.200 | 0 → 0 | 30 → 734 | 0,09 → 2,40 | 0,37 → 6,14 | 0,03 → 0,44 |
| 20→25 | Ilha dos Animais Raros · Cocox, Vila Syrup · Sham e Buchi | 3.946 → 55.092 | 46 → 44,5 | 18.400 → 17.813 | 248 → 496 | 0 → 13.595 | 47 → 921 | 0,12 → 2,40 | 0,49 → 8,54 | 0,03 → 0,61 |
| 25→30 | Vila Syrup · Sham e Buchi, Baratie · Pearl e Gin | 5.490 → 72.885 | 50,8 → 51,2 | 21.286 → 21.542 | 0 → 0 | 0 → 4.069 | 108 → 1.344 | 0,27 → 3,33 | 0,76 → 11,87 | 0,05 → 0,85 |
| 30→35 | Baratie · Pearl e Gin, Parque Arlong · Kuroobi e Chew | 6.862 → 83.830 | 53,6 → 53,6 | 22.037 → 22.062 | 0 → 0 | 0 → 0 | 128 → 1.564 | 0,32 → 3,96 | 1,08 → 15,82 | 0,08 → 1,13 |
| 35→40 | Parque Arlong · Kuroobi e Chew, Loguetown · Marinheiro | 8.412 → 108.671 | 58,8 → 58,6 | 28.438 → 28.085 | 0 → 0 | 0 → 29.821 | 143 → 1.345 | 0,31 → 2,92 | 1,39 → 18,75 | 0,10 → 1,34 |
| 40→45 | Deserto de Alabasta · Bananawani | 11.270 → 156.230 | 70 → 70 | 30.800 → 30.800 | 0 → 0 | 0 → 0 | 161 → 2.232 | 0,38 → 5,28 | 1,77 → 24,03 | 0,13 → 1,72 |
| 45→50 | Deserto de Alabasta · Bananawani | 12.600 → 170.119 | 70 → 70 | 30.800 → 30.800 | 0 → 0 | 0 → 0 | 180 → 2.430 | 0,43 → 5,75 | 2,20 → 29,79 | 0,16 → 2,13 |
| 50→55 | Alubarna 01 · Puppu | 18.090 → 259.128 | 90 → 90 | 64.800 → 64.800 | 0 → 0 | 0 → 62.208 | 201 → 2.188 | 0,29 → 3,17 | 2,49 → 32,95 | 0,18 → 2,35 |
| 55→60 | Alubarna 02 · Miss Valentine | 21.244 → 477.436 | 94 → 94 | 67.680 → 67.680 | 0 → 0 | 0 → 129.946 | 226 → 3.697 | 0,33 → 5,35 | 2,81 → 38,30 | 0,20 → 2,74 |
| 60→65 | Alubarna 03 · Miss Merry Christmas | 24.794 → 843.837 | 98 → 98 | 78.400 → 78.400 | 0 → 0 | 0 → 75.264 | 253 → 7.843 | 0,33 → 10,21 | 3,14 → 48,51 | 0,22 → 3,47 |
| 65→70 | Alubarna 04 · Miss Double Finger | 29.998 → 1.103.082 | 106 → 106 | 84.800 → 84.800 | 0 → 0 | 0 → 81.408 | 283 → 9.638 | 0,37 → 12,55 | 3,51 → 61,06 | 0,25 → 4,36 |
| 70→75 | Alubarna 05 · Mr.1 | 38.040 → 1.406.349 | 120 → 120 | 105.600 → 105.600 | 0 → 0 | 461 → 101.376 | 313 → 10.875 | 0,37 → 12,87 | 3,88 → 73,93 | 0,28 → 5,28 |
| 75→80 | Ilha dos Anjos · Satori | 44.730 → 1.476.455 | 126 → 126 | 90.720 → 90.720 | 0 → 0 | 22.365 → 87.091 | 178 → 11.027 | 0,26 → 15,95 | 4,14 → 89,89 | 0,30 → 6,42 |
| 80→85 | Ilha dos Anjos 2 · Shura | 52.536 → 1.476.480 | 132 → 132 | 79.200 → 79.200 | 0 → 0 | 26.268 → 228.096 | 199 → 9.457 | 0,35 → 16,42 | 4,48 → 106,31 | 0,32 → 7,59 |
| 85→90 | Ilha dos Anjos 3 · Gendatsu | 62.300 → 1.476.505 | 140 → 140 | 95.200 → 95.200 | 0 → 0 | 31.150 → 91.392 | 222 → 9.894 | 0,34 → 15,16 | 4,83 → 121,46 | 0,34 → 8,68 |
| 90→95 | Ilha dos Anjos 4 · Ohm | 79.840 → 1.773.212 | 160 → 160 | 102.400 → 102.400 | 0 → 0 | 5.144 → 98.304 | 467 → 10.468 | 0,76 → 17,04 | 5,59 → 138,50 | 0,40 → 9,89 |
| 95→100 | Enies Lobby 1 · Fukurou | 93.912 → 1.992.206 | 168 → 168 | 99.320 → 99.482 | 0 → 0 | 0 → 190.956 | 559 → 10.722 | 0,98 → 18,86 | 6,57 → 157,36 | 0,47 → 11,24 |
| 100→105 | Enies Lobby 1 · Fukurou, Enies Lobby 2 · Kalifa, Enies Lobby 3 · Jabra | 110.184 → 2.267.606 | 176 → 176 | 106.942 → 107.028 | 0 → 0 | 0 → 101.376 | 626 → 12.306 | 1,07 → 21,08 | 7,64 → 178,44 | 0,55 → 12,75 |
| 105→110 | Enies Lobby 3 · Jabra, Enies Lobby 4 · Blueno | 132.352 → 2.640.479 | 188,8 → 188,9 | 117.701 → 117.807 | 0 → 0 | 0 → 300.674 | 701 → 12.388 | 1,17 → 20,69 | 8,81 → 199,13 | 0,63 → 14,22 |
| 110→115 | Enies Lobby 5 · Kaku, Thriller Bark 1 · Absalom | 158.256 → 3.067.062 | 201,6 → 201,7 | 117.349 → 117.120 | 0 → 0 | 0 → 270.673 | 785 → 13.861 | 1,40 → 24,87 | 10,22 → 224,00 | 0,73 → 16,00 |
| 115→120 | Thriller Bark 1 · Absalom, Thriller Bark 2 · Perona | 187.056 → 3.239.116 | 212,8 → 213,2 | 110.659 → 110.859 | 0 → 0 | 0 → 210.616 | 879 → 14.206 | 1,76 → 28,46 | 11,98 → 252,46 | 0,86 → 18,03 |
| 120→125 | Thriller Bark 2 · Perona, Thriller Bark 3 · Ryuma | 222.390 → 3.717.061 | 226 → 226,1 | 111.921 → 111.892 | 0 → 0 | 0 → 318.843 | 984 → 15.031 | 2,07 → 31,64 | 14,05 → 284,10 | 1,00 → 20,29 |
| 125→130 | Thriller Bark 3 · Ryuma, Thriller Bark 4 · Oars | 265.376 → 4.360.133 | 239,2 → 241 | 114.794 → 115.679 | 0 → 0 | 109.725 → 444.583 | 651 → 16.247 | 1,41 → 35,26 | 15,46 → 319,35 | 1,10 → 22,81 |
| 130→135 | Thriller Bark 4 · Oars, Sabaody 1 · Pacifista | 316.160 → 4.752.551 | 256,1 → 256,1 | 114.516 → 114.521 | 0 → 0 | 2.391 → 332.237 | 1.225 → 17.263 | 2,85 → 40,21 | 18,32 → 359,56 | 1,31 → 25,68 |
| 135→140 | Sabaody 1 · Pacifista, Sabaody 2 · Urouge | 372.312 → 5.497.314 | 269,2 → 269,3 | 118.451 → 118.502 | 0 → 0 | 0 → 568.550 | 1.383 → 18.301 | 3,27 → 43,33 | 21,59 → 402,89 | 1,54 → 28,78 |
| 140→145 | Sabaody 2 · Urouge, Sabaody 3 · Basil Hawkins | 453.568 → 6.584.360 | 292,8 → 293,1 | 128.838 → 128.980 | 0 → 0 | 0 → 492.518 | 1.549 → 20.782 | 3,67 → 49,20 | 25,26 → 452,09 | 1,80 → 32,29 |
| 145→150 | Sabaody 3 · Basil Hawkins, Sabaody 4 · X Drake | 542.014 → 7.730.871 | 312 → 312,3 | 134.085 → 133.646 | 0 → 0 | 57.080 → 765.311 | 1.554 → 22.304 | 3,77 → 54,29 | 29,03 → 506,38 | 2,07 → 36,17 |
| 150→155 | Sabaody 4 · X Drake, Marineford 1 · Squard | 635.758 → 10.698.791 | 327,7 → 327,7 | 172.383 → 172.372 | 0 → 0 | 242.558 → 669.943 | 1.200 → 30.601 | 2,38 → 60,61 | 31,40 → 566,98 | 2,24 → 40,50 |
| 155→160 | Marineford 1 · Squard, Marineford 2 · Onigumo | 756.382 → 16.332.656 | 349,1 → 347,6 | 195.477 → 194.670 | 0 → 0 | 187.217 → 1.502.054 | 1.631 → 42.663 | 3,03 → 79,36 | 34,43 → 646,34 | 2,46 → 46,17 |
| 160→165 | Marineford 2 · Onigumo, Marineford 3 · Little Oars Jr. | 889.024 → 18.865.740 | 364,8 → 364,8 | 204.289 → 204.307 | 0 → 0 | 0 → 1.574.093 | 2.437 → 47.396 | 4,53 → 88,16 | 38,97 → 734,50 | 2,78 → 52,46 |
| 165→170 | Marineford 3 · Little Oars Jr., Marineford 4 · Izo | 1.035.216 → 21.557.301 | 378,7 → 379,2 | 212.052 → 212.354 | 0 → 0 | 167.499 → 1.840.742 | 2.292 → 51.995 | 4,26 → 96,72 | 43,23 → 831,22 | 3,09 → 59,37 |
| 170→175 | Marineford 4 · Izo, Marineford 5 · Vista | 1.206.910 → 24.703.575 | 395,2 → 394,8 | 208.092 → 208.267 | 0 → 0 | 37.864 → 1.993.498 | 2.958 → 57.521 | 5,85 → 113,59 | 49,08 → 944,81 | 3,51 → 67,49 |
| 175→180 | Marineford 5 · Vista, Marineford 6 · Jozu | 1.406.592 → 28.249.024 | 410,8 → 410,9 | 208.576 → 208.445 | 0 → 0 | 0 → 2.209.690 | 3.424 → 63.369 | 7,02 → 130,13 | 56,11 → 1.074,93 | 4,01 → 76,78 |
| 180→185 | Marineford 6 · Jozu | 1.467.216 → 31.298.449 | 414 → 414 | 207.838 → 207.058 | 0 → 0 | 192.421 → 2.774.131 | 3.079 → 68.899 | 6,39 → 143,50 | 62,50 → 1.218,43 | 4,46 → 87,03 |

### Perfil otimizado mais rápido Estrategista

Total estimado de abates 23.543 → 499.497.

| Faixa | Mapas e monstros | XP da faixa | XP/abate | XP/h de combate | XP de resgates | XP extra de boosts | Abates estimados | Horas da faixa | Horas acumuladas | Dias de 14 h |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1→5 | Ilha Dawn · César e chefe de ilha | 197 → 2.292 | 15,5 → 15,5 | 6.135 → 6.318 | 130 → 1.810 | 99 → 881 | 6 → 57 | 0,02 → 0,14 | 0,02 → 0,14 | 0,00 → 0,01 |
| 5→10 | Cidade das Conchas · Helmeppo | 936 → 7.541 | 29 → 35 | 7.695 → 11.386 | 680 → 2.280 | 163 → 1.991 | 6 → 57 | 0,02 → 0,17 | 0,04 → 0,31 | 0,00 → 0,02 |
| 10→15 | Cidade das Conchas · Helmeppo, Orange Town · Mr. 3 e Cabaji | 1.580 → 15.070 | 32,7 → 33,5 | 14.406 → 14.747 | 1.934 → 5.134 | 523 → 4.968 | 16 → 148 | 0,04 → 0,34 | 0,07 → 0,65 | 0,01 → 0,05 |
| 15→20 | Orange Town · Mr. 3 e Cabaji, Ilha dos Animais Raros · Cocox | 2.660 → 30.460 | 44 → 42,2 | 20.252 → 18.376 | 0 → 4.400 | 530 → 13.030 | 12 → 309 | 0,03 → 0,71 | 0,10 → 1,36 | 0,01 → 0,10 |
| 20→25 | Ilha dos Animais Raros · Cocox, Vila Syrup · Sham e Buchi | 3.946 → 55.092 | 49,2 → 50,1 | 24.092 → 24.293 | 992 → 992 | 1.477 → 15.364 | 30 → 773 | 0,06 → 1,59 | 0,16 → 2,95 | 0,01 → 0,21 |
| 25→30 | Vila Syrup · Sham e Buchi, Baratie · Pearl e Gin | 5.490 → 72.885 | 55,8 → 55,9 | 33.396 → 33.529 | 0 → 0 | 2.745 → 0 | 49 → 1.304 | 0,08 → 2,17 | 0,24 → 5,13 | 0,02 → 0,37 |
| 30→35 | Baratie · Pearl e Gin, Parque Arlong · Kuroobi e Chew | 6.862 → 83.830 | 58,6 → 58,3 | 36.137 → 36.687 | 0 → 0 | 3.431 → 32.353 | 59 → 882 | 0,09 → 1,40 | 0,34 → 6,53 | 0,02 → 0,47 |
| 35→40 | Parque Arlong · Kuroobi e Chew, Loguetown · Marinheiro | 8.412 → 108.671 | 64,6 → 65 | 47.500 → 48.793 | 0 → 0 | 4.206 → 3.047 | 65 → 1.625 | 0,09 → 2,16 | 0,43 → 8,70 | 0,03 → 0,62 |
| 40→45 | Deserto de Alabasta · Bananawani | 11.270 → 156.230 | 77 → 77 | 49.280 → 49.280 | 0 → 0 | 5.635 → 0 | 73 → 2.029 | 0,11 → 3,17 | 0,54 → 11,87 | 0,04 → 0,85 |
| 45→50 | Deserto de Alabasta · Bananawani | 12.600 → 170.119 | 77 → 77 | 49.280 → 49.280 | 0 → 0 | 6.300 → 32.494 | 82 → 1.787 | 0,13 → 2,79 | 0,67 → 14,66 | 0,05 → 1,05 |
| 50→55 | Alubarna 01 · Puppu | 18.090 → 259.128 | 99 → 99 | 99.000 → 99.000 | 0 → 0 | 9.045 → 129.564 | 91 → 1.309 | 0,09 → 1,31 | 0,76 → 15,97 | 0,05 → 1,14 |
| 55→60 | Alubarna 02 · Miss Valentine | 21.244 → 477.436 | 103 → 103 | 107.120 → 107.120 | 0 → 0 | 10.622 → 110.537 | 103 → 3.562 | 0,10 → 3,43 | 0,86 → 19,39 | 0,06 → 1,39 |
| 60→65 | Alubarna 03 · Miss Merry Christmas | 24.794 → 843.837 | 108 → 108 | 116.640 → 116.640 | 0 → 0 | 12.397 → 45.725 | 115 → 7.390 | 0,11 → 6,84 | 0,97 → 26,24 | 0,07 → 1,87 |
| 65→70 | Alubarna 04 · Miss Double Finger | 29.998 → 1.103.082 | 117 → 117 | 126.360 → 126.360 | 0 → 0 | 14.999 → 541.668 | 128 → 4.798 | 0,12 → 4,44 | 1,08 → 30,68 | 0,08 → 2,19 |
| 70→75 | Alubarna 05 · Mr.1 | 38.040 → 1.406.349 | 132 → 132 | 147.840 → 147.840 | 0 → 0 | 19.020 → 47.498 | 144 → 10.294 | 0,13 → 9,19 | 1,21 → 39,87 | 0,09 → 2,85 |
| 75→80 | Ilha dos Anjos · Satori | 44.730 → 1.476.455 | 139 → 139 | 111.200 → 111.200 | 0 → 0 | 22.365 → 333.600 | 161 → 8.222 | 0,20 → 10,28 | 1,41 → 50,15 | 0,10 → 3,58 |
| 80→85 | Ilha dos Anjos 2 · Shura | 52.536 → 1.476.480 | 145 → 145 | 92.800 → 92.800 | 0 → 0 | 26.268 → 278.400 | 181 → 8.263 | 0,28 → 12,91 | 1,70 → 63,06 | 0,12 → 4,50 |
| 85→90 | Ilha dos Anjos 3 · Gendatsu | 62.300 → 1.476.505 | 154 → 154 | 110.880 → 110.880 | 0 → 0 | 31.150 → 332.640 | 202 → 7.428 | 0,28 → 10,32 | 1,98 → 73,37 | 0,14 → 5,24 |
| 90→95 | Ilha dos Anjos 4 · Ohm | 79.840 → 1.773.212 | 176 → 176 | 126.720 → 126.720 | 0 → 0 | 2.766 → 213.352 | 438 → 8.863 | 0,61 → 12,31 | 2,59 → 85,68 | 0,18 → 6,12 |
| 95→100 | Enies Lobby 1 · Fukurou | 93.912 → 1.992.206 | 185 → 185 | 125.800 → 125.800 | 0 → 0 | 0 → 304.203 | 508 → 9.124 | 0,75 → 13,42 | 3,33 → 99,10 | 0,24 → 7,08 |
| 100→105 | Enies Lobby 1 · Fukurou, Enies Lobby 2 · Kalifa, Enies Lobby 3 · Jabra | 110.184 → 2.267.606 | 193,5 → 194,8 | 131.558 → 132.497 | 0 → 0 | 4.724 → 531.647 | 545 → 8.909 | 0,80 → 13,10 | 4,13 → 112,20 | 0,30 → 8,01 |
| 105→110 | Enies Lobby 3 · Jabra, Enies Lobby 4 · Blueno | 132.352 → 2.640.479 | 207,4 → 208,3 | 141.034 → 141.641 | 0 → 0 | 66.176 → 536.203 | 319 → 10.102 | 0,47 → 14,86 | 4,60 → 127,06 | 0,33 → 9,08 |
| 110→115 | Enies Lobby 5 · Kaku, Thriller Bark 1 · Absalom | 158.256 → 3.067.062 | 222,4 → 221,3 | 139.831 → 144.121 | 0 → 0 | 71.922 → 669.162 | 388 → 10.836 | 0,62 → 16,64 | 5,22 → 143,70 | 0,37 → 10,26 |
| 115→120 | Thriller Bark 1 · Absalom, Thriller Bark 2 · Perona | 187.056 → 3.239.116 | 234,2 → 234,8 | 121.788 → 122.096 | 0 → 0 | 0 → 358.848 | 799 → 12.267 | 1,54 → 23,59 | 6,76 → 167,29 | 0,48 → 11,95 |
| 120→125 | Thriller Bark 2 · Perona, Thriller Bark 3 · Ryuma | 222.390 → 3.717.061 | 248,6 → 249,1 | 129.275 → 129.510 | 0 → 0 | 0 → 772.200 | 895 → 11.824 | 1,72 → 22,74 | 8,48 → 190,03 | 0,61 → 13,57 |
| 125→130 | Thriller Bark 3 · Ryuma, Thriller Bark 4 · Oars | 265.376 → 4.360.133 | 265 → 265,2 | 137.806 → 137.879 | 0 → 0 | 0 → 1.104.480 | 1.001 → 12.278 | 1,93 → 23,61 | 10,40 → 213,64 | 0,74 → 15,26 |
| 130→135 | Thriller Bark 4 · Oars, Sabaody 1 · Pacifista | 316.160 → 4.752.551 | 281,8 → 281,2 | 144.050 → 143.664 | 0 → 0 | 0 → 848.401 | 1.122 → 13.881 | 2,19 → 27,18 | 12,60 → 240,81 | 0,90 → 17,20 |
| 135→140 | Sabaody 1 · Pacifista, Sabaody 2 · Urouge | 372.312 → 5.497.314 | 295,3 → 295,6 | 165.378 → 165.558 | 0 → 0 | 70.652 → 931.995 | 1.021 → 15.442 | 1,82 → 27,58 | 14,42 → 268,39 | 1,03 → 19,17 |
| 140→145 | Sabaody 2 · Urouge, Sabaody 3 · Basil Hawkins | 453.568 → 6.584.360 | 322,2 → 321,8 | 180.437 → 180.193 | 0 → 0 | 226.784 → 1.220.687 | 704 → 16.669 | 1,26 → 29,77 | 15,68 → 298,16 | 1,12 → 21,30 |
| 145→150 | Sabaody 3 · Basil Hawkins, Sabaody 4 · X Drake | 542.014 → 7.730.871 | 344,2 → 344,4 | 192.768 → 192.866 | 0 → 0 | 254.320 → 1.520.126 | 836 → 18.033 | 1,49 → 32,20 | 17,17 → 330,36 | 1,23 → 23,60 |
| 150→155 | Sabaody 4 · X Drake, Marineford 1 · Squard | 635.758 → 10.698.791 | 360 → 360,6 | 284.385 → 290.899 | 0 → 0 | 0 → 1.740.340 | 1.766 → 24.842 | 2,24 → 30,80 | 19,41 → 361,15 | 1,39 → 25,80 |
| 155→160 | Marineford 1 · Squard, Marineford 2 · Onigumo | 756.382 → 16.332.656 | 382,2 → 383 | 336.340 → 337.005 | 0 → 0 | 0 → 3.682.800 | 1.979 → 33.032 | 2,25 → 37,54 | 21,66 → 398,69 | 1,55 → 28,48 |
| 160→165 | Marineford 2 · Onigumo, Marineford 3 · Little Oars Jr. | 889.024 → 18.865.740 | 401,4 → 401,4 | 353.232 → 353.267 | 0 → 0 | 0 → 3.184.301 | 2.215 → 39.063 | 2,52 → 44,39 | 24,17 → 443,08 | 1,73 → 31,65 |
| 165→170 | Marineford 3 · Little Oars Jr., Marineford 4 · Izo | 1.035.216 → 21.557.301 | 417 → 417,4 | 366.962 → 367.339 | 0 → 0 | 0 → 3.805.980 | 2.483 → 42.525 | 2,82 → 48,32 | 26,99 → 491,40 | 1,93 → 35,10 |
| 170→175 | Marineford 4 · Izo, Marineford 5 · Vista | 1.206.910 → 24.703.575 | 432,5 → 435 | 380.635 → 382.757 | 0 → 0 | 414.491 → 4.797.780 | 1.832 → 45.766 | 2,08 → 52,01 | 29,08 → 543,41 | 2,08 → 38,82 |
| 175→180 | Marineford 5 · Vista, Marineford 6 · Jozu | 1.406.592 → 28.249.024 | 451,6 → 451,8 | 397.415 → 397.609 | 0 → 0 | 703.296 → 5.560.720 | 1.557 → 50.214 | 1,77 → 57,06 | 30,85 → 600,47 | 2,20 → 42,89 |
| 180→185 | Marineford 6 · Jozu | 1.467.216 → 31.298.449 | 455 → 455 | 400.400 → 400.400 | 0 → 0 | 733.608 → 6.006.000 | 1.612 → 55.588 | 1,83 → 63,17 | 32,68 → 663,64 | 2,33 → 47,40 |

## Migração e verificações

- O custo v5 é compartilhado pelo cliente e pelo servidor. A migração local de saves e a 0069 PostgreSQL preservam nível, progresso fracionário dentro do nível, atributos, inventário e recibos. O total armazenado de XP passa a representar o novo custo. O histórico de promoções preserva a XP registrada à época. A promoção seguinte usa a nova curva. A 0069 roda uma vez pelo histórico de migrações.
- A 0069 executou com o aplicador de migrações real em PostgreSQL 18.6 descartável via PGlite. Foram verificados saves nos níveis 1, 50, 184, 185, 200 e 1.000.000 e um registro de regras legadas. A comparação cobriu paridade dos 185 custos, atributos, recibos, inventário e repetição sem mudança.
- Passaram o build, a checagem de tipos e 23 testes direcionados de progressão, caçada, grupo, contratos, regras de personagem e empacotamento do servidor. No Chromium, um save de teste no nível 50 migrou de 37% para a mesma fração. A HUD mostrou 14.795 / 39.986 XP, o personagem subiu ao 51 no limite correto e Conchas devolveu 32 XP e 16 XP conforme o desbloqueio. Isso verifica o caminho do jogo. As durações de semanas são projeções, não sessões observadas de semanas.

Para reproduzir as sessões e a projeção na revisão do PR:

```sh
node tools/measure_world_progression.cjs . 90 progression > cacadas.jsonl
node tools/measure_world_progression.cjs . 90 transitions > transicoes.jsonl
node tools/measure_world_progression.cjs . 180 level:5 > conchas.jsonl
node tools/project_world_progression.cjs cacadas.jsonl transicoes.jsonl conchas.jsonl > projecao.json
```

Adicione `--calibrate` ao último comando para recalcular a tabela de custos a partir das taxas. O incremento fixo após o nível 185 é configurado separadamente.
