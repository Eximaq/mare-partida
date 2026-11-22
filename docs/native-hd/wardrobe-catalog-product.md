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
node tools/summarize-hd-wardrobe-product.cjs resultados/<assinatura>/sample resumo.json
node --expose-gc tests/rework-armed-female-wardrobe-pixels.cjs
node --expose-gc tests/rework-male-p114-signed-slots.cjs
node --expose-gc tests/rework-signed-staff-wardrobe.cjs
node --expose-gc tests/rework-independent-world-browser.cjs
```

A assinatura identifica o export usado. O censo grava um resultado por contexto e retorna código de falha quando encontra lacunas. Cada contexto exercita 50 peças individuais, todos os 1.000 pares entre slots e 100 conjuntos determinísticos de cinco peças. O modo `PRODUCT_MODE=direct` passa os 100.000 conjuntos daquele contexto pelo seletor. `PRODUCT_FILTER` aceita arma, classe, corpo, direção e ação. O modo direto percorre o produto em memória constante e retoma os contextos concluídos. Os relatórios por contexto registram a fonte individual, os pares incompletos e as contagens por item.

## Desenho e uso no mapa

Na revisão `aeaaa62`, as 4.200.000 combinações com todas as armas passaram pelo seletor no repouso feminino Sul. Outro lote executou 400.000 seleções de ataque da espada 1 entre as quatro direções. Os lotes têm contextos diferentes e podem conter a mesma configuração de itens. Cada desenho do teste por pixels compara o quadro com um controle que remove exatamente um slot do mesmo personagem.

A caminhada feminina passou por 200 retiradas de slot, com 8.000 comparações de fase. A caminhada e o repouso masculinos com a espada 1 passaram por 400 retiradas, com 3.400 comparações de fase. Todas as retiradas alteraram pixels em pelo menos uma fase do ciclo. O teste de espada feminino também mediu 400 retiradas no repouso e ataque e 1.800 comparações. Nos testes de soco Leste, tecnologia Norte e foco Leste foram 150 retiradas e 1.200 comparações. O teste da Pistola 114 compara a montagem com passes originais em 212 posições de relógio. Nos cetros, 66 imagens coincidiram com a montagem calculada a partir do pacote editável.

As evidências locais da caçada incluem criação, inventário, trocas de arma e roupa, caminhada, ataque, retorno de poder e reconexão. A prova por slot e por ciclo faz parte dos testes Node. As capturas do navegador amostram momentos do mapa.
