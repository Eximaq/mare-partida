# Armamentos de classe — lotes HD

## Lote 1 — 03/11/2026

Base: `origin/main` em `25cd9d05`; branch `feature/class-weapons-batch-1`.
Os IDs 0–108 permanecem intactos. Os cinco novos itens usam os cálculos
compartilhados de inventário, forja e servidor. Não há migração de banco ou save.

| ID | Equipamento | Raridade | ATQ / DEF / Vida | Atributos fixos |
|---|---|---|---|---|
| 109 | Manoplas do Coral Negro | Épico | 26 / 5 / 10 | FOR 7, VIT 5, DES 2 |
| 110 | Punhos do Dragão Carmesim | Lendário | 44 / 8 / 16 | FOR 16, VIT 8, DES 4 |
| 111 | Luva do Abalo Sísmico | Lendário | 40 / 16 / 24 | FOR 12, VIT 16, DES 4 |
| 112 | Manoplas da Ruptura dos Mares | Supremo | 66 / 18 / 36 | FOR 24, VIT 18, DES 6 |
| 113 | Mosquete do Vento Cortante | Épico | 29 / 0 / 0 | DES 7, FOR 2, crítico 0,72% |

Valores no nível 1, +0, sem extras nem pérolas. As bases do catálogo ainda não
possuem multiplicador de raridade: a forja aplica raridade e nível uma vez.
Extras sorteados são separados dos atributos fixos; reforja não altera estes.
Supremo mantém a raridade vermelha e as restrições atuais de aquisição.

### Arte e encaixe

- Ícones originais selecionados da galeria PixelLab, com uma nova Luva do Abalo
  Sísmico no lugar das braçadeiras propostas inicialmente.
- Materiais equipados gerados no PixelLab Pro, 128 × 128 com alfa. Pixels da
  fonte preservados; `materialScale` controla apenas o encaixe lógico. A mesma
  composição de 96 px usa raster 3× para conservar os detalhes na prévia ampliada.
- Punhos fechados, palmas para dentro, nós dos dedos para fora. Cada manopla
  possui uma vista Norte própria; Oeste espelha a composição Leste completa.
- Ruptura menor, sem alterar a forma aprovada. Dragão Carmesim inclui armadura
  articulada sobre os braços, usando os ossos e as máscaras nativas existentes.
- Recuperação limitada dos pixels de mãos antigas presentes no corpo, fora do
  atlas de mãos. Cabelo, rosto, roupa e capa continuam ocluindo membros atrás.
- Mosquete em uma mão no repouso/caminhada, conforme revisão do proprietário.
  Ataque e emissão usam a animação nativa de disparo.
- Efeitos de impacto/disparo são apresentação; não criam hits extras, dano,
  recargas, passivos nem emissores ambientais permanentes. Eventos online de
  dano sem origem inequívoca não recebem a assinatura de manopla com fruta equipada.

### Origem dos materiais equipados

| Material | Job PixelLab | Galeria | Candidato |
|---|---|---|---|
| Coral | `55eeba35-f899-4482-bcd8-66d1de857ecf` | `63f76de3-5e5b-5ce8-8e4b-ad630309e466` | 2 |
| Dragão | `f970fc9b-8b3d-436a-9e10-9dcf63cfec1e` | `a431c15a-34ce-5c80-a212-a6aa0a7319ee` | 1 |
| Luva Sísmica | `c671c7db-797c-4754-9012-d20789700de7` | `9a724596-7544-5ae7-9f1a-9670665fc0d0` | 2 |
| Ruptura | `d0b3f36a-b42b-4316-a02c-e050313fea4e` | `9ca400bc-a2a5-599b-96ef-7fa888317446` | 0 |
| Mosquete: perfil / Sul / Norte | `61b81f57-571e-42e0-a67b-a6b0ab283363` | `78b37286-227a-5c47-8cd9-22b35208616f` | 0 / 1 / 2 |
| Quatro vistas traseiras | `700524e3-b8c5-4a79-ac08-01c1ec6d229e` | `c237f247-26a9-5753-816e-3d5bcd82dc51` | 0–3 |
| Armadura articulada do Dragão | `f7251440-2d8c-473b-af35-d28e8662d717` | `464de4b3-893e-554d-beb1-c08a6c58a476` | 2 |

