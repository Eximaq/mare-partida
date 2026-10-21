# Paper Doll — arma rígida com encaixe animado

Em21/10/2026, o proprietário respondeu “Prossiga” à proposta explícita de reutilizar uma única espada nos quatro encaixes reais da mão. Esta exceção cobre armas rígidas; não permite converter corpo, cabelo ou roupa em imagens estáticas para simular suas animações. Nenhuma nova geração PixelLab foi executada.

## Entrega e limites

O compositor aceita o tipo opcional `rigid-attachment` para armas. A [prévia](../pixellab-pip-generations/paper-doll-rigid-weapon-20261021/preview.html) usa uma imagem nativa64×64 da espada e os quatro frames existentes de Idle/sul do corpo. A arma mantém exatamente79 pixels, cores, comprimento e espessura; apenas a translação inteira acompanha a mão. O corpo não é redesenhado ou encoberto. GIF e composições são montagens locais autorizadas, sem novos pixels artísticos.

O ensaio não conclui o personagem modular: cabelo, roupa, três direções, Walk e Attack continuam pendentes. As peças de revisão permanecem `approved:false`, em rig corpo/arma separado; `human-v1` continua exigindo corpo, cabelo, roupa e arma. O catálogo do jogo não registra este conjunto. O fallback, os saves, as sete classes, facções, combate, eventos de impacto, equipamentos, Haki e Zoan seguem o fluxo atual.

## Contrato reutilizável

Um clip de arma declara o mesmo relógio, número de frames e direções do rig, mas carrega uma única imagem e sockets por pose. `frameWidth/Height` continuam sendo as dimensões do rig. `source.width/height` são as dimensões reais do PNG; `anchorX/Y` é o ponto de encaixe na imagem. Cada `socket.x/y` é a posição correspondente no canvas do corpo, antes da escala de desenho.

```json
{
  "kind": "rigid-attachment",
  "url": "rigid-weapon.png",
  "frames": 4, "fps": 4, "loop": true,
  "directions": ["south"],
  "frameWidth": 84, "frameHeight": 84,
  "source": {"width": 64, "height": 64, "anchorX": 20, "anchorY": 36},
  "sockets": {"south": [{"x":30,"y":49},{"x":28,"y":48},{"x":30,"y":49},{"x":29,"y":48}]}
}
```

Com pivô padrão, a origem da imagem fica em `socket - anchor`:10/13,8/12,10/13,9/12. São posições medidas nas quatro poses, não offsets para esconder uma espada mal encaixada. O retângulo de origem permanece0/0/64/64 em todos os frames. Nenhuma folha com quatro cópias da arma é criada. A camada conserva o frameIndex do corpo para sincronização e chave de cache.

Somente `weapon` aceita esse modo; os outros slots mantêm a auditoria de frames animados. `kind` ausente ou `sheet` conserva o comportamento anterior. Fontes vazias, dimensões inválidas, sockets ausentes, posições fracionárias ou fora do canvas impedem toda a composição. Todos os sockets declarados devem existir, inclusive os de frames ainda não selecionados. Uma direção ausente não herda encaixes de outra. Aprovação da peça e compatibilidade de FPS/frames/loop permanecem obrigatórias.

A ordem de profundidade continua usando `zIndex`, `directionOverrides` e `poseOverrides`; sockets são anteriores à escala e os pivôs/offsets explícitos continuam funcionando. Não há rotação interpolada. Para outra ação/direção, fornecer a vista apropriada e os encaixes reais, validando oclusão e contato; esta prévia frontal não os autoriza automaticamente. O mesmo compositor/cache serve para mundo, retrato e prévia quando houver um conjunto completo aprovado.

## Origem e reprodução

`rigid-weapon.png` é uma cópia byte a byte de `paper-doll-layer-batch-20261021/weapon/frame-01.png`, originalmente gerada pelo PixelLab no job `c41dbbaa-b5bf-482c-bd5c-a3e6a8278763`. O custo histórico do atlas foi6 gerações; o custo desta implementação é0. Hashes, autorização e montagem constam no [manifesto](../pixellab-pip-generations/paper-doll-rigid-weapon-20261021/manifest.json). Fontes anteriores foram preservadas.

```text
python pixellab-pip-generations/paper-doll-rigid-weapon-20261021/assemble_review.py
node --test tests/paper-doll.test.cjs tests/paper-doll-attachment.test.cjs
python tools/build_pages.py
python tests/paper_doll_rigid_browser.py
```

A montagem confere hashes, transparência, contato, ausência de alteração corporal e igualdade RGBA de cada frame do GIF transparente4FPS, loop0/disposal2. Os testes Node verificam fonte única, encaixes, cache, troca de peça, profundidade, fallback atômico e bloqueio do uso rígido na anatomia. O Chromium compara os canvases reais com as composições nativas, verifica fonte constante, quatro posições, controles, ciclo, erros de imagem, autorização, responsividade e save sentinela. Capturas ficam em `docs/evidence-paper-doll/`, ignoradas pelo Git.

Resultados locais desta implementação:

- 33 suítes Node passaram, incluindo o novo contrato de arma rígida e as80 poses do compositor anterior.
- Build GitHub Pages passou. Chromium conferiu a prévia em1366×900 e393×852, com os quatro resultados idênticos às composições PNG esperadas e zero alteração corporal.
- `paper_doll_browser.py` passou:80 poses de fallback por viewport, composição geométrica, importação, equipamentos, saves, Haki/Zoan e combate real no caminho antigo. A amostra local de1,8s teve109 frames e mediana/p95 de16,7ms; não mede desempenho de um personagem modular completo.
- `class_combat_v2_browser.py` passou para as sete classes, preservando o Bento de produção e as alternativas existentes.
- `pages_cache_browser.py` passou:60 recursos versionados, sem solicitar script antigo e com save preservado.

O workflow Paper Doll recompõe a prévia a partir dos arquivos originais e repete as verificações em Chromium. Push e PR não fazem merge nem ativam o protótipo no jogo.

Correção de portabilidade após o CI de48f4e7e: o hash do PNG derivado de uma célula variou na reexportação Linux/Pillow, apesar de os pixels permanecerem iguais. O arquivo bruto original continua protegido por SHA256; a célula derivada é comparada em RGBA visível com o recorte nativo desse original. Três testes verificam recompactação válida, alteração de pixel recusada e alteração do arquivo bruto recusada. A comparação não recolore nem corrige a arte.

Próximo passo artístico: obter cabelo e roupa compatíveis com as poses do corpo. Não há consumo futuro autorizado por este modo gratuito; qualquer produção paga terá plano e orçamento próprios.

Preparação do próximo lote: `pixellab-pip-generations/paper-doll-hair-outfit-20261021/` contém cópias byte a byte das fontes existentes, quatro poses64×64 em atlas128×128, máscaras separadas e referência visual. O plano propõe duas chamadas mascaradas de aproximadamente6 gerações cada, teto12, sem retries, com inspeção de cabelo antes da roupa. Nenhuma chamada desse novo plano foi enviada; sua aprovação é independente dos lotes encerrados. Os rascunhos antigos continuam reprovados e preservados.
