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

O reteste local dos dois espadachins capturou 25 poses de repouso e caminhada com a fonte HD e 25 amostras de ataque nas quatro direções. No ataque masculino, EAST, WEST e NORTH desenharam a lâmina original reaproveitada com o peitoral 6 e cabelo Chanel rosa. Os 46 testes Node selecionados passaram.

## Pendências de integração

- Item 0 SOUTH masculino usa uma composição que contém corpo e lâmina no mesmo PNG. A separação precisa preservar os pixels e a empunhadura do ciclo. A base modular SOUTH contém âncoras de braço estáticas durante o ataque e não serve para vincular a lâmina do porte a todos os quadros.
- O ataque de espada feminino com peitoral 6 usa uma base diferente da do peitoral de punhos. Ainda exige adaptação dos quadros da roupa às poses da espada. O navegador registra native96 nessas rotas.
- O relatório gerado identifica os demais equipamentos e combinações que ainda não selecionam o rework. A matriz não representa todas as combinações legais ou todas as cores. Nenhuma dessas lacunas foi convertida em aprovação por visibilidade.

## Cobertura por ID equipado isoladamente

Cada célula conta as poses HD resolvidas entre 12 por corpo, com três ações e quatro direções. Uma célula abaixo de 12 identifica uma lacuna de integração com aquela aparência. A execução em combinações exige a matriz detalhada gerada pelo comando acima.

