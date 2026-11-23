# Capacetes nas poses masculinas articuladas

Os dez equipamentos de cabeça do catálogo passaram pela seleção, carregamento e comparação do quadro inteiro em 42 poses de ataque. As poses usam o crânio, o pivô do pescoço, a direção e os materiais da arma efetivamente equipada. O jogo compara o RGBA do crânio recortado e a posição dos pontos do pescoço e do nariz em cada fase. A arma permanece na profundidade original e os capacetes de cobertura total ocultam o cabelo conforme a preferência do jogo.

| Classe | Poses exercitadas | Pares capacete × pose | Quadros desenhados e comparados |
|---|---:|---:|---:|
| Espadachim | 17 | 170 | 1.360 |
| Armas de fogo | 13 | 130 | 1.040 |
| Estrategista | 4 | 40 | 320 |
| Curandeiro | 2 | 20 | 160 |
| Adagas | 6 | 60 | 480 |
| Total | 42 | 420 | 3.360 |

A referência por quadro desenha primeiro a arma original com a aparência salva, aplica a regra de visibilidade do cabelo e monta o PNG próprio do capacete pelas coordenadas de origem. O teste exige igualdade de todos os pixels e uma diferença visível ao tirar o capacete. [Resultados por arma e direção](quadros.json.gz) · [Teste](../../../../tests/rework-articulated-weapon-heads.cjs).

O teste no mapa equipou o capacete 19, trocou pelo 178, voltou ao 19 e o retirou durante ataques com a espada 0 a Leste, a arma de fogo 4 a Oeste e as adagas 73 ao Norte. Passaram 12 observações com pele ébano, cabelo azul e olhos verdes. A identificação da arma no quadro continua disponível após retirar a última roupa. [Observações do navegador](mapa.json.gz).
