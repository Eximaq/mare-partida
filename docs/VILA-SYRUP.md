# Vila Syrup — cenário costeiro HD

O destino `syrup` usa uma pintura inédita da vila rural de Usopp, com casas claras, telhados de palha e telha, caminhos de terra, bosque e falésias. A mansão de Kaya, com telhado azul, domina a parte norte; seu jardim tem uma entrada aberta para a praça. A estrada do sul passa entre duas faces rochosas e chega à enseada e ao píer.

A pesquisa consultou a [página oficial de Syrup Village](https://live-action.onepiece-base.com/location/syrup-village/), a [descrição geográfica de Gecko Island no OPwiki, com referências aos capítulos](https://opwiki.org/wiki/Gecko-Insel), e um [panorama do anime](https://cdn.shopify.com/s/files/1/0770/3425/8763/files/village_sirop_usopp_one_piece.jpg?v=1701946289). A composição prioriza a vila rural do anime; a versão live action foi usada como referência secundária da propriedade de Kaya. A disposição jogável é uma adaptação original, não uma reprodução exata da planta canônica. As imagens externas não são distribuídas com o jogo.

## Arte e renderização

| Item | Contrato |
| --- | --- |
| Nova textura | `assets/syrup-village/coastal-village/scene-hd.png` |
| Resolução nativa | 1448 × 1086 pixels |
| Mundo | 3072 × 2304 unidades, mesma proporção 4:3 |
| Tratamento | PNG original copiado byte a byte, sem redução ou recompressão |
| Renderização | Recortes da fonte completa; suavização de alta qualidade restrita ao cenário |
| Geometria | Cinco áreas de piso, 34 silhuetas e 41 bases físicas |

As dimensões do mundo representam distâncias do jogo, não a quantidade de pixels da imagem. `syrup-world.js` recorta diretamente a fonte original para o chão e as silhuetas. Não há miniatura intermediária nem sprites antigos do cenário sobrepostos à pintura. Os personagens mantêm suas regras de renderização.

Os arquivos `assets/new-islands/syrup-map.png`, `assets/exported-maps/syrup/map.png` e `assets/ui/voyage-hd/syrup.png` permanecem idênticos. A capa de viagem conserva seu caminho. Prompt, origem, referências e hashes estão junto da nova pintura em `generation-prompt.txt`, `provenance.json` e `asset-register.csv`.

## Navegação e encontros

`syrup-map-data.js` fornece a mesma geometria ao navegador e ao servidor: piso, fundações, silhuetas, chegada, retorno, setores e encontros. A malha tem células de 16 unidades. A cobertura visual inclui a água e as faces das falésias; a navegação permite apenas o platô da vila, a passagem entre casas, o jardim, a estrada/enseada e o píer. Casas, muros, postes, cercas, poço e troncos têm bases sólidas. As copas e telhados usam oclusão separada dessas bases.

A chegada é **(1504, 1952)**; o retorno ao porto é **(1504, 2112)**, com raio 48. A separação evita retornar automaticamente ao chegar. A estrada liga o píer à vila baixa, à praça, ao bosque e ao portão aberto de Kaya. O jardim, as duas margens do portão e os caminhos em torno do carvalho também são exploráveis.

Continuam o acesso no nível 21, a recomendação 21–25, Sham/Buchi no nível 23 e os oito IDs de encontro. Os setores persistidos são `entrada`, `vila-baixa`, `praça` e `bosque`, preservando o acento de `praça`. Atributos, loot, recompensas, duração dos respawns e progresso de caçadas não mudam.

## Compatibilidade

A migração `0070_syrup_hd_map.sql` reconhece a assinatura do mundo após a integração de Baratie no PR #394. Reposiciona somente personagens que estavam em Syrup e encerra a rota espacial anterior. Os demais destinos conservam coordenadas, direção, caminho e relógios. A operação é idempotente e não promove assinaturas desconhecidas.

O motor reancora inimigos pelos IDs existentes e preserva HP, mortos, respawns e caçadas, inclusive encontros extras de grupo. Ações ligadas à geometria anterior de Syrup são canceladas. A projeção individual, as leituras em lote e o worker também atualizam a sala compartilhada, inclusive quando a assinatura da batalha pessoal já é atual. As cadeias anteriores de Baratie, Arlong, Loguetown e Skypiea continuam reconhecidas; XP, inventários e recibos não são regravados pela mudança do mapa.

## Verificação

- `tests/syrup-village-layout.test.cjs`: imagens intactas, acesso, IDs/níveis, rotas cliente/servidor, mar/falésias, fundações, portão aberto, PNG integral e alvos exatos perto de obstáculos.
- `tests/syrup-boundary.test.cjs`: chegada no novo píer, costa fechada, bases sólidas e movimento que para antes da água. As coordenadas e o hash de objetos da planta substituída foram atualizados; as imagens antigas com suas anotações permanecem preservadas.
- `tests/syrup-scene-compat.test.cjs`: assinaturas anteriores, progresso e encontros de grupo preservados.
- `tests/integration/server-syrup-scene.test.mts`: PostgreSQL real, migração idempotente, viagens e salas individuais/em lote.
- `tests/syrup_village_browser.cjs`: catálogo, quatro setores, imagem integral e recortes, passagens em torno dos pilares/carvalho, profundidade, combate, save/reload e retorno clicado no computador e celular.
- `node tools/audit_maps.cjs --map syrup --full`: conectividade da geometria carregada e integridade das colisões.
- `.github/workflows/syrup-village.yml`: build e verificações focadas neste destino.

As falhas gerais já conhecidas da branch em catálogo, contexto Docker, Visual Completo e partes do legado são registradas separadamente dos checks de Syrup. A entrega permanece no PR #394 em rascunho, sem merge ou publicação em Pages.
