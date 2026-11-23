# Continuação dos 114 contextos

## Fechamento da fila de seleção

A fila inicial de 114 ataques masculinos chegou a **114/114**. Para cada ataque, o seletor recebeu as 50 peças isoladas, os 1.000 pares entre slots e os 100.000 conjuntos completos. Nos lotes de correção, as **11.400.000 configurações completas** passaram pela seleção direta. Cada registro identifica o build correspondente. [Produto direto dos 114 contextos](produto-direto-114.json.gz)

Os últimos 23 contextos completaram **2.300.000/2.300.000** seleções. No mapa, esses grupos somaram 73 ataques observados e 14 ciclos completos. As capturas mostram exemplos de conjuntos completos. As comparações de pixels e as trocas por slot têm registros separados. [Quadros, retiradas de peças, trocas e carregamento](desenho-e-cache-lote-final.json.gz) · [Lâminas e disparos no mapa](laminas-e-disparos-finais-no-mapa.jpg) · [Seis cajados no mapa](seis-cajados-norte-no-mapa.webp)

| Movimento masculino | Seleção direta | Prova de desenho | Ciclos capturados no mapa |
|---|---:|---|---:|
| 12 espadas e adagas Sul | 1.200.000 | Calças e botas da própria peça acompanham os apoios e o deslocamento de cada perna. Casaco, luvas e capacete conservam mãos, lâmina e a ordem da cabeça. | 4 |
| Seis cajados Norte, 123–128 | 600.000 | Comparação de 270 retiradas de peças em 54 fases. As roupas preservam os pixels da haste. | 6 |
| Disparo Sul, 114 e 116 | 200.000 | Troncos e mangas têm camadas separadas do corpo doador, das mãos e da arma. | 1 |
| Pistola 114 Norte, Leste e Oeste | 300.000 | 432 comparações de calças e botas adaptadas, 480 de peitorais e luvas. O peitoral 151 preserva as camadas inferiores. | 3 |

Os vínculos das fontes podem ser reproduzidos pelos módulos `tools/register_south_blade_{legs,coats,gloves}.py`, `tools/register_north_staff_wardrobe.py`, `tools/register_south_fused_clothes.py`, `tools/register_pistol_{legs,recoil_clothes}.py` e pelo exportador `tools/export_combat_wardrobe.py`. Os registros conservam as partes e as coordenadas das peças. A tabela do censo identifica a origem selecionada por ID, corpo, arma, ação e direção. [Tabela dos 50 IDs](README.md) · [Fontes por peça e contexto](detalhes.tsv.gz)

Na aparência masculina Sul, 14 cabelos × 5 expressões × 18 armas passaram com o conjunto vestido. Foram 232 verificações de desenho e três ciclos no mapa com capacete equipado e retirado. O navegador também reteve de propósito a textura do peitoral 130 enquanto o personagem disparava um ataque com o cajado 123 Norte. Ele andou, causou dano e equipou o 137 antes de a textura antiga chegar. Os dois ataques seguintes mantiveram os seis IDs e as cores salvas. [Prova de aparência](../aparencias-ataque-sul/resumo.json) · [Ciclos da aparência no mapa](../aparencias-ataque-sul/ciclos-no-mapa.webp)

O build estático do commit `14505bc0be618c0a1d5cacde16008d1a69d0d896` tem a assinatura `478afa2805b71aa09613e1cb55e44f411b9b9e14b36f7a2740178429fea8782a`. Para repetir os ensaios de mapa, use `tests/rework-independent-world-browser.cjs` com `--pistol-complete-wardrobe`, `--wardrobe-load-race` ou `--south-saved-head-shapes`. Sirva o build gerado por `python tools/build_pages.py --static-demo` e aponte `MARE_TEST_URL` para ele. Para o censo de seleção, use `HD_PUBLISHED_ROOT` e o modo `sample` ou `direct` em `tools/audit-hd-wardrobe-product.cjs`.

## Histórico dos lotes anteriores
## Mais dez contextos selecionados

As seis armas de foco 123–128 para Sul completaram **600.000/600.000** seleções diretas. Os quatro disparos para Sul de 4, 5, 113 e 115 completaram **400.000/400.000**. Com os lotes anteriores, 91 dos 114 contextos iniciais passaram na seleção. Restam 23 nessa etapa. O teste de textura das empunhaduras comparou 112 quadros e o mapa registrou seis ciclos de foco. O teste de tronco e cabeça nos quatro rifles comparou 312 quadros. A arma 5 conserva a nona postura própria e o retorno à primeira. Para as armas 114 e 116, os arquivos registram as pernas e os capacetes que já passaram, com a ação e a direção de cada caso. [Seleções e observações no mapa](empunhaduras-e-disparos-sul.json.gz)

Em `72b92a547efcb34994cf8ede06ef56482d8b7a61`, mais 30 dos 63 contextos pendentes no último censo completo passaram pela seleção direta. Isso fecha 81 dos 114 contextos originais na etapa de seleção, com 33 ainda na fila nessa revisão. O relatório do censo anterior identifica os 50 IDs individualmente. [Censo anterior](README.md) · [Resultados dos 30 contextos, assinaturas, peças, pares e observações do mapa](trinta-contextos-72b92a5.json.gz)

| Ataque masculino | Armas e direções | Conjuntos selecionados diretamente | Observações de ataque no mapa | Ciclos completos no mapa |
|---|---|---:|---:|---:|
| Espada e adagas | 0, 1, 67–70, 12, 13, 71–74 Norte | 1.200.000/1.200.000 | 36 | 4 |
| Disparo | 4, 5, 113, 115, 116 Leste/Oeste | 1.000.000/1.000.000 | 8 | 2 |
| Foco | 16, 17, 31, 32, 121, 122 Sul | 600.000/600.000 | 8 | 4 |
| Cetro 121 | Leste/Oeste | 200.000/200.000 | 10 | 4 |

As calças, mangas e luvas das lâminas usam a anatomia de cada fase. Na nodachi, a roupa acompanha o espelhamento, incluindo o punho corrigido. Os disparos laterais usam as duas mãos, o recuo e as camadas próprias de cada peça. A ponta do cetro 121 cruza a luva em posições diferentes das outras armas de foco. Sua montagem usa a máscara assinada do próprio cetro e preserva o cabelo salvo.

O produto direto enumera os 100.000 conjuntos de cinco slots em cada contexto. A evidência contém também as fontes dos 50 itens e os 1.000 pares de cada contexto. As observações no mapa incluem trocas pelo inventário e registram a arma e a fonte de cada slot. Os quatro ciclos do cetro usaram a correção final de cabelo. Os produtos diretos identificam a assinatura do build em que a seleção ocorreu. O utilitário de confirmação da HUD passou nos oito tamanhos de tela após resolver a troca de botão durante o redesenho.

Para reproduzir o produto, execute `tools/audit-hd-wardrobe-product.cjs` com `HD_PUBLISHED_ROOT` apontando ao build, `PRODUCT_MODE=direct` e filtro de corpo, arma, ação e direção conforme as linhas. O arquivo de resultados conserva as direções canônicas e o nome exato de cada ação.

[Capturas dos 14 ciclos do lote de 30 contextos](trinta-contextos-mapa.jpg)
