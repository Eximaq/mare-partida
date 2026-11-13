# Artes e contratos pendentes — lista para produção

**Calça 22 masculina (cobertura já concluída):** camada independente vinculada no índice publicado em 1c63826f; idle, caminhada e combate desarmado nas quatro direções, inventário e recarga validados. Não repetir essa adaptação nem solicitar prancha inteira. Famílias armadas e combinações adicionais continuam separadas. [Relatório da candidata e evidências](PANTS22_MALE_CANDIDATE.md).

**Escopo atualizado:** capas (slot cloak; defs 23, 24, 135, 142, 149, 156, 163, 170, 177 e 184) não têm impacto visual, conforme orientação do proprietário. Foram retiradas dos pedidos de arte e dos bloqueios visuais. Os resultados históricos de testes não foram reescritos: ocorrências de cloak omitido nessas rodadas deixam de ser pendências visuais. Esta revisão altera apenas o relatório, sem remover itens ou modificar atributos.

Auditoria parcial sobre a base b0d7cf81e7be357e7e4c2a6d1ff4c5f727a804d6, índices runtime atuais, catálogos de roupas/armas/cabeça e acervo histórico 2801902fa2dad8e83069815faeaa3f53f90bc1b6. Não equivale a aprovação de todas as combinações nem à conclusão do PR. Nenhuma imagem foi regenerada.

## Fontes não localizadas no acervo auditado

SOUTH = sul, NORTH = norte, EAST = leste, WEST = oeste. Nos itens abaixo, a fonte deve declarar o corpo e a combinação de roupa/cabeça em que foi aprovada; um ciclo composto não serve como camada independente.

| def | Peça | Corpo | Direção | Material necessário |
|---|---|---|---|---|
| 21 | Grevas de Navegante | masculino | quatro direções | Repouso, caminhada e ataque com camada de calça própria; os ciclos femininos não substituem esta base |
| 22 | Calças da Maré Alta | masculino | quatro direções | Somente famílias armadas e combinações adicionais; idle/walk/ataque desarmado já vinculados e validados |
| 0 | Espada de Ferro Salgado | ambos | quatro direções | Porte e ataque ligados à aparência original sem outras peças visuais. Ficam pendentes variantes com outros equipamentos. |
| 168 | Saia/Pernas do Rito Marinho | feminino | quatro direções | Peça isolada concluída para aparência original, repouso, caminhada e ataque desarmado. Outras combinações e famílias de ataque exigem validação própria. |

Para ataques, cada pedido exige compatibilidade com o gesto/família real da classe; não há aprovação automática de combinações arbitrárias.

## Não gerar novamente: fonte histórica já encontrada

| Peça | Fonte e cobertura | Pendência concreta |
|---|---|---|
| 168 feminina, caminhada | tools/rework-outfits/catalog.json: female_168_{south,north,east,west}_fourview_EW41_SN4; quatro ZIPs em art-approved/clothing/female-pants168-182 no commit histórico acima. SHA-256 dos quatro ZIPs conferido contra o catálogo | A camada feminina agora usa tecido isolado a partir destes ciclos opacos. As composições fechadas continuam no acervo e não são desenhadas pelo jogo |
| 0, ataque masculino SOUTH | approved-0233b9dafee96fa70d9a; art-approved/weapons/sword0-south/male_sword0_south_approved-cycle_presentation-v2.zip; SHA-256 conferido | worldEligible=true, mas reviewRequired=outfit-not-identified. Geometria declarada: frame lógico 160, densidade 4, pivô (80,128). Quadros históricos mostram a aparência original, sem outras peças visuais. O seletor agora limita o uso a esse conjunto |
| 0, demais ataques masculino/feminino | tools/rework-weapons/catalog.json, inclusive clothing-batch-20261112/0-67-70_N_F e demais direções/variantes | Registros consultados worldEligible=false, reviewRequired=unverified-logical-scale-and-pivot. Os ciclos históricos com trajes continuam fora do mapa. As variantes sem outras peças visuais agora usam a lâmina isolada sobre os rigs atuais, exceto NORTH masculino, recomposto do pacote histórico |
| Cabelo ondulado masculino + peitoral 6 WEST | male-torso6-west-frozen-idle-native e variante de cabeça hair-wavy | Vínculo corrigido para considerar mirrorLayerIDs já declarado. Comparação exata de pixels e âncoras preservada; não requer arte nova |
| Luva feminina 152 com conjunto 151/154/155 | frozen-female-glove152-*-native-layers e sourceOutfitId | Revisões declaradas preservam corpo/cabeça/roupa e relógio; não substituir registro-pai por outro conjunto. SOUTH/NORTH possuem revisões próprias de luva, EAST/WEST preservam os layers originais |

