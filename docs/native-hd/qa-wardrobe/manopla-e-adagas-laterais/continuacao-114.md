# Continuação dos 114 contextos

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
