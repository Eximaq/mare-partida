# Balanceamento inicial das sete classes

Diagnóstico controlado executado em 18/10/2026; nenhuma proposta de curva foi aplicada ao jogo. A Forja 2.0 adiciona camadas de equipamento, mas a tabela de nascimento de 50 pontos foi mantida.

## Método

Sete classes × níveis 1,5,10,20,30 × três cenários × 12 sementes = 1.260 amostras de 180 segundos. Passo de 50 ms. Importados `MareCharacters.derive/damage/incoming` reais, dados atuais de classes/inimigos e o controlador de animação aprovado do Espadachim Pirata, incluindo tempo de impacto e reação a dano.

Mesma facção Pirata; equipamento normalizado ATQ6/DEF7/VIDA24, sem extras nem pérolas para isolar as classes. Todos os pontos livres: 70% no principal, 30% no secundário, arredondamento conservando o orçamento. Três cenários: chefe único com habilidades, dois chefes com habilidades e chefe único sem habilidades. O inimigo usa os dados do Guardião da Caldeira nas Ruínas e o escalonamento atual depois do nível8.

Arena em alcance, sem navegação, sem obstáculos, sem poções, sem passagem de nível durante a amostra; reposição após1s. Assim, o alcance e o recuo não concedem vantagem nesta arena. XP/h e tempo para próximo nível são estimativas de teto desta condição, não medições de progressão real nos mapas. O TTK inclui a fase até a morte de cada alvo e eventuais derrotas do herói. DPS usa vida efetivamente retirada, sem contabilizar overkill.

## Comparação por nível

### Nível 1

| Classe | Vida | DPS | Recebido/s | TTK (s) | Energia/min | Vida final % | XP/h estimado |
|---|---:|---:|---:|---:|---:|---:|---:|
| Espadachim | 232 | 60.69 | 3.41 | 4.76 | 137.89 | 18.25 | 89416.67 |
| Lutador / Pugilista | 310 | 56.71 | 3.24 | 5.19 | 164.08 | 85.56 | 83858.33 |
| Atirador / Franco-Atirador | 200 | 64.11 | 3.55 | 4.45 | 127.03 | 68.56 | 94733.33 |
| Gatuno / Acrobata | 220 | 90.96 | 2.99 | 2.83 | 151 | 36.61 | 134850 |
| Ciborgue / Engenheiro de Combate | 433 | 24.29 | 2.08 | 13.39 | 120.78 | 96.49 | 34800 |
| Estrategista Elemental / Mago | 216 | 80.03 | 3.6 | 3.37 | 152 | 85.94 | 117450 |
| Suporte / Curandeiro | 239 | 39.52 | 3.28 | 7.84 | 108.75 | 81.31 | 57758.33 |

### Nível 5

| Classe | Vida | DPS | Recebido/s | TTK (s) | Energia/min | Vida final % | XP/h estimado |
|---|---:|---:|---:|---:|---:|---:|---:|
| Espadachim | 280 | 96.2 | 2.62 | 2.62 | 136.47 | 77.21 | 142583.33 |
| Lutador / Pugilista | 426 | 91.13 | 2.63 | 2.83 | 148.67 | 88.56 | 134850 |
| Atirador / Franco-Atirador | 240 | 116.76 | 3.05 | 1.98 | 126.08 | 45.97 | 173275 |
| Gatuno / Acrobata | 312 | 145.95 | 2.86 | 1.37 | 152 | 67.72 | 217016.67 |
| Ciborgue / Engenheiro de Combate | 665 | 37.58 | 1.53 | 8.31 | 101.83 | 89.33 | 54375 |
| Estrategista Elemental / Mago | 260 | 129.4 | 2.69 | 1.69 | 152.5 | 84.11 | 191883.33 |
| Suporte / Curandeiro | 283 | 66.21 | 3.03 | 4.29 | 88.5 | 89.62 | 97633.33 |

### Nível 10

