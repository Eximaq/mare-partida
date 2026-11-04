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
