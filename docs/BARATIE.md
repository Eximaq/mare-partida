# Baratie — restaurante flutuante HD

O destino `baratie` usa uma pintura inédita do restaurante navio de One Piece. O casco verde em forma de peixe, a proa com boca e olhos, a cauda, os telhados vermelhos e as velas amarelas/brancas identificam o local. O salão e a cozinha aparecem em corte, com o piso visível, ligados ao convés e às duas plataformas laterais de combate. A passarela central termina em um pequeno desembarque cercado pelo mar.

A pesquisa consultou o [Baratie Stage de ONE PIECE Bounty Rush, da Bandai Namco](https://opbr-en.bn-ent.net/stage/detail/0017.html) e a [página oficial do Baratie](https://live-action.onepiece-base.com/location/baratie/). A primeira inclui vistas de combate e destroços; a composição criada para o jogo representa o restaurante intacto. A paleta e a silhueta do anime também foram conferidas em [uma reprodução do exterior](https://gamek.vn/7-nha-hang-doc-dao-va-hap-dan-nhat-trong-the-gioi-manga-anime-20180516163717928.chn). As referências externas não são distribuídas com o jogo.

## Fonte e renderização

| Item | Contrato |
| --- | --- |
| Nova textura | `assets/baratie/floating-restaurant/scene-hd.png` |
| Resolução nativa | 1448 × 1086 pixels |
| Mundo | 3072 × 2304 unidades, mesma proporção 4:3 |
| Tratamento | PNG original copiado byte a byte, sem redução ou recompressão |
| Renderização | Recortes proporcionais da fonte completa; suavização de alta qualidade restrita ao cenário |
| Geometria | Oito áreas de piso, 33 silhuetas e 48 bases físicas |

As dimensões do mundo definem as distâncias do jogo; não declaram a resolução nativa da imagem. `baratie-world.js` usa a imagem original para o chão e para as silhuetas, sem miniatura intermediária e sem sobrepor sprites antigos do restaurante. As regras visuais dos personagens permanecem iguais.

Continuam idênticos `assets/new-islands/baratie-map.png`, `assets/exported-maps/baratie/map.png` e `assets/ui/voyage-hd/baratie.png`. A capa de viagem mantém seu caminho atual. O prompt, as fontes, a origem e os hashes ficam junto da nova pintura em `generation-prompt.txt`, `provenance.json` e `asset-register.csv`.

## Navegação e encontros

`baratie-map-data.js` fornece o mesmo piso, obstáculos, pontos de chegada, setores e encontros ao navegador e ao catálogo autoritativo. A navegação usa células de 16 unidades. A cobertura visual inclui a água; a área caminhável termina nas bordas do convés, das plataformas e do desembarque. Mesas, paredes, fogão, balcões, caixas e postes têm bases sólidas. As aberturas do salão e da cozinha, o corredor central e a passarela ficam livres.

A chegada é **(1536, 1952)**; o retorno ao porto é **(1536, 2112)**, com raio 48. A separação evita retornar automaticamente ao chegar. Os dois postes com luminárias têm chão acessível atrás e à frente, permitindo verificar a oclusão do personagem no próprio jogo.

São preservados o acesso no nível 26, a recomendação 26–30, Gin e Pearl no nível 28 e os oito IDs de encontro. Os quatro setores persistidos continuam `entrada`, `salão`, `convés` e `cozinha`, incluindo os acentos. Não mudam atributos, loot, recompensas, tempo de respawn ou progresso das caçadas.

## Saves e servidor

A migração `0069_baratie_hd_map.sql` reconhece a assinatura do mundo após a integração de Arlong no PR #394. Somente personagens que estavam em Baratie são movidos à nova chegada e têm a rota espacial anterior encerrada. Outros destinos conservam posição, direção, caminho e relógios. A migração é idempotente e não promove assinaturas desconhecidas.

O motor atualiza as âncoras pelos IDs existentes. HP, mortos, respawns, caçadas e encontros extras de grupo são preservados; ataques dependentes da geometria anterior de Baratie são cancelados. A projeção e o worker aplicam a compatibilidade também à sala compartilhada, inclusive quando a assinatura da batalha pessoal já foi atualizada. As cadeias anteriores de Arlong, Loguetown e Skypiea continuam reconhecidas. XP, itens e recibos não são regravados por essa alteração de mapa.

Os scripts participam do navegador, build estático, catálogo, assinaturas de combate, contexto Docker e auditor de mapas.

## Verificação focada

- `tests/baratie-layout.test.cjs`: preservação das imagens, acesso, IDs acentuados, encontros, rotas reais, água, móveis, portas abertas e PNG original.
- `tests/baratie-scene-compat.test.cjs`: assinaturas anteriores, reancoragem dos encontros e preservação de estados de combate.
- `tests/integration/server-baratie-scene.test.mts`: PostgreSQL real, migração idempotente, viagem e projeções individuais/em lote das salas.
- `tests/baratie_browser.cjs`: viagem pelo catálogo, caminhada pelos quatro setores, imagem servida, recortes da câmera, oclusão, combate, save/reload e retorno clicado em computador e celular.
- `node tools/audit_maps.cjs --map baratie --full`: conectividade e colisões da geometria efetivamente carregada.
- `.github/workflows/baratie.yml`: build e verificações específicas deste destino.

Os checks globais da branch já apresentam falhas conhecidas de catálogo, contexto Docker, Visual Completo e partes do legado. A verificação de Baratie deve ser distinguida dessas falhas anteriores. Esta entrega integra o mesmo PR #394 e o mantém em rascunho, sem merge ou publicação em Pages.
