# Camadas de equipamentos no commit 4ff9073

O jogo e as fontes avaliados estão no [commit 4ff9073](https://github.com/Eximaq/mare-partida/commit/4ff9073991d2f32a1311a7d85d4b1aced959d7e7). A assinatura do censo foi `fba920d8a5428740b276d3c91dbcc63a3c6de8fa941861f5eefca6913a3e4da9`. Por contexto entende-se corpo, classe/arma, direção e ação canônica. A aparência da varredura usa pele ébano, cabelo azul e olhos verdes. Os sete estados sem arma conservam suas classes.

| Seleção no build exportado | Resultado |
|---|---:|
| Contextos com todas as seleções do censo aprovadas | 1.020 / 1.176 |
| Contextos com lacunas, todos em ataques masculinos armados | 156 |
| Receptores masculinos com arma antes de vestir roupas | 494 / 504 |
| Peças isoladas | 51.139 / 58.800 |
| Todos os pares de slots em todos os contextos | 1.020.007 / 1.176.000 |
| Conjuntos completos determinísticos, 100 por contexto | 102.000 / 117.600 |
| IDs com validação global de seleção, carregamento e desenho | 0 / 50 |

O [build anterior](../censo-5128c18/README.md) apresentou 158 contextos com lacunas. O porte masculino da arma 119 ao Sul passou no repouso e na caminhada com as cinco peças. Os quatro peitorais laterais nas seis adagas acrescentaram seleções individuais em contextos que ainda têm outros slots pendentes. Dez contextos masculinos continuam falhando já no receptor sem roupa. A fila identifica a etapa e os IDs por contexto. [Fila](pendencias.json.gz) · [58.800 linhas por ID](detalhes.tsv.gz) · [1.176 registros completos](censo.ndjson.gz) · [Totais](resumo.json)

## Enumeração direta

A execução percorreu todos os 100.000 conjuntos de cada uma das 23 linhas abaixo agregadas. A aprovação mede a seleção dos cinco IDs solicitados sobre a arma e a pose. A assinatura consta acima. [Resultados diretos](produto-direto.json.gz)

| Recorte | Conjuntos enumerados e selecionados |
|---|---:|
| Feminino, repouso desarmado Sul, sete classes | 700.000 / 700.000 |
| Feminino, disparo Norte, seis armas | 600.000 / 600.000 |
| Masculino, arma 119 Sul, repouso e caminhada | 200.000 / 200.000 |
| Masculino, soco Norte, armas 14, 15, 109, 111, 112, 118, 119 e 120 | 800.000 / 800.000 |

## Camadas, carregamento e desenho

Nos ataques laterais masculinos com as adagas 12, 13, 71, 72, 73 e 74, os peitorais 151, 158, 165 e 179 usam a trilha própria de tecido e a máscara de mão e metal do ataque. A fonte de aprovação é o [pacote recuperável](https://github.com/Eximaq/mare-partida/tree/4ff9073991d2f32a1311a7d85d4b1aced959d7e7/art-approved/weapons/male-daggers12-13-71-74-four-torsos-ew-v2), com assinatura SHA-256 `67134527f6c1793484ac303b9624f17ea0212ce231e10adafa193d75289e3461`. Foram comparados **384 quadros** contra as referências do arquivo. No build, os mesmos 384 quadros foram carregados e comparados ao personagem com aparência salva, com a oclusão aplicada de forma independente. Houve diferença visível após vestir a peça em todas as fases. Na arma 119, as retiradas individuais no porte Sul tiveram **100 comparações e 850 posições de quadro**. [Pixels por fase](adagas-384.json.gz) · [Retiradas no porte 119](porte-119.json.gz) · [Ciclos visuais](ciclos-adagas.webp)

O teste de mapa em Chromium completou 116 observações e zero erros de página. Inclui criação, caminhadas, troca por inventário, reconexão, poder com ocultação temporária da arma, manopla 112 ao Norte com cinco peças e troca de peitoral 151 → 165 → 151 com a adaga 73 a Leste e Oeste. O teste observou o canvas do mapa e a fonte acordada de cada peça. Os ciclos completos de 384 quadros acima foram desenhados pelo compositor exportado. [Registro do mapa](mapa.json.gz)

As chamadas genéricas de ataque e poder foram comparadas à pose específica nas 42 armas femininas e nos sete estados desarmados, nas quatro direções, somando **392 comparações**. A adaptação conserva a classe, a arma real, as roupas e a pose de ataque. W112 Norte no masculino tem regressão adicional no mapa.

## Seleção por ID

Nas colunas de corpo, o denominador é 504 contextos armados por corpo. A coluna desarmado cobre os dois corpos e sete classes, totalizando 168 por ID. Pares e amostras nesta tabela contam contextos armados. A condição global exige também carregamento, desenho e encaixe.

| ID | Slot | Masculino | Feminino | Desarmado | Pares armados aprovados | Presenças em conjuntos amostrados armados | Global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | coat | 349 | 504 | 168 | 34081 | 8520 | Parcial |
| 7 | coat | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 130 | coat | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 137 | coat | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 144 | coat | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 151 | coat | 360 | 504 | 168 | 34080 | 8520 | Parcial |
| 158 | coat | 360 | 504 | 168 | 34080 | 8520 | Parcial |
| 165 | coat | 360 | 504 | 168 | 34080 | 8520 | Parcial |
| 172 | coat | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 179 | coat | 360 | 504 | 168 | 34080 | 8520 | Parcial |
| 21 | legs | 350 | 504 | 168 | 34084 | 8520 | Parcial |
| 22 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 133 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 140 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 147 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 154 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 161 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 168 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 175 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 182 | legs | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 8 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 9 | boots | 350 | 504 | 168 | 34084 | 8520 | Parcial |
| 134 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 141 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 148 | boots | 349 | 504 | 168 | 34080 | 8520 | Parcial |
| 155 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 162 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 169 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 176 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 183 | boots | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 25 | gloves | 351 | 504 | 168 | 34085 | 8520 | Parcial |
| 26 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 131 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 138 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 145 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 152 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 159 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 166 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 173 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 180 | gloves | 348 | 504 | 168 | 34080 | 8520 | Parcial |
| 18 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 19 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 129 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 136 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 143 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 150 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 157 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 164 | head | 366 | 504 | 168 | 34080 | 8520 | Parcial |
| 171 | head | 354 | 504 | 168 | 34080 | 8520 | Parcial |
| 178 | head | 364 | 504 | 168 | 34080 | 8520 | Parcial |

## Reprodução

Execute `python tools/build_pages.py`, defina `HD_PUBLISHED_ROOT` para a pasta absoluta do site exportado e execute `node tools/audit-hd-wardrobe-product.cjs RESULTADOS`. O modo padrão verifica cada peça, todos os pares e as amostras. Para enumeração cartesiana, use `PRODUCT_MODE=direct` e o filtro de arma/corpo/ação/direção correspondente. Execute `node tests/rework-male-dagger-coat-cycles.cjs` e `node --test tests/rework-wardrobe-map-action.test.cjs` sobre a mesma exportação. Para o mapa, defina `MARE_TEST_URL` e `MARE_EVIDENCE_DIR` e execute `node tests/rework-independent-world-browser.cjs`. O recorte é retomável pelo diretório de resultados da mesma assinatura.
