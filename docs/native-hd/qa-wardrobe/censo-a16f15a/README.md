# Roupas e armas no build a16f15a

O [commit testado](https://github.com/Eximaq/mare-partida/commit/a16f15ae5fb337733dd8acb439664b29e1950f47) conserva a pose e a aparência personalizada nos 504 receptores masculinos armados. O build anterior aprovava 494. A assinatura dos arquivos de execução, dos índices e do auditor é `fa38bb63878e620394e29344702bd78e8aa4a3b4199230f9ef57729b623813ca`. A aparência do censo usa pele ébano, cabelo azul e olhos verdes. Cada contexto combina corpo, classe/arma, direção e ação canônica.

| Seleção | Aprovados | Executados |
|---|---:|---:|
| Receptores masculinos com arma, antes da roupa | 504 | 504 |
| Contextos com as 50 peças, todos os pares e os conjuntos amostrados | 1.020 | 1.176 |
| Peças isoladas | 51.167 | 58.800 |
| Pares completos entre slots diferentes | 1.020.015 | 1.176.000 |
| Misturas de cinco slots, 100 por contexto | 102.000 | 117.600 |

Os 156 contextos com lacunas pertencem a ataques masculinos com arma. Todos os receptores passaram. A fila detalha os IDs afetados e as incompatibilidades de vínculo. [Fila](pendencias.json.gz) · [Tabela por ID e contexto](detalhes.tsv.gz) · [1.176 registros, incluindo pares que falharam](censo.ndjson.gz) · [Totais](resumo.json).

## Peitorais, punhos e aparência

Os peitorais 151, 158, 165 e 179 usam as camadas de `sixth-coats-source-proof.json` e do registro de punho `male-punch-native-right-cuff`. A arma 118 usa o encaixe próprio de cada manga. O teste compara a roupa e o metal com os pixels de origem, em cima do corpo com a aparência salva, nas oito fases das duas laterais. Passaram **192 quadros em 24 montagens**. O mapa passou por 21 ataques observados com as armas 111, 112 e 118 durante a troca 151 → 165 → 151 e após retirar a última roupa. Cada observação registra a ação, direção, fonte e slots. O mesmo roteiro passou após a reconciliação com a main em 12315b3. [Registro do mapa](mapa.json.gz) · [Captura da arma 118](mapa-118-oeste.webp).

O rosto de perfil das armas 32, 109, 110 e 128 usa a fonte original da pose e os pigmentos de íris e cabelo. Na vista traseira das armas 110 e 114, a máscara do cabelo exclui o pescoço; na espada 0 o olho encoberto conserva a empunhadura. A arma 111 frontal mantém o mesmo relógio ao trocar a cor dos olhos. Passaram as 42 armas nas quatro direções das sete classes, com três combinações de cores por pose. Foram 168 ciclos, 1.367 quadros por aparência e 4.101 quadros desenhados. O teste compara o canal alfa e a resposta separada do cabelo e da íris, inclusive nas costas. [Resultados por arma e direção](materiais-42-armas.json.gz).

## Enumeração direta do build de referência

Este ponto de controle contém 261 contextos concluídos no [build 4ff9073](../censo-4ff9073/README.md), 26.100.000 conjuntos selecionados de 26.100.000 enumerados. Cada linha veio de 100.000 chamadas ao seletor, com cinco peças presentes. Os totais se referem à assinatura `fba920d8a5428740b276d3c91dbcc63a3c6de8fa941861f5eefca6913a3e4da9`. A enumeração direta mede seleção, e o teste em mapa e a comparação de pixels têm a cobertura descrita acima. [Contagens por arma, corpo, direção e ação](enumeracao-4ff9073.json.gz).

## Cobertura por peça

As colunas de corpo contam os 504 contextos com arma de cada corpo. A coluna sem arma conta os 168 contextos dos dois corpos. As colunas de pares e conjuntos amostrados contam somente os contextos armados, com 40.320 e 10.080 participações previstas por peça.

| ID | Slot | Masculino armado | Feminino armado | Sem arma | Pares aprovados | Misturas aprovadas | Integração global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 349 | 504 | 168 | 34.081 | 8.520 | Parcial |
| 7 | Peitoral | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 130 | Peitoral | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 137 | Peitoral | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 144 | Peitoral | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 151 | Peitoral | 366 | 504 | 168 | 34.082 | 8.520 | Parcial |
| 158 | Peitoral | 366 | 504 | 168 | 34.082 | 8.520 | Parcial |
| 165 | Peitoral | 366 | 504 | 168 | 34.082 | 8.520 | Parcial |
| 172 | Peitoral | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 179 | Peitoral | 366 | 504 | 168 | 34.082 | 8.520 | Parcial |
| 21 | Calça | 350 | 504 | 168 | 34.084 | 8.520 | Parcial |
| 22 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 133 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 140 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 147 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 154 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 161 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 168 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 175 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 182 | Calça | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 8 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 9 | Bota | 350 | 504 | 168 | 34.084 | 8.520 | Parcial |
| 134 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 141 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 148 | Bota | 349 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 155 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 162 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 169 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 176 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 183 | Bota | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 25 | Luva | 351 | 504 | 168 | 34.085 | 8.520 | Parcial |
| 26 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 131 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 138 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 145 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 152 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 159 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 166 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 173 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 180 | Luva | 348 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 18 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 19 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 129 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 136 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 143 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 150 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 157 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 164 | Cabeça | 368 | 504 | 168 | 34.088 | 8.520 | Parcial |
| 171 | Cabeça | 354 | 504 | 168 | 34.080 | 8.520 | Parcial |
| 178 | Cabeça | 366 | 504 | 168 | 34.080 | 8.520 | Parcial |

## Reprodução

Exporte com `python tools/build_pages.py` e defina `HD_PUBLISHED_ROOT` com a pasta absoluta do build. Execute `node tools/audit-hd-wardrobe-product.cjs RESULTADOS` e `node tests/rework-registered-weapon-coats.cjs`. Para a comparação das três aparências, execute `node tests/rework-male-weapon-material-cycles.cjs`. Para o mapa, sirva a exportação e defina `MARE_TEST_URL` e `MARE_EVIDENCE_DIR` antes de executar `node tests/rework-independent-world-browser.cjs --registered-coats`.
