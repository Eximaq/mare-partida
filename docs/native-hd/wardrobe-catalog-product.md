# Catálogo de vestuário no mapa

O catálogo tem 50 peças em cinco slots, 42 armas e sete classes. Cada consulta ao seletor identifica corpo, arma, ação e direção. Os testes de desenho usam o carregador do jogo, o compositor dos quadros e a caçada no navegador.

## Fontes reaproveitadas

| Corpo e contexto | Material da peça | Montagem no jogo |
|---|---|---|
| Feminino, repouso armado e espada | Catálogo assinado de espada, grupos de roupa, luvas, botas e capacetes do índice modular e do registro de cabelo | Seis espadas usam os grupos próprios nos oito quadros. Mangas acompanham os segmentos do braço. As peças preservam a base e a arma. |
| Feminino, soco, tecnologia e foco | Pacotes editáveis `soco-editable-sources.tgz` e `focus-editable-sources.tgz` do checkpoint de 18/11 | 240 vínculos de peça/direção e 2.676 PNGs únicos exportados. Punhos e antebraços do foco usam 64 vínculos entre a pose original e a receptora. |
| Feminino, caminhada armada | Camadas de caminhada do índice modular, peças da perna e mão do rig Norte, oclusões de perfil | Quarenta posições sincronizam o vestuário com as oito fases da arma no ciclo de um segundo. Registros de perfil e Norte conservam a mão de contato. |
| Masculino, repouso e caminhada | Grupos `equipmentLayerGroups.boots`, registros `frozenBootContract`, `frozenPantsSource` e `frozenGloveLayers` no índice modular | Bota, cintura e pernas são montadas pelos pontos anatômicos do receptor. As placas Oeste registradas nesse sentido usam uma única reflexão efetiva. Capacetes usam a orientação final do corpo para verificar a identidade. |
| Masculino, Pistola 114 | `docs/native-hd/editable-male-equipment/sources/pistola114-masculino-camadas.zip` | 68 entradas originais. Doze já tinham registro e 56 imagens entraram no carregador. P21, B9 e G25 nas quatro direções e P22 no Sul. O relógio tem 30 posições no Sul e oito por lateral e no Norte. A máscara lateral distingue os pixels de pele, cabelo, olhos e arma. |
| Masculino, cetros | `docs/native-hd/editable-male-equipment/sources/cetros-equipamentos-aprovados.{json,zip}` | O Cetro 123 recebe C6 e G25 no Sul em oito fases. A luva substitui a cor dentro da máscara e conserva o alfa. O Cetro 126 recebe os passes traseiro e dianteiro de B148 no Norte em nove fases. O arquivo contém 17 PNGs originais. |

Os arquivos de revisão com 16 e 51 casos documentam propostas e comparações lado a lado. O pacote complementar aponta para `809d0df`, ancestral da branch. As contagens históricas de 1.579 e 2.203 sobre 2.208 descrevem posições de catálogo de revisões anteriores. O censo atual usa o produto dos equipamentos que o jogador pode vestir.

## Reprodução

```powershell
python tools/build_pages.py --static-demo
$env:HD_PUBLISHED_ROOT = (Resolve-Path dist).Path
node --expose-gc tools/audit-hd-wardrobe-product.cjs resultados
node tools/summarize-hd-wardrobe-product.cjs resultados/<assinatura>/sample resumo.json detalhes.tsv
node --expose-gc tests/rework-armed-female-wardrobe-pixels.cjs
node --expose-gc tests/rework-male-p114-signed-slots.cjs
node --expose-gc tests/rework-signed-staff-wardrobe.cjs
node --expose-gc tests/rework-male-dagger-profile-wardrobe.cjs
node --expose-gc tests/rework-female-rifle-signed-wardrobe.cjs
node --expose-gc tests/rework-independent-world-browser.cjs
```

A assinatura identifica o export usado. O censo grava um resultado por contexto e retorna código de falha quando encontra lacunas. Cada contexto exercita 50 peças individuais, todos os 1.000 pares entre slots e 100 conjuntos determinísticos de cinco peças. O modo `PRODUCT_MODE=direct` passa os 100.000 conjuntos daquele contexto pelo seletor. `PRODUCT_FILTER` aceita arma, classe, corpo, direção e ação. O modo direto percorre o produto em memória constante e retoma os contextos concluídos. Os relatórios por contexto registram a fonte individual, os pares incompletos e as contagens por item.

## Desenho e uso no mapa

Na revisão `aeaaa62`, as 4.200.000 combinações com todas as armas passaram pelo seletor no repouso feminino Sul. Outro lote executou 400.000 seleções de ataque da espada 1 entre as quatro direções. Os lotes têm contextos diferentes e podem conter a mesma configuração de itens. Cada desenho do teste por pixels compara o quadro com um controle que remove exatamente um slot do mesmo personagem.