## Personalização feminina: dados visuais pendentes

| Campo | Material/contrato a localizar ou fornecer | Resultado no cenário real já executado |
|---|---|---|
| Cor do cabelo | Cabelos nomeados já possuem camada isolada. Integração da paleta existente corrigida; prova de alfa/pixels externos e teste real de aplicação/recarga passaram para hair-bob/pink. Não gerar essas camadas novamente. Cabelo original fundido continua exigindo contrato próprio | hair-bob/pink foi desenhado no mapa depois de aplicar e depois de recarregar na candidata native96-8d6ab865bc7ffa0d |
| Estilo dos olhos | Face/olhos por estilo suportado, preservando cabeça feminina | face-focused persiste, mas a fonte usa face original |
| Cor dos olhos | A íris original já está separada em female-original-face-ownership.json: SOUTH 163 pixels visíveis, EAST/WEST 110 cada; NORTH transparente. Paleta integrada sobre essa camada; teste de pixels fora da íris passou. Aplicação e recarga de green confirmadas no mapa com hair-bob. A compatibilidade com estilos de olhos diferentes de original continua pendente | green foi desenhado como eye-palette:green após aplicar e recarregar; face-focused ainda foi omitido |
| Pele | Máscaras de pele do corpo e cabeça, incluindo clipes/roupas compatíveis | dark persiste, mas a fonte usa paleta original |

Os 170 hashes de fontes com máscaras femininas de cabelo dos conjuntos de roupa não coincidem com os hashes das bases femininas auditadas. Essas máscaras existentes não comprovam cobertura da base sem equipamento ou do cabelo hair-bob.

A máscara deve identificar apenas o material correto, sem recolorir cabelo, roupa ou olhos por aproximação. Não é necessário redesenhar o corpo inteiro para fornecer uma máscara compatível. A procura nas fontes históricas dessas máscaras ainda não está encerrada.

## Entrega de uma fonte nova

Preservar PNGs originais, densidade e transparência. Informar def canônico (somente equipamentos), slot, corpo, variante, ação, direção, assinatura do frame-base, fonte aprovada e sequência/timing. Fornecer pivô, máscaras e ordem de camadas do encaixe aprovado. Quando a fonte for uma composição fechada, listar todos os slots e a aparência exata; quando for camada isolada, declarar explicitamente essa condição.

A lista será complementada com incompatibilidades encontradas na rodada de todas as armas e conjuntos registrados. Cenários ainda não executados não são declarados validados.

## Falhas de integração observadas, não pedidos de nova arte

- Peitorais 6 e 7, ambos os corpos, e capacete 18 feminino: a repetição na última candidata ainda encontrou slots omitidos durante carga inicial. As fontes existem; não são pedidos de nova arte.
- Direção/transparência: os 12 cenários repetidos na última candidata não reproduziram a direção incorreta nem a ausência do corpo. A omissão de peças permanece separada; não declarar todas as combinações resolvidas.
- Botas 8 e 9 isoladas, ambos os corpos: slot omitido no mapa. Há registros em conjuntos; verificar se existe camada independente compatível antes de pedir nova arte.
- Personalização: na candidata native96-8d6ab865bc7ffa0d, hair-bob, pink e green passaram pela aplicação e recarga no mapa. A regressão continua vermelha em eyeStyle=face-focused e skinColor=dark, antes/depois de recarregar. Não foi enfraquecida para declarar a personagem completamente funcional.

