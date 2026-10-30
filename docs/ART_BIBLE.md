# Referência visual — Maré Partida

## Armas das demais classes, 96 px — 30/10/2026

Base 47f68fe do PR153, branch feature/weapons-other-classes-96. Dez itens existentes: 2/3, 4/5, 14/15, 16/17 e 31/32. Referências originais 32×32 preservadas; corpo de 96 px em células 128/160, pivôs 64/112 e 80/128, quatro vistas, Idle com 4 quadros a 4 FPS, Walk com 8 quadros a 8 FPS e ataques com 8 quadros a 12 FPS. Contorno escuro de um pixel, luz superior esquerda e fundo transparente na grade nativa. Fontes finais: 16×16 para punhos/manopla/orbe; 24×24 para canhão/compasso/relicário; 64×32 para rifle; 32×24 para pistola; 24×80 para cajado. Três armas de disparo têm vistas Pro 32×32. Compasso e relicário derivam de novos designs Pro. Aproveitar contato, profundidade e margem da sprint1, com adaptação para peças vestidas, armas de fogo e focos. Amostras precederam o restante do lote; custo confirmado de 190 gerações em 15 Create Pro e 4 Edit Pro, mais Workbench gratuito. [Contrato das demais classes](PAPER-DOLL-96-ARMAS-DEMAIS-CLASSES.md).


## Armas equipadas96 — 30/10/2026

[Contrato da sprint1](PAPER-DOLL-96-ARMAS.md): doze armas geradas na IA PixelLab Pro, direção artística Ultra HD Masterpiece. Fontes nativas32/40/64/80/96, sem redução de imagem ou paleta; suporte128 com margem transparente. Corpo/ícones preservados. Cabos ajustados à mão; eixo da arte, fio externo, profundidade e envelope por pose. Ame final: segunda variante da galeria escolhida pelo proprietário. Efeitos equipados somente70/74. Custo PixelLab190 gerações, além dos estudos imagegen anteriores rejeitados.



## Torso e perfis — 30/10/2026, v8

Torso mantém a altura96 e os canvases/pivôs128/160 atuais, usando Casaco de Marinheiro e Casaco da Bruma como peitorais compactos, sem caudas que disputem a capa. Fontes estáticas nativas nos dois corpos; 832 quadros consolidados sobre a anatomia existente. Perfil facial de olho único, oeste espelhado; acessórios sem pele copiada, capacete sem cabelo aparente. Cabeça possui a pele; feições possuem íris/pálpebras/boca. Oito moldes e regras no [contrato](PAPER-DOLL-96-FIT-CONTRACT.md). Custo adicional20 gerações em dois trabalhos PixelLab, sem alterar a escala ou ativar produção.

## Revisão canônica v7 — 30/10/2026

Os defeitos de encaixe da revisão anterior foram confirmados. Dez cabelos e dez equipamentos foram refeitos no PixelLab (20 trabalhos, 200 gerações). Os seis rostos foram separados em feições limpas; corpo, pescoço, rosto, cabelo e acessórios agora compartilham a mesma lateral espelhada e sockets inteiros. Luvas e calçados usam a anatomia nativa de cada pose; capas têm tecido posterior completo. Ver [contrato e moldes reutilizáveis](PAPER-DOLL-96-FIT-CONTRACT.md). A bancada permanece isolada e a integração em produção continua pendente.

Revisão nativa 96: [contrato e moldes reutilizáveis](PAPER-DOLL-96-FIT-CONTRACT.md), materiais por membro, gesto das mãos e paletas preservados. A integração no personagem publicado continua pendente.

## Continuação de 29/10/2026 — locomoção e encaixes

A bancada96 cobre Idle/Walk nas quatro direções dos dois corpos, além dos seis ataques. Dez cabelos e seis opções faciais derivadas da base limpa; FlipX lateral dos cabelos, cabeça/rosto no mesmo socket e equipamentos independentes com contatos refinados. São candidatos de avaliação artística, sem ativação no jogo. Ver [PAPER-DOLL-96-PERSONALIZACAO.md](PAPER-DOLL-96-PERSONALIZACAO.md).

## Nova base aprovada de 96 px — 28/10/2026

O proprietário aprovou o desenho masculino/feminino na simulação do lobby.
Canvas128, altura de referência96, pivô64/112 e escala fixa; roupa, rosto e cabelo
independentes do corpo neutro. Oito referências recompostas sem diferença de
pixels e dois ciclos frontais candidatos estão na
[bancada isolada](../tools/paper-doll-96-v3/). A aprovação do desenho não homologa
as animações nem substitui o personagem publicado. Cobertura e custos em
[PAPER-DOLL-96-V3.md](PAPER-DOLL-96-V3.md). Os contratos84 anteriores permanecem
como fonte dos movimentos e histórico, sem ativar a nova criação feminina.

