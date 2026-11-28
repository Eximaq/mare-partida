# Parque Arlong — cenário HD

O destino `arlong` usa uma pintura inédita do complexo costeiro de Arlong Park: pagode com sete telhados, motivos de tubarão, torres, muralhas, palmeiras, pátio claro, dois canais e cais central. A composição foi criada após pesquisa das vistas oficiais de [Arlong Park A](https://opbr-en.bn-ent.net/stage/detail/0015.html) e [Arlong Park B](https://opbr-en.bn-ent.net/stage/detail/0016.html), da Bandai Namco. As imagens de referência não integram os arquivos do jogo.

## Arte e resolução

| Item | Contrato |
| --- | --- |
| Textura do cenário | `assets/arlong-park/shark-palace/scene-hd.png` |
| Resolução nativa | 1448 × 1086 pixels |
| Coordenadas do mundo | 3072 × 2304 unidades, na mesma proporção 4:3 |
| Tratamento do arquivo | PNG original copiado byte a byte, sem redução ou recompressão |
| Renderização | Recorte proporcional da fonte completa; suavização de alta qualidade somente no cenário |
| Profundidade | 21 silhuetas poligonais da própria pintura e 23 bases físicas |

As unidades do mundo definem distâncias e colisões; não são uma declaração de resolução da pintura. O renderer usa as dimensões reais da imagem, sem miniatura intermediária. Os sprites do personagem conservam suas regras de renderização.

O cenário novo tem caminho próprio. Permanecem intactos `assets/new-islands/arlong-map.png`, `assets/exported-maps/arlong/map.png`, `assets/ui/voyage-hd/arlong.png` e `assets/ui/boss-dungeons/portraits/arlong.png`. A capa de viagem e o retrato do chefe continuam selecionando os arquivos existentes. Origem, prompt, referências e hashes estão junto ao cenário em `provenance.json`, `generation-prompt.txt` e `asset-register.csv`.

## Navegação e encontros

`arlong-map-data.js` fornece piso, água, bases, silhuetas, setores, encontros e objetivos à mesma navegação usada pelo navegador e servidor. A malha tem células de 16 unidades. A cobertura visual contém o mar, enquanto a malha caminhável bloqueia água, exterior, muros e bases das construções.

A chegada fica no cais em **(1536, 2080)** e o retorno ao porto em **(1536, 2208)**, com raio 48. A distância entre eles evita ativar o retorno ao entrar. A avenida central liga o cais ao palácio; a travessa sul e o pátio unem as alas ao redor das duas piscinas.

Continuam os quatro setores `entrada`, `ala-oeste`, `ala-leste` e `palacio`, com os mesmos oito IDs de encontro. O acesso permanece no nível 31, a recomendação em 31–35 e Kuroobi/Chew no nível 33. A integração não altera atributos, loot, recompensas ou duração dos respawns.

## Compatibilidade de progresso

A migração `0068_arlong_park_hd_map.sql` reconhece a assinatura world anterior do PR #394. Reposiciona somente jogadores que estavam em Arlong e encerra suas rotas antigas. Os demais mapas mantêm coordenadas, direção, caminho e relógios. A operação é idempotente; assinaturas desconhecidas não são promovidas.

O motor reancora os inimigos pelos IDs persistidos, conservando HP, estado vivo/morto, respawns e caçadas. Cancela os ataques espaciais da antiga geometria de Arlong. A projeção e o worker das salas de grupo aplicam a mesma compatibilidade, inclusive aos encontros extras e ao caso em que a batalha pessoal já foi promovida. XP, inventários e recibos não são regravados pela mudança do mapa.

## Verificação

- `tests/arlong-park-layout.test.cjs`: imagens preservadas, chegada, IDs/níveis, rotas reais nos dois navegadores, água/muros, combate na avenida e PNG integral.
- `tests/arlong-scene-compat.test.cjs`: promoção das versões antigas, inimigos feridos/mortos e respawns preservados.
- `tests/integration/server-arlong-scene.test.mts`: PostgreSQL real, idempotência, viagens e projeções de salas individuais/em lote.
- `tests/arlong_park_browser.cjs`: entrada pelo catálogo, quatro setores, renderização/profundidade, combate, save/reload e retorno clicado em desktop e celular.
- `node tools/audit_maps.cjs --map arlong --full`: 42 rotas, um componente navegável, sem colisões inválidas ou duplicadas.
- `.github/workflows/arlong-park.yml`: integração, build estático e navegador focados neste destino.

O comando global `npm test` também expõe falhas preexistentes da fundação em catálogo de itens, contexto Docker e Visual Completo. O resultado dos checks específicos de Arlong deve ser distinguido desse estado da base. O PR permanece em rascunho, sem merge ou publicação em Pages por esta tarefa.
