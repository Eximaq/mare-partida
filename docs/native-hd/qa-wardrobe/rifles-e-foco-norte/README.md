# Vestuário masculino nos rifles e cajados para Norte

Censo do código `24013e7ec5ab2074b8de88455223646bda9f67d3`, assinatura `598f3cebfcc8cee76c27f63b42dd5852dad1c45c9bdc03c5b4f58a103de758b3`. O catálogo consultado contém 50 roupas e 42 armas. As sete classes também foram testadas desarmadas. O censo percorreu 1.176 contextos, cada um com 50 roupas isoladas, 1.000 pares entre slots e 100 conjuntos mistos determinísticos. Os receptores sem roupas passaram em todos os contextos. [Resumo](resumo.json) · [58.800 resultados individuais](detalhes.tsv.gz) · [Resultados brutos por contexto](censo.ndjson.gz) · [Fila das lacunas com causa e IDs](pendencias.json.gz)

| Corpo e arma | Contextos completos em seleção | Roupas | Pares | Mistos |
|---|---:|---:|---:|---:|
| Feminino armado | 504/504 | 25.200/25.200 | 504.000/504.000 | 50.400/50.400 |
| Masculino armado | 361/504 | 19.496/25.200 | 368.935/504.000 | 36.100/50.400 |
| Feminino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |
| Masculino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |

Os 143 contextos com lacunas são ataques masculinos armados. Nos cinco rifles Norte, faltam vínculos de peitoral e luva. Nos cinco cajados Norte desta entrega há quatro peitorais recuperados por arma. A fila identifica os demais IDs pendentes de cada receptor. O último produto direto feminino cobriu 58,8 milhões de seleções na assinatura registrada no arquivo próprio. [Produto direto feminino](../censo-d7027df/cartesiano-feminino-4ff9073.json.gz)

## Evolução da seleção masculina armada

| Código | Montagem testada | Individuais | Pares |
|---|---|---:|---:|
| 6f8bf4d | Ponto de comparação | 19.331 | 367.435 |
| f6c7506 | Calças e botas dos rifles | 19.426 | 367.935 |
| b5b9953 | Cabeças dos rifles | 19.476 | 368.935 |
| 24013e7 | Peitorais dos cajados | 19.496 | 368.935 |

Cada linha foi medida no seu próprio build. As assinaturas e os totais de cada ID estão no [comparativo](comparacao.json.gz).

## Fontes, ciclos e verificações no mapa

**Rifles 4, 5, 113, 115 e 116.** As armas compartilham o tronco posterior e três estados de recuo em 48 tempos. O registrador compara a cintura e os pés da pose Norte, calcula as áreas próprias das calças e conserva a mão, o braço e o metal nas oclusões. As botas usam as partes originais dianteiras e traseiras. Para o capacete fechado o jogo recompõe os pixels de couro cabeludo com a pele do personagem e recupera a parte da arma que passa por trás do cabelo. O registrador confirma a recomposição exata da base original antes de liberar essa montagem. Os nomes dos registros e as assinaturas das fontes estão no [registro dos rifles](../../../../tools/rework-combat-wardrobe/north-rifle-trousers.json).

- Calças, botas e cabeças passaram por 2.400 verificações de tempos cada. Para os 500 pares calça × bota × rifle houve comparação de pixels em todos os três estados distintos, totalizando 1.500 quadros. Os 5.000 trios calça × bota × cabeça × rifle passaram na seleção.
- No inventário e no mapa foram registrados 125 ataques durante trocas de calça e bota e 75 durante trocas de cabeça. Os testes conservaram a aparência salva, fizeram A → B → A e retiraram peças. O ensaio de cabeça também ocultou e reexibiu o equipamento com as demais peças em uso. [Visível](rifle-115-visivel.webp) · [Oculto](rifle-115-oculto.webp)

**Cajados 123 a 127.** Os editáveis de cada arma em `art-approved/weapons/clothing-batch-20261112` trazem tecido próprio, áreas protegidas e imagens de referência por fase. O exportador confere as nove imagens da pose contra o receptor da arma. Recupera os peitorais 151, 158, 165 e 179 e recompõe as 180 referências vestidas. A comparação de pixels no compositor percorreu esses mesmos 180 quadros com pele ébano, olhos verdes e cabelo azul. O ensaio no mapa observou 35 ataques com as cinco armas, incluindo troca de peitoral, retorno ao primeiro e retirada. [Cajado 126 com o peitoral 179](cajado-126-peitoral-179.webp)

