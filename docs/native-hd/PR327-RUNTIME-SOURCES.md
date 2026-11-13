# Fontes do #307 no mapa

Referência de arte e animação no merge #307 `73eaa308`. Integração anterior no merge #322 `ef0c4db1`. O mapa prepara cada pose com o seletor HD. Quando a configuração não tem um registro compatível para a pose, o fluxo atual seleciona o compositor native96. Esse retorno explica a diferença em relação às prévias.

| Índice | Registros do #307 | Registros atuais | Ausentes do #307 |
| --- | ---: | ---: | ---: |
| Corpo | 160 | 160 | 0 |
| Roupa | 1.023 | 1.047 | 0 |
| Ataque de arma | 165 | 169 | 0 |
| Registro feminino de arma | 492 | 504 | 0 |
| Porte de arma | 164 | 168 | 0 |
| Cabeça e cabelo | 876 | 876 | 0 |

Os registros de corpo, roupa, arma e porte já existentes foram preservados nos índices. O índice de cabeça manteve os IDs e teve alterações de metadados em 800 registros. A revisão usa a versão atual desses registros.

## Vínculos recuperados

- Peitorais isolados masculinos e femininos por ID, em repouso e caminhada, com a arma carregada, quando o corpo e a pose coincidem. A calça masculina 22 usa a própria camada ao lado da arma e do peitoral.
- Caminhada feminina com camada de peitoral por cima da mesma base que a arma usa. O registro da arma usa a cada quinto quadro da roupa. A projeção exige igualdade de poses, rasters corporais, pivô e duração do ciclo.
- Ataque feminino de punhos com peitoral quando a anatomia do registro coincide, preservando as âncoras da roupa.
- Espada masculina com peitoral e cabelo selecionados em EAST e WEST, usando a lâmina isolada e os pontos do ataque. O item 0 também usa a camada de lâmina independente em NORTH.
- A prévia da personalização aplica a aparência selecionada. O porte e as composições recuperadas usam as camadas de cabelo, pele e olhos que a fonte permite personalizar.

As adaptações preservam os PNGs de origem, a densidade, o pivô e a escala do mapa. A camada de roupa pode precisar de revisão visual de encaixe onde foi adaptada a uma pose diferente.

## Cobertura e reprodução

`node tools/audit_rework_map_coverage.cjs <pasta>` gera `item-source-coverage.csv`, `item-source-coverage.json` e `coverage.json`. Use `MARE_AUDIT_SAVED_APPEARANCE=1` para a segunda matriz, com a paleta de teste personalizada. Cada linha registra ID canônico, slot, ação, direção, corpo, fonte selecionada e fontes indexadas. A cobertura mede seleção, sem aprovar a arte por existência. Capas ficam no catálogo com ausência de camada corporal prevista.

| Matriz | Consultas | HD selecionado | Fonte existente com vínculo pendente ou incompatível | Sem combinação compatível no índice |
| --- | ---: | ---: | ---: | ---: |
| Paleta original | 3.984 | 2.679 | 696 | 609 |
| Paleta personalizada de teste | 3.984 | 1.246 | 1.913 | 825 |

As matrizes cobrem 166 combinações derivadas de registros e os 102 itens dos sete slots auditados, incluindo 42 armas e 10 capas. Todas as 42 armas encontram fonte HD isoladamente, com a paleta original. As Grevas 21 masculinas não têm registro para as 12 poses auditadas. A auditoria distingue ausência nos índices de ausência de arte no histórico.

`python tools/build_pages.py` prepara a build para o navegador. `tests/rework_catalog_creation_browser.cjs` usa a criação real, controles de movimento e clique no alvo para o ataque. Os testes com `MARE_CHECK_CREATION_COLOR=1` e `MARE_CHECK_STARTER_ATTACKS=1` verificam a mudança de pixels na prévia, as fontes desenhadas no mapa e as poses alcançadas pelo ataque. `tests/rework-starter-coat.test.cjs` verifica o carregamento e a composição dos clipes de teste.

## Pendências de integração

- Item 0 SOUTH masculino usa uma composição que contém corpo e lâmina no mesmo PNG. A separação precisa preservar os pixels e a empunhadura do ciclo. A base modular SOUTH contém âncoras de braço estáticas durante o ataque e não serve para vincular a lâmina do porte a todos os quadros.
- O ataque de espada feminino com peitoral 6 usa uma base diferente da do peitoral de punhos. Ainda exige adaptação dos quadros da roupa às poses da espada. O navegador registra native96 nessas rotas.
- O relatório gerado identifica os demais equipamentos e combinações que ainda não selecionam o rework. A matriz não representa todas as combinações legais ou todas as cores. Nenhuma dessas lacunas foi convertida em aprovação por visibilidade.