29/10: seis categorias de ataque ×quatro direções ×dois corpos disponíveis
na bancada, oito frames reais12FPS.40 clips distintos cobrem48 entradas porque
tecnologia/disparo compartilham os fontes anteriores. Células160/pivô80,128
preservam a escala96. Cabeça neutra, rosto, cabelo, roupa e oclusão das mãos
permanecem separados. Folhas completas por camada na pasta Jade Dragon.
São candidatos de animação/encaixe para aprovação artística, sem migração do jogo.

Continuação de22/10: [candidato de encaixe leste no Workbench](PAPER-DOLL-ENCAIXE-LESTE.md). O ataque pode ser inspecionado em quatro direções; o novo vestuário leste ainda precisa de harmonização artística. Sem geração paga nesta etapa e sem ativação em produção.


Retoque exato de22/10: [norte modular e corpo leste com apoio estável](PAPER-DOLL-RETOQUE-EXATO.md). PixelLab Workbench fez cópias localizadas da superfície estacionária do dorso e do contorno dos pés, preservando os oito frames reais. Os pixels fora dessas regiões não foram modificados. A reconstrução generativa de roupa/mão leste foi reprovada; norte/frente/oeste continuam como rascunhos para avaliação, sem ativação no personagem publicado.

Revisão direcional (22/10/2026): [frente e oeste em inspeção, norte e leste com fallback](PAPER-DOLL-DIRECOES-BENTO.md). O oeste tem oito poses de seis camadas, encaixes da espada por pose e calibração fixa de origem. As duas vistas pendentes não usam peças parciais. O lote consumiu9 gerações confirmadas e preserva produção/saves.

Continuação em inspeção: [novo corte frontal guiado pelas articulações do Bento](PAPER-DOLL-MOVIMENTO-BENTO.md). Corpo neutro pelo Skeleton v3 e peças visíveis originais separadas;13 gerações confirmadas nos dois estudos. Não usar o primeiro corpo da transferência (espada interpretada como braço). O novo pacote continua `approved:false`, somente frente, sem continuidade Idle/Walk nem demais vistas certificadas.

**Atualização de avaliação (21/10/2026): o Attack/sword modular foi reprovado pelo proprietário por qualidade de movimento inferior ao Bento atual.** A infraestrutura e todos os fontes foram preservados; produção continua com os sprites existentes. A prévia do ataque agora permite comparação sincronizada com o Bento, sem novas gerações. Os registros de testes abaixo representam validação técnica, não aprovação artística.

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


## 28/10/2026 — Importação dos 21 sprites de combate v2

Referências medidas nos assets existentes: altura opaca do Idle anterior para manter a escala aparente; mesma densidade/pixel scale entre estados, compensação de canvases transparentes de ações e pivô estável na margem inicial dos pés. O pacote novo traz Idle92px (Cocox) ou96px; ações124–144px, com6–29 quadros. Fontes PixelLab existentes, sem nova geração, pintura ou reamostragem. Preservar contornos/paletas originais e nearest-neighbor; não deformar a arte para preencher o antigo canvas. FPS autoral não informado no export:12/24FPS são configuração de apresentação, e os tempos de combate continuam antigos. Hurt usa quatro quadros inspecionados em180ms.

[Auditoria, dimensões por conjunto, integridade dos5.957 frames, fallbacks e pendências de aprovação](SPRITES-COMBAT-V2.md). Não inferir aprovação visual pelo sucesso dos testes técnicos.


## Alubarna — export completo e escalas (29/10/2026)

O proprietário escolheu103×82 células64 nos cinco destinos. Uma imagem6592×5248 e208 objetos nativos compartilhados preservam pixels, posição e profundidade. Escala aparente: Puppu110px < Merry Christmas120px < Valentine135px < Double Finger150px < Mr.1 170px. Hurt South mantém a política aprovada. Sem geração paga. [Proveniência e validação](ALUBARNA.md).

### 30/10/2026 — Revisão v9 de peitorais e anatomia96

Dois peitorais refeitos como camisas fechadas com mangas curtas; tecido separado de pele antes do encaixe. 16 folhas anatômicas fixas para 424 poses, 32 folhas de peitoral com poses estáticas e movimento. Pulsos medidos sobre os próprios frames, lados resolvidos por cotovelo/pose anterior e profundidade normalizada. Cabeça não pode redesenhar ombro sobre roupa; luva fechada conserva a silhueta nativa dos dedos. Capa mantida, sujeita à mesma prioridade das mãos. Referências históricas, escala, corpo e timing preservados. Custos: 38 gerações de reparo artístico + 31,9 de medição, total69,9. Contrato e limites em PAPER-DOLL-96-FIT-CONTRACT.md.

A revisão cromática v9 limita os dois peitorais a paletas explícitas por material; pontos rosados e pele copiada do gerador não são aceitos. Os 34 exports conservaram seu alpha. A fonte anatômica continua igual para os dois tecidos, preservando encaixes ao trocar material.
