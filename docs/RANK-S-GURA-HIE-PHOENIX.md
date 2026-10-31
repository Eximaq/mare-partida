# Rank S: Gura, Hie e Tori Phoenix

As três frutas entram no catálogo Rank S com três slots de habilidade. As regras do cliente e do serviço local compartilham os identificadores e custos de `assets/akuma/rank-s-rules.json`; o serviço valida lançamentos e impactos, enquanto a simulação do mundo permanece no cliente.

## Gura-Gura

- Aura usa somente os frames 17–21 do recurso enviado. Sua renderização mantém a escala aprovada, centralizada no personagem e com opacidade de 68%. O buff usa os frames 5–15 na mesma escala.
- Rachadura Espacial: cone frontal de quatro tiles, 450% de dano físico e 2,5 s de atordoamento. Poeira 2 é desenhada em cada tile do cone.
- Quebra-Crânio: área de três tiles, 450% de dano físico sem defesa ou escudo e redução de 80% da defesa por 3 s. Poeira 1 é desenhada em cada tile da área.
- Exército de um Homem Só: mais 60% de ataque e defesa durante 10 s.

## Hie-Hie

- Passiva Logia recebe a redução física já usada pelas outras Logias, salvo ataques com Haki.
- Lanças de Gelo: cinco impactos de 420% num alcance de cinco tiles.
- Pássaro Gélido: 450% num alcance de seis tiles; a animação respeita o frame 39.
- Ambos aplicam lentidão de movimento e ataque. Tempo Gélido alcança um alvo até três tiles, congelando por até 5 s; o próximo golpe despedaça o gelo e adiciona 600% de dano. Após a liberação, o alvo recebe 40% de lentidão e 50% de redução de velocidade de ataque.

## Tori-Tori: Model Phoenix

- A aura é visível na forma Zoan e usa 70% da escala quando o personagem volta à forma humana.
- A forma transformada usa o personagem PixelLab AI `7acf1282-14f7-429b-9e4e-5ed3adacee7a`, com frames nativos das quatro direções para idle, Walking, Attack e Tuck the wings tightly against. A escala de mundo é 130%.
- Regenera 10% da vida máxima e da energia máxima a cada 10 s equipada.
- Phoenix Flame usa os 40 quadros originais de `Tuck_the_wings_tightly_against_the_sides_and_accel` nas quatro direções e a animação corporal de asas recolhidas voltada ao alvo, sem deslocar o personagem; causa 400% até dois tiles, reduz defesa em 50% e cura recebida em 80%.
- Chamas da Restauração mantém o totem fixo de 96 px por 7 s, repetindo os frames 18–41. As chamas dos frames 1–6 cobrem todos os 81 tiles do raio de cinco tiles, em tamanho de 64 px cada. Cura 15% da vida máxima por segundo enquanto o personagem está dentro da área.
- Energia Flamejante desenha à frente da fênix o spritesheet fornecido `Bola de Eneriga.png`, preservando suas proporções, e percorre o caminho até o alvo em cinco impactos, somando 550%, e aplica redução de cura recebida de 80%.

Os recursos enviados pelo usuário foram preservados em `assets/akuma/{gura,hie,phoenix}`. As prévias automatizadas ficam fora do repositório.
