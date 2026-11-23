# Manopla e adagas laterais no mapa

O censo do código `6fee649b5584a56bed5891ad8d39aae30d824a1a` tem a assinatura `5e055a892689bb746624a8439f5e349d2995e7400abb64ab7474835a494e8aad`. Há **1.035 contextos completos na seleção e 141 com lacunas**, todos em ataques masculinos armados. Os 1.176 receptores sem roupas foram selecionados. Nenhum dos 50 itens atendeu ao critério global de seleção e desenho em todas as poses. [Censo por contexto](censo.ndjson.gz) · [Resultados por item](detalhes.tsv.gz) · [Fila de causas e IDs](pendencias.json.gz) · [Resumo](resumo.json)

| Corpo e equipamento | Contextos completos | Itens individuais | Pares | Conjuntos mistos |
|---|---:|---:|---:|---:|
| Feminino armado | 504/504 | 25.200/25.200 | 504.000/504.000 | 50.400/50.400 |
| Masculino armado | 363/504 | 20.018/25.200 | 374.955/504.000 | 36.300/50.400 |
| Feminino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |
| Masculino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |

Cada contexto consulta 50 peças, todos os 1.000 pares entre slots e 100 conjuntos completos determinísticos. As sete classes entram separadamente nos estados desarmados. O auditor distingue falhas de receptor e de montagem. Falhas de carregamento, desenho e encaixe exigem testes adicionais com imagens. [Antes desta rodada](../norte-articulado/) · [Repouso feminino desarmado e tiros femininos para Norte](../rifles-e-foco-norte/) · [58,8 milhões de seleções femininas diretas em build anterior](../censo-d7027df/cartesiano-feminino-4ff9073.json.gz)

| Revisão | Individuais masculinos armados | Pares masculinos armados | Contextos completos |
|---|---:|---:|---:|
| ca5e805 | 19.678 | 370.795 | 361 |
| e4c4971 | 19.778 | 372.795 | 363 |
| e6bf34c | 19.898 | 373.275 | 363 |
| 6fee649 | 20.018 | 374.955 | 363 |

## Manopla 110

A manopla usa a mesma silhueta da pose lateral de soco. A montagem preserva o metal próprio e as cores registradas nas bordas que continuam descobertas após vestir o personagem. O cabelo, a íris e a pele vêm da aparência salva. O Oeste usa o espelhamento indicado pela fonte. O auditor direto percorreu **100.000/100.000 conjuntos a Leste e 100.000/100.000 a Oeste** no código `e4c4971`, assinatura `4507d75c4dac5a9ee76ccbf073f9aa8a37e129fe0715e58e4dc7492e0e455382`. As 960 comparações das imagens finais cobrem os oito quadros de 50 peças isoladas e dez conjuntos por direção. O mapa registrou 26 ataques alternando os cinco slots, retirada e retorno da arma, duas aparências e duas ordens de equipar. [Seleções diretas com resultados por ID](produto-manopla-110.json.gz) · [Registros das comparações de pixels e ataques](quadros-e-mapa.json.gz)

![Manopla 110, oito quadros reais a Leste](punho-east.png)
![Manopla 110, oito quadros reais a Oeste](punho-west.png)

## Botas nas seis adagas

As lâminas 12, 13, 71, 72, 73 e 74 compartilham a anatomia dos tornozelos a Leste e Oeste. Cada arma tem sua própria máscara que restaura a mão e o corpo depois da lâmina dianteira. Aplicar a bota apenas à primeira passagem do corpo fazia a máscara recompor a pele em cima dela. Agora as duas passagens usam a bota selecionada, preservando a ordem das duas lâminas. O registro verifica a anatomia sob toda a área alterada em cada fase. As dez botas usam seus próprios grupos dianteiro e traseiro. As origens, os pivôs e a posição por fase estão no registro reproduzível. [Registro e conferência dos doadores](../../../../tools/export_articulated_boots.py) · [Teste contra a recomposição independente](../../../../tests/rework-lateral-dagger-boots.cjs)

Nas 960 imagens finais, cada bota produziu ao menos 3.749 pixels diferentes do pé descoberto. Foram verificadas as quatro opções de peitoral já integradas à pose nas duas ordens de montagem. O mapa registrou 156 ataques com o peitoral 151, as dez botas, retorno à primeira bota e retirada individual. Houve captura dos oito quadros das seis armas nas duas direções. Abaixo estão dois dos doze ciclos. [Registros de quadros e mapa](quadros-e-mapa.json.gz)

![Botas na adaga 73, oito quadros a Leste](botas-adaga73-east.png)
![Botas na adaga 73, oito quadros a Oeste](botas-adaga73-west.png)

## Capacetes nas seis adagas