Lote 1: 70 gerações de assinatura, incluindo candidatos descartados.
O importador `tools/paper_doll_96_hd_materials.py` registra hashes, origem,
canal alfa, grip, ponta, escala e densidade. Não usar uma nova redução de cores
ou uma imagem achatada para substituir os materiais de personagem.

### Validação

- 13 testes Node de catálogo, atributos, reforja, arte e armas legadas: passaram.
- 2 testes do catálogo compartilhado com o servidor: passaram.
- Chrome: 480 frames de manoplas, 55.404 pixels de pele verificados, nenhuma
  falha de cobertura nas regiões de mão/braço auditadas; 10 espelhamentos exatos.
- Chrome na distribuição estática: 10 combates (5 armas × 2 corpos), frame 4 de
  impacto/emissão, encaixe do projétil, recuperação e retorno desarmado: passaram.
- `python tools/player96_release.py --write` e `python tools/build_pages.py`:
  concluídos. A distribuição inclui também as novas vistas e a armadura do braço.
- PostgreSQL e sessões multiplayer reais não foram executados neste computador.
  Não é uma medição de FPS de sessão longa nem uma aprovação artística automática.

As capturas ficam fora do Git. Para desfazer, reverter os commits deste lote;
preservar a identidade dos novos IDs em saves que já os tenham adquirido.

O proprietário autorizou seguir para as próximas cinco armas após a revisão
visual deste lote. Os lotes seguintes permanecem separados em commits.

## Lote 2 e revisão South — 04/11/2026

IDs 114–118: Pistolas Gêmeas do Corsário, Rifle do Horizonte da Grand Line,
Arcabuz do Juízo Celestial, Braço Mecânico de Ferro Salgado e Canhão de Luz
Pacifista. Ícones originais e materiais equipados PixelLab Pro, com vistas
Sul/Norte e perfil próprias. Origem, candidato e hashes em weapons.json.

| ID | ATQ / DEF / Vida | Atributos fixos no nível 1, +0 |
|---|---|---|
| 114 | 48 / 0 / 0 | DES 16, FOR 4, crítico 1,6% |
| 115 | 52 / 0 / 0 | DES 16, FOR 8, crítico 1,6% |
| 116 | 84 / 0 / 0 | DES 24, FOR 12, crítico 2,4% |
| 117 | 22 / 12 / 24 | VIT 7, FOR 5, DES 2 |
| 118 | 40 / 16 / 36 | VIT 16, FOR 12, DES 4 |

O braço usa ataque desarmado nativo; o canhão, ataque técnico. O par de pistolas
conserva o gesto e a cadência de tiro existentes: não há dois hits ou dois
projéteis por evento. Assinaturas de disparo/impacto são apenas apresentação.
Reforja, extras, pérolas e estatísticas antigas são preservados. Lote artístico:
160 gerações, incluindo candidatos descartados.

### Revisão aprovada das referências de South

O proprietário substituiu a orientação anterior de porte em uma mão. Somente
parado/caminhando em South, as armas longas 4, 113, 115 e 116 ficam horizontais,
cano à esquerda e coronha à direita, apoiadas nas duas mãos. O porte mantém
ângulo e distâncias entre mãos durante a caminhada; o balanço do corpo/pernas
continua nativo. A mão à direita da imagem aparece sobre o gatilho/cabo.
Pistolas 5 e 114 exibem um par com canos para baixo e para fora, conforme a
referência, sem mudar os eventos de disparo. Ataque e demais direções retêm
suas vistas anteriores. Os ícones de inventário não foram substituídos.

Seis perfis South foram gerados no PixelLab com as duas referências enviadas.
Armas longas: extensão lógica 76; pistolas: 22; fonte nativa 128 × 128 e raster
3×. A adaptação preserva os pixels das fontes, sem redução de paleta. A nova
postura retargeta só braços/mãos já vestidos na composição compartilhada;
rosto, cabeça, pernas, personalização e cores continuam nas camadas nativas.
O contorno do braço acompanha a mesma máscara, incluindo os fragmentos que
as camadas antigas de calça mantinham perto das mãos. O cotovelo usa malha
contínua para evitar fissuras entre os segmentos.

