# Artes e contratos pendentes — lista para produção

**Atualização da calça 22 masculina:** fontes originais recuperadas e candidata independente exercitada no mapa. Vínculo definitivo, revisão visual completa e combinações permanecem pendentes; não solicitar uma prancha inteira nova. [Relatório da candidata e evidências](PANTS22_MALE_CANDIDATE.md).

**Escopo atualizado:** capas (slot cloak; defs 23, 24, 135, 142, 149, 156, 163, 170, 177 e 184) não têm impacto visual, conforme orientação do proprietário. Foram retiradas dos pedidos de arte e dos bloqueios visuais. Os resultados históricos de testes não foram reescritos: ocorrências de cloak omitido nessas rodadas deixam de ser pendências visuais. Esta revisão altera apenas o relatório, sem remover itens ou modificar atributos.

Auditoria parcial sobre a base b0d7cf81e7be357e7e4c2a6d1ff4c5f727a804d6, índices runtime atuais, catálogos de roupas/armas/cabeça e acervo histórico 2801902fa2dad8e83069815faeaa3f53f90bc1b6. Não equivale a aprovação de todas as combinações nem à conclusão do PR. Nenhuma imagem foi regenerada.

## Fontes não localizadas no acervo auditado

SOUTH = sul, NORTH = norte, EAST = leste, WEST = oeste. Nos itens abaixo, a fonte deve declarar o corpo e a combinação de roupa/cabeça em que foi aprovada; um ciclo composto não serve como camada independente.

| def | Peça | Corpo | Direção | Material necessário |
|---|---|---|---|---|
| 21 | Grevas de Navegante | masculino | quatro direções | Repouso, caminhada e ataque com camada de calça própria; os ciclos femininos não substituem esta base |
| 22 | Calças da Maré Alta | masculino | quatro direções | Repouso, caminhada e ataque com camada de calça própria |
| 0 | Espada de Ferro Salgado | ambos | quatro direções | Fonte de porte em repouso/caminhada; o ataque histórico existe e está separado abaixo |
| 168 | Saia/Pernas do Rito Marinho | feminino | quatro direções | Fonte compatível de ataque; caminhada histórica existe e está separada abaixo |

Para ataques, cada pedido exige compatibilidade com o gesto/família real da classe; não há aprovação automática de combinações arbitrárias.

## Não gerar novamente: fonte histórica já encontrada

| Peça | Fonte e cobertura | Pendência concreta |
|---|---|---|
| 168 feminina, caminhada | tools/rework-outfits/catalog.json: female_168_{south,north,east,west}_fourview_EW41_SN4; quatro ZIPs em art-approved/clothing/female-pants168-182 no commit histórico acima. SHA-256 dos quatro ZIPs conferido contra o catálogo | Composições fechadas, marcadas interchangeableEquipment=false; confirmar equipamento/aparência exatos e contrato de desenho antes de registrar. Não extrair uma calça genérica da composição. Repouso precisa de referência neutra aprovada |
| 0, ataque masculino SOUTH | approved-0233b9dafee96fa70d9a; art-approved/weapons/sword0-south/male_sword0_south_approved-cycle_presentation-v2.zip; SHA-256 conferido | worldEligible=true, mas reviewRequired=outfit-not-identified. Geometria declarada: frame lógico 160, densidade 4, pivô (80,128). Falta confirmar a combinação exata de roupa/aparência e sua assinatura-base; não é ausência de arte nem ausência de escala |
| 0, demais ataques masculino/feminino | tools/rework-weapons/catalog.json, inclusive clothing-batch-20261112/0-67-70_N_F e demais direções/variantes | Registros consultados worldEligible=false, reviewRequired=unverified-logical-scale-and-pivot. Há arte, mas falta contrato de escala/pivô compatível com o mapa; não calibrar por aproximação |
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

A prova existente native-head-compat validou 390/390 poses da cabeça masculina original: repouso, caminhada e seis famílias de ataque. A prova cobre os pixels da cabeça e as âncoras NECK/NOSE, não aprova automaticamente a sobreposição do capacete. Ainda faltam teste no mapa, corte parcial do cabelo para 18, ocultação integral para 19 e restauração ao ocultar/desequipar. Nenhuma checagem foi afrouxada e o pacote não foi ativado em produção.

Manifesto: [head18-19-male-manifest.json](candidates/head18-19-male-manifest.json). Resultado: [head18-19-male-validation.json](candidates/head18-19-male-validation.json).
