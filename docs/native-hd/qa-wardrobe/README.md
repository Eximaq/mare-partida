# Composição de vestuário no mapa

[Censo de 74e609c, com os resultados dos 50 IDs e 3.100.000 conjuntos enumerados](censo-74e609c/README.md).

Medição do código [6a8ffea](https://github.com/Eximaq/mare-partida/commit/6a8ffeabb0db645ecaa02cb63ccfd7394b933c7e). Referência anterior [1ff7442](https://github.com/Eximaq/mare-partida/commit/1ff74420de4d9ea41c84a909a39b94f54773e92d). Assinaturas do auditor no build anterior e no medido, respectivamente, `1473b55ab8bce40b47f57128f4f545cc89b784ee9c2129e7932728ae9336f418` e `2768429bd90a5adc36e808e453c790f5b21ec25cf729da90d22875a35563322a`.

| Medição do seletor | Anterior | Medido |
|---|---:|---:|
| Receptores sem roupa selecionados / 1.176 | 848 | 1.016 |
| Contextos completos no censo / 1.176 | 607 | 820 |
| Contextos com lacunas | 569 | 356 |
| Consultas individuais pendentes / 58.800 | 23.032 | 12.142 |
| Receptores masculinos armados / 504 | 190 | 358 |

O censo percorreu os 50 itens, os 1.000 pares entre slots e 100 conjuntos determinísticos em cada contexto. Passaram 46.658 consultas individuais, 905.703 pares e 84.996 conjuntos amostrados. As 42 armas seguem a classe do catálogo. As sete classes também são testadas desarmadas. Consulte o [resumo](resumo.json), os [58.800 resultados por ID e contexto](detalhes.tsv.gz), a [referência anterior](antes.tsv.gz), os [lotes completos do censo](censo.ndjson.gz) e a [fila por causa e receptor](pendencias.json.gz).

## Produtos diretos

| Recorte | Contextos | Peças | Pares | Conjuntos completos selecionados |
|---|---:|---:|---:|---:|
| Feminino desarmado, repouso Sul, sete classes | 7 | 350/350 | 7.000/7.000 | 700.000/700.000 |
| Feminino, disparo Norte, seis armas | 6 | 300/300 | 6.000/6.000 | 600.000/600.000 |

A enumeração direta usa `PRODUCT_MODE=direct` com `tools/audit-hd-wardrobe-product.cjs`. Cada linha do [arquivo de produtos](produto-direto.ndjson.gz) corresponde a um contexto. O carregamento e o desenho têm ensaios separados.

## Desenho e mapa

O [ensaio de retirada por quadro](quadros.json.gz) compara o desenho completo com o mesmo personagem sem a peça examinada. Em repouso Sul, as 50 retiradas alteraram a imagem. No disparo Norte foram 340 diferenças em 400 comparações e em adagas Norte, 390 em 400. As igualdades concentraram-se nas luvas em seis das oito fases do disparo e em uma fase das adagas. A inspeção da oclusão dessas fases permanece relevante. Na manopla Sul houve 850 diferenças em 850 comparações. A variação por si só não mede alinhamento anatômico.

Os painéis [anterior](antes.png) e [posterior](depois.png) mostram os quadros do compositor. O [registro do mapa](mapa.json.gz) reúne 80 observações em navegador com o equipamento e a aparência utilizados. Exemplos do mapa mostram [repouso desarmado com cinco peças](repouso-desarmada-com-cinco-pecas.png) e [fuzil com peitoral 179](fuzil113-peitoral-179.png).

## Seleção por equipamento

M e F contam contextos armados com seleção individual, de 504 por corpo. Desarmado agrega os dois corpos, de 168. Pares e conjuntos amostrados contam participações armadas por ID. A aprovação global exige também cobertura das poses, do desenho, da aparência e do mapa.

| ID | Slot | M | F | Desarmado | Pares | Conjuntos amostrados | Integração global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 7 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 130 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 137 | Peitoral | 336 | 486 | 98 | 32160 | 7500 | Parcial |
| 144 | Peitoral | 336 | 486 | 98 | 32160 | 7500 | Parcial |
| 151 | Peitoral | 336 | 486 | 70 | 32160 | 7500 | Parcial |
| 158 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 165 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 172 | Peitoral | 336 | 486 | 119 | 32160 | 7500 | Parcial |
| 179 | Peitoral | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 21 | Calça | 338 | 486 | 91 | 32164 | 7500 | Parcial |
| 22 | Calça | 336 | 486 | 91 | 32160 | 7500 | Parcial |
| 133 | Calça | 336 | 486 | 119 | 32160 | 7500 | Parcial |
| 140 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 147 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 154 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 161 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 168 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 175 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 182 | Calça | 336 | 486 | 140 | 32160 | 7500 | Parcial |
| 8 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 9 | Bota | 338 | 486 | 112 | 32164 | 7500 | Parcial |
| 134 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 141 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 148 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 155 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 162 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 169 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 176 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 183 | Bota | 336 | 486 | 112 | 32160 | 7500 | Parcial |
| 25 | Luva | 266 | 486 | 126 | 30004 | 7500 | Parcial |
| 26 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 131 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 138 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 145 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 152 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 159 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 166 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 173 | Luva | 264 | 486 | 126 | 30000 | 7500 | Parcial |
| 180 | Luva | 264 | 486 | 140 | 30000 | 7500 | Parcial |
| 18 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 19 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 129 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 136 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 143 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 150 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 157 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 164 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 171 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
| 178 | Cabeça | 336 | 486 | 154 | 32160 | 7500 | Parcial |