| ID | Job PixelLab do porte South | Candidato |
|---|---|---|
| 4 | a9961ce5-3438-484d-86c9-a26154ad1444 | 1, variante superior isolada |
| 5 | f1a425f4-acfc-4fff-964d-b134db254fb8 | 1 |
| 113 | f7a15c6d-9e78-4f16-88ee-0ac01903ba65 | 1, espelho horizontal |
| 114 | d641ea6b-d428-494f-948c-0eb4f972a63a | 3 |
| 115 | 84679254-01fb-4e2b-ac20-f3a67ce096c1 | 1 |
| 116 | 309dfb71-792f-4632-94cc-9f7ae5f73962 | 1 |

Revisão South: 80 gerações, incluindo duas primeiras opções de pistola
descartadas por não se aproximarem suficientemente da referência.

### Validação deste incremento

- 20 testes Node: catálogo, atributos/forja, arte, armas antigas e porte South.
- 2 testes do catálogo compartilhado/imutável do servidor.
- Chrome: 720 frames de cobertura, 76.981 pixels auditados, 20 espelhamentos
  exatos, sem falhas nas regiões verificadas.
- Chrome: 144 frames de porte South das seis armas, incluindo as antigas;
  641.664 pixels de arma verificados com a exceção intencional da mão sobre
  o gatilho.
- Distribuição estática: 10 combates dos cinco itens do lote 2, impacto/emissão,
  recuperação e retorno desarmado sem erros JavaScript.
- Build Pages e manifesto nativo executados. PostgreSQL/multiplayer real não
  executados neste computador; sem alteração de esquema do banco.

Arquivos principais: item-catalog.js, class-weapon-vfx.js, game.js, weapons.js,
wardrobe.js, motion.js, weapons.json, player-pack.json, PNGs dos materiais e
ícones, testes específicos e contratos de catálogo compartilhado. Capturas
comparativas ficam fora do Git. O proprietário aprovou seguir com os próximos
armamentos e projéteis após esta revisão.

## Lotes 3 e 4 — materiais e projéteis, 04/11/2026

Os IDs 119–128 completam os vinte armamentos: Colosso, Serafim, Monções,
Trovão, Carmesim, Calamidade, Drum, Sakura, Marés e Milagre. Permanecem
intactas as primeiras 119 definições; cada uma das cinco classes recebe
um Épico, dois Lendários e um Supremo. Ícones e materiais PixelLab Pro;
fontes, candidatos e hashes em weapons.json. Oito projéteis de magia/suporte
gerados no PixelLab, separados sem alterar pixels ou alfa, com origem em
assets/effects/class-weapons/manifest.json. Os novos estilos acompanham o
projétil atual e preservam um hit por ataque.

O Serafim foi substituído por canhão reto e compacto, com vistas frontal e
traseira próprias. A referência feminina orienta somente os braços masculinos
em North/South; a textura vem de braços nativos completos. Cabeça, corpo e
pernas masculinos não são substituídos. O peitoral exposto pelo novo gesto
é recomposto com o material equipado, sem apagar a arte original.

A revisão também recuperou a coroa completa do Cetro da Calamidade. O gerador
de release agora sincroniza as versões do manifesto e das armas, além dos
hashes, evitando rejeição do conjunto atual no carregamento.

Validação deste ponto de recuperação: 26 testes Node, 2 do catálogo
compartilhado, 20 combates no cliente original e 6 na distribuição estática,
retorno desarmado e emissores nativos: passaram. Chrome: 960 frames de cobertura,
40 espelhos, 1.332 composições com e sem as duas luvas existentes, sem falhas
nas regiões verificadas. PostgreSQL/multiplayer real não executados.

Após este ponto o proprietário solicitou consolidar a política dinâmica de
camadas e cobrir o braço inteiro do Serafim; esse é o incremento seguinte.

