# Ilha dos Animais Raros — cenário HD

O destino `animais-raros` do Arquipélago continua levando à área e ao mapa `rare`. O cenário agora usa uma pintura inédita da ilha de Gaimon: floresta tropical, clareiras, palmeiras, árvore antiga, um grande rochedo com cinco baús vazios no topo e uma enseada com pequeno desembarque de madeira ao sul.

A pesquisa consultou o [episódio 18 no site oficial de ONE PIECE](https://one-piece.com/anime/18/index.html), a [descrição geográfica da ilha](https://onepiece.fandom.com/wiki/Island_of_Rare_Animals) e imagens do anime para as falésias, a vegetação e o desembarque. Os links completos ficam em `provenance.json`. A disposição é uma adaptação jogável original; as referências externas não são distribuídas no repositório. Os baús no topo são cenário, sem nova interação ou recompensa. Os Cocox continuam sendo sprites separados.

## Arte e renderização

| Item | Contrato |
| --- | --- |
| Nova textura | `assets/rare-animals/gaimon-island/scene-hd.png` |
| Resolução nativa real | 1447 × 1087 pixels |
| Mundo | 3072 × 2304 unidades de jogo |
| Tratamento da fonte | Cópia byte a byte do PNG original, sem redução ou recompressão |
| Geometria | Duas áreas de piso, uma exclusão do rochedo, 21 silhuetas e 25 bases físicas |
| Malha | Células de 16 unidades, compartilhadas por cliente e servidor |

O gerador recebeu o pedido de 1448 × 1086, mas retornou um PNG de 1447 × 1087. A integração usa o cabeçalho real: coordenadas e recortes têm fatores independentes `3072/1447` e `2304/1087`. As dimensões do mundo não representam pixels nativos. Não há versão reduzida da pintura no caminho de renderização.

`rare-animals-world.js` recorta diretamente a fonte completa, com suavização de alta qualidade restrita ao cenário. As silhuetas usam os mesmos pixels da pintura. Personagens e monstros conservam suas regras de renderização. A arte anterior `assets/new-islands/rare-map.png`, a capa `assets/ui/voyage-hd/animais-raros.png` e todos os sprites existentes permanecem intactos. Prompt, origem e hashes acompanham a nova pintura. As folhas históricas dos Cocox foram extraídas do personagem PixelLab `71a074a4-26d7-4f04-9be5-a1dd05fdf3c3`; permanecem no repositório com seus frames originais. Esta integração não gera novas animações do monstro.

## Navegação e encontros

`rare-animals-map-data.js` fornece a geometria efetiva a `MareMapExports`. A chegada é **(1504, 1952)**; o retorno é **(1504, 2112)**, com raio 48. A separação permite desembarcar sem acionar a saída. O clique usa o retorno do mapa instalado, substituindo a consulta às coordenadas legadas de `MareRare`.

O piso acompanha as clareiras, as trilhas dos dois lados do rochedo, a areia seca e o píer. Mar, faces das falésias, mata periférica fechada, raízes, troncos e pedras são bloqueados. O rochedo inteiro, inclusive seu topo gramado, fica fora do piso para impedir que um clique sobre os baús atravesse a parede. A cobertura visual continua incluindo essas partes do cenário.

Os quatro setores persistidos são `entrada`, `subbosque`, `mata-fechada` e `copa-antiga`. Permanecem o acesso no nível 16, a recomendação 16–20 e os oito Cocox de nível 18. Seus IDs, atributos, loot, recompensas, respawns e progresso de caça não mudam. `rare-renderer.js` continua fornecendo o hitbox e a altura da barra de vida dos Cocox; suas imagens e animações não foram substituídas.

No viewport móvel de 393 × 852, o botão existente com o nome da ilha pode cobrir o centro do marcador de retorno quando a câmera está alinhada ao píer. A checagem de clique usa uma caminhada real até **(1440, 2016)**, ainda sobre a madeira: isso expõe o marcador ao lado do botão e permite retornar normalmente. O HUD, a câmera e as coordenadas do retorno não são modificados por essa verificação.

## Persistência

A migração `0071_rare_island_hd_map.sql` reconhece a assinatura posterior à Vila Syrup no PR #394, reposiciona apenas personagens em `rare` e encerra a rota espacial antiga. Outros mapas preservam coordenadas, direção, velocidade, caminhos e relógios. A operação é idempotente e não promove assinaturas desconhecidas.

A compatibilidade de batalha reancora os encontros pelos IDs existentes, incluindo extras de grupo, e preserva HP, mortos, cadáveres, prazos de respawn, caçadas e recibos. Ações ligadas à geometria antiga de Rare são encerradas. Projeções individuais, leituras em lote e o worker da sala canônica também reconhecem a atualização quando a assinatura pessoal já foi promovida. As cadeias anteriores de Syrup, Baratie, Arlong, Loguetown e Skypiea permanecem reconhecidas.

## Verificação

- `tests/rare-island-layout.test.cjs`: imagens intactas, dimensões nativas reais, acesso, IDs, níveis, navegação com movimento real, chão/água, topo inacessível e contornos das árvores.
- `tests/rare-world.test.cjs`: metadados e arte antiga preservados, chegada e clareiras do novo mapa, regras do Cocox e folhas originais.
- `tests/rare-scene-compat.test.cjs`: assinaturas, encontros individuais e extras de grupo preservados.
- `tests/integration/server-rare-scene.test.mts`: PostgreSQL real, migração idempotente, viagem `animais-raros`, sala `rare`, projeções e worker.
- `tests/rare_island_browser.cjs`: catálogo, quatro setores, fonte integral, recortes, profundidade real, clique no Cocox, combate, save/reload e retorno clicado no computador e celular.
- `node tools/audit_maps.cjs --map rare --full`: conectividade e integridade dos colisores.
- `.github/workflows/rare-island.yml`: build e verificações focadas no destino.

As falhas gerais preexistentes em catálogo, contexto Docker, Visual Completo e partes do legado são registradas na descrição do PR. Esta integração permanece no PR #394 em rascunho, sem merge ou publicação em Pages.
