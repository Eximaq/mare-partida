# Manopla e adagas laterais no mapa

O censo do código `976b29468c55edbe53e493b4def0f89fe663e329` tem a assinatura `336d0273fdbbab68d6a53bd40f4bd7f5f55c9410007a0328c867ac3596060a50`. Há **1.047 contextos completos na seleção e 129 com lacunas**, todos em ataques masculinos armados. Os 1.176 receptores sem roupas foram selecionados. Nenhum dos 50 itens atendeu ao critério global de seleção e desenho em todas as poses. [Censo por contexto](censo.ndjson.gz) · [Resultados por item](detalhes.tsv.gz) · [Fila de causas e IDs](pendencias.json.gz) · [Resumo](resumo.json)

| Corpo e equipamento | Contextos completos | Itens individuais | Pares | Conjuntos mistos |
|---|---:|---:|---:|---:|
| Feminino armado | 504/504 | 25.200/25.200 | 504.000/504.000 | 50.400/50.400 |
| Masculino armado | 375/504 | 20.674/25.200 | 387.355/504.000 | 37.500/50.400 |
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
| 976b294 | 20.674 | 387.355 | 375 |

## Punhos para o Sul

Nos ataques masculinos das armas 2, 3, 14 e 110, o receptor preserva as 12 fases assinadas. O capacete usa o crânio e a máscara de cabelo da base `male-attack-unarmed-south-drawn8`. A comparação nos 5.503 pixels da máscara confere a posição em cada fase. Os dez modelos de bota usam as camadas próprias à frente e atrás das pernas e o movimento registrado na base. As quatro fases adicionais mudam os braços. A área das botas mantém a mesma anatomia do último quadro de pernas.

Cada uma dessas quatro poses passou de zero para **20 de 50 peças** e **100 de 1.000 pares** selecionados. O mapa registrou 108 ataques com os dois slots. Uma segunda execução contra o preview gerado pelo comando oficial repetiu os mesmos 108 casos e as mesmas fontes. O ensaio isolado de capacetes fez outras 64 observações. Os testes compararam 960 quadros de capacetes, 1.920 quadros de botas com e sem capacete e 4.800 quadros de todos os 400 pares. Peitorais, calças e luvas continuam pendentes nessas quatro poses. [Resultados por arma, item, pele e fase](quadros-e-mapa-punho-sul.json.gz)

![Doze quadros no mapa com capacete e botas na arma 2](punho-sul-vestido-2-ciclo.png)
![Doze quadros no mapa com capacete e botas na arma 110](punho-sul-vestido-110-ciclo.png)

## Produto direto masculino

Na revisão `24013e7ec5ab2074b8de88455223646bda9f67d3`, assinatura `598f3cebfcc8cee76c27f63b42dd5852dad1c45c9bdc03c5b4f58a103de758b3`, o auditor enumerou e selecionou **44.500.000 de 44.500.000 conjuntos completos** nos 445 contextos masculinos que então completavam a seleção. São 196 contextos de repouso, 196 de caminhada e 53 de soco, incluindo 84 contextos desarmados. Cada um dos 50 IDs participou de 10.000 conjuntos por contexto. O arquivo inclui as fontes individuais e o resultado dos 1.000 pares em cada contexto. As próximas três rodadas de ataques laterais estão documentadas abaixo com suas próprias assinaturas. Esta medição abrange a seleção. As contagens de quadros e de observações no mapa aparecem nas seções de cada arma. [Resultados dos 445 contextos](produto-masculino-24013e7.json.gz)

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
| 8 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 9 | Bota | 457 | 504 | 168 | 36.179 | 8.790 | Parcial |
| 134 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 141 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 148 | Bota | 454 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 155 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 162 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 169 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 176 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 183 | Bota | 453 | 504 | 168 | 36.166 | 8.790 | Parcial |
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
| 18 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 19 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 129 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 136 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 143 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 150 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 157 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 164 | Cabeça | 464 | 504 | 168 | 36.174 | 8.790 | Parcial |
| 171 | Cabeça | 462 | 504 | 168 | 36.166 | 8.790 | Parcial |
| 178 | Cabeça | 464 | 504 | 168 | 36.166 | 8.790 | Parcial |
