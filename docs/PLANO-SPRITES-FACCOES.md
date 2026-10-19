# Etapa 1 — sprites-base de facção

Estado: análise concluída; nenhuma nova geração iniciada. A geração e a integração aguardam aprovação do lote. Este documento não é uma entrega de sprites.

## Referência observada

Os quatro PNGs em `assets/npcs/` têm canvas RGBA 48×48 e altura visível 46 px (y=1 até 46). Larguras visíveis: Luffy 42, Ryuma 27, Nami 32, Donquixote 44 px. Cada um possui entre 14 e 59 cores visíveis distintas. Os nomes são os identificadores existentes; as identidades desses NPCs não serão copiadas para as novas facções.

Contornos pretos/quase pretos, predominantemente de um pixel, silhuetas bem separadas; sombreamento em blocos com tons base, sombra e luz; cabeça estilizada relativamente grande, aproximadamente um quarto da altura no desenho de referência (estimativa visual). O vestuário, cabelo, acessórios e peles possuem contraste forte. Azul-marinho, bege, dourado e tons de pele aparecem junto a cores saturadas de roupa.

O render atual dos NPCs usa altura de 76 px, exceto Ryuma com 72 px, com suavização desativada. O personagem atual usa altura 74 px. As imagens dos NPCs são estáticas: não têm frames próprios de idle/walk no projeto. O herói atual alterna imagens frontais, mas usa imagem estática de costas e lado. A nova implementação deverá tocar animações reais nas quatro direções, sem tratar um espelhamento como geração independente.

## Direção de arte

Quatro indivíduos originais, um por facção. A classe continua independente da facção. Usar o PNG de Ryuma como referência de contorno, sombreamento e detalhamento, sem copiar rosto, cabelo, roupa ou identidade. Paletas de roupa definidas por facção; nenhum símbolo, logotipo ou uniforme oficial de franquias. O estilo shonen marítimo serve como direção de clima, não como reprodução de personagens.

Base frontal proposta: 48×48 nativa, transparência, corpo inteiro centralizado, pés perto da linha inferior e margem para membros. Aprovar uma imagem-base por facção antes das rotações e animações. Se o lote retornar alternativas, a seleção exige a escolha do usuário ou sua delegação explícita. A estimativa abaixo não contém novas tentativas.

## Chamadas previstas — mesma sequência por facção

1. `create_image_pro` (MCP), `width:48`, `height:48`, `no_background:true`, `style_image_base64: assets/npcs/ryuma.png`, `style_copy:[outline,detail,shading]`. Estimativa 10 gerações por chamada. O modelo pode retornar até 25 alternativas; escolher uma base, sem cobrar por alternativa da mesma chamada.
2. `create_character` (MCP), `mode:v3`, `size:48`, `body_type:humanoid`, `n_directions:4`, `view:low top-down`, `reference_image_base64: imagem-base frontal selecionada`, `name: nome abaixo`, `description: mesmo prompt da base`. Estimativa conservadora 2–9 gerações por personagem. A imagem é a identidade a girar, não uma segunda referência de estilo.
3. `animate_character` (MCP), `character_id: retornado`, `mode:template`, `template_animation_id:breathing-idle`, `animation_name:idle`, `directions:[south,north,west,east]`. Estimativa 4 gerações, uma por direção; contagem de frames determinada pelo template.
4. `animate_character` (MCP), `character_id: retornado`, `mode:template`, `template_animation_id:walking-8-frames`, `animation_name:walk`, `directions:[south,north,west,east]`. Estimativa 4 gerações, uma por direção; oito frames por direção.

Total: quatro chamadas de base, quatro de rotação e oito de animação; **80–108 gerações estimadas**, sem retries. As animações propostas usam canvases pequenos; se o serviço exigir um canvas maior com custo adicional ao orçamento aprovado, interromper antes do gasto extra. Direções, ordem dos frames e dimensões retornadas serão verificadas antes da integração. Sem seed escolhido e sem enhancer pago separado.

## Prompts exatos propostos (elaborados a partir do pedido)

O prefixo e o sufixo abaixo são concatenados com o texto específico de cada facção, na ordem prefixo + texto específico + sufixo. O mesmo resultado é usado na base e na rotação. A chamada de rotação usa também a imagem selecionada.

Prefixo EN: “One original full-body humanoid maritime adventure RPG character, directly facing south toward the viewer, low top-down game view, neutral standing pose, arms relaxed and separated from the torso. Match the reference's one-pixel dark outlines, compact expressive head, readable anatomy and clustered three-tone material shading; do not copy its identity or outfit. ”

