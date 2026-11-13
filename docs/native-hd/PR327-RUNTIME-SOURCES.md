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
- Caminhada feminina com camada de peitoral por cima da mesma base que a arma usa. Os 40 quadros originais da roupa são mantidos. Cada uma das oito poses da arma permanece pelos cinco quadros correspondentes. O vínculo exige igualdade de poses, rasters corporais, pivô e duração do ciclo.
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

As matrizes cobrem 166 combinações derivadas de registros e os 102 itens dos sete slots auditados, incluindo 42 armas e 10 capas. Todas as 42 armas encontram fonte HD isoladamente, com a paleta original. No levantamento inicial, as Grevas 21 masculinas ainda não tinham registro para as 12 poses auditadas. O lote seguinte registra sua geração. A auditoria distingue ausência nos índices de ausência de arte no histórico.

`python tools/build_pages.py` prepara a build para o navegador. `tests/rework_catalog_creation_browser.cjs` usa a criação real, controles de movimento e clique no alvo para o ataque. Os testes com `MARE_CHECK_CREATION_COLOR=1` e `MARE_CHECK_STARTER_ATTACKS=1` verificam a mudança de pixels na prévia, as fontes desenhadas no mapa e as poses alcançadas pelo ataque. `tests/rework-starter-coat.test.cjs` verifica o carregamento e a composição dos clipes de teste.

O reteste local dos dois espadachins capturou 25 poses de repouso e caminhada com a fonte HD e 25 amostras de ataque nas quatro direções. No ataque masculino, EAST, WEST e NORTH desenharam a lâmina original reaproveitada com o peitoral 6 e cabelo Chanel rosa. Os 46 testes Node de seleção, composição e anatomia passaram. O reteste de navegador verificou os 40 quadros preparados em cada direção na caminhada feminina e não registrou erros de assets nesse cenário.

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

## Lote seguinte

As Grevas 21 masculinas agora têm fonte registrada. Foram gerados 96 PNGs independentes para 12 clipes de repouso, caminhada e punhos. A adaptação usa os pixels das Grevas 21 femininas do acervo v47 e as silhuetas quadro a quadro da camada masculina 22. A transferência encurta a barra para acompanhar a peça original e preserva os rasters de corpo e o pivô. A geração é candidata a revisão visual, com os comandos em `tools/pants22-native/build-pants21.cjs` e `tools/pants22-native/package-pants21.py`. O mapa desenhou a camada 21 com espada 0 após equipagem pelo inventário, em repouso e caminhada nas quatro direções.

A peça 168 feminina mantém sua própria camada com punhos 2. O vínculo exige os mesmos rasters, poses e âncoras do corpo e substitui apenas o short base. Confirmado no mapa com cabelo Chanel rosa, olhos verdes/amendoados e pele escura. Os 12 clipes foram carregados e desenhados também pelo compositor em teste.

### Peitorais com espada 0 no mapa

Equipagem pelo inventário seguida de repouso e caminhada nas quatro direções. As amostras registraram o ID da fonte realmente desenhada. A avaliação de cada costura e todos os ataques permanecem separadas.

| Corpo | IDs exercitados com fonte HD em todas as quatro direções |
| --- | --- |
| Masculino | 7, 130, 137, 144, 158, 165, 172, 179 |
| Feminino | 7, 130, 137, 144, 151, 158, 165, 172, 179 |

O carregamento agora preserva as camadas de gola, manga e punho registradas junto de cada peitoral. As amostras usaram cabelo Chanel rosa, olhos verdes/amendoados e pele escura. O 151 masculino foi vinculado nas poses compatíveis com o doador de calça 133 e ainda precisa de adaptação lateral no conjunto com espada.

A matriz anterior é histórica. Rode a auditoria novamente para obter os totais desta versão, que inclui os vínculos da peça 21 e da 168 com arma.

### Personalização aplicada no mapa

