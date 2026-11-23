# Integração das roupas e das armas no mapa

Build de [74e609c](https://github.com/Eximaq/mare-partida/commit/74e609c7c0da9932e11567ac7bd8d6502812c4b5). A assinatura do seletor, índices e dependências de auditoria foi `1931503a3219b45aafdf199f1b500a3bf5305da88fe012353ec92477a75dc52f`. O [censo anterior](../README.md) descreve a versão 6a8ffea e inclui a referência de 1ff7442.

| Medida | 1ff7442 | 6a8ffea | 74e609c |
|---|---:|---:|---:|
| Contextos de vestuário com os 50 itens, 1.000 pares e 100 conjuntos amostrados selecionados, de 1.176 | 607 | 820 | 942 |
| Contextos com lacunas de vestuário | 569 | 356 | 234 |
| Consultas individuais com lacunas, de 58.800 | 23.032 | 12.142 | 9.054 |
| Seleções de corpo masculino armado sem roupas, de 504 | 190 | 358 | 383 |

Passaram 49.746/58.800 consultas individuais, 981.606/1.176.000 pares e 94.200/117.600 conjuntos amostrados. No feminino, todos os 588 contextos passaram no vestuário. Das 504 consultas femininas apenas com a arma, o auditor reconheceu 490. As outras 14 selecionam registros específicos de caminhada lateral e Norte que requerem comprovação independente da montagem da arma. No masculino, os 84 contextos desarmados passaram no vestuário. Os 234 grupos de vestuário restantes ocorrem nos contextos masculinos armados.

A fila identifica o receptor vazio, a diferença entre as cores de referência e as cores salvas, as peças sem vínculo e conflitos entre peças aprovadas individualmente. O censo usa cabelo azul, olhos verdes e pele ébano. [Resumo](resumo.json) · [Detalhes por ID e por contexto](detalhes.tsv.gz) · [Fila de causas](pendencias.json.gz) · [1.176 lotes brutos](censo.ndjson.gz).

## Produto completo executado

| Contexto | Consultas isoladas | Pares completos | Conjuntos selecionados |
|---|---:|---:|---:|
| Feminino desarmado, repouso Sul, sete classes | 350/350 | 7.000/7.000 | 700.000/700.000 |
| Feminino, seis armas de fogo, disparo nas quatro direções | 1.200/1.200 | 24.000/24.000 | 2.400.000/2.400.000 |

O segundo recorte inclui os 600.000 conjuntos do disparo Norte. O auditor recuperou a pose de recuo da arma 5 ao Sul. Cada conjunto foi enviado ao seletor do mapa pelo modo direto. O carregamento e o desenho foram medidos nos ensaios abaixo. [31 lotes da enumeração](produtos.ndjson.gz).

## Desenho e mapa

O mapa foi exercitado no Chromium com criação, aparência salva, inventário, caminhada, combate, troca de arma, poder do tipo Mera, mudança de mapa e restauração da sessão. Foram 101 observações com zero exceções. As caminhadas e os socos masculinos desarmados foram exercitados com os cinco slots ocupados nas quatro direções. Foram executadas separadamente retiradas de peças no compositor durante o ciclo. [Registro do navegador](mapa.json.gz) · [Fases com e sem cada peça](quadros.json.gz).

A fonte de disparo Norte contém luvas com alfa vazio nas duas mãos das fases 1 a 6, nas dez opções. As fases 0 e 7 possuem pixels de luva. [Alfa por ID, mão e fase](alfa-luvas-norte.json.gz). A revisão visual identificou deslocamento das botas durante o recuo feminino lateral e no soco masculino Sul na versão desta medição. Isso permanece distinto das aprovações do seletor e dos testes de diferenças de pixels.

## Seleção por ID

| ID | Slot | Feminino armado | Masculino armado | Desarmado (ambos) | Integração global |
|---:|---|---:|---:|---:|---|
| 6 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 7 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 130 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 137 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 144 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 151 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 158 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 165 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 172 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 179 | Peitoral | 504/504 | 336/504 | 168/168 | Parcial |
| 21 | Calça | 504/504 | 338/504 | 168/168 | Parcial |
| 22 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 133 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 140 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 147 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 154 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 161 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 168 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 175 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 182 | Calça | 504/504 | 336/504 | 168/168 | Parcial |
| 8 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 9 | Bota | 504/504 | 338/504 | 168/168 | Parcial |
| 134 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 141 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 148 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 155 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 162 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 169 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 176 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 183 | Bota | 504/504 | 336/504 | 168/168 | Parcial |
| 25 | Luva | 504/504 | 272/504 | 168/168 | Parcial |
| 26 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 131 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 138 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 145 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 152 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 159 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 166 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 173 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 180 | Luva | 504/504 | 270/504 | 168/168 | Parcial |
| 18 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 19 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 129 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 136 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 143 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 150 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 157 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 164 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 171 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |
| 178 | Cabeça | 504/504 | 336/504 | 168/168 | Parcial |

## Reprodução

Execute `python tools/build_pages.py --static-demo` e defina `HD_PUBLISHED_ROOT` como a pasta absoluta do build. Execute `node --expose-gc tools/audit-hd-wardrobe-product.cjs <saída>` com `PRODUCT_MODE=sample`. Para a enumeração direta use `PRODUCT_MODE=direct` e um dos filtros abaixo. Os lotes identificados pela assinatura podem ser retomados.

```json
{"weapon":[null],"body":["feminino"],"direction":["south"],"action":["idle"]}
{"weapon":[4,5,113,114,115,116],"body":["feminino"],"action":["attack-firearm"]}
```

Para consolidar, execute `node tools/summarize-hd-wardrobe-product.cjs <saída>/<assinatura>/sample resumo.json detalhes.tsv.gz pendencias.json.gz`. Execute `node --expose-gc tests/rework-armed-female-wardrobe-pixels.cjs` com `WARDROBE_FAMILY` e `WARDROBE_DIRECTION` para exercitar o ciclo de cada recorte. Para o mapa, execute `node tests/rework-independent-world-browser.cjs` com `MARE_TEST_URL` apontado para o site no navegador.
