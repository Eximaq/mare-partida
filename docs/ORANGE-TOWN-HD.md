# Orange Town — porto, loja de Chouchou e praça em HD

Orange Town usa uma nova pintura em `assets/orange-town/port-town/scene-hd.png`. A viagem continua com o identificador `orange-town`; o mapa e a área persistida continuam `orange`. A integração pertence ao PR #394 e não realiza merge.

## Arte e referências

A pintura tem **1448 × 1086 pixels nativos**, PNG RGB, 3.837.016 bytes. O mundo mede **3072 × 2304 unidades de jogo**. Essas unidades não representam uma segunda imagem nem uma ampliação gravada: a renderização recorta o PNG original com nearest-neighbor. O arquivo gerado foi copiado byte a byte, sem recompressão ou retoque posterior.

SHA-256 da imagem:

`7ad098491f8effe3190f6cdb7e9bc342891c5f4590dc9542b4c55d7674a52826`

A direção visual usa casas claras com telhados inclinados, ruas de pedra, a loja **PET FOOD** com Chouchou pequeno junto à porta e a ocupação de Buggy em um terraço com bandeira, canhão e tenda. A fonte de peixe, as ruas em laços e a distribuição dos armazéns são uma adaptação jogável original. O bairro superior tem acesso por uma escadaria; o parque cercado não ganha uma entrada que a pintura não mostra.

Referências consultadas:

- [ONE PIECE oficial — episódio 5](https://one-piece.com/anime/5/index.html): contexto de Orange Town e Buggy.
- [Toei — localidades de One Piece](https://www.toei-anim.co.jp/tv/onep/character/category.html): cidade portuária no arco inicial.
- [Bandai Channel — episódio 6](https://www.b-ch.com/titles/2992/006): Chouchou protege a loja de seu antigo dono.
- [OPwiki — Orgel-Insel](https://opwiki.org/wiki/Orgel-Insel): conferência dos estabelecimentos e do terraço ocupado pelos piratas.
- [Panorama do anime reproduzido em fonte secundária](https://one-piece-shop.fr/wp-content/uploads/2021/12/Orange_Town_Anime_Infobox-990x557.png): referência visual inspecionada para fachadas, telhados, ruas e pequena tenda no terraço.

O prompt, as dimensões retornadas e a proveniência ficam junto da imagem. Nenhuma imagem de referência externa foi distribuída. As imagens antigas de Orange Town, a capa de viagem e os sprites permanecem intactos.

## Geometria e encontros

`orange-town-map-data.js` define o piso, as bases físicas, os recortes de oclusão, os materiais dos passos e os pontos de navegação. `orange-town-world.js` desenha a imagem original e suas silhuetas. O cliente e o servidor recebem a mesma geometria por `world-map-exports.js`.

| Setor persistido | Local na nova pintura | Encontros preservados |
| --- | --- | --- |
| `cais` | Cais de Orange Town | Mr. 3 e Cabaji |
| `rua` | Rua de Chouchou | Mr. 3 e Cabaji |
| `praca` | Praça da Fonte | Mr. 3 e Cabaji |
| `armazens` | Armazéns do Porto | Mr. 3 e Cabaji |
| `jardins` | Jardim do Bairro Alto | Mr. 3 e Cabaji |

Os dez IDs seguem `orange-<setor>-0/1`, com Mr. 3 no índice 0 e Cabaji no índice 1, ambos no nível 13. Não foi acrescentado um chefe. O acesso permanece no nível 11 e a recomendação continua 11–15. A escolha dos inimigos preserva o jogo existente; não é uma alegação sobre os personagens presentes no arco original.

A chegada é **(1536, 1712)**, no cais de pedra. O retorno é **(1536, 1984)**, com raio 48, no píer de madeira. A separação evita retorno imediato ao desembarcar. O piso termina antes da água, das faces do cais e das cordas na ponta do píer. A fonte, as fachadas, as cargas e os barris têm bases sólidas; a rua de cima se conecta pela escada central.

Os passos consultam `MareOrangeTownLayout.surfaceAt(x,y)`: madeira no píer, cimento nas ruas de pedra e nenhum material sobre água ou bases sólidas. A tabela histórica de terrenos continua como fallback do renderer antigo, sem substituir os materiais da pintura atual.

## Saves e servidor

A migração `0074_orange_town_hd_map.sql` reconhece a assinatura anterior do mundo, reposiciona somente personagens salvos em Orange Town para a nova chegada e atualiza a assinatura. Ela não reinicia caçadas, recompensas, inventário ou progresso. A execução repetida não reposiciona novamente personagens já migrados.

A compatibilidade em `world-battle.cjs` mantém IDs, tipos, nível, HP, mortos, relógios de respawn e progresso, e troca apenas as âncoras espaciais de Orange Town. Ações que dependiam das posições antigas são canceladas. As projeções de leitura e o worker de grupos tratam também as salas compartilhadas e seus encontros extras. As migrações anteriores permanecem imutáveis.

Assinaturas após a integração:

- Mundo: `75d653917517f14b56910244d1ff104bba0c736b5d90f0c2fa6dd40be53f8604`.
- Batalha: `c91ad59190d5a25a2214bf4c79f3f50e4e76b84dc8050f5044ee43dbf4132518`.

## Verificação

O gate dedicado está em `.github/workflows/orange-town.yml`. Ele executa os testes de layout, arte histórica, áudio, compatibilidade, navegador e migração PostgreSQL. O harness `tests/orange_town_browser.cjs` usa a versão estática servida, viaja pela interface e verifica navegação, combate, retorno, save/reload, profundidade e pixels do PNG em computador e celular.

Os browsers e capturas históricos continuam exercitando suas versões antigas; não foram reescritos para fingir que os antigos mapas tinham a nova geometria.

Resultados observados na integração:

| Verificação | Resultado |
| --- | --- |
| Layout, destinos exatos e materiais de Orange Town | 3/3 |
| Arte histórica, áudio, fontes PixelLab e profundidade | 8/8 |
| Auditoria de rotas | 52/52; um único componente de piso |
| Compatibilidade das nove cenas | 28/28 |
| PostgreSQL das cenas e consumidores históricos | 33/33 |
| Cadeia de migrações | 1/1 |
| Build, typecheck e versão estática | Aprovados |
| Navegador desktop 1366 × 768 e celular 393 × 852, DPR 2 | Viagem, cinco setores, combate, save/reload e retorno aprovados |

Três recortes de câmera, com 22.080 pixels cada, coincidiram exatamente com os pixels esperados da pintura. A fonte cobriu 1.074 pixels do herói na posição atrás e nenhum na posição dianteira. A passagem real registrou as três variantes de passos de cimento e as três de madeira. Não houve erro de página nem arquivo ausente no gate.

O `npm test` amplo terminou com **247/251** na foundation, nas mesmas quatro falhas já existentes antes deste mapa: expectativa antiga de 189 itens frente a 229; exclusão de `sword-compendium.js` no contexto Docker; ausência de `daily-sword-boss-specials.json` no mesmo contexto; e expectativa antiga de inventário em `visual-completo.test.mts`. O comando interrompe nessa etapa, antes da suíte legada. Esses problemas não foram alterados pelo trabalho de Orange Town.