O editor de personagem foi usado para aplicar uma opção por vez. No espadachim inicial, as cinco opções de formato dos olhos e as seis cores produziram rasters distintos em SOUTH, EAST e WEST nos dois corpos, com repouso e caminhada observados nas quatro direções. NORTH manteve o mesmo raster entre opções de olhos. As dez cores do cabelo Chanel masculino produziram rasters distintos nas quatro direções. Essa prova mede as opções no conjunto testado, sem equivalência presumida para os outros estilos, capacetes ou clipes.

Nos dois corpos, o lote com os 14 estilos de cabelo produziu 14 rasters distintos em cada direção. O Chanel também produziu dez rasters distintos ao alternar suas dez cores nos dois corpos. São amostras de repouso e caminhada no espadachim inicial. As 140 combinações de estilo e cor por corpo e os encaixes durante ataques ainda exigem exercício próprio.

O teste da peça 21 isolada confirmou os 16 quadros de caminhada e oito quadros de ataque de punhos em cada direção, além de retirar e recarregar equipada. O primeiro reteste após recarga expôs perda do vínculo quando o save normalizou as paletas para cabelo preto e pele clara. A versão corrigida usa apenas as máscaras de anatomia da base e preserva o raster da peça.

### Retestes de conjuntos

- Os dez conjuntos originais de botas 8 e 9 e luvas 25 e 26 passaram no mapa. São 120 cenários de repouso, caminhada e ataque de punhos. As combinações isoladas e os demais cruzamentos ainda precisam de vínculos específicos.
- A peça 168 passou no mapa com peitoral 6 e punhos 2 nas quatro direções em repouso e caminhada. O compositor também preparou e desenhou os 12 clipes de repouso, caminhada e punhos com o peitoral 151.
- O Sobretudo 151 masculino com espada 0 passou em SOUTH e NORTH. EAST e WEST ainda exigem adaptação dos quadros das mangas à pose original de porte.

### Auditoria de seleção após as adaptações

| Paleta | Configurações | Consultas | Fonte HD selecionada | Fonte existente sem vínculo compatível | Sem combinação no índice |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original | 174 | 4.176 | 2.807 | 696 | 673 |
| Personalizada de teste | 174 | 4.176 | 1.362 | 1.925 | 889 |

Fontes selecionadas automaticamente e equipagens exercitadas no mapa são provas diferentes. Continuam pendentes os cruzamentos de todas as cores com todos os cabelos, os encaixes nas famílias de ataque e as demais combinações de equipamentos permitidas.

Os capacetes 18, 19, 129 e 157 foram equipados pelo inventário em ambos os corpos com espada 0, peitoral 6 e personalização. Os oito casos desenharam a fonte HD identificada em repouso e caminhada nas quatro direções. A Bandana 18 usa cobertura parcial. O Capacete 19 oculta o cabelo pela regra da peça. Os demais IDs de capacete e combinações de combate seguem na matriz de trabalho.

A regressão do retrato encontrou o capacete fora do canvas de 72 px quando o sprite HD usava a mesma origem do mapa. O retrato ajusta a origem vertical pelos limites reais do sprite e conserva a escala. A regressão aguarda a identidade do capacete antes de comparar o retrato visível e oculto.

O seletor também passou a reutilizar a camada de calça 133 e bota 9 junto a outras armas de porte compatível. A regressão automatizada verifica as oito poses com espada 0.

O reteste do retrato passou com 18 e 19 nos dois corpos, incluindo dez alternâncias, persistência após recarga e restauração dos pixels. O lote de pernas com espada confirmou retorno a native96 nos IDs 133, 140, 147, 154, 161, 175 e 182 nos dois corpos na build anterior à extensão de porte da 133. O 168 manteve a fonte HD no corpo feminino e caiu para native96 no masculino.

A auditoria de cabelo para espada 0 e peitoral 6 cruzou 14 estilos, dez cores, dois corpos, quatro direções e duas ações. A opção feminina sem cabelo causava as 80 lacunas iniciais. O seletor agora usa a cabeça limpa já registrada e resolve 2.240 de 2.240 consultas de repouso e caminhada. Esse número mede seleção. A execução pelo editor mediu individualmente os 14 estilos e as dez cores no Chanel.

