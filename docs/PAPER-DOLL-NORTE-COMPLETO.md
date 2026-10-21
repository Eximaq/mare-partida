# Paper Doll — caminhada norte com quatro camadas

## Resultado desta continuação (21/10/2026)

[Prévia interativa](../pixellab-pip-generations/paper-doll-north-finish-20261021/preview.html) · [GIF transparente para celular](../pixellab-pip-generations/paper-doll-north-finish-20261021/walk-north.gif) · [Bancada](../tools/paper-doll-inspector/index.html?pack=walk-north-complete).

O pacote reúne Idle nas quatro direções e Walk/south e north, com corpo, cabelo, roupa e espada sincronizados. Walk/north tem oito poses reais na ordem original. Todos os itens permanecem `approved:false`: é um conjunto de inspeção, sem ativação no catálogo de produção. Os personagens publicados continuam no renderizador existente. Não houve alteração de saves, combate, impactos, equipamentos, câmera ou transformações.

Os oito corpos e a espada são os mesmos do estudo anterior. Os primeiros quatro cabelos válidos foram copiados byte a byte. Uma edição mascarada corrigiu os quatro cabelos restantes. A inspeção confirmou cobertura da cabeça e contato com o corpo; os últimos dois possuem silhueta de tufos mais lisa, uma diferença artística ainda visível na reprodução. A aprovação artística do personagem completo permanece pendente.

## Roupa e falha preservada

O primeiro atlas de roupa entregou camisa clara/colete azul nas poses1–2, mas deixou3–4 com as costas nuas. A geometria passou, mas o resultado artístico foi parcialmente reprovado. Todos os arquivos originais continuam preservados; apenas1–2 foram registrados como peças utilizáveis.

A terceira e última chamada planejada foi reorganizada para as seis poses faltantes3–8 em uma única linha192×64, com células nativas32×64. O recorte fixo `(16,0,48,64)` retirou somente margens transparentes; a reconstrução foi comparada com os corpos originais antes da chamada. Essa organização entregou as seis roupas, inspecionadas em conjunto com as duas primeiras. Não houve quarta chamada, duplicação de poses, pintura local, escala ou redução temporal do ciclo.

## Montagem e contrato

- Rig84×84, pivô42/65, Walk8 frames/8FPS; corpo64×64 com padding10/13.
- Cabelos preservados32×52 com padding26/17; cabelos corrigidos64×64 com padding10/13.
- Roupas1–2 em64×64 com padding10/13; roupas3–8 em32×64 com padding26/13.
- Espada norte original nos oito sockets já medidos, atrás do corpo; mão oclui o cabo. Sem mover corpo/pivô para corrigir a lâmina.
- Idle e Walk/south reaproveitados sem alterações. Profundidade e cache usam o compositor existente.
- GIF padrão transparente com paleta exata de95 cores; sem quantização ou fundo embutido. O formato usa tempos alternados120/130ms (resolução de10ms), total1s; a prévia Canvas usa125ms por frame.

`prepare_inputs.py` e `prepare_remaining.py` congelam fontes/máscaras/referências por SHA256. `inspect_batch.py` valida os pixels protegidos de cada célula. `quality-review.json` registra a inspeção artística por pose. `assemble_review.py` monta apenas após esses gates. `assembly-audit.json`, recibos, manifest e receita conservam a procedência e as falhas. Guias opacos são auxiliares locais ignorados pelo Git.

## Custo e limites

Foram cobradas **18 gerações**, em três chamadas de6: correção do cabelo, primeira roupa e seis roupas restantes. A cadeia foi anunciada com teto18 antes do consumo, usando a autorização do proprietário para decisões recomendadas. O teto conservador acumulado passou de94 para112, sem alterar o auto global e sem overage em dólares.

Acumulado: **109 confirmadas +2 previamente reportadas +1 estimada de um job antigo sem cobrança final exposta =112 conservadoras**. Não se presume reembolso da cobrança não exposta. Nenhum job permanece pendente. Dados de conta/saldo e credenciais não fazem parte dos arquivos versionados.

## Entradas PixelLab