Os recibos identificam os quadros e as fontes por arma. A verificação de ciclos com o compositor e a observação de ataques em tempo real no mapa têm contagens separadas. [Ciclos e mapa](ciclos-e-mapa.json.gz)

**Regressões históricas.** O ensaio completo do navegador observou 1.518 poses no build f6c7506, incluindo armas de ID 0 e as 42 armas com suas classes nos dois corpos. O ensaio observa o desenho no mapa e confirma a identidade da arma e a ação solicitada. As provas de caminhada preservam a pele e a aparência em trocas A → B → A. A verificação de pixels F182 preserva os 80 tempos da caminhada Norte e Sul e exige os hashes originais após isolar as adições posteriores comprovadas. [Observações do navegador](navegador-historico.json.gz)

Na execução da CI em 1070b57, nove dos onze jobs visuais passaram. Os dois que falharam foram o navegador histórico, que consultava o último desenho global e a classe incorreta em parte das armas, e `ordered-poses`, que inclui testes do antigo carregamento em bloco, dependência de leitura de PNG e comparações anteriores às adições do catálogo. Esta revisão corrige o navegador histórico, a dependência PNG, a projeção dos registros F182 e dois testes de caminhada. A aprovação completa da suíte histórica segue pendente. [Execução do GitHub](https://github.com/Eximaq/mare-partida/actions/runs/45099721312)

## Reprodução

Gere o site com `python tools/build_pages.py --static-demo` e defina `HD_PUBLISHED_ROOT` para o site exportado. Execute as três suítes `tests/rework-fixed-north-rifle-{trousers,boots,heads}.cjs` e `tests/rework-north-focus-coats.cjs` com `node --expose-gc`. As comparações com o acervo editável usam `python tools/register_north_rifle_trousers.py --verify` e `python tools/export_north_focus_coats.py --verify`. Para o mapa, sirva o build, defina `MARE_TEST_URL` e `MARE_EVIDENCE_DIR` e execute `node tests/rework-independent-world-browser.cjs` com cada uma das opções `--north-rifle-trousers`, `--north-rifle-helmets` e `--north-focus-coats`. Execute `node tests/native_hd_game_browser.cjs` para o ensaio histórico. O censo completo usa `PRODUCT_MODE=sample node tools/audit-hd-wardrobe-product.cjs <saída>` e retorna 1 enquanto houver lacunas.

## Estado dos 50 equipamentos

As colunas de peças isoladas têm 504 contextos armados por corpo e 168 contextos desarmados. Pares e mistos abrangem os contextos armados dos dois corpos. Cada ID participa de até 40.320 pares e 10.080 mistos. Todos os 50 continuam com integração global parcial.

| ID | Slot | Masculino armado | Feminino armado | Desarmado | Pares | Mistos | Integração global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 362 | 504 | 168 | 34.601 | 8.650 | Parcial |
| 7 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 130 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 137 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 144 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 151 | Peitoral | 415 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 158 | Peitoral | 415 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 165 | Peitoral | 415 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 172 | Peitoral | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 179 | Peitoral | 415 | 504 | 168 | 35.205 | 8.650 | Parcial |
| 21 | Calça | 370 | 504 | 168 | 34.712 | 8.650 | Parcial |
| 22 | Calça | 367 | 504 | 168 | 34.702 | 8.650 | Parcial |
| 133 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 140 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 147 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 154 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 161 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 168 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 175 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 182 | Calça | 366 | 504 | 168 | 34.700 | 8.650 | Parcial |
| 8 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 9 | Bota | 410 | 504 | 168 | 35.233 | 8.650 | Parcial |
| 134 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 141 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 148 | Bota | 407 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 155 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 162 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 169 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 176 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 183 | Bota | 406 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 25 | Luva | 366 | 504 | 168 | 34.614 | 8.650 | Parcial |
| 26 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 131 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 138 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 145 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 152 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 159 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 166 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 173 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 180 | Luva | 361 | 504 | 168 | 34.600 | 8.650 | Parcial |
| 18 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 19 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 129 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 136 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 143 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 150 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 157 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 164 | Cabeça | 434 | 504 | 168 | 35.228 | 8.650 | Parcial |
| 171 | Cabeça | 432 | 504 | 168 | 35.220 | 8.650 | Parcial |
| 178 | Cabeça | 434 | 504 | 168 | 35.220 | 8.650 | Parcial |