Os dez equipamentos de cabeça usam o crânio, o nariz e a nuca da pose assinada. O registro de ataque desloca o grupo inteiro oito pixels físicos para trás e quatro para baixo. A Leste e Oeste, todos os 4.994 pixels da área do cabelo coincidiram com a referência em cada fase; as lâminas ficaram fora dessa área. Para capacetes fechados o jogo revela a pele da aparência salva. O capacete é desenhado com seu próprio ajuste após as mangas. Os testes confrontaram 960 quadros novos (mais 480 quadros de regressão a Norte). O mapa registrou 180 ataques nas seis armas com botas 148 e peitoral 151, alternando as dez cabeças, ocultação e retorno, ordem inversa e duas aparências salvas. [Fontes e comparação de pixels](../../../../tests/rework-articulated-weapon-heads.cjs) · [Registros dos testes de cabeça](capacetes-quadros-e-mapa.json.gz)

![Capacete e botas na adaga 73 a Leste](cabeca-adaga73-east.png)
![Capacete e botas na adaga 73 a Oeste](cabeca-adaga73-west.png)

Para repetir, execute `node --expose-gc tests/rework-articulated-weapon-heads.cjs rogue`. No navegador, use `--dagger-heads=east` e `--dagger-heads=west` no mesmo teste de mapa.

## Execução

Exporte o jogo com `python tools/build_pages.py --static-demo` e defina `HD_PUBLISHED_ROOT` para o diretório exportado. Para repetir cada lote, use os comandos abaixo. O navegador usa `MARE_TEST_URL` e `MARE_EVIDENCE_DIR`.

```sh
python tools/export_articulated_boots.py --daggers --verify
node --expose-gc tests/rework-lateral-gauntlet-wardrobe.cjs east
node --expose-gc tests/rework-lateral-gauntlet-wardrobe.cjs west light
node --expose-gc tests/rework-lateral-dagger-boots.cjs east
node --expose-gc tests/rework-lateral-dagger-boots.cjs west
node tests/rework-independent-world-browser.cjs --lateral-gauntlet-wardrobe
node tests/rework-independent-world-browser.cjs --dagger-boots=east
node tests/rework-independent-world-browser.cjs --dagger-boots=west
PRODUCT_MODE=sample node tools/audit-hd-wardrobe-product.cjs resultados
PRODUCT_MODE=direct PRODUCT_FILTER='{"body":["masculino"],"weapon":[110],"direction":["east","west"],"action":["attack-unarmed"]}' node tools/audit-hd-wardrobe-product.cjs resultados
```

## Situação dos 50 itens

As colunas individuais contam até 504 contextos armados por corpo e 168 desarmados entre os dois corpos. Pares e conjuntos são as participações aprovadas do item nos contextos armados dos dois corpos. Para obter a cobertura por arma, ação e lado, consulte o [detalhamento](detalhes.tsv.gz).

| ID | Slot | Masculino armado | Feminino armado | Desarmado | Pares armados | Conjuntos amostrados armados | Global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 364 | 504 | 168 | 34.681 | 8.670 | Parcial |
| 7 | Peitoral | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 130 | Peitoral | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 137 | Peitoral | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 144 | Peitoral | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 151 | Peitoral | 420 | 504 | 168 | 35.565 | 8.670 | Parcial |
| 158 | Peitoral | 420 | 504 | 168 | 35.565 | 8.670 | Parcial |
| 165 | Peitoral | 420 | 504 | 168 | 35.565 | 8.670 | Parcial |
| 172 | Peitoral | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 179 | Peitoral | 420 | 504 | 168 | 35.565 | 8.670 | Parcial |
| 21 | Calça | 372 | 504 | 168 | 34.792 | 8.670 | Parcial |
| 22 | Calça | 369 | 504 | 168 | 34.782 | 8.670 | Parcial |
| 133 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 140 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 147 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 154 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 161 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 168 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 175 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 182 | Calça | 368 | 504 | 168 | 34.780 | 8.670 | Parcial |
| 8 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 9 | Bota | 441 | 504 | 168 | 35.659 | 8.670 | Parcial |
| 134 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 141 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 148 | Bota | 438 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 155 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 162 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 169 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 176 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 183 | Bota | 437 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 25 | Luva | 368 | 504 | 168 | 34.694 | 8.670 | Parcial |
| 26 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 131 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 138 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 145 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 152 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 159 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 166 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 173 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 180 | Luva | 363 | 504 | 168 | 34.680 | 8.670 | Parcial |
| 18 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 19 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 129 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 136 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 143 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 150 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 157 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 164 | Cabeça | 448 | 504 | 168 | 35.654 | 8.670 | Parcial |
| 171 | Cabeça | 446 | 504 | 168 | 35.646 | 8.670 | Parcial |
| 178 | Cabeça | 448 | 504 | 168 | 35.646 | 8.670 | Parcial |
