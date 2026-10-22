# Paper Doll — continuação por direção (22/10/2026)

## Resultado desta continuação

[Prévia por direção](../pixellab-pip-generations/paper-doll-bento-directions-20261021/preview.html) · [GIF oeste](../pixellab-pip-generations/paper-doll-bento-directions-20261021/modular-west.gif) · [Avaliações](../pixellab-pip-generations/paper-doll-bento-directions-20261021/reviews.json) · [Manifesto](../pixellab-pip-generations/paper-doll-bento-directions-20261021/manifest.json).

O protótipo tem **frente e oeste** com corpo, calças, botas, roupa, cabelo/bandana e espada separados. São16 poses modulares de ataque,8 por direção a12FPS. A frente foi reaproveitada sem nova geração; o GIF frontal foi copiado byte a byte. O oeste usa poses novas guiadas pelas articulações do Bento e peças visíveis originais. Nenhum candidato foi ativado na aventura; todas as peças seguem `approved:false` e dependem de revisão artística.

Norte e leste permanecem com **fallback completo** para a animação original, inclusive quando a ferramenta permite rascunhos. Não se misturam camadas incompletas com o personagem publicado. Os controles de peças ficam desativados nessas vistas; o corpo no quadro central continua disponível como diagnóstico.

## PixelLab, fontes e controles

Foram executadas três chamadas MCP `animate_with_skeleton_v3`, uma por norte/oeste/leste, com8 frames e18 articulações por pose, referências neutras existentes de64×64, `view:high top-down`, `template_id:mannequin`, transparência e seed omitida. Todos os jobs terminaram e cada getter confirmou3 gerações cobradas: **9 nesta etapa**, abaixo do teto anunciado de12, sem retries. A continuação anterior custou13; não confundir esses valores com saldo da conta. Não houve solicitação de overage em dólares nem alteração do auto global.

O norte foi produzido e inspecionado primeiro. A reprovação ficou isolada à oclusão nessa vista; os dois perfis usam referências e articulações independentes, conforme o plano anunciado. Não foi repetida a geração do norte nem expandido o número de chamadas.

Descrição exata: “a bald human male pirate base with a bare torso and arms, plain charcoal shorts, bare feet, empty hands, dark crisp pixel outlines and warm skin shading”. Tradução: base humana masculina careca, torso e braços descobertos, shorts cinza, pés descalços e mãos vazias, com contornos nítidos e pele em tons quentes. A ação enviada foi `attack` (ataque). As imagens de referência, os parâmetros completos, os18 joints, os IDs e o consumo por chamada estão preservados nos manifestos e na receita `directions.blueprint.json`.

Os controles foram medidos manualmente nos corpos de Bento, não nas pontas das armas. As guias do leste que preparei alternavam a altura dos tornozelos entre53/54; isso deveria ter sido detectado antes da geração. O novo preflight offline `tools/paper_doll_motion_controls.py --grounded` sinaliza essa variação sem modificar os pedidos históricos nem gastar créditos. Ele verifica18 joints, coordenadas finitas/normalizadas e altura constante para ataques com pés plantados. Seus testes usam o leste real como caso reprovado. Norte passa nas verificações numéricas, mas foi reprovado visualmente, demonstrando que o preflight não substitui inspeção de anatomia e profundidade. No leste, a pose de índice5 está encoberta pelo clarão original; suas articulações foram inferidas, não apresentadas como anatomia visível recuperada. `east/controls.json` registra essa limitação.

Os recortes das fontes removem somente transparência: `[10,13,74,77]` para o norte e `[10,10,74,74]` nos perfis. A reversibilidade RGBA é verificada contra as células originais84×84. As referências existentes e todos os PNGs gerados permanecem inalterados.

## Alinhamento e profundidade do oeste

O corpo oeste retornou com a linha dos pés em56 nos oito frames nativos. Uma calibração **fixa** de padding10/9 leva todos ao chão65 do rig84/pivô42,65. As peças originais usam padding10/10. Não há correção variável de posição, estabilização por frame, escala ou pintura de anatomia.

