# Vestuário no build 902c176

O [código testado](https://github.com/Eximaq/mare-partida/commit/902c17601eb967af7bb769ce631efc3f46fcc48f) monta o metal de duas partes da manopla 109 e a máscara de contato do canhão 15 nos ataques Leste e Oeste. O braço 117 usa sua camada própria ao Norte e fica encoberto nas duas fases previstas pelo registro da arma. Essas cinco poses mantêm a mesma anatomia, aparência salva e relógio do soco desarmado. A assinatura do build é `230b1005982379a63b7968bcd1b84ab4efe5926ee0de9ffbb3b4609a9cb530cf`.

| Etapa | Build a16f15a | Build 902c176 | Executados no build 902c176 |
|---|---:|---:|---:|
| Corpo e arma com a aparência do censo, antes de vestir | 1.008 | 1.008 | 1.008 |
| Contextos com todas as peças, pares e 100 conjuntos amostrados | 1.020 | 1.025 | 1.176 |
| Peças isoladas | 51.167 | 51.417 | 58.800 |
| Pares entre slots | 1.020.015 | 1.025.015 | 1.176.000 |
| Conjuntos amostrados | 102.000 | 102.500 | 117.600 |
| Contextos masculinos armados que passam pelo vestuário | 348 | 353 | 504 |

As 151 lacunas pertencem a ataques masculinos armados. Todos os 504 contextos femininos armados e os 168 desarmados passaram pela seleção do censo. A tabela registra aparências com pele ébano, cabelo azul e olhos verdes. O detalhamento identifica a etapa e o motivo de cada falha. [Totais](resumo.json) · [Detalhes por ID](detalhes.tsv.gz) · [Fila](pendencias.json.gz) · [Registros de contexto e pares](censo.ndjson.gz).

## Produtos completos e desenho

Nos cinco contextos corrigidos, 500.000 de 500.000 conjuntos completos passaram pelo seletor do jogo, com 100.000 por contexto. O teste de desenho carregou as artes originais e comparou 40 fases em duas montagens por fase. A primeira compara corpo e arma com a fonte nativa. A segunda veste os cinco slots e compara o quadro com a sobreposição dos metais originais e da máscara de contato. Passaram 80 comparações integrais de pixels. [Produto direto por contexto](produto-direto.json.gz) · [Teste por quadro](../../../../tests/rework-wardrobe-grip-cycles.cjs).

O ensaio do mapa registrou 15 ataques e trocou a luva 159 → 25 → 159 pelo inventário. As outras quatro roupas, a arma e a aparência salva permaneceram presentes, inclusive no retorno à luva original. O registro contém a ação, a direção, o número de quadros, a fonte e os slots efetivamente desenhados. [Registro](mapa.json.gz) · [Captura durante a troca](mapa-109-oeste.webp).

O teste adicional dos peitorais 137, 144 e 172 compara, em duas aparências, o corpo, as peças individuais e as duas peças combinadas com o alfa das camadas originais. Passaram 48 fases ao Sul. [Teste de propriedade](../../../../tests/rework-south-wardrobe-ownership.cjs). Os ciclos das 42 armas com três aparências foram medidos no [build a16f15a](../censo-a16f15a/README.md).

## Cobertura por ID

Os dois corpos têm 504 contextos armados cada. A coluna desarmada abrange 168 contextos. As duas colunas finais de contagem abrangem apenas os contextos armados, com 40.320 participações em pares e 10.080 em conjuntos amostrados previstas por peça.

| ID | Slot | Masculino armado | Feminino armado | Desarmado | Pares armados | Conjuntos amostrados armados | Integração global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 354 | 504 | 168 | 34.281 | 8.570 | Parcial |
| 7 | Peitoral | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 130 | Peitoral | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 137 | Peitoral | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 144 | Peitoral | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 151 | Peitoral | 371 | 504 | 168 | 34.282 | 8.570 | Parcial |
| 158 | Peitoral | 371 | 504 | 168 | 34.282 | 8.570 | Parcial |
| 165 | Peitoral | 371 | 504 | 168 | 34.282 | 8.570 | Parcial |
| 172 | Peitoral | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 179 | Peitoral | 371 | 504 | 168 | 34.282 | 8.570 | Parcial |
| 21 | Calça | 355 | 504 | 168 | 34.284 | 8.570 | Parcial |
| 22 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 133 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 140 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 147 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 154 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 161 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 168 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 175 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 182 | Calça | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 8 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 9 | Bota | 355 | 504 | 168 | 34.284 | 8.570 | Parcial |
| 134 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 141 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 148 | Bota | 354 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 155 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 162 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 169 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 176 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 183 | Bota | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 25 | Luva | 356 | 504 | 168 | 34.285 | 8.570 | Parcial |
| 26 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 131 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 138 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 145 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 152 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 159 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 166 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 173 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 180 | Luva | 353 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 18 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 19 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 129 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 136 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 143 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 150 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 157 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 164 | Cabeça | 373 | 504 | 168 | 34.288 | 8.570 | Parcial |
| 171 | Cabeça | 359 | 504 | 168 | 34.280 | 8.570 | Parcial |
| 178 | Cabeça | 371 | 504 | 168 | 34.280 | 8.570 | Parcial |
