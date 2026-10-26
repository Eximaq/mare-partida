# Akuma no Mi — Lote Zoan Rank E

As três Zoans ampliam o Rank E sem alterar os IDs de Kuku e Beri. Cada fruta mantém `type = akuma_no_mi`, `family = zoan`, o slot exclusivo e a passiva permanente do Compêndio: +0,1% de HP e +0,1% de Força por ID registrado.

| Fruta | Bônus equipado | Habilidade transformado | Recarga |
|---|---|---|---|
| Tori-Tori: Albatroz | +12% velocidade, +5 pontos percentuais de esquiva | 1: Plano de Alta Altitude, +30% velocidade por 5 s e imunidade a armadilhas marcadas como de chão | 14 s |
| Uma-Uma | +15% velocidade terrestre, +3% HP máximo | 2: Arrancada Galopante, até quatro tiles de 64 px, dano físico de 0,55× e empurrão de 45 px no primeiro alvo | 12 s |
| Inu-Inu: Dachshund | +10 pontos percentuais de esquiva, +3% defesa física | 3: Mordida de Calcanhar, salto até 130 px, dano físico de 0,85×, −30% velocidade e −5% defesa do alvo por 3 s | 10 s |

O botão **T** na HUD alterna a forma animal. O servidor persiste a transformação e exige a forma Zoan para validar a habilidade. O cliente conserva o estado no save estático, substitui o paperdoll humano no mundo, retrato e prévias e mantém o ataque básico físico e corpo a corpo. Ao trocar ou retirar a fruta, a forma humana retorna. A recarga é individual por fruta e continua após troca de equipamento e reload.

Plano de Alta Altitude registra a imunidade a avisos classificados como `groundTrap`. Os mapas atuais ainda não possuem armadilhas de chão; golpes em área e telegráficos comuns continuam causando dano. A Arrancada segue a navegação do mapa, então paredes e terreno intransitável interrompem o avanço. A API Python valida direção, alcance e primeiro alvo a partir das posições enviadas pelo protótipo; o combate continua dependente do cliente e não deve ser exposto como servidor público autoritativo.

## Arte

Frutas e ícones de habilidade são PNGs PixelLab nativos de 48×48 e 32×32. A forma animal usa quatro direções de 48×48 com pés ancorados, caminhada e ataque básico próprios em tiras de nove quadros. Os VFX de habilidade usam oito quadros de 48×48 a 12 FPS; o vento do Albatroz acompanha o bônus de cinco segundos, a poeira do Cavalo acompanha a arrancada e a mordida do Dachshund tem três marcas luminosas no alvo. `zoan-art.js` renderiza com `imageSmoothingEnabled = false` no mesmo `requestAnimationFrame` do mapa, retrato e menus. Silhuetas bloqueadas usam a forma animal, enquanto a fruta registrada mostra seu ícone de item.

As referências do proprietário guiaram apenas características gerais: albatroz branco e azul, cavalo castanho terrestre, dachshund caramelo e preto; nenhum personagem, roupa ou composição da referência foi reproduzido. A Uma-Uma recebeu uma fruta nova inspirada no cavalo, pois havia apenas a imagem do animal. As imagens de referência permanecem fora do Git.

PixelLab: Tori fruta `18c57239-f27d-4995-a3a7-d5044a1b6746`, personagem `60ed537a-062d-4bd7-8ade-394bfa4d36f5`, caminhada `2623d6d1-888e-4e41-8141-d79973bade8f`, ataque `1abbf50a-0042-4046-b7ee-6b2e8f4b2561`, ícone `58c96d35-087d-4048-94e5-8add860270a0`, VFX `f877199d-8c2b-429b-b85e-036a363f8b32`; Uma fruta `a4613e1b-61ca-4b9e-8296-4ff04d2f716d`, personagem `19e5d278-f125-4d47-998c-691aaadbcae6`, caminhada `0ce7a070-440a-4707-b3dc-fec0ba7f61b4`, ataque `85202f13-d260-44f2-876e-7650c9fbbb52`, ícone `ef92f816-8b7c-4df8-9109-a9dcc20aa945`, VFX `ef64118b-9861-4462-b513-0d6a895e6cec`; Inu fruta `4dd3a840-ad18-4f31-8cf1-1d1d76b042b8`, personagem `4c66ba23-6946-4060-af9c-11631e0be3c8`, caminhada `21bca5f3-4716-4851-b036-42b05a5895cb`, ataque `e9bf9b4e-0d56-4a11-b129-cdf4872cffd6`, ícone `a27df66a-58c0-40cc-8ceb-1e242759090b`, VFX `cced0728-4837-4d2a-b2d1-49fbbc4bda24`.

Os PNGs de caminhada e ataque são recortes sem interpolação dos quadros gerados pelo PixelLab em canvas ampliado, centralizados pela união da silhueta em cada direção. Os VFX do PixelLab Workbench foram reorganizados em tiras horizontais, sem interpolação. Cada célula final mede exatamente 48×48.

O Dachshund possui margens transparentes diferentes entre idle, caminhada e ataque: nas poses laterais paradas, o último pixel visível fica na linha 38, enquanto a caminhada alcança as linhas 44–46. `zoan-art.js` ajusta a posição vertical por quadro e direção para que as patas permaneçam no ponto do chão usado pelo personagem e sua sombra, inclusive nas prévias. Os arquivos originais e as demais Zoans permanecem inalterados.

## Validação

Executar `node tests/akuma-system.test.cjs`, `python tests/akuma_backend_test.py`, regressões Node pertinentes e `python tools/build_pages.py`. No navegador, conferir registro, silhueta bloqueada, equipamento, T, três atalhos, recarga, ataque básico, caminhada, colisão da Arrancada, lentidão da Mordida, retrato e prévias.

## Transição de forma

O botão T usa a [transição comum Zoan](ZOAN-TRANSICAO.md): explosion-take-2 cobre o personagem, revela a nova forma e desaparece após 1207ms. Também funciona ao retornar à forma humana e nas Zoans dos demais ranks, sem alterar as habilidades.