Rota: MCP `inpaint_image_pro_flash`, saída de nova camada transparente, `crop_to_mask:true`, seed compartilhada1612130099. Cada chamada recebeu seu corpo original em `image_url`, máscara própria em `mask_image_url` e referência de estilo por `context_image`, com os textos exatos preservados no [manifesto](../pixellab-pip-generations/paper-doll-north-finish-20261021/manifest.json) e na [receita portátil](../pixellab-pip-generations/paper-doll-north-finish-20261021/north-finish.blueprint.json). Os prompts foram elaborados a partir do pedido do proprietário, não digitados por ele.

1. Cabelo (128×128): adicionar cabelo preto curto nas quatro cabeças de costas, seguindo a referência e preservando cada pose, pescoço, corpo, braços, shorts, pés e ordem das células; sem bandana/roupa/arma.
2. Roupa inicial (128×128): adicionar camisa clara de mangas curtas e colete azul nas quatro poses, mantendo mãos/antebraços visíveis, cabeça, pernas, shorts, transparência e ordem; sem cabelo/arma/emblemas.
3. Roupa restante (192×64): vestir as seis figuras da linha com o mesmo colete e camisa, sem costas nuas; seguir a referência lateral, manter os pixels protegidos e a ordem original.

São atlas nativos editados no PixelLab, divididos e compostos localmente sem alterar pixels de arte. Seleção: peças para inspeção; um resultado parcialmente reprovado está preservado e identificado.

## Cobertura restante

Para o mínimo do Espadachim faltam Walk/west e east (16 poses) e Attack nas quatro direções (32): **48 frames de corpo,48 de cabelo e48 de roupa, total144**, além dos48 encaixes da arma e imagens de lâmina específicas quando necessárias. Os32 conjuntos de Idle/Walk existentes não são aprovação para esses movimentos. As demais categorias de ataque continuam no legado. Próximo lote deve começar pelo corpo de um perfil de caminhada, inspecionando-o antes das peças; nenhum gasto futuro é iniciado por este relatório.

## Verificação

A validação inclui auditoria dos PNGs e GIF, comparação do Canvas com composição independente dos originais em todas as oito poses,16 combinações de camadas, pivôs/sockets, celular393px, bancada, mundo em movimento e combate legado. Os testes de mundo importam o pacote apenas no contexto isolado do navegador: não alteram os flags de produção nem o schema de saves. Capturas e medições ficam em `docs/evidence-paper-doll/`, ignoradas pelo Git e entregues como artefatos da CI.

Validação local executada:38 arquivos de testes Node e33 testes Python de auditoria/montagem/GIF passaram; build GitHub Pages passou. Chromium validou o novo pacote em todas as oito poses contra os PNGs originais, reprodução8FPS,16 combinações de camadas nas duas direções, importação na bancada, edição/exportação dos encaixes, tela1366px e celular393px. A prévia e o atlas ampliado foram inspecionados visualmente, incluindo as diferenças de cabelo documentadas.

O ensaio de mundo observou os oito frames tanto ao norte quanto ao sul, Idle nas quatro vistas, ataque legado com641 de dano observado no contexto de teste, Haki e bypass Zoan. O cache ficou em32 composições/903.168bytes, abaixo do limite4MiB. Os testes anteriores de caminhada frontal, estudo norte reprovado, expansão Idle, sockets, combate real das sete classes e cache Pages também passaram. Não houve regressão do schema/sentinel dos saves. Esses dados descrevem o ensaio executado, não uma medição universal de FPS ou balanceamento.

As capturas de desktop/celular e caminhada no mundo foram conferidas. A infraestrutura completa de animações e a aprovação artística do personagem ainda não estão concluídas. A CI repete os testes novos e preserva os anteriores; seu resultado acompanha o Pull Request48.

A primeira execução da CI encontrou diferença nos bytes dos PNGs de cabelo extraídos pela montagem anterior no Linux. O teste passou a conferir o SHA256 das cópias preservadas e comparar seus pixels diretamente com o atlas bruto original, cujo hash também é validado. Isso mantém a proteção da arte e evita depender da codificação PNG do sistema operacional. A verificação local corrigida passou.