A espada usa os oito desenhos nativos do ataque original. Os encaixes recebem pequenas translações por pose para acompanhar a mão do novo corpo; os PNGs da arma não são redesenhados, girados ou distorcidos. As poses de índice2/3/4 desenham a lâmina atrás do corpo, com a empunhadura encoberta. Nessas poses não se inventa um cabo oculto nem se exige contato de pixels que a fonte não mostra. Nos demais frames, o teste auxiliar de pele/arma nas regiões manuais da mão encontrou distância de0–2px. Essa medição é evidência geométrica auxiliar, não aprovação artística.

`compose.py` registra os offsets, a ordem de desenho, os hashes e as posições dos pés. A montagem utiliza o compositor Paper Doll existente sem modificar seu código. Cabelo/bandana, roupa, calças, botas e arma copiam apenas pixels visíveis das fontes originais por seleção de região/paleta e contorno existente. Não são peças completas para qualquer anatomia ou ângulo, e não há reconstrução local de superfícies encobertas.

## Pendências exatas e fallback

| Vista | Pendência | Decisão |
|---|---|---|
| Norte | Corpo: antebraço aparece sobre o dorso nas poses de índice1–5, apesar dos controles de profundidade | Corpo reprovado; sequência original completa |
| Leste | Corpo: linha dos pés67–68 no canvas de inspeção; guias de tornozelo inferidas variam53/54 | Corrigir os controles de altura antes de outro lote; não estabilizar imagens localmente |
| Leste, pose de índice5 | Clarão oculta superfícies de cabelo/bandana, roupa, cintura das calças e arma limpa | Não há pixels suficientes para quatro peças isoladas completas; sequência original completa |
| Todas | Aprovação artística final, continuidade com Idle/Walk e demais categorias de arma | Manter catálogo de produção e saves existentes |

Para finalizar os corpos pendentes, a unidade segura de produção é uma sequência nova de8 frames por vista:16 frames de corpo para norte+leste. Estimativa da mesma rota Skeleton v3:3 gerações por vista,6 no conjunto, sem garantia de resolver a oclusão do norte. Um próximo lote precisa de controles revistos e inspeção sem roupa antes de qualquer continuação. Nenhuma nova chamada foi executada além das três registradas.

No leste também faltam quatro PNGs de peças ajustadas à pose5 (cabelo/bandana, roupa, calças e arma sem clarão), ou um conjunto novo coerente se o corpo mudar. Uma edição ajustada por peça e verificada costuma exigir4 chamadas: estimativa4 gerações com Pixen, com maior risco de deriva; Pro Flash exige consultar capacidades/preço e pode elevar o lote para cerca de20 gerações. Isso é levantamento de produção, não autorização nem promessa de encaixe. Alternativas: obter do artista as camadas originais sem VFX, ou conservar o sprite completo até existir um conjunto real. Copiar a pose vizinha ou cobrir o erro com roupa não foi usado como solução.

## Validação

As auditorias reproduzem padding, fontes, contato auxiliar e GIFs sem chamar PixelLab. GIFs transparentes usam paleta exata, disposal2 e tempos80/90ms somando670ms; cada frame decodificado é comparado ao composto. O Canvas usa12FPS e execução única.

O teste Node verifica orçamento/recibos,18 joints por pose, bloqueio de produção, chão fixo no oeste e fallback atômico nas duas vistas pendentes. Chromium compara os32 quadros de direção, as composições com offsets/profundidade,64 combinações de peças, fallback completo, reprodução, viewport393px, limites de cache e isolamento de save. A validação Chromium passou e as capturas desktop/celular foram inspecionadas, incluindo as vistas de fallback. A validação não aprova a arte final.

Verificação executada: 40 suítes Node (`tests/*.test.cjs`), cinco testes Python das guias de movimento, build estático (`python tools/build_pages.py`) e os testes Chromium frontal e direcional. Todos passaram. Os resultados técnicos não substituem a aprovação artística das peças.

Combate, impactos, movimento, câmera, inventário, Haki, Zoan, classes, facções, mapas e saves não foram modificados. A expansão é de assets e ferramenta de inspeção, sem merge automático.