## Referências para as máscaras de pele femininas

O arquivo [female-skin-source-contracts.csv](female-skin-source-contracts.csv) lista cada camada potencialmente afetada, ação, direção, hashes de todos os frames e índices de origem. São referências existentes, não pedidos para redesenhar os PNGs. A máscara precisa isolar a pele e preservar cabelo, íris, roupas e contornos. Os índices registram skinMaterialMaskVerified=false/headSkinMaterialMaskVerified=false nessas bases.

As Botas de Navegante (8) possuem registros masculinos com torso151/pants133/gloves152 e femininos com torso151. As Botas do Recifal (9) também possuem registros masculinos com pants133 (com ou sem torso151/gloves152) e femininos com torso151. A falta da bota isolada não autoriza reutilizar esses conjuntos como camada genérica.

## Estilos de olhos sem fonte compatível selecionável

Auditoria do seletor, com corpo original sem equipamento, nas quatro direções e nas ações idle/walk/attack: original possui 12/12 combinações por corpo. Cada estilo abaixo possui 0/12 por corpo. Os identificadores não aparecem nos índices de base/cabeça nem nos catálogos históricos de roupas/armas consultados. Isso é ausência de fonte compatível no acervo auditado, não prova de que nunca foi criada em outro pacote.

| Campo salvo | Nome na interface | Corpo | Material pendente |
|---|---|---|---|
| eyeStyle=face-calm | Sereno | masculino e feminino | Face/olhos compatíveis em SOUTH/NORTH/EAST/WEST; declarar também ausência visual esperada de olhos em NORTH |
| eyeStyle=face-resolute | Determinado | masculino e feminino | Mesmo contrato direcional, com identidade própria do estilo |
| eyeStyle=face-almond | Amendoado | masculino e feminino | Mesmo contrato direcional, com identidade própria do estilo |
| eyeStyle=face-focused | Atento | masculino e feminino | Mesmo contrato direcional; falha feminina confirmada pela interface real |

A arte de face deve manter assinatura da cabeça e camada de íris separada. Uma referência estática pode ser reutilizada entre ações somente quando os metadados aprovados declararem o mesmo vínculo rígido. Não solicitar três redesenhos por ação se a fonte aprovada já puder ser reutilizada.

## Rastreabilidade da validação atual

Base Git b0d7cf81e7be357e7e4c2a6d1ff4c5f727a804d6 com alterações locais; release candidata native96-8d6ab865bc7ffa0d. Build feita pelo tools/build_pages.py com somente o diretório de saída alterado para dist-direction-fix. Os hashes dos quatro módulos publicados foram comparados com o checkout. Teste tests/rework_female_appearance_ui_browser.cjs: criação, remoção de equipamento, aplicação e recarga realizadas pela interface; quatro falhas remanescentes (estilo de olhos e pele, aplicação/recarga). Não é resultado de produção nem de commit final.

## Correção da auditoria de capacetes femininos

Os itens 18 e 19 femininos já têm NORTH/EAST/WEST em female-original-face-ownership.json → historicalGear, além de SOUTH no índice principal. O compositor consome esses registros. Não gerar novamente essas seis artes: a auditoria agora inclui esse índice auxiliar. As referências masculinas também foram recebidas posteriormente como candidatas; consultar a seção do pacote recebido. Compatibilidade de cabelo e de outras combinações continua sujeita ao contrato de cada registro.

Luvas 25 e 26 possuem fontes nos conjuntos masculinos torso151/pants133/boots155 e femininos torso151/pants154/boots155. Sua omissão quando equipadas isoladamente é incompatibilidade do conjunto atual, não ausência de todos os PNGs das luvas.

