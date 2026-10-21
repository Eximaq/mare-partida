# Referência visual — Maré Partida

## Paper Doll — corte básico compartilhado (21/10/2026)

[Prévia](../pixellab-pip-generations/paper-doll-basic-sword-20261021/preview.html) · [Relatório](PAPER-DOLL-ATAQUE-BASICO.md). Oito poses reais de espada por direção,12FPS, rig84/pivô42,65. Corpo, cabelo e roupa são separados; armas rígidas reutilizam pixels e grips medidos, com giros exatos de90°. O norte mantém costas visíveis e lâmina além do ombro distante. Uma correção Workbench na camada de colete removeu gola/botões frontais nas costas, sem tocar na anatomia. Não há espelhamento de corpos, cortes temporais, duplicação fabricada ou troca de relógio de dano. O personagem comum cobre Idle/Walk/Attack-sword nas quatro vistas em inspeção; aprovação artística entre movimentos e demais categorias continuam pendentes. Não gerar novamente o mesmo gesto por facção.

## Paper Doll — locomoção modular em inspeção (21/10/2026)

Rig84×84/pivô42,65; Idle4/4FPS e Walk8/8FPS nas quatro direções. As48 poses reais de corpo/cabelo/roupa por camada são alinhadas por padding fixo, sem redimensionar a densidade de pixels. Espadas rígidas usam fontes e sockets próprios por vista e fase. Referência visual: cabelo preto, camisa clara e colete azul neutros, sem símbolos de facção. O conjunto ainda não tem aprovação artística completa nem ativação em produção.

Faltam96 frames de corpo/cabelo/roupa do ataque do Espadachim, mais encaixes/poses de arma. Os sprites originais não foram separados artificialmente. Há dois pixels soltos de cabelo apagados numa nova cópia pelo PixelLab Workbench, com guardas exatas, hashes e preservação de todos os demais pixels; nenhuma pose foi pintada localmente. [Contrato](PAPER-DOLL.md) · [Procedência e limites](PAPER-DOLL-CAMINHADAS-LATERAIS.md).

## Ilha Dawn manual — 20/10/2026

Usar o composto e os objetos originais do ZIP do proprietário, sem redesenhar, recolorir ou reduzir. Terrenos nativos64, composição56×40. Árvores95×105, barcos84×141, casas121×119, postes20×80 e baú18×18 preservados em escala1×. Monstros mantêm as artes48 existentes. Oclusão condicional usa pixels do composto e alpha dos objetos, evitando duplicação do cenário. [Fontes, footprints e limites](DAWN-MAPA-MANUAL.md).

## Cidade das Conchas — 20/10/2026

Reconstrução com arte existente, sem novas gerações ou edição dos PNGs. Tiles Wang nativos32 do conjunto compartilhado `harbor-v2`, renderizados2× em células64; água, areia, grama e pedra com paleta e junções já aprovadas. Construções navais de células256 em escala1×, mercados azuis e escritórios com bandeira; arco/colunas de pedra do atlas de ruínas, sem elementos vulcânicos. Navios e carga usam o atlas portuário existente, nearest-neighbor. Monstros legados desta ilha preservados, sem anunciar frames novos. [Fontes, composição e limites](CIDADE-DAS-CONCHAS.md).

## Zoans Rank E — 20/10/2026

Formas animais nativas 48×48, quatro direções cardeais, fundo transparente, contorno escuro, iluminação superior esquerda e pés ancorados na base do quadro. As caminhadas PixelLab possuem oito quadros de movimento mais a pose inicial; seus canvases ampliados são recortados para células 48×48 sem interpolação. Ícones de fruta 48×48 e de habilidade 32×32 seguem a legibilidade aprovada no rework Kuku/Beri. O albatroz é branco com asas azul celeste, o cavalo é castanho e terrestre, e o dachshund é caramelo com dorso preto. Ver [Lote Zoan Rank E](ZOAN-RANK-E.md).

Registro da reconstrução de Ruínas de Brasas, outubro de 2026. As medidas abaixo vêm dos arquivos atuais, não de estimativas da imagem exibida no navegador.

