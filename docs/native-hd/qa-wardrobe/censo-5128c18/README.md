# Roupas e armas em 5128c18

O [commit do jogo](https://github.com/Eximaq/mare-partida/commit/5128c181e2c69bc13a9d54c923161e0a8dd1feee) preserva os commits anteriores do PR. O censo do build exportado tem assinatura `823152a723e2ea05f466bad375b91fbc6d54219355576c593fb0fc57b9efc240`.

| Medida | 1ff7442 | 74e609c | 5128c18 |
|---|---:|---:|---:|
| Contextos aprovados em seleção de roupas, pares e conjuntos amostrados / 1.176 | 607 | 942 | 1.018 |
| Contextos com lacunas de vestuário | 569 | 234 | 158 |
| Consultas individuais com lacunas / 58.800 | 23.032 | 9.054 | 7.729 |
| Corpo masculino armado sem roupa selecionado / 504 | 190 | 383 | 494 |

O seletor resolveu 51.071 de 58.800 peças isoladas, 1.019.207 de 1.176.000 pares e 101.800 de 117.600 conjuntos mistos determinísticos. Cada contexto percorreu os 1.000 pares entre os cinco slots. O teste fez 100 amostras com cinco peças por contexto. O produto completo de 100.000 conjuntos por contexto é medido à parte. No [build 74e609c](../censo-74e609c/README.md), a enumeração direta confirmou 700.000/700.000 conjuntos femininos desarmados em repouso Sul e 2.400.000/2.400.000 em disparo feminino com as seis armas e quatro direções, incluindo 600.000/600.000 no Norte.

## Onde a seleção falha

Os 588 contextos femininos e os 84 masculinos desarmados passaram na seleção. Dos 504 masculinos armados, 346 passaram em todas as seleções de vestuário. A caminhada feminina com espada, cajado e pistola agora verifica a origem das peças no registro próprio da arma em cada fase e em cada direção. Todos os 504 receptores femininos armados sem roupa passaram.

Dos 158 contextos masculinos com lacunas, 10 já falham no receptor com aparência salva e arma sem roupa. São W109 L/O, W110 N/L/O, W114 N, W128 L/O e W32 L/O. A fila inclui 24 contextos de espada, 24 de adagas, 24 de disparo, 36 de soco, 48 de foco e dois de porte com W119 Sul. A fila abaixo identifica a causa por peça e registra separadamente os conflitos que só aparecem na combinação. [Fila com causas](pendencias.json.gz) · [1.176 registros brutos](censo.ndjson.gz) · [58.800 consultas por ID em TSV](detalhes.tsv.gz) · [Totais](resumo.json)

## Carregamento, desenho e aparência

No ensaio de porte Leste e Norte, retirar uma peça por vez do personagem gerou diferença visível em todas as 200 comparações. Foram 1.700 posições de quadro de repouso e caminhada. No soco com manoplas Norte e nas placas laterais Oeste, houve 50 comparações e 400 posições por lote. O ensaio confirmou o desenho dos grupos no recebedor equipado. O teste de materiais isolou cor de cabelo, cor dos olhos e silhueta em 168 ciclos masculinos sem roupa. Nas revisões de trabalho deste lote, 154 passaram e 14 apontaram divergências. Os nomes das fontes e os erros por cor estão no arquivo. [Quadros e fontes](quadros.json.gz) · [Ensaios de cabelo e olhos](materiais-masculinos.json.gz)

O ensaio de Chromium registrou 107 observações no commit 5128c18. Passaram as trocas reais pelo inventário, a pistola 114 personalizada, o porte da manopla 109, a restauração da luva e os quatro socos desarmados. A primeira tentativa com a manopla 112 e cinco peças falhou no mapa ao solicitar a ação genérica `attack` para o Norte. A pose explícita `attack-unarmed` havia passado o ensaio de pixels. Essa falha encerrou o ensaio com erro. [Traço do mapa](mapa.json.gz)

O recuo lateral do disparo passou a deslocar separadamente as duas pernas. No pico de afastamento da pistola 4 com a bota 148, a região exposta do pé caiu de 74,3% para 12%, frente a 8,1% na pose de referência. O soco Sul corrigiu o deslocamento das solas das botas 9 e 148. As pranchas mostram a evolução por fase. [Disparo lateral](disparo-lateral.webp) · [Soco Sul](soco-sul.webp)

## Tabela do catálogo

As colunas contam seleções individuais por contexto. Um ID globalmente concluído exige também combinações, desenho, encaixe e uso no mapa.

| ID | Slot | Masculino armado | Feminino armado | Desarmado, ambos | Integração global |
|---:|---|---:|---:|---:|---|
| 6 | Peitoral | 349/504 | 504/504 | 168/168 | Parcial |
| 7 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 130 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 137 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 144 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 151 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 158 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 165 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 172 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 179 | Peitoral | 348/504 | 504/504 | 168/168 | Parcial |
| 21 | Calça | 350/504 | 504/504 | 168/168 | Parcial |
| 22 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 133 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 140 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 147 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 154 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 161 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 168 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 175 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 182 | Calça | 348/504 | 504/504 | 168/168 | Parcial |
| 8 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 9 | Bota | 350/504 | 504/504 | 168/168 | Parcial |
| 134 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 141 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 148 | Bota | 349/504 | 504/504 | 168/168 | Parcial |
| 155 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 162 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 169 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 176 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 183 | Bota | 348/504 | 504/504 | 168/168 | Parcial |
| 25 | Luva | 349/504 | 504/504 | 168/168 | Parcial |
| 26 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 131 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 138 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 145 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 152 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 159 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 166 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 173 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 180 | Luva | 346/504 | 504/504 | 168/168 | Parcial |
| 18 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 19 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 129 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 136 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 143 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 150 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 157 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 164 | Cabeça | 366/504 | 504/504 | 168/168 | Parcial |
| 171 | Cabeça | 354/504 | 504/504 | 168/168 | Parcial |
| 178 | Cabeça | 364/504 | 504/504 | 168/168 | Parcial |

## Reprodução

Exporte o jogo com `python tools/build_pages.py --static-demo`. Aponte `HD_PUBLISHED_ROOT` para `dist`. Execute `node --expose-gc tools/audit-hd-wardrobe-product.cjs <pasta>` com `PRODUCT_MODE=sample`. Para o produto exaustivo, use `PRODUCT_MODE=direct` e `PRODUCT_FILTER` com os campos do recorte. A retomada usa a assinatura do build e do auditor. Execute `node tools/summarize-hd-wardrobe-product.cjs <pasta>/<assinatura>/sample resumo.json detalhes.tsv.gz pendencias.json.gz` para gerar os totais. As consultas com lacunas retornam código 1.

A compilação de produção passou. Passaram as 19 regressões locais de composição e carregamento, o teste de troca de identidade durante carregamento e as duas direções de caça com obstáculo. O fluxo Paper Doll de infraestrutura e publicação de Pages passaram em GitHub Actions. As jobs de regressão de jogo, de combate com armas, do lobby e da Central ainda apontaram falhas neste SHA. [Execuções do commit](https://github.com/Eximaq/mare-partida/commit/5128c181e2c69bc13a9d54c923161e0a8dd1feee/checks)