## Capacetes masculinos 18 e 19: pacote recebido

Kaizoku_capacetes_18_19_candidatos.zip foi recebido e conferido. As seis fontes NORTH/EAST/WEST são PNGs RGBA 512×512 idênticos aos assets históricos existentes; não foram duplicadas nem alteradas. Elas saem da categoria de fonte não localizada e entram como **candidatas de adaptação masculina**. O manifesto conserva approval=false e os deslocamentos físicos propostos de (0,0) NORTH, (-1,0) EAST e (1,0) WEST.

A prova existente native-head-compat validou 390/390 poses da cabeça masculina original: repouso, caminhada e seis famílias de ataque. A prova cobre os pixels da cabeça e as âncoras NECK/NOSE, não aprova automaticamente a sobreposição do capacete. Atualização: os seis registros agora integram o índice publicável, mantendo a prova exata da cabeça. O 18 usa o alfa da peça sobre o cabelo original; o 19 oculta a camada de cabelo masculina durante o desenho e a restaura ao ocultar/retirar o item. Testados ambos os itens/corpos nas quatro direções, movimento, combate desarmado e controles reais de inventário. Não houve geração, alteração ou duplicação de PNGs. Cabelos nomeados/combinações adicionais não foram testados nesta rodada.

Manifesto: [head18-19-male-manifest.json](candidates/head18-19-male-manifest.json). Resultado: [head18-19-male-validation.json](candidates/head18-19-male-validation.json).

## Capacetes 18/19 — cobertura essencial concluída

[Fontes desenhadas e cenários](evidence/helmets18-19/runtime.json) · [Masculino 19 EAST](evidence/helmets18-19/male19-east.png) · [Feminino 19 EAST](evidence/helmets18-19/female19-east.png).

Comandos: `python tools/build_pages.py`; `node --test player-rework-received-helmets-runtime.test.cjs` (2/2); `node --test player-rework-original-hair-helmets-runtime-hd.test.cjs` (1/1); `tests/received_helmets_map_browser.cjs` via Playwright/Edge. Fixture fornece itens 18/19 desequipados, corpo/aparência original e alvo imóvel em passagem livre; teclado, clique de ataque, equipar, ocultar e retirar usam a interface. Não injeta direção/ação/frame nem intercepta imagens/índices. Uma asserção inicial esperava um formato incorreto do ID feminino; foi substituída por verificação do hash da camada real, contra os registros do item/direção. A primeira abertura encontrou o servidor local desligado; somente a rodada posterior conta.

Não se reivindica cobertura de todas as armas, cabelos ou roupas, nem recarga/reconexão nesta rodada. Permanecem: 21 masculino; porte/contratos da arma 0; adaptação da 168; independência das botas 8/9 e luvas 25/26; quatro estilos de olhos; máscaras femininas de pele/cabelo original. Capas excluídas.

## Espada de Ferro Salgado e início do item 168

O def 0 utiliza o arquivo original de lâmina do pacote NORTH. No masculino, SOUTH usa nove quadros e os 16 ticks de 24 fps da apresentação original. NORTH recompõe oito quadros a 12 fps com as camadas originais, espada atrás do corpo/mão. EAST/WEST usam a lâmina histórica sobre as âncoras do rig atual. O porte masculino e as três ações femininas usam a mesma lâmina, com transformações rígidas. A posição do cabo foi calibrada em (375,350) no PNG 640×640 e a orientação do porte segue o antebraço. As variantes adaptadas continuam sujeitas à revisão de combinações com roupas e personalizações. O runtime distingue item 0 de ausência de arma.

Para a Saia/Pernas do Rito Marinho, foram recuperados 46 quadros históricos nas quatro direções. Todos os ciclos têm fundo opaco. O primeiro quadro NORTH tem uma [extração transparente preliminar](evidence/item168/north-phase0-candidate.png) e [máscara com origem e hash](evidence/item168/north-phase0-mask.json). Ainda há pixels de borda para refinar e regiões encobertas pelas mãos para reconstruir antes de alinhar ao rig feminino. Esse primeiro recorte foi um estudo. A camada registrada depois está descrita na seção da saia integrada.

