# Manopla e adagas laterais no mapa

O censo do código `e4cdf54ae03677363f94f96486577ec19bfb24db` tem a assinatura `f63f36dce464b2d5614264adeb8ff3fe3bb5c2a90dd59da105856eacda48b1c8`. Há **1.047 contextos completos na seleção e 129 com lacunas**, todos em ataques masculinos armados. Os 1.176 receptores sem roupas foram selecionados. Nenhum dos 50 itens atendeu ao critério global de seleção e desenho em todas as poses. [Censo por contexto](censo.ndjson.gz) · [Resultados por item](detalhes.tsv.gz) · [Fila de causas e IDs](pendencias.json.gz) · [Resumo](resumo.json)

| Corpo e equipamento | Contextos completos | Itens individuais | Pares | Conjuntos mistos |
|---|---:|---:|---:|---:|
| Feminino armado | 504/504 | 25.200/25.200 | 504.000/504.000 | 50.400/50.400 |
| Masculino armado | 375/504 | 20.594/25.200 | 386.955/504.000 | 37.500/50.400 |
| Feminino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |
| Masculino desarmado | 84/84 | 4.200/4.200 | 84.000/84.000 | 8.400/8.400 |

Cada contexto consulta 50 peças, todos os 1.000 pares entre slots e 100 conjuntos completos determinísticos. As sete classes entram separadamente nos estados desarmados. O auditor distingue falhas de receptor e de montagem. Falhas de carregamento, desenho e encaixe exigem testes adicionais com imagens. [Antes desta rodada](../norte-articulado/) · [Repouso feminino desarmado e tiros femininos para Norte](../rifles-e-foco-norte/) · [58,8 milhões de seleções femininas diretas em build anterior](../censo-d7027df/cartesiano-feminino-4ff9073.json.gz)

| Revisão | Individuais masculinos armados | Pares masculinos armados | Contextos completos |
|---|---:|---:|---:|
| ca5e805 | 19.678 | 370.795 | 361 |
| e4c4971 | 19.778 | 372.795 | 363 |
| e6bf34c | 19.898 | 373.275 | 363 |
| 6fee649 | 20.018 | 374.955 | 363 |
| 8d0b359 | 20.218 | 378.955 | 367 |
| e4cdf54 | 20.594 | 386.955 | 375 |

## Manopla 110

A manopla usa a mesma silhueta da pose lateral de soco. A montagem preserva o metal próprio e as cores registradas nas bordas que continuam descobertas após vestir o personagem. O cabelo, a íris e a pele vêm da aparência salva. O Oeste usa o espelhamento indicado pela fonte. O auditor direto percorreu **100.000/100.000 conjuntos a Leste e 100.000/100.000 a Oeste** no código `e4c4971`, assinatura `4507d75c4dac5a9ee76ccbf073f9aa8a37e129fe0715e58e4dc7492e0e455382`. As 960 comparações das imagens finais cobrem os oito quadros de 50 peças isoladas e dez conjuntos por direção. O mapa registrou 26 ataques alternando os cinco slots, retirada e retorno da arma, duas aparências e duas ordens de equipar. [Seleções diretas com resultados por ID](produto-manopla-110.json.gz) · [Registros das comparações de pixels e ataques](quadros-e-mapa.json.gz)

![Manopla 110, oito quadros reais a Leste](punho-east.png)
![Manopla 110, oito quadros reais a Oeste](punho-west.png)

## Manoplas 2 e 3

O metal das duas armas tem arquivos próprios já orientados a Leste e Oeste. O jogo mantém o movimento dos punhos e aplica as cinco peças à anatomia compartilhada. O censo direto selecionou os 400.000 conjuntos das duas armas nas duas direções. As comparações de pixels cobriram os oito quadros de 50 itens e dez conjuntos por direção e arma, totalizando 1.920 imagens. O mapa registrou 52 ataques durante trocas de equipamento, retirada e retorno da arma. [Seleção por item e contexto](produto-punhos-2-3.json.gz) · [Resultados por quadro e registros do mapa](quadros-punhos-2-3.json.gz)

![Manopla 2 a Leste, oito quadros no mapa](punho-2-east.png)
![Manopla 3 a Oeste, oito quadros no mapa](punho-3-west.png)

## Manoplas 111 e 112 e braços mecânicos 118 e 119

As quatro armas usam o próprio metal e os quadros da pose lateral. As armas 118 e 119 distribuem oito poses em 20 instantes, com retenção do quadro final. Os casacos 151, 158, 165 e 179 usam as mangas originais e o deslocamento de punho do próprio registro. Na 111, cinco fases têm contorno diferente no braço. Na 119, a borda semitransparente do metal tem uma cobertura adicional em três fases. A montagem preserva essas diferenças na camada de origem. Cabelo, olhos e pele acompanham a aparência salva. [Seleção e desenho](../../../../player-rework-native-hd.js) · [Origens do metal e do punho](../../../../player-rework-weapon-native-hd.js)