| Classe | Vida | DPS | Recebido/s | TTK (s) | Energia/min | Vida final % | XP/h estimado |
|---|---:|---:|---:|---:|---:|---:|---:|
| Espadachim | 340 | 139.73 | 2.68 | 1.68 | 139.31 | 18.09 | 191641.67 |
| Lutador / Pugilista | 575 | 137.62 | 2.21 | 1.73 | 133.22 | 82.97 | 189225 |
| Atirador / Franco-Atirador | 290 | 174.38 | 3.15 | 1.15 | 124.67 | 66.1 | 239250 |
| Gatuno / Acrobata | 431 | 210.33 | 2.45 | 0.77 | 151 | 40.01 | 289516.67 |
| Ciborgue / Engenheiro de Combate | 949 | 55.24 | 1.2 | 5.83 | 100 | 96.36 | 74916.67 |
| Estrategista Elemental / Mago | 315 | 168.35 | 3.26 | 1.22 | 153 | 84.75 | 231516.67 |
| Suporte / Curandeiro | 338 | 95.3 | 3.01 | 2.95 | 53.25 | 89.94 | 130500 |

### Nível 20

| Classe | Vida | DPS | Recebido/s | TTK (s) | Energia/min | Vida final % | XP/h estimado |
|---|---:|---:|---:|---:|---:|---:|---:|
| Espadachim | 460 | 208.35 | 3.21 | 1.46 | 136.94 | 12.5 | 209283.33 |
| Lutador / Pugilista | 857 | 226.41 | 2.46 | 1.27 | 131.33 | 89.44 | 226925 |
| Atirador / Franco-Atirador | 390 | 296.35 | 4.38 | 0.73 | 124.67 | 44.41 | 297733.33 |
| Gatuno / Acrobata | 653 | 340.3 | 1.28 | 0.5 | 149.5 | 91.09 | 342925 |
| Ciborgue / Engenheiro de Combate | 1541 | 89.2 | 1.15 | 4.8 | 100 | 98.38 | 88691.67 |
| Estrategista Elemental / Mago | 425 | 291.85 | 4.81 | 0.75 | 153.5 | 58.08 | 293866.67 |
| Suporte / Curandeiro | 448 | 164.01 | 3.2 | 2.14 | 27 | 95.04 | 164333.33 |

### Nível 30

| Classe | Vida | DPS | Recebido/s | TTK (s) | Energia/min | Vida final % | XP/h estimado |
|---|---:|---:|---:|---:|---:|---:|---:|
| Espadachim | 580 | 298.96 | 3.66 | 1.18 | 136 | 16.59 | 236108.33 |
| Lutador / Pugilista | 1147 | 301.95 | 2.64 | 1.16 | 130.14 | 89.14 | 238525 |
| Atirador / Franco-Atirador | 490 | 444.69 | 0.43 | 0.46 | 122.78 | 99.64 | 352108.33 |
| Gatuno / Acrobata | 883 | 463.82 | 0.65 | 0.39 | 150.5 | 99.38 | 367575 |
| Ciborgue / Engenheiro de Combate | 2121 | 133.45 | 1.13 | 3.92 | 100 | 98.95 | 104641.67 |
| Estrategista Elemental / Mago | 535 | 407.32 | 5.32 | 0.59 | 145.5 | 77.52 | 322625 |
| Suporte / Curandeiro | 558 | 227.28 | 3.89 | 1.88 | 21.75 | 91.4 | 178591.67 |

## Sustentação e eficiência das habilidades

