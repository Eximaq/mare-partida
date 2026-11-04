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