O produto direto selecionou **800.000 de 800.000 conjuntos**. A comparação independente de pixels cobriu **3.840 quadros** dos 50 itens isolados e dez conjuntos completos por arma e direção. Outros **192 quadros** reproduziram as imagens aprovadas dos casacos e seus punhos. No mapa foram **104 ataques observados** com as cinco peças equipadas durante as trocas, duas aparências, retirada e retorno da arma, alterações A → B → A e ordem inversa. A falha induzida ao carregar uma manga da 118 ficou isolada naquele slot e a peça reapareceu após a recuperação. [Seleção por ID](produto-punhos-111-112-118-119.json.gz) · [Quadros e registros do mapa](quadros-punhos-111-112-118-119.json.gz) · [Teste reproduzível](../../../../tests/rework-lateral-gauntlet-wardrobe.cjs)

![Oito poses da manopla 111 a Leste](punho-111-east.png)
![Oito poses do braço mecânico 119 a Oeste](punho-119-west.png)

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
for w in 111 112 118 119; do
  node --expose-gc tests/rework-lateral-gauntlet-wardrobe.cjs east ebony "$w"
  node --expose-gc tests/rework-lateral-gauntlet-wardrobe.cjs west light "$w"
  node tests/rework-independent-world-browser.cjs "--lateral-gauntlet=$w"
done
node tests/rework-registered-weapon-coats.cjs
node --test tests/rework-sn4-approved-preview.test.cjs
node tests/rework-independent-world-browser.cjs --dagger-boots=east
node tests/rework-independent-world-browser.cjs --dagger-boots=west
PRODUCT_MODE=sample node tools/audit-hd-wardrobe-product.cjs resultados
PRODUCT_MODE=direct PRODUCT_FILTER='{"body":["masculino"],"weapon":[2,3,110,111,112,118,119],"direction":["east","west"],"action":["attack-unarmed"]}' node tools/audit-hd-wardrobe-product.cjs resultados
```

## Situação dos 50 itens

As colunas individuais contam até 504 contextos armados por corpo e 168 desarmados entre os dois corpos. Pares e conjuntos são as participações aprovadas do item nos contextos armados dos dois corpos. Para obter a cobertura por arma, ação e lado, consulte o [detalhamento](detalhes.tsv.gz).

| ID | Slot | Masculino armado | Feminino armado | Desarmado | Pares armados | Conjuntos amostrados armados | Global |
|---:|---|---:|---:|---:|---:|---:|---|
| 6 | Peitoral | 376 | 504 | 168 | 35.161 | 8.790 | Parcial |
| 7 | Peitoral | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 130 | Peitoral | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 137 | Peitoral | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 144 | Peitoral | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 151 | Peitoral | 426 | 504 | 168 | 36.045 | 8.790 | Parcial |
| 158 | Peitoral | 426 | 504 | 168 | 36.045 | 8.790 | Parcial |
| 165 | Peitoral | 426 | 504 | 168 | 36.045 | 8.790 | Parcial |
| 172 | Peitoral | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 179 | Peitoral | 426 | 504 | 168 | 36.045 | 8.790 | Parcial |
| 21 | Calça | 384 | 504 | 168 | 35.272 | 8.790 | Parcial |
| 22 | Calça | 381 | 504 | 168 | 35.262 | 8.790 | Parcial |
| 133 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 140 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 147 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 154 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 161 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 168 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 175 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 182 | Calça | 380 | 504 | 168 | 35.260 | 8.790 | Parcial |
| 8 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 9 | Bota | 453 | 504 | 168 | 36.139 | 8.790 | Parcial |
| 134 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 141 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 148 | Bota | 450 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 155 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 162 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 169 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 176 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 183 | Bota | 449 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 25 | Luva | 380 | 504 | 168 | 35.174 | 8.790 | Parcial |
| 26 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 131 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 138 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 145 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 152 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 159 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 166 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 173 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 180 | Luva | 375 | 504 | 168 | 35.160 | 8.790 | Parcial |
| 18 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 19 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 129 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 136 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 143 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 150 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 157 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 164 | Cabeça | 460 | 504 | 168 | 36.134 | 8.790 | Parcial |
| 171 | Cabeça | 458 | 504 | 168 | 36.126 | 8.790 | Parcial |
| 178 | Cabeça | 460 | 504 | 168 | 36.126 | 8.790 | Parcial |
