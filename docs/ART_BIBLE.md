# Referência visual — Maré Partida

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

Revisão de composição de 19/10/2026: mapa 32×32 tiles de 64px, sem reduzir as artes. Edifícios renderizados em escala 1,5; uma ponte diagonal em escala 2 alinhada ao vão e às margens. Paredões e degraus reutilizam a textura de basalto/calçamento em composição geométrica no renderizador, com colisões e passagens correspondentes. Nenhuma geração adicional.

Revisão compacta final: mundo 16×16 tiles (1024px por lado), quatro setores, três construções e três escadas. Mantidas todas as escalas dos assets; câmera centralizada quando o mundo cabe na viewport.