## Camadas dinâmicas e braço completo do Serafim — 04/11/2026

A correção posterior do proprietário substitui a prioridade absoluta 100 da
arma. `MareWeapons96.composition` centraliza a ordem dos trajes: pele 10,
rosto/olhos 20, cabelo 30, calças 40, torso 50, capa frontal 55, cinto 60,
botas 70, luvas 80 e cabeça 90. A capa traseira precede o corpo. Cintos sem
sprite continuam sem uma camada artificial. A ordem independe do carregamento.

A profundidade da arma é resolvida pela mão e pelo frame: usa o z anatômico
da pose e permite uma `depthTrack[action][direction][side]` explícita para
transições que novos materiais exijam. A máscara traseira vem da silhueta
real já vestida, incluindo cabeça, roupa e capa; a mão empunhadora é distinguida
da outra mão. A arma dianteira prevalece sobre roupas. Os dedos fechados podem
ocluir o cabo quando não houver exceção explícita. Não há prioridade universal
da arma sobre o corpo, nem mudança na profundidade do cenário.

Exceções preservadas: em South e Attack-Focus lateral a arma prevalece sobre
a mão/luva, sem promover uma mão traseira acima do torso. O fuzil South parado
e andando mantém o porte aprovado, com cano à esquerda, coronha à direita e
os mesmos pontos relativos das duas mãos. Isso substitui a antiga exceção da
mão sobre o gatilho descrita no histórico do lote 2; a postura não mudou.
Oeste continua usando o espelho da composição Leste completa já adotado pelos
assets nativos; nenhuma arma isolada troca de mão no compositor.

Todos os itens visíveis de cabeça, inclusive chapéus, suprimem o cabelo inteiro.
Ocultar ou retirar a cabeça restaura penteado e cor sem alterar equipamento,
atributos ou personalização persistida. Os atalhos de conjuração e a exclusão
de camadas humanas nas formas Zoan continuam no adaptador compartilhado.
As animações humanas existentes são idle, walk e seis famílias de ataque;
esta fase não inventa clipes Hurt/Cast ausentes.

Serafim 120: nova manga metálica articulada PixelLab Pro, job
`f1de0e49-c545-47d9-9df1-c8fd8f904c17`, galeria
`72ee55c6-d634-517c-832d-35ea87b4286f`, candidato 2. A cobertura segue
ombro, cotovelo e punho no braço equipado de ambos os corpos, incluindo
as junções da manga fora do atlas neutro. Mantém as vistas próprias do canhão
e a referência feminina de braços para o masculino North/South. Fontes de
roupa e corpo são preservadas; recortes e sobreposições ocorrem em memória.
Na revisão seguinte, a manga ganhou um pixel lógico de espessura e uma faixa
mais larga da textura branca/dourada, preenchendo as laterais escuras. A
expansão segue a máscara do braço, sem engordar o corpo ou a mão livre.

Validação: matriz Chrome de 96 conjuntos (duas bases, oito estados e três
direções nativas), 10.928 pixels de botas, 8.270 de luvas, 96 ocultações e 96
restaurações de cabelo passaram. Serafim: 120 frames sem pele exposta na
região auditada do braço equipado. A composição espelhada Oeste é verificada
pela suíte de encaixe. Matriz de armas: 1.332 composições / 4.547.934 pixels,
72 materiais, sem falhas nas regiões auditadas. Seis combates estáticos
(120/124/128 × dois corpos) passaram com emissão, impacto e recuperação
nativos; retorno desarmado sem erros JavaScript.

Capturas reais do compositor: sete famílias com conjunto completo nas quatro
direções; sequência de oito frames do Serafim e do fuzil South; comparação
antes/depois com o commit anterior. Evidências ficam fora do Git. Não são
imagens geradas por IA como prova. O build Pages inclui 1.026 recursos nativos.
PostgreSQL/multiplayer real e medição prolongada de FPS não foram executados.

Novas roupas reutilizam a mesma política e máscaras; precisam respeitar o
contrato de alfa, regiões anatômicas, pivôs e animações nativas. Uma arte nova
com anatomia ou âncoras incorretas ainda exige validação, não uma nova variante
para cada combinação de roupas. Não há promessa de aprovação automática de
assets futuros que ainda não existem. Para desfazer esta fase, reverter seu
commit sem reverter os materiais/projéteis do checkpoint anterior.