A caminhada feminina passou por 200 retiradas de slot, com 8.000 comparações de fase. A caminhada e o repouso masculinos com a espada 1 passaram por 400 retiradas, com 3.400 comparações de fase. Todas as retiradas alteraram pixels em pelo menos uma fase do ciclo. O teste de espada feminino também mediu 400 retiradas no repouso e ataque e 1.800 comparações. Nos testes de soco Leste, tecnologia Norte e foco Leste foram 150 retiradas e 1.200 comparações. O teste da Pistola 114 compara a montagem com passes originais em 212 posições de relógio. Nos cetros, 66 imagens coincidiram com a montagem calculada a partir do pacote editável.

As evidências locais da caçada incluem criação, inventário, trocas de arma e roupa, caminhada, ataque, retorno de poder e reconexão. A prova por slot e por ciclo faz parte dos testes Node. As capturas do navegador amostram momentos do mapa.


### Encaixes recuperados a partir de 63db412

No porte lateral de adagas masculino, o renderizador projeta a lâmina somente quando a mão correspondente existe no quadro. A verificação da luva passou a usar a mão próxima que realmente é desenhada. Os painéis próprios das calças laterais usam as posições de quadril, joelho e perna da pose receptora. A Calça 168 mantém seus dois passes. A Luva 25 mantém as 16 fases, inclusive o espelhamento já presente na imagem Oeste. A troca 25 → 26 → 25 foi feita pelo inventário durante a caminhada. Nas 64 comparações Leste/Oeste de Calça 168 e Luva 25, os 260.636 pixels que mudaram ficaram dentro da arte da peça retirada.

No disparo Norte feminino, o arquivo `fuzil113-ns.zip` do checkpoint de 18/11 contém 31 registros aproveitados. São dez calças, dez botas, dez luvas e o Sobretudo 151, distribuídos em 163 PNGs distintos. A comparação com o corpo do jogo verificou os 11 grupos de anatomia, os pivôs, as oito poses e o relógio. As duas mãos, os passes da bota 148 e a ordem entre manga e punho vêm do pacote. Os dez equipamentos de cabeça usam o registro de personalização da personagem, incluindo o deslocamento de nove pixels do quadro de recuo. O mesmo receptor funciona nas armas 4, 5, 113, 114, 115 e 116.

O controle por pixels montou os quadros diretamente dos registros do arquivo editável. As seis armas reproduziram o controle em 192 quadros, com duas combinações de roupas e dois tons de pele. A retirada isolada das cinco peças em dez conjuntos produziu 50 ciclos com diferença visível e 400 comparações de fase.

![Oito fases a 12 quadros por segundo do Fuzil 113 com cinco peças](wardrobe-rifle-north.webp)

### Leitura dos casos pendentes

- No ataque feminino Norte de adagas 73, o seletor encontra a Calça 168 e a Luva 25. O Peitoral 6 e a Cabeça 18 ainda carecem de montagem nessa direção. O teste de mapa cobre o Peitoral 6 e a Calça 168 nas laterais.
- No disparo feminino Norte, o conjunto com o Sobretudo 151 aceita todas as dez opções dos quatro slots restantes. Os outros nove peitorais ainda precisam do vínculo da manga e do tronco nessa pose.
- O pacote de pistolas laterais guarda 25 camadas de uma composição. O corpo utilizado pelo jogo tem 11 camadas e nenhuma imagem inicial de anatomia coincide entre as duas estruturas. O Oeste compartilha as poses. No Leste, a sequência de pontos anatômicos é diferente. O registro Sul do fuzil tem oito quadros e 68.388 correções de pixel dependentes da reconstrução original. O reaproveitamento dos passes nessas direções ainda exige separar as oclusões e demonstrar o encaixe no corpo atual.
- No ataque masculino Leste da Espada 1, a consulta do censo com pele Ébano, olhos verdes e cabelo azul ainda falha para Peitoral 6, Calça 168 e Luva 25. Na Pistola 114 masculina, os quatro sentidos passaram no visual com cabelo preto e olhos azuis. A variação azul/verde passou no Leste e no Oeste. O Sul continua pendente para essa variação.

## Capturas da caçada

A sessão passou por criação, inventário, caminhada equipada, combate, retorno de poder e reconexão. Foram 74 observações e zero erros registrados no navegador. Os recortes mostram as trocas feitas pelo inventário. A animação acima contém o ciclo medido diretamente no compositor usado pelo mapa.

![Troca de luvas e equipamentos em uso na caçada](wardrobe-in-game.png)
