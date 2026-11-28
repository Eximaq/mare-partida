# Cidade das Conchas — base da Marinha em HD

O destino `conchas` usa uma nova pintura de Shells Town, com o quartel da
153ª base da Marinha, pátio aberto e Zoro preso por cordas à cruz de madeira.
A área persistida continua `swamp`. A integração faz parte do PR #394,
mantido em rascunho, sem merge ou publicação em Pages nesta entrega.

## Direção visual e referências

O quartel ocupa o norte, com torres arredondadas brancas, faixas verdes,
emblema e inscrição MARINE. O pátio concentra o espaço de circulação e combate.
Zoro aparece com cabelo verde, camiseta branca, faixa verde, calça escura e
botas, com os braços presos à travessa por cordas. O portão aberto liga o pátio
à rua central, à frente das casas e ao píer. A disposição é uma adaptação
original para o jogo, não uma planta canônica.

Referências pesquisadas na web:

- [Bandai Channel — episódio 2](https://www.b-ch.com/titles/2992/002):
  sinopse oficial do encontro com Zoro preso no interior da base de Shells Town.
- [ONE PIECE oficial — episódio 2](https://one-piece.com/anime/2/index.html):
  referência narrativa do início da aventura em Shells Town.
- [Panorama do anime, preservado no OPwiki](https://opwiki.org/images/Shellstown_1.PNG):
  referência visual das torres arredondadas, faixas e arquitetura militar.
- [PlayStation Blog — Pirate Warriors 3](https://blog.ja.playstation.com/?p=7800):
  referência de adaptação da cena de Zoro preso para um jogo.

A pintura foi gerada em uma única imagem. Os arquivos externos de referência
não são distribuídos no repositório.

## Arte original e renderização

`assets/conchas-marine/shells-town/scene-hd.png` contém o PNG original de
**1448 × 1086 pixels**, RGB, **3.900.453 bytes**. SHA-256:
`0235c4a409343995680574bf8c71cc9204548e388a910c4575ff3e57738298ed`.

A geração solicitou 3072 × 2304, mas retornou 1448 × 1086. O arquivo foi copiado
byte a byte, sem ampliação artificial, redução ou recompressão. O mundo mede
**3072 × 2304 unidades de jogo**; essas unidades não são pixels nativos.
Prompt, referências, procedência e registro do asset acompanham o PNG.

`conchas-marine-world.js` recorta a fonte integral para a câmera. As silhuetas
de profundidade usam a mesma imagem, com nearest-neighbor e sem reconstruir
o cenário a partir de tiles. Zoro é um marco visual estático do cenário;
não foi adicionado um NPC, missão ou novo encontro de combate.

As imagens anteriores permanecem intactas: exportação de Conchas, projeção
PixelLab, foreground, capa de viagem, objetos e sprites de Helmeppo. A origem
PixelLab continua documentada em `CIDADE-DAS-CONCHAS-PIXELLAB.md`.

## Piso, colisão e navegação

`conchas-marine-map-data.js` fornece a mesma geometria ao navegador e ao
servidor: dois polígonos de piso, 28 silhuetas e 46 bases físicas. O pátio,
portão, rua central, passeio do cais e píer formam um componente conectado.
Água, face do cais, fundações e muros não são caminháveis. A base do poste e
os pés de Zoro bloqueiam movimento; há caminhos pelos dois lados.

| Ponto | Coordenadas do mundo |
| --- | --- |
| Chegada | 1536, 1968 |
| Retorno ao porto | 1536, 2112 — raio 48 |
| Tamanho do mundo | 3072 × 2304 |

Os quatro IDs persistentes de setor são mantidos: `areia-sul`,
`caminho-central`, `ruas-do-porto` e `praca-das-conchas`. Seus nomes visuais
acompanham a nova composição. Permanecem os oito IDs de encontro,
**Helmeppo Nv. 8**, acesso no **Nv. 5**, recomendação **5–10** e ausência de
chefe. Atributos, animações, loot, recompensas, respawns e progresso de caçada
não foram alterados.

Os módulos novos estão conectados aos entrypoints web, ao catálogo
autoritativo, ao auditor, ao build estático e ao contexto Docker.

## Saves individuais e grupos

A migração aditiva **0073** reconhece a assinatura anterior de mundo
`f2308876d37a9ae02a349952b87bada6fd2c015db8b9ac266b37c3031a2e604b`.
A assinatura final é
`63d94786300959c580ea26f0f895af50879ce7b4c65735bc3412ecae6dfaee8b`.
Apenas personagens de `conchas` com essa assinatura são recolocados na
chegada. Outros mapas preservam posição, direção, rota, velocidade e relógios.
Assinaturas desconhecidas não são promovidas. Repetir a migração não desloca
o jogador novamente.

A compatibilidade de combate reconhece a assinatura anterior
`b936a87dc26fa164f795e1b77931888790932a37a27acdeb36c3b62152546c07` e a cadeia de
versões já suportada. Encontros são reancorados pelos IDs existentes, incluindo
os extras de grupo. HP, mortos, cadáveres, respawns, progresso e recibos de
recompensa permanecem preservados. Ações dependentes da posição antiga são
encerradas apenas em `swamp`. A leitura individual, as projeções em lote e o
worker de grupo usam a geometria atual, inclusive quando a assinatura pessoal
já foi promovida e a sala compartilhada ainda é antiga.
A assinatura final de combate é
`65190d0d471d444bab81b8c46ded2948934fddb0dce0ea72820c91462f949e80`.

## Verificação

- Layout, colisão, preservação PixelLab, contratos Conchas e profundidade:
  **9/9 testes aprovados**.
- Auditor: **44/44 rotas**, um componente caminhável, nenhum collider inválido
  ou duplicado.
- Compatibilidade de combate Conchas: **3/3 testes aprovados**.
- Compatibilidade dos oito mapas: **25/25 testes aprovados**.
- PostgreSQL real: **30/30 testes aprovados**, mais **1/1** da cadeia foundation.
- Navegador real: **1366 × 768 / DPR 1** e **393 × 852 / DPR 2**, com viagem
  pela UI, quatro setores, oito encontros, combate, save/reload e retorno clicado.
- Fonte PNG servida byte a byte; três recortes de 22.080 pixels com diferença zero.
- Profundidade de Zoro: **1.936 pixels** cobertos atrás, zero à frente.
- Nenhum erro de página ou asset pertinente ausente. Build estático,
  build TypeScript, typecheck, sintaxe e diff check aprovados.

A revisão independente detectou água caminhável na fonte **(617, 1020)**,
entre o poste e as tábuas. O contorno final do píer usa x632–816 entre
y962–1072; a regressão bloqueia essa água e percorre continuamente os dois
lados das tábuas, o passeio e o portão, em cliente, servidor e navegador.

O primeiro marcador de retorno, em y2224, caía sob a barra de habilidades no
desktop. A posição final y2112 fica sobre as tábuas e aparece no canvas em
**(683, 576)**, com aproximação central; o clique retornou em 12 passos.
No celular, a aproximação pela lateral do mesmo píer expõe o marcador em
**(260, 660)** e o clique retorna em 15 passos. O HUD móvel existente ocupa
parte relevante da tela; não foram alterados HUD, câmera ou escala para o teste.

O harness aguarda as poses desenhadas. As duas falhas conhecidas de preparação
attack/skill south do avatar padrão continuam registradas; as poses utilizadas
nas capturas ficaram prontas. O pipeline do personagem não foi alterado.

`npm test` terminou com **247/251 testes foundation aprovados**, mantendo as
mesmas quatro falhas preexistentes já reproduzidas antes desta entrega:

- `current-game-catalog.test.mts`: contagem do catálogo 229 versus 189.
- `docker-context.test.mts`: dois casos, `sword-compendium.js` excluído e
  `daily-sword-boss-specials.json` ausente do contexto.
- `visual-completo.test.mts`: expectativa anterior de item/visual.

O comando para antes da suíte legada inteira; os testes focados acima e a
cadeia de migração foram executados com as assinaturas finais.

O workflow `conchas-marine.yml` executa a navegação, a compatibilidade, o
build estático, o percurso de navegador desktop/celular e os testes de
persistência PostgreSQL. O teste histórico do forte continua validando a
geometria original, capturada antes da instalação do novo mapa.