Encerramento: 39 testes Node pertinentes e 2 do catálogo compartilhado passaram.
A última revisão preservou os 960 frames auditados de encaixe, 40 espelhos e
144 frames do porte South, sem falhas. A manga expandida do Serafim acrescentou
1.086 subpixels opacos nas quatro amostras North/South dos dois corpos.
Após o build final, os demais nove itens dos lotes 3/4 passaram em 18 combates
estáticos (dois corpos), com emissão, impacto, recuperação e retorno desarmado,
sem erros JavaScript. Main permaneceu em 25cd9d05; o novo PR 237 de HUD não
altera arquivos desta entrega. Não foi integrado preventivamente um PR aberto.

Decisão do proprietário ao finalizar: suspender os ajustes do Protocolo Serafim
por enquanto. O estado atual e suas fontes ficam preservados para retomada;
não há aprovação artística final desse item. Os demais armamentos, projéteis
e a política compartilhada de composição seguem nesta entrega. Nenhuma
compensação, exclusão de item de save ou mudança de aquisição foi solicitada.


## Compatibilidade da entrega e correção de fragmentos — 04/11/2026

A validação do GitHub identificou contratos antigos que ainda pressupunham
um catálogo de 109 itens, ausência do Satori e prioridade fixa das mãos.
O smoke do contêiner passa a conferir as 129 definições e seu hash oficial;
o teste de sprites reconhece o Satori já integrado em main, sem alterar
seus recursos. A prévia móvel carrega o mesmo emissor de armas do cliente.
Os vinte ícones HD agora são reconhecidos pelo seletor compartilhado de
arte do inventário. Nenhuma regra do servidor ou do combate foi alterada.

O teste de capacetes segue a ocultação integral do cabelo também com bandana.
As inspeções antigas em uma amostra por pixel continuam para materiais 1×;
as armas HD usam as matrizes próprias 3× de encaixe, prioridade e vestuário,
agora obrigatórias no mesmo workflow. A verificação de todos os materiais e
rotações permanece ativa em sua densidade real. A cobertura das manoplas
considera a propriedade de cada braço quando os punhos se cruzam: a manopla
traseira não pode pintar por cima do antebraço dianteiro.

A máscara traseira das lâminas permite somente os dedos fechados sobre o
cabo, preservando o antebraço dianteiro. Na rasterização HD, fragmentos
mínimos causados pela rotação são removidos do resultado em cache; detalhes
substanciais separados por até um pixel lógico recebem uma ponte da própria
cor adjacente. As fontes não são alteradas por esse tratamento em memória.

Dois reparos pontuais foram feitos no PixelLab pixelart_workbench:
- Monções 121: um pixel dourado liga o suporte à gema central; imagem
  e1f559a7-254b-4845-873b-8102e67a42ed.
- Marés 127: dez pixels dispersos fora da arma foram removidos; imagem
  9a9ed818-d440-4202-bd5e-fe27cba60a3c.

Canvas, alfa e demais pixels foram preservados. Os reparos e hashes estão
registrados em weapons.json. O Serafim não recebeu novos ajustes nesta fase.

Revalidação: 41 testes Node, 2 do catálogo compartilhado, 960 frames de encaixe,
40 espelhos, 144 frames de porte South e 4.714 rotações de 60 materiais
passaram. A suíte Python validou 8.327 frames nativos em 36 personagens.
Build Pages e release nativo foram regenerados. Evidências locais não entram
no commit. A suspensão artística do Serafim permanece conforme decisão acima.

Na distribuição estática final, a regressão dos materiais anteriores passou
em 1.920 composições, 640 espelhos e 40.758 testemunhas de cobertura de
palmas; o detector negativo de arma sobre o rosto manteve 184 testemunhas.
Quatro combates (121/127 × dois corpos) confirmaram os materiais reparados,
emissão/impacto e retorno desarmado sem erros JavaScript.