| Classe/Nv | DPS sem skills | DPS com 2 alvos | Ganho DPS skills, 1 alvo % | Dano/energia | Cura/energia | Dano evitado/s | Energia final % | KOs | Segundos até próximo nível* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sword / 1 | 53.92 | 64.84 | 12.56 | 6.63 | 0 | 0 | 92.67 | 1.08 | 3.23 |
| brawler / 1 | 43.67 | 57.38 | 29.86 | 4.87 | 0.71 | 0.19 | 63.91 | 0 | 3.44 |
| gunner / 1 | 50.89 | 72.94 | 25.98 | 6.97 | 0 | 0 | 94.41 | 2 | 3.04 |
| rogue / 1 | 75.21 | 104.9 | 20.94 | 7.63 | 0 | 0 | 92.55 | 1 | 2.14 |
| cyborg / 1 | 22.35 | 26.62 | 8.68 | 1.18 | 0.48 | 0.41 | 91.91 | 0 | 8.28 |
| strategist / 1 | 64.23 | 94.62 | 24.6 | 7.01 | 0 | 0 | 95.04 | 2 | 2.45 |
| healer / 1 | 38.44 | 39.76 | 2.81 | 0 | 0.41 | 0.53 | 96.81 | 0 | 4.99 |
| sword / 5 | 89.36 | 110.77 | 7.65 | 10.19 | 0 | 0 | 94.03 | 0.83 | 7.43 |
| brawler / 5 | 76.74 | 101.2 | 18.75 | 6.64 | 0.53 | 0.07 | 83.38 | 0 | 7.86 |
| gunner / 5 | 97.47 | 137.26 | 19.79 | 10.92 | 0 | 0 | 95.2 | 1 | 6.11 |
| rogue / 5 | 127.69 | 190.13 | 14.3 | 9.08 | 0 | 0 | 94.29 | 0.75 | 4.88 |
| cyborg / 5 | 34.14 | 41 | 10.08 | 1.98 | 0.07 | 0.25 | 97.48 | 0 | 19.48 |
| strategist / 5 | 108.31 | 161.53 | 19.47 | 9.28 | 0 | 0 | 96.97 | 0.92 | 5.52 |
| healer / 5 | 64.47 | 67.52 | 2.7 | 0 | 0 | 0.44 | 97.53 | 0 | 10.84 |
| sword / 10 | 129.59 | 170.51 | 7.82 | 15.4 | 0 | 0 | 94.46 | 0.17 | 15.66 |
| brawler / 10 | 119.02 | 154.8 | 15.63 | 10.59 | 0.29 | 0.02 | 96.95 | 0 | 15.85 |
| gunner / 10 | 154.5 | 218.38 | 12.87 | 11 | 0 | 0 | 97.76 | 1 | 12.54 |
| rogue / 10 | 190.3 | 299.67 | 10.53 | 10.23 | 0 | 0 | 96.97 | 0 | 10.36 |
| cyborg / 10 | 51.61 | 59.28 | 7.03 | 2.7 | 0 | 0.2 | 100 | 0 | 40.05 |
| strategist / 10 | 150.66 | 228.35 | 11.74 | 8.61 | 0 | 0 | 97.45 | 1 | 12.96 |
| healer / 10 | 95.17 | 99.23 | 0.14 | 0 | 0 | 0.3 | 99.62 | 0 | 22.98 |
| sword / 20 | 196.09 | 274.62 | 6.25 | 18.26 | 0 | 0 | 97.25 | 0 | 42.65 |
| brawler / 20 | 199.4 | 255.48 | 13.55 | 12.53 | 0.43 | 0.03 | 95.04 | 0 | 39.36 |
| gunner / 20 | 272.51 | 409.18 | 8.75 | 12.31 | 0 | 0 | 96.01 | 1 | 29.98 |
| rogue / 20 | 315.87 | 522.2 | 7.73 | 12.02 | 0 | 0 | 95.35 | 0 | 26.03 |
| cyborg / 20 | 83.32 | 98.22 | 7.06 | 4.24 | 0 | 0.18 | 100 | 0 | 100.7 |
| strategist / 20 | 279.24 | 398.12 | 4.52 | 10.86 | 0 | 0 | 98.47 | 1 | 30.37 |
| healer / 20 | 164.01 | 175.45 | 0 | 0 | 0 | 0.13 | 99.96 | 0 | 54.32 |
| sword / 30 | 283.09 | 397.89 | 5.61 | 25.85 | 0 | 0 | 97.59 | 0 | 71.68 |
| brawler / 30 | 270.31 | 351.23 | 11.71 | 14.47 | 0.42 | 0.02 | 94.05 | 0 | 70.97 |
| gunner / 30 | 419.12 | 684.26 | 6.1 | 12.6 | 0 | 0 | 96.38 | 0 | 48.06 |
| rogue / 30 | 436.97 | 780.66 | 6.14 | 12.81 | 0 | 0 | 96.82 | 0 | 46.03 |
| cyborg / 30 | 123.92 | 146.27 | 7.69 | 6.07 | 0 | 0.17 | 100 | 0 | 161.81 |
| strategist / 30 | 377.34 | 551.22 | 7.95 | 13.06 | 0 | 0 | 99.19 | 1 | 52.46 |
| healer / 30 | 227.28 | 247.34 | 0 | 0 | 0 | 0.14 | 99.96 | 0 | 94.77 |