A build publicável e o teste de navegador passaram com 24 verificações de fonte desenhada, incluindo equipar e retirar pelo inventário. A rodada usa aparência original e save descartável. O teste automatizado também reconstruiu todos os estados do índice de armas e verificou 101 quadros masculinos do item 0 sem recortes. [Capturas no mapa](evidence/sword0/map-eight-directions.png) · [registro de execução](evidence/sword0/runtime.json).

## Saia 168 feminina integrada

Os quatro ciclos históricos forneceram os painéis azuis, detalhes dourados e calças brancas. A camada de tecido foi separada do fundo e da pele por máscara de material conectada à cintura. Pequenos vazios entre trechos azuis foram preenchidos com pixels vizinhos. As 32 poses de caminhada usam os quadros históricos mais próximos do rig atual. O repouso usa o quadro zero do rig. Para os 32 quadros de ataque desarmado, o tecido foi ajustado por faixa horizontal a partir do quadril e da abertura das pernas. O pacote mantém os PNGs da base por hash, a escala, os pivôs e o relógio das poses. A camada de shorts original é substituída apenas durante o desenho da peça.

O navegador validou as quatro direções, todos os quadros de caminhada e ataque desarmado, equipar, recarregar e retirar. A rodada cobre a aparência original feminina e o item 168 isolado. A volta ao repouso foi testada depois de mover o personagem para longe do alvo. [Capturas](evidence/item168/map-four-directions.png) · [Registro do navegador](evidence/item168/runtime.json).

## Primeiros protótipos dos rostos

Sereno, Determinado, Amendoado e Atento têm 24 camadas transparentes para SOUTH, EAST e WEST nos dois corpos. As expressões usam os mesmos parâmetros de abertura, inclinação e sobrancelha, com caixas próprias de cada cabeça. Os pixels vêm das bases atuais. NORTH preserva a nuca original, pois os olhos não aparecem. O atlas é um protótipo. O próximo passo é avaliar a distinção entre expressões no tamanho do jogo e ligar as camadas aos campos de aparência, mantendo a recoloração da íris e a sobreposição do cabelo. [Comparação](evidence/face-styles/comparison.png) · [Atlas](evidence/face-styles/eye-overlays.png) · [Metadados](evidence/face-styles/atlas.json).

## Expressões no renderizador e primeiras paletas femininas

Sereno, Determinado, Amendoado e Atento usam a mesma regra de deformação nas duas cabeças, com caixas registradas por fonte. O renderizador preserva o alfa da camada. As cabeças masculinas usam as camadas separadas e o espelhamento já declarado para WEST. O feminino aplica a forma do olho antes do cabelo e após a paleta da íris. NORTH mantém a nuca original. A cobertura verificada é a base original dos dois corpos em repouso, caminhada e ataque desarmado. Composições de armas e roupas com rosto fundido continuam sujeitas ao contrato de cada fonte.

A primeira paleta de pele feminina usa máscaras por camada de anatomia. A recomposição da cabeça protege a íris e a franja com o contrato de regiões existente. Para o cabelo original, a mesma camada de cabelo do ataque é usada na cabeça fundida de repouso e caminhada, com a diferença de pescoço restaurada. A pele, a íris e as roupas ficam fora da recoloração de cabelo. As variantes com roupas equipadas ainda precisam de máscaras por fonte.

A interface confirmou os quatro estilos nos dois corpos após aplicar e recarregar. No feminino também foram exercitados Atento, íris verde, pele escura e cabelo original rosa. Os testes do compositor verificam pixels distintos nas direções visíveis, alfa preservado e a combinação das paletas. [Capturas e diagnóstico](evidence/face-styles/map-runtime.json).
