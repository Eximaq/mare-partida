# Loguetown — cidade portuária HD

O destino `loguetown` usa uma pintura inédita de cidade portuária, com cais central, mercado, praça de execução, torre do relógio, jardins e quartel da Marinha. O cenário foi criado para esta integração após a orientação do proprietário de seguir o acabamento dos mapas de Skypiea, Thriller Bark e Sabaody.

## Arte e resolução

| Item | Contrato |
| --- | --- |
| Textura carregada pelo jogo | `assets/loguetown/harbor-city/scene-hd.png` |
| Resolução nativa da pintura | 1448 × 1086 pixels |
| Coordenadas do mundo | 4096 × 3072 unidades |
| Arquivo publicado | PNG original, sem redução ou recompressão |
| Renderização | Recorte proporcional da imagem completa, com suavização de alta qualidade |
| Profundidade | Silhuetas da própria pintura, redesenhadas somente quando encobrem atores |

As dimensões do mundo definem distâncias de caminhada e colisões; não são uma declaração de resolução nativa da imagem. O renderer usa `naturalWidth` e `naturalHeight` para converter o recorte da câmera, sem esticar a proporção 4:3, usar miniaturas ou criar uma versão reduzida em canvas. O build copia o PNG byte a byte. O manifesto `assets/loguetown/harbor-city/provenance.json` registra origem, dimensões e SHA-256.

Os arquivos anteriores continuam intactos: `assets/exported-maps/loguetown/map.png`, `assets/world-maps/loguetown.png` e `assets/ui/voyage-hd/loguetown.png`. As capas de viagem e de grupo continuam usando a imagem existente. A pintura nova não recebe sobreposição dos sprites de cenário antigos.

## Navegação e encontros

`loguetown-map-data.js` fornece a mesma geometria para navegador, auditor e servidor: piso caminhável em malha de 16 unidades, bases físicas dos obstáculos, silhuetas de profundidade, objetivos e oito posições de patrulha. A cobertura visual inclui o mar; isso não torna a água caminhável.

A chegada fica no cais central em **(2048, 2736)**. O retorno ao porto fica em **(2048, 2856)**, com raio de interação 48. Os quatro setores persistidos continuam `cais`, `avenida`, `praca` e `jardins`; cada um conserva dois slots de encontro. O acesso permanece no nível 36, a faixa recomendada em 36–40 e os oito inimigos continuam Marinheiros de nível 40. O trabalho não altera seus atributos, recompensas, loot ou tempos de respawn.

## Compatibilidade de progresso

A migração `0067_loguetown_hd_map.sql` reconhece a assinatura world da versão anterior. Apenas jogadores que estavam em Loguetown são reposicionados no cais, com a rota antiga encerrada. Personagens nos outros mapas mantêm coordenadas, movimento e relógios; assinaturas desconhecidas não são promovidas.

No motor de batalha, os encontros são reancorados pelos IDs persistidos, conservando identidade, HP, estado vivo/morto, respawns e progresso. Ataques que ainda dependiam da geometria antiga de Loguetown são cancelados. O mesmo tratamento alcança as salas de grupo e seus encontros extras, inclusive quando uma projeção pessoal já foi atualizada e a sala ainda contém as posições antigas.

## Verificação focada

- `tests/loguetown-layout.test.cjs`: arte preservada, entrada, oito encontros e navegação cliente/servidor.
- `tests/loguetown-scene-compat.test.cjs`: promoção de versões, respawns, mortos/feridos e salas de grupo.
- `tests/integration/server-loguetown-scene.test.mts`: migração PostgreSQL real, viagem e projeções compartilhadas.
- `tests/loguetown_layout_browser.cjs`: textura efetivamente servida, desktop/celular, caminhada, profundidade, combate, save/reload e retorno clicado.
- `node tools/audit_maps.cjs --map loguetown --full`: conectividade e rotas do cenário real.
- `.github/workflows/loguetown.yml`: build, navegador e persistência focados neste destino.