*Estimativa de arena com nível fixo, sem deslocamento. Cura/energia contabiliza cura direta; bênção/guarda têm também mitigação e regeneração, discriminadas nos dados brutos. A área não é acionada contra um alvo único, conforme a lógica real de auto-habilidades.

## Achados

- O Gatuno mantém o maior DPS normalizado e o Ciborgue a maior vida, coerentes parcialmente com seus papéis; o Ciborgue mata mais devagar, especialmente solo. O Curandeiro consegue matar sozinho, com menor DPS e sustentação própria.
- Espadachim é limitado também pelas animações reais e pela reação ao dano. Outras classes ainda não possuem o mesmo conjunto de animações de combate; comparar apenas os coeficientes como se todos tivessem o mesmo tempo de ação induziria erro. Não se propõe enfraquecer uma classe com base só nessa assimetria artística.
- No nível30, chefes com a curva atual têm cerca de658HP enquanto o DPS cresce muito mais do que a vida dos inimigos; várias classes reduzem TTK para menos de1s na arena. Há saturação do conteúdo inicial.

## Candidato mínimo simulado — não aplicado

Somente vida do chefe acima do nível8: crescimento por nível de4% para10%. Dano/defesa do inimigo, experiência, classes e saves permaneceriam iguais. Trata-se de candidato para playtest, não decisão de balanceamento final. Requer aprovação antes de alterar a experiência real. Não altera os atributos já distribuídos nem itens salvos; aumenta o tempo das lutas e reduz XP/h contra esse alvo.

| Classe/Nv | TTK atual | TTK candidato | XP/h atual | XP/h candidato |
|---|---:|---:|---:|---:|
| sword/20 | 1.46 | 1.98 | 209283.33 | 173275 |
| brawler/20 | 1.27 | 1.81 | 226925 | 183666.67 |
| gunner/20 | 0.73 | 1.08 | 297733.33 | 247708.33 |
| rogue/20 | 0.5 | 0.78 | 342925 | 289275 |
| cyborg/20 | 4.8 | 7.19 | 88691.67 | 62350 |
| strategist/20 | 0.75 | 1.24 | 293866.67 | 229825 |
| healer/20 | 2.14 | 3.45 | 164333.33 | 116000 |
| sword/30 | 1.18 | 1.91 | 236108.33 | 177383.33 |
| brawler/30 | 1.16 | 1.78 | 238525 | 185600 |
| gunner/30 | 0.46 | 0.92 | 352108.33 | 268008.33 |
| rogue/30 | 0.39 | 0.73 | 367575 | 296766.67 |
| cyborg/30 | 3.92 | 6.97 | 104641.67 | 64041.67 |
| strategist/30 | 0.59 | 1.2 | 322625 | 232483.33 |
| healer/30 | 1.88 | 3.33 | 178591.67 | 119141.67 |

Mais168 amostras foram usadas no candidato. Reproduzir: `node tools/simulate_initial_balance.cjs`. [JSON integral](balance-data/initial-balance.json) · [CSV](balance-data/initial-balance.csv). O diagnóstico não substitui sessões reais nos mapas; a regressão das sete classes no navegador cobre o fluxo real separadamente.