Tradução: um personagem humanoide original de RPG de aventura marítima, corpo inteiro, frontal voltado para baixo/observador, vista superior baixa, postura neutra, braços relaxados separados do tronco. Seguir o contorno escuro de um pixel, cabeça compacta e expressiva, anatomia legível e sombras em grupos de três tons da referência; sem copiar identidade ou roupa.

1. **Iara do Levante — Exército Revolucionário**

   EN: “Rebel female island courier, short dark curly hair, determined friendly face, dark green cropped field jacket, burgundy neck scarf, beige practical trousers, brown boots, utility belt with small pouches and aged brass buckles. ”

   Tradução: mensageira rebelde de uma ilha, cabelo escuro curto e cacheado, rosto determinado e simpático, jaqueta verde-escura curta, lenço vinho, calça bege prática, botas marrons e cinto utilitário com bolsas e fivelas de latão envelhecido.

2. **Bento Maré-Livre — Pirata**

   EN: “Charismatic male sea adventurer, wavy dark hair and teal headband, cheerful bold expression, sleeveless crimson vest over a cream shirt, cobalt blue trousers, brown waist sash, sturdy sandals, small brass compass hanging from a nautical belt. ”

   Tradução: aventureiro marítimo carismático, cabelo escuro ondulado e faixa verde-azulada, expressão alegre e ousada, colete carmesim sem mangas sobre camisa creme, calça azul-cobalto, faixa marrom, sandálias resistentes e pequena bússola de latão no cinto náutico.

3. **Cecília da Vigília — Marinheiro**

   EN: “Disciplined female naval watch officer, tied-back dark hair, composed confident face, original structured white naval tunic with navy blue shoulder panels and light blue trim, gray trousers, polished dark boots, small gold fasteners, no hat, no insignia. ”

   Tradução: oficial naval disciplinada, cabelo escuro preso, rosto calmo e confiante, túnica naval branca original estruturada, painéis azul-marinho nos ombros e acabamento azul-claro, calça cinza, botas escuras polidas, pequenos fechos dourados, sem chapéu ou insígnia.

4. **Dário do Conselho — Governo Mundial**

   EN: “Refined male institutional envoy, neatly combed silver hair, stern dignified face, tailored ivory long coat over a deep blue waistcoat, black trousers, cool gray gloves, formal black boots and restrained gold edging, imposing upright posture, no emblems. ”

   Tradução: emissário institucional refinado, cabelo prateado penteado, rosto severo e digno, casaco longo marfim de alfaiataria sobre colete azul-profundo, calça preta, luvas cinza-frio, botas formais pretas e acabamento dourado discreto, postura firme, sem emblemas.

Sufixo EN: “Entire body inside one 48 by 48 pixel canvas with transparent margins, feet aligned near the bottom, clear limb separation. Professional crisp pixel art, original shonen sea-adventure mood, no text, no logos, no official franchise symbols, no famous-character likeness, no weapon, no scenery, no cast shadow baked into the image.”

Tradução: corpo inteiro dentro de um canvas de 48×48 pixels com margens transparentes, pés alinhados perto da base, membros separados de forma legível. Pixel art nítida profissional, clima shonen original de aventura marítima, sem texto, logotipos, símbolos oficiais, semelhança com personagens famosos, arma, cenário ou sombra projetada incorporada à imagem.

## Integração após aprovação

Fazer novo checkpoint integral antes de substituir o carregamento de sprites. Preservar os PNGs atuais e a renderização anterior como fallback de carregamento, nunca como resultado final da nova arte. Não usar animações antigas de ataque que troquem a identidade visual: nesta etapa, a pose-base pode permanecer durante o ataque funcional, pois novas animações de combate estão fora do escopo.

Salvar os originais e auditoria em `pixellab-pip-generations/faccoes-base-20261018/`. Entregar as pastas solicitadas em `assets/factions/{revolucionario,pirata,marinheiro,governo_mundial}/`, cada uma com `idle.png`, `walk.png`, `preview.png` e `metadata.json`. As folhas têm uma linha por direção e frames na ordem retornada. Padding transparente e offsets de montagem serão registrados; não pintar nem interpolar pixels. Registrar dimensões reais, FPS, direção, frame count, pivô dos pés e offsets. Manter preview transparente.

Criar uma inspeção dos quatro personagens lado a lado e seleção usando os novos sprites. Testar cada facção com idle e caminhada nas quatro direções, comparação com NPCs, escala, cortes, ancoragem, suavização desligada e preservação de classes/saves. Registrar capturas reais e informar qualquer animação que ainda exija refinamento, sem apresentar arte reprovada como concluída.