O inventário confirmou repouso e caminhada HD nas quatro direções para todos os dez IDs de capacete nos dois corpos, com espada 0 e peitoral 6. O reteste da calça 133, primeiro sem bota e depois com a bota 9, passou no corpo masculino com espada 0 e personalização nas quatro direções. A opção feminina sem cabelo também foi aplicada pelo editor e desenhou a cabeça limpa em todas as direções.

## Reteste das lacunas de espada e equipamento

Base de trabalho `bb3f5f1d`. A validação usou a build estática de `tools/build_pages.py`, com personagem descartável criado pela interface. Os equipamentos dos lotes foram disponibilizados por fixture e equipados no inventário. O teste movimentou o personagem pelos controles e iniciou os ataques clicando em alvos no mapa. A instrumentação registrou o ID da fonte desenhada, direção, ação e quadro.

| Equipamento | Corpo | Resultado | Escopo da prova |
| --- | --- | --- | --- |
| Espada 0 + Sobretudo 151 | Masculino | Porte HD nas quatro direções | Repouso e caminhada no mapa. EAST usa as camadas do 151 separadas do conjunto com calça 133. WEST usa o espelhamento registrado da base. |
| Espada 0 + calças 140, 147, 154, 161, 175 e 182 | Masculino | Porte HD nas quatro direções | Repouso e caminhada no mapa. As camadas são selecionadas pelo ID da calça. O teste automatizado confere os 16 quadros de caminhada por direção no registro. |
| Espada 0 + peitorais 6, 7, 130, 137, 144, 151, 158, 165, 172 e 179 | Feminino | Fontes de ataque vinculadas nas quatro direções | A espada mantém seus oito estados, posições e tempos. Os dez peitorais apareceram no mapa nas quatro direções, com três quadros de ataque observados por direção. O compositor também desenhou os oito quadros por direção com o peitoral 6. |
| Espada 0 em SOUTH | Masculino | Ataque modular pendente | O pacote `sword0-historical-native.zip` contém nove estados com arma e corpo na mesma imagem. A base `v7-sword-drawn8-south` tem oito poses com âncoras estáticas dos braços. O próximo passo é separar os pixels da lâmina e registrar os pontos de encaixe do golpe por fase para aplicar mangas e cabelo. |
| Espada 0 + calças 140, 147, 154, 161, 175 e 182 | Feminino | Porte HD pendente | Os registros congelados individuais de caminhada são composições fechadas. Os conjuntos de 147 e 154 já trazem partes separadas, incluindo camadas distais; é necessário validar o limite com as botas e reconstruir as regiões ocluídas para uso independente. |

A adaptação dos peitorais femininos reutiliza as camadas da roupa do ataque desarmado e reposiciona as mangas pelas âncoras do braço do golpe de espada. As partes fixas do peitoral, a cadência do ataque, o pivô e a escala permanecem os registrados. A regressão comprova a identidade da arma e da roupa. A revisão fina de sobreposição das mangas ainda é pendente.

### Matriz de cabelo deste lote

`node tools/audit_rework_sword_hair.cjs <diretório>` gera `hair-source-matrix.json` com cada corpo, peça, estilo, cor, direção, ação e ID de fonte. O lote tem espada 0, dois corpos, 14 estilos, dez cores e 20 arranjos de equipamento por corpo. Os arranjos cobrem os dez peitorais, as seis calças da tabela e o peitoral 6 combinado separadamente com os capacetes 18, 19, 129 e 157. A pele escura, o rosto Amendoado e a íris verde são mantidos no cruzamento.

| Ação | Consultas | Fonte HD selecionada | Sem fonte HD compatível |
| --- | ---: | ---: | ---: |
| Repouso | 22.400 | 19.040 | 3.360 |
| Caminhada | 22.400 | 19.040 | 3.360 |
| Ataque de espada | 22.400 | 8.820 | 13.580 |

As 67.200 consultas correspondem a 5.600 configurações. A matriz mede seleção do renderizador. Cor aplicada, encaixe, oclusão e restauração de cada cabelo com cada equipamento ainda exigem prova de pixels e teste no mapa. As combinações com outras armas também seguem pendentes.

