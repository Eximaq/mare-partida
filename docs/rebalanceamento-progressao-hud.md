# Rebalanceamento de progressão e HUD

Base auditada: `9a5d551e` (após #259); branch atualizada com 3081134e (#263). Os multiplicadores abaixo partem dos valores vigentes nessa revisão.

| Regra | Antes | Sprint |
|---|---|---|
| XP por nível | arredondar(80 + 25 × (nível − 1)^1,55) | 80 no nível 1; dobro da taxa percentual anterior entre níveis |
| Cidade das Conchas | 8–8; entrada 8 | 5–10; entrada 5; equipamento normal até nível 10 |
| XP normal por mapa | fator 1 em todos; redução de XP já vigente de 90% | fator 1,15^índice do arquipélago sobre a recompensa vigente |
| Movimento / frequência de ataque | 1× / 1,5× sobre a ficha original | 2× / 2,25× sobre a ficha original |
| Vida / ataque / defesa | curva vigente, incluindo defesa física ×1,30 | ×1,50 / ×1,30 / ×1,20 |
| Masmorras / Impel Down | chefes ×2,5 / fator de andar 1,30 | chefes ×7,5 / fator de andar 1,075 |
| Destreza para cadência | 0,006 ataque/s por ponto | 70% Gatuno, 40% Atirador, 0% outras classes |
| Diárias | metas calculadas para 6h; próximo andar de Impel ou reforços | alvos numéricos ×4 em novos ciclos; reforços quando não há quatro conclusões de Impel |
| Ferro Salgado (normal) | 35% padrão, 45% Conchas, 55% Orange, 60% Raros | 7%, 9%, 11%, 12%; bônus e garantias preservados |
| Escala visual | tamanho de referência por espécie | Marinheiro/Miss Doublefinger/Mr. 1 ×0,70; Helmeppo ×1,30; Cocox/Miss Merry Christmas ×0,80 |
| Nome na criação | até 18 no cliente; até 40 unidades de texto no servidor | até 12 caracteres visíveis; nomes existentes preservados |

A redução da eficácia da defesa do jogador no PvE depende da definição do percentual. O parâmetro permanece em 100%.

## Cálculo e preservação de dados

- XP: se A(L) é o custo antigo arredondado, a série nova parte de 80 e evolui por N(L) = N(L−1) × [1 + 2 × (A(L)/A(L−1) − 1)]. O jogo cobra Math.round(N(L)). Exemplos: nível 5, 294 → 781; nível 10, 833 → 5.221; nível 20, 2.479 → 41.391; nível 40, 7.393 → 347.137; nível 75, 19.816 → 2.425.406.
- Saves: o nível atual é preservado, assim como a proporção aproximada de avanço: arredondar(XP dentro do nível × custo novo / custo antigo). O save offline grava a versão da curva; o servidor registra a migração transacional uma vez. Recibos históricos, XP profissional e de tripulação, Haki e talentos não são recalculados.
- Caça: a ordem é a do catálogo (Dawn = 0, Conchas = 1, Alabasta = 8, Ilha dos Anjos = 14). As áreas de Alubarna têm etapas próprias. O bônus vem antes da divisão na Party. A porcentagem histórica dos baús continua usando os custos anteriores; Impel Down tem recompensa própria.
- Combate: o perfil comum é calculado primeiro. Vida, ataque e defesa recebem os fatores globais. Só as Masmorras de Chefes aplicam 7,5 aos atributos que já escalavam. O intervalo original é dividido por 2,25, o mesmo que dividir o intervalo vigente por 1,5. Especiais mantêm seus próprios relógios.
- Diárias: o cálculo de referência mantém o perfil anterior e multiplica as metas por quatro. A terceira missão usa os reforços que já existem, pois só se pode preparar o próximo andar de Impel. Ciclos persistidos mantêm seus objetivos. A chance de Ferro Salgado é reduzida depois do bônus de loot, com garantias preservadas.
- HUD: a faixa de loot fica no meio da altura, junto à borda direita. Cabe um aviso por vez. A fila é suspensa quando um modal ou HUD ocupa a faixa. Abrir um painel não limpa ações pendentes.

## Simulação de referência

Motor autoritativo, navegação real, semente 42 e 240 s de caça por cenário, extrapolados com nível fixo. Equipamento de referência: ataque = 1,3 × nível, defesa = 0,75 × nível e HP = 9 × nível. Sem poções, Akuma, Haki ou talentos. Dano/min é perda efetiva de HP; Ferro/h é valor esperado pelas chances. A duração da diária considera abates e reforços. Uma amostra curta não representa todos os estilos de jogo.

| Nível · classe | Mapa | Primeiro abate (s) | Mortes em 4 min | Dano recebido/min | Acertos recebidos/min | Ataques/s do personagem | XP/h | Horas para subir | Horas de diária | Ferro/h |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5 · Lutador | Dawn | 10,50 → 13,75 | 0 → 1 | 335 → 670 | 29,50 → 49 | 1,14 → 1,09 | 2.895 → 1.995 | 0,10 → 0,39 | 6,72 → 36,77 | 221,25 → 19,95 |
| 10 · Atirador | Conchas | 2,25 → 4 | 0 → 5 | 4,25 → 649 | 0,25 → 33,25 | 1,34 → 1,22 | 5.280 → 4.050 | 0,16 → 1,29 | 4,20 → 24,65 | 297 → 40,50 |
| 20 · Gatuno | Animais Raros | 3,50 → 6,25 | 1 → 5 | 491 → 1.417 | 20,25 → 44,75 | 2,24 → 2,13 | 7.560 → 8.505 | 0,33 → 4,87 | 6,69 → 35,69 | 324 → 48,60 |
| 40 · Espadachim | Loguetown | 8,25 → 12 | 4 → 8 | 1.651 → 3.354 | 36,25 → 56,75 | 1,95 → 1,60 | 15.180 → 23.790 | 0,49 → 14,59 | 6,16 → 41,70 | 115,50 → 13,65 |
| 75 · Estrategista | Alubarna 05 | 32,25 → 71,25 | 8 → 17 | 5.391 → 11.745 | 34,50 → 58 | 1,65 → 1,60 | 22.200 → 81.945 | 0,89 → 29,60 | 6,23 → 41,51 | 26,25 → 3,15 |

Alvida contra Lutador Nv. 20: **13 s antes; nenhuma vitória em 300 s depois, com 13 mortes**. Grupo de quatro Nv. 20 (Lutador, Atirador, Gatuno, Curandeiro): **5,75 s → 15,5 s**, sem mortes. Nenhum cenário registrou inimigo vivo em posição não caminhável. As metas diárias ultrapassaram 24h nos cinco cenários desta amostra.

No ensaio com 90% de eficácia da defesa PvE, as mortes subiram de 8 para 9 no Nv. 40 e de 17 para 19 no Nv. 75. **Recomendação: manter 100%** enquanto se revisam a dificuldade solo e as metas diárias. A redução não foi ativada.

Os arquivos alterados concentram-se nas regras compartilhadas, nas rotas do servidor e na migração 0041, na renderização dos monstros e nas telas da HUD e criação. As capturas foram mantidas fora do repositório.