| Referência | Arquivo / frame | Apresentação |
|---|---|---|
| NPC Ryuma | `assets/npcs/ryuma.png`, 48×48 RGBA; conteúdo visível em (11,1)–(38,47) | Referência de densidade e escala compacta |
| Bento, facção pirata | `assets/factions/pirata/metadata.json`, frame 56×56, referência corporal 48px | Quatro direções; pivot (28,52); metadados de escala existentes preservados |
| Novos monstros | Quatro sheets 48×384; oito poses de 48×48 por sheet | Escala de renderização 1,5; pivot comum (24,45), pés próximos à base |
| Pisos vulcânicos | Quatro texturas nativas 64×64 | Uma célula de terreno ocupa 64px no mundo |
| Cenário de ruínas | Atlas transparente 512×512, células 128×128 | Edifícios, naufrágios e estruturas maiores têm escala proporcional |

Linguagem: aventura marítima original, contornos escuros, luz superior esquerda, madeira envelhecida, pedra cinza quente, tecidos vermelhos/ocres, bronze e pontos de luz âmbar. Os personagens precisam se destacar do piso. Interpolação dos sprites desativada; ancoragem junto aos pés e ordenação pela posição no mundo.

Os quatro monstros foram gerados originalmente em 64×64. Depois do pedido explícito de 48×48, os originais foram preservados e as poses reduzidas com nearest-neighbor, sem nova geração paga. A ordem é sul, sudeste, leste, nordeste, norte, noroeste, oeste, sudoeste. A IA usa as quatro direções cardeais; as oito poses permanecem disponíveis.

O orçamento reduzido adiou as animações de caminhada/ataque dos monstros. Os arquivos atuais contêm poses estáticas, sem simulação de caminhada por oscilação. Fogo ambiental utiliza quatro quadros gerados; água e lava têm deslocamento de textura e brilho por código.

Os PNGs fonte permanecem intactos. Contraste/iluminação e rotações dos pisos são composição em tempo de execução. Estas texturas Pixen não são um conjunto de autotiles: os contornos da costa e dos caminhos são máscaras do renderizador.

Fontes e IDs das gerações: `assets/ruinas-brasas/provenance.json`. Configuração de renderização: `assets/ruinas-brasas/manifest.json`.

## Orange Town — 20/10/2026

Quatro monstros novos com poses nativas 48×48, usando Ryuma/Bento como referência de escala aparente, contornos escuros e paleta marítima quente. O MCP v3 entregou oito poses pelo custo previsto; as quatro cardeais são usadas no jogo, preservando as oito originais. Caminhadas possuem oito quadros gerados mais a referência inicial, na ordem original, sem recorte temporal, inversão ou ping-pong. Os canvases de caminhada são 64×64 ou 68×68 para acomodar o corpo de 48px e movimento; não foram redimensionados. Pivô calculado pelos pés do quadro de referência, escala de renderização 1,5 e interpolação desligada.

Atlas de construções transparente 256×256, quatro células 128×128; divisão por quadrantes autorizada, sem redimensionar os arquivos. Piso de calçamento nativo64. Água, areia, grama, palmeiras e carga reutilizam arte existente; madeira do cais reutiliza o atlas procedural já existente do porto. Ataques usam a pose direcional e avisos reais de combate; o lote não incluiu animações de ataque. Manifesto de runtime em `assets/orange-town/manifest.json`; solicitações, recibos e receita em `pixellab-pip-generations/orange-town-20261020/`.

Revisão de composição de 19/10/2026: mapa 32×32 tiles de 64px, sem reduzir as artes. Edifícios renderizados em escala 1,5; uma ponte diagonal em escala 2 alinhada ao vão e às margens. Paredões e degraus reutilizam a textura de basalto/calçamento em composição geométrica no renderizador, com colisões e passagens correspondentes. Nenhuma geração adicional.

## Personagem único — 20/10/2026

O contrato `human-v1` compartilha corpo/cabelo entre as sete classes e quatro facções. Roupa é uma camada independente; ataques são categorias de ação/arma, sem reutilizar uma espada como tiro ou magia. O manifesto vazio em `assets/paper-doll/human/manifest.json` e `docs/PAPER-DOLL.md` definem as peças futuras. Esta etapa não produziu imagens nem autoriza recoloração/recortes dos personagens fundidos. O visual atual continua como fallback até a validação artística de peças reais; o editor de aparência será uma fase posterior.