| ID | Item | Slot | Masc. original | Fem. original | Masc. personalizado | Fem. personalizado |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | Espada de Ferro Salgado | weapon | 12 | 12 | 11 | 12 |
| 1 | Sabre de Coral | weapon | 12 | 12 | 10 | 12 |
| 2 | Punhos de Bronze | weapon | 12 | 12 | 0 | 12 |
| 3 | Luvas de Marfim | weapon | 12 | 12 | 0 | 12 |
| 4 | Mosquete de Convés | weapon | 12 | 12 | 8 | 11 |
| 5 | Mosquete dos Faróis | weapon | 12 | 12 | 8 | 11 |
| 6 | Casaco de Marinheiro | coat | 12 | 12 | 0 | 0 |
| 7 | Casaco da Bruma | coat | 12 | 12 | 0 | 0 |
| 8 | Botas de Navegante | boots | 0 | 0 | 0 | 0 |
| 9 | Botas do Recifal | boots | 0 | 0 | 0 | 0 |
| 12 | Adagas da Bruma | weapon | 12 | 12 | 8 | 8 |
| 13 | Lâminas Acrobáticas | weapon | 12 | 12 | 8 | 8 |
| 14 | Manopla de Aço | weapon | 12 | 12 | 0 | 12 |
| 15 | Canhão de Pulso | weapon | 12 | 12 | 0 | 12 |
| 16 | Compasso de Tempestade | weapon | 12 | 12 | 0 | 12 |
| 17 | Orbe das Correntes | weapon | 12 | 12 | 0 | 12 |
| 18 | Bandana das Correntes | head | 12 | 12 | 12 | 12 |
| 19 | Capacete do Corsário | head | 12 | 12 | 12 | 12 |
| 21 | Grevas de Navegante | legs | 0 | 12 | 0 | 0 |
| 22 | Calças da Maré Alta | legs | 12 | 12 | 0 | 0 |
| 25 | Luvas de Cordame | gloves | 0 | 0 | 0 | 0 |
| 26 | Luvas do Vigia | gloves | 0 | 0 | 0 | 0 |
| 31 | Cajado do Farol | weapon | 12 | 12 | 0 | 12 |
| 32 | Relicário da Maré Viva | weapon | 12 | 12 | 0 | 12 |
| 67 | Katana da Maelstrom | weapon | 12 | 12 | 10 | 12 |
| 68 | Nodachi de Kairouseki | weapon | 12 | 12 | 10 | 12 |
| 69 | Nodachi de Fogo | weapon | 12 | 12 | 10 | 12 |
| 70 | Meito: Ame no Habakiri | weapon | 12 | 12 | 10 | 12 |
| 71 | Adaga de Cristal | weapon | 12 | 12 | 8 | 8 |
| 72 | Punhal de Netuno | weapon | 12 | 12 | 8 | 8 |
| 73 | Punhal Flamejante | weapon | 12 | 12 | 8 | 8 |
| 74 | Lâmina das Trevas | weapon | 12 | 12 | 8 | 8 |
| 109 | Manoplas do Coral Negro | weapon | 12 | 12 | 8 | 12 |
| 110 | Punhos do Dragão Carmesim | weapon | 12 | 12 | 0 | 12 |
| 111 | Luva do Abalo Sísmico | weapon | 12 | 12 | 0 | 12 |
| 112 | Manoplas da Ruptura dos Mares | weapon | 12 | 12 | 0 | 12 |
| 113 | Mosquete do Vento Cortante | weapon | 12 | 12 | 8 | 11 |
| 114 | Pistolas Gêmeas do Corsário | weapon | 12 | 12 | 8 | 11 |
| 115 | Rifle do Horizonte da Grand Line | weapon | 12 | 12 | 8 | 11 |
| 116 | Arcabuz do Juízo Celestial | weapon | 12 | 12 | 8 | 11 |
| 117 | Braço Mecânico de Ferro Salgado | weapon | 12 | 12 | 0 | 12 |
| 118 | Canhão de Luz Pacifista | weapon | 12 | 12 | 0 | 12 |
| 119 | Punho Hidráulico do Colosso | weapon | 12 | 12 | 0 | 12 |
| 120 | Arsenal Final: Protocolo Serafim | weapon | 12 | 12 | 0 | 12 |
| 121 | Cetro das Monções | weapon | 12 | 12 | 0 | 12 |
| 122 | Orbe do Trovão de Skypiea | weapon | 12 | 12 | 0 | 12 |
| 123 | Cajado da Tempestade Carmesim | weapon | 12 | 12 | 0 | 12 |
| 124 | Cetro da Calamidade dos Quatro Mares | weapon | 12 | 12 | 0 | 12 |
| 125 | Bastão Medicinal de Drum | weapon | 12 | 12 | 0 | 12 |
| 126 | Báculo das Flores de Sakura | weapon | 12 | 12 | 0 | 12 |
| 127 | Cajado das Marés Restauradoras | weapon | 12 | 12 | 0 | 12 |
| 128 | Báculo do Milagre dos Mil Mares | weapon | 12 | 12 | 0 | 12 |
| 129 | Chapéu do Corsário | head | 12 | 12 | 12 | 12 |
| 130 | Casaco das Marés | coat | 12 | 12 | 0 | 0 |
| 131 | Luvas do Navegante | gloves | 0 | 0 | 0 | 0 |
| 133 | Calças do Convés | legs | 12 | 12 | 0 | 0 |
| 134 | Botas do Corsário | boots | 0 | 0 | 0 | 0 |
| 136 | Capuz das Dunas | head | 12 | 12 | 12 | 12 |
| 137 | Túnica do Peregrino | coat | 12 | 12 | 0 | 0 |
| 138 | Luvas de Areia | gloves | 0 | 0 | 0 | 0 |
| 140 | Calças do Deserto | legs | 0 | 12 | 0 | 0 |
| 141 | Botas do Oásis | boots | 0 | 0 | 0 | 0 |
| 143 | Chapéu do Navegador Arcano | head | 12 | 12 | 12 | 12 |
| 144 | Manto das Correntes Celestes | coat | 12 | 12 | 0 | 0 |
| 145 | Luvas do Cartógrafo Elemental | gloves | 0 | 0 | 0 | 0 |
| 147 | Calças do Observador dos Ventos | legs | 0 | 12 | 0 | 0 |
| 148 | Botas de Maré Serena | boots | 0 | 0 | 0 | 0 |
| 150 | Chapéu Carmesim | head | 12 | 12 | 12 | 12 |
| 151 | Sobretudo do Almirante | coat | 0 | 12 | 0 | 0 |
| 152 | Manoplas da Autoridade | gloves | 0 | 0 | 0 | 0 |
| 154 | Calças de Comando | legs | 0 | 12 | 0 | 0 |
| 155 | Botas Imperiais | boots | 0 | 0 | 0 | 0 |
| 157 | Diadema da Tormenta | head | 12 | 12 | 12 | 12 |
| 158 | Manto das Tempestades | coat | 12 | 12 | 0 | 0 |
| 159 | Braçadeiras do Trovão | gloves | 0 | 0 | 0 | 0 |
| 161 | Calças da Monção | legs | 0 | 12 | 0 | 0 |
| 162 | Botas do Vendaval | boots | 0 | 0 | 0 | 0 |
| 164 | Tiara da Maré Sagrada | head | 12 | 12 | 12 | 12 |
| 165 | Vestes do Santuário Oceânico | coat | 12 | 12 | 0 | 0 |
| 166 | Manoplas da Cura Profunda | gloves | 0 | 0 | 0 | 0 |
| 168 | Saia/Pernas do Rito Marinho | legs | 0 | 12 | 0 | 0 |
| 169 | Sandálias da Ressurgência | boots | 0 | 0 | 0 | 0 |
| 171 | Tricórnio do Soberano | head | 12 | 12 | 12 | 12 |
| 172 | Casaco da Grand Line | coat | 12 | 12 | 0 | 0 |
| 173 | Manoplas Reais | gloves | 0 | 0 | 0 | 0 |
| 175 | Calças do Conquistador | legs | 0 | 12 | 0 | 0 |
| 176 | Botas da Supremacia | boots | 0 | 0 | 0 | 0 |
| 178 | Coroa do Horizonte Final | head | 12 | 12 | 12 | 12 |
| 179 | Armadura do Imperador | coat | 12 | 12 | 0 | 0 |
| 180 | Manoplas da Vontade Absoluta | gloves | 0 | 0 | 0 | 0 |
| 182 | Calças do Trono dos Mares | legs | 0 | 12 | 0 | 0 |
| 183 | Botas do Horizonte Eterno | boots | 0 | 0 | 0 | 0 |