A auditoria de catálogo ampliada testou 189 arranjos em 4.536 consultas por paleta. Selecionou 3.063 fontes com a paleta original e 1.618 com a paleta personalizada.

### Reprodução

- `python tools/build_pages.py`
- `node --test tests/rework-starter-coat.test.cjs player-rework-weapon-carry-hd.test.cjs player-rework-outfit-carry-overlay-hd.test.cjs player-rework-female111-family-hd.test.cjs`
- `node tests/rework_catalog_creation_browser.cjs` com `MARE_CATALOG_END=1`, `MARE_STRICT_VISUAL_ASSETS=1`, `MARE_TEST_URL`, `MARE_EVIDENCE_DIR` e `CHROME_PATH`. Para equipagem, usar `MARE_CATALOG_EQUIPMENT=1`, `MARE_CHECK_ITEM_MOVEMENT=1`, `MARE_CATALOG_GENDER` e `MARE_CATALOG_ITEMS`. Para confirmar os ataques após equipar os peitorais femininos, acrescentar `MARE_CHECK_ITEM_ATTACKS=1`. O cenário de criação com peitoral 6 usa `MARE_CHECK_CREATION_COLOR=1` e `MARE_CHECK_STARTER_ATTACKS=1`.
- `node tools/audit_rework_map_coverage.cjs <diretório>` com e sem `MARE_AUDIT_SAVED_APPEARANCE=1`.

## Espada 0 SOUTH masculina e calças femininas

- **SOUTH masculino.** `sword0-south-modular-nine` recupera a lâmina das nove imagens históricas, usando os quadros de anatomia correspondentes da família SOUTH como referência para separar a arma. As mãos dianteiras, a cabeça, o cabelo e o peitoral são compostos separadamente. Foram registrados pontos de ombro, cotovelo e empunhadura por fase. O pivô 80×128, o canvas 640×640 e a sequência original de 16 ticks a 24 fps foram preservados. O mapa registrou os estados 0 a 8 com espada 0, peitoral 6 e cabelo Chanel rosa.
- **Calças femininas 140, 147, 154, 161, 175 e 182.** As fontes próprias congeladas serviram para isolar o tecido. O renderizador substitui a camada de shorts e conserva corpo, cabeça, estados da espada e cadência do clipe. São 72 registros de repouso, caminhada e ataque em quatro direções. As seis peças foram equipadas pelo inventário e desenhadas no mapa nas três ações e quatro direções, com peitoral 6, cabelo Chanel rosa, pele escura, rosto Amendoado e íris verde. Os recortes e a sobreposição são candidatos a ajuste fino.
- **Cabelos e cores.** Nas 5.600 configurações da matriz da espada 0, a seleção passou em 22.400 de 22.400 consultas de repouso e em 22.400 de 22.400 consultas de caminhada. Em ataque, 12.460 de 22.400 selecionaram fonte HD e 9.940 continuam sem fonte compatível. Os casos restantes estão nas combinações masculinas de ataque com outros peitorais, calças e capacetes. Os totais medem seleção. A auditoria de pixels em SOUTH e repouso desenhou 560 casos com a espada 0 e o peitoral 6 ou a calça 154 nos dois corpos. Para cada penteado com cabelo, as dez cores produziram hashes distintos. As dez opções de cor produziram o mesmo hash em Sem cabelo, conforme esperado. Essa prova de cor não certifica o acabamento dos encaixes. O comando de matriz aceita `MARE_HAIR_RENDER=1`, `MARE_HAIR_DIRECTION` e `MARE_HAIR_EQUIPMENT` para registrar hashes dos pixels de repouso e checkpoints por configuração de equipamento.
- **Reprodução das camadas.** Execute `node tools/rebuild-sword0-visuals.cjs <diretório temporário>` após materializar os índices. Depois execute `python tools/package-sword0-visuals.py <diretório temporário>`. Os PNGs históricos continuam byte a byte nos arquivos de origem. Os PNGs derivados são arquivados com hashes próprios.
