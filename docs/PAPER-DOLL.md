# Paper Doll 1.0 — Fase 1

## Estado atual (21/10/2026)

O [pacote de revisão multidirecional](PAPER-DOLL-EXPANSAO.md) já contém corpo, cabelo, roupa e espada para as16 poses de Idle nas quatro direções. A arma tem fonte e âncora próprias por vista; a bancada abre o pacote diretamente pelo link `?pack=expansion-idle` e permite editar/exportar sockets por frame. A arte permanece em inspeção (`approved:false`), fora do catálogo de produção. O jogo mantém seus sprites atuais.

Walk/south e north possuem oito poses reais com as quatro peças para inspeção. O [estudo norte inicial](PAPER-DOLL-CAMINHADA-NORTE.md) preserva a falha de cabelo e o fallback como histórico. A [continuação norte](PAPER-DOLL-NORTE-COMPLETO.md) reutiliza os quatro cabelos válidos, corrige os quatro restantes e acrescenta roupa por pose. O pacote `walk-north-complete` abre na bancada; peças continuam `approved:false`. Há pequenas diferenças na silhueta do cabelo e nenhuma aprovação artística do personagem completo.

Para o mínimo do Espadachim faltam48 frames por camada de corpo/cabelo/roupa (16 de Walk nos perfis e32 de Attack):144 frames anatômicos/vestuário, mais48 encaixes da arma e imagens específicas de lâmina quando necessárias. As estimativas de320 frames abaixo registram o levantamento inicial, anterior aos pilotos e à exceção de arma rígida. A Fase1 completa continua pendente.

## Evolução: personagem único (20/10/2026)

A base técnica agora usa `human-v1`, independente de classe/facção. A implementação histórica `swordsman-v1` e seus pacotes continuam aceitos na bancada. Esta evolução não entrega sprites modulares nem o editor de aparência: todos os placeholders continuam `available:false`, sem URLs ou aprovação artificial. O jogo preserva os personagens completos por fallback.

- `profile(player)` separa corpo/cabelo comuns, categoria de ação, roupa de facção e arma padrão. Todas as 28 combinações apontam para `human-body` e `human-hair`.
- `appearance(player)` aplica os equipamentos ao perfil, sem escrever em `player` ou em saves. IDs de itens existentes não foram alterados. Classes/facções inválidas e Zoan não são elegíveis.
- `animationId(player, action)` e `sample(runtime, player, action, direction, time)` resolvem a pose visual usando o tempo fornecido pelo jogo. Nenhum evento de impacto é criado pelo compositor.
- Idle e Walk são comuns. Attack se divide em `attack-unarmed` (Lutador), `attack-sword` (Espadachim), `attack-firearm` (Atirador), `attack-daggers` (Gatuno), `attack-tech` (Ciborgue) e `attack-focus` (Estrategista/Suporte). Compartilhar canalização não afirma que as habilidades das duas classes são iguais.
- Skills, combo, hurt, death e transformações mantêm os renderizadores anteriores. Ataques de classes sem controlador validado continuam inteiramente no caminho legado, mesmo quando o futuro conjunto Idle/Walk estiver disponível. A migração de cada ataque exige seu contrato real de tempo/impacto; não se transplantou o golpe de Bento para outros estilos.
- Facção escolhe `human-outfit-<factionId>`, sem mudar anatomia. Equipar um casaco substitui essa roupa. Remover restaura o padrão da facção. Arma removida restaura o padrão da categoria, preservando o contrato anterior; não altera as regras de combate desarmado.
- Foram associados os 14 itens de arma iniciais (0–5,12–17,31–32), casacos6/7 e bandana18. Uma arma de categoria incompatível ou um item não mapeado nesses slots força fallback completo. Equipamentos de outros slots continuam fora do protótipo visual; a expansão desses slots requer peças reais antes da ativação artística do personagem completo.

A bancada agora oferece Classe e Facção, com os mesmos perfis usados no jogo. O lado original sempre usa a própria facção. Apenas o Espadachim Pirata tem referência original de ataque aprovada; nos outros perfis, a ferramenta informa explicitamente que está mostrando repouso como referência, sem simular uma animação de ataque. A importação local continua isolada do jogo/save e bloqueia a mudança de perfil enquanto um pacote está em inspeção.

### Contrato comum e produção futura

O contrato84×84, pivô42/65, quatro direções, transparência e regras de profundidade da Fase1 continuam válidos. `assets/paper-doll/human/manifest.json` contém o rig e catálogo vazios, sem PNG. Idle tem4 frames/4FPS; Walk8/8FPS; cada categoria Attack tem8/12FPS como contrato inicial de arte. Esses números não modificam cooldowns ou velocidade do combate. Qualquer variação necessária exige revisão explícita do contrato antes da integração.

Cada peça pode entregar cobertura parcial: uma pose ausente volta atomicamente ao legado. Um corpo/cabelo cobrindo Idle, Walk e todas as seis categorias precisa de240 frames (48 de locomoção +192 de ataques). Uma arma cobrindo locomoção e seu próprio ataque precisa de80. Roupa/acessório que acompanhar todas as categorias também precisa de240; o mesmo arquivo da peça é reutilizado nas classes compatíveis, sem gerar quatro corpos por facção ou sete por classe.

Todas essas imagens ainda faltam. O primeiro lote artístico recomendado permanece pequeno: corpo, cabelo, roupa neutra e espada em Idle/sul, validando o encaixe antes de ampliar movimentos e variações. Esta etapa técnica consumiu **zero créditos** e não autoriza essa produção. Prompts, método de animação alinhada e orçamento precisam de aprovação própria; a quantidade de frames não deve ser confundida com o custo de gerações.

Não há customizador de aparência, recoloração, escolha persistente de cabelo/pele/olhos nem alteração de save nesta entrega. O vídeo do usuário orienta uma fase futura, mantendo o tema náutico do projeto.

### Verificação desta evolução

`tests/paper-doll.test.cjs` confere os28 perfis, corpo/cabelo comuns, categorias, trocas de classe/facção/equipamento, rejeição de armas incompatíveis e ausência de mutação. `tests/universal_character_browser.py` percorre os28 perfis ×3 ações na bancada e carrega os28 perfis no jogo em contextos isolados, conferindo fallback, equipamentos e saves. A regressão anterior de composição, importação, Haki, Zoan e combate das sete classes continua obrigatória. As capturas locais ficam em `docs/evidence-paper-doll/shared-*.png`, ignoradas pelo Git.

## Estado e limite artístico

### Cobertura parcial por direção (21/10/2026)

O rig continua declarando as quatro direções. Uma peça pode fornecer um subconjunto não vazio delas em `clip.directions`, com uma linha real de PNG por direção declarada. A ordem das linhas segue esse array; direções desconhecidas, duplicadas, folhas com linhas extras e sequências incompatíveis são rejeitadas. Uma pose sem linha retorna `missing-direction` antes de qualquer desenho, preservando o fallback atômico. Não há empréstimo, espelhamento ou duplicação de linhas.

A bancada informa quais direções possuem composição completa (`readyDirections`, modo `partial-draft`), mantendo o sprite original nas demais e em ações ausentes. Isso permite inspecionar lotes pequenos sem aprovar arte nem ativar conjuntos incompletos no jogo. Os testes Node e `tests/paper_doll_partial_browser.py` verificam quatro frames sul, três direções legadas, ação ausente e save intacto com fixtures geométricas explicitamente separadas de arte de personagem.

O [piloto real Idle/sul](PAPER-DOLL-IDLE-SUL.md) consumiu11 gerações autorizadas e entregou quatro frames de inspeção, mas o contato mão/espada e os ombros não passaram. O pacote continua `approved:false`, fora do catálogo do jogo. Essa evolução não conclui o critério artístico da Fase1.

A [continuação da espada](PAPER-DOLL-ESPADA.md) usa saídas nativas isoladas com máscaras que congelam a anatomia. Quatro contatos passaram com zero alteração no corpo. O teste usa um rig de inspeção corpo/arma; o `human-v1` continua exigindo corpo, cabelo, roupa e arma completos. A variação visual da lâmina e as peças de roupa/cabelo mantêm a validação artística pendente.

### Preparação de edição agrupada — sem novas gerações

`tools/paper_doll_batch_audit.py` verifica uma folha nativa por célula, na ordem declarada, sem redimensionar ou completar imagens. Uma célula inválida impede a exportação de todo o conjunto; quatro camadas visivelmente idênticas são rejeitadas como sequência estática. O teste estrutural continua separado da avaliação artística. Cinco testes de fixtures geométricas cobrem ordem/exportação, vazamento de uma célula, duplicação estática, canvas e oclusão autorizada.

O auditor de camadas isoladas mantém por padrão todos os pixels do corpo protegidos para armas. Cabelo/roupa podem usar explicitamente `allow_body_occlusion:true` (CLI `--allow-body-occlusion`) para cobrir somente a anatomia dentro da máscara correspondente. Alpha parcial, pixels fora da máscara, perda de contato ou mudança na anatomia fora da região continuam bloqueando a aprovação estrutural. Onze testes Python verificam esses contratos; isso não concede aprovação artística.

`pixellab-pip-generations/paper-doll-layer-batch-20261021/` preserva as fontes, a folha de entrada128×128 com quatro frames64×64 existentes, máscaras binárias e guias de contexto192×128. Após aprovação do teto18, foi executada somente a chamada da espada, com cobrança confirmada de6 gerações. O contato estrutural passou nas quatro células sem alterar o corpo, mas a lâmina varia de comprimento, espessura e guarda. **O gate artístico foi reprovado e as chamadas dependentes de cabelo/roupa não foram executadas.** A [prévia diagnóstica](../pixellab-pip-generations/paper-doll-layer-batch-20261021/preview.html) mantém os quatro frames na ordem original, sem reparo local ou ativação no jogo. [Relatório do lote](PAPER-DOLL-LOTE-CAMADAS.md). As guias são entradas, não sprites novos; o atlas edita poses existentes e não cria movimento por duplicação.

O [conjunto Idle/sul](../pixellab-pip-generations/paper-doll-hair-outfit-20261021/preview.html) reúne agora as quatro peças reais: corpo, cabelo, roupa e arma rígida. Cabelo e roupa foram produzidos em duas edições mascaradas,12 gerações cobradas, sem retries, com zero alteração fora das regiões permitidas. O pacote pode ser importado na bancada; outras poses permanecem no fallback e o jogo mantém os personagens originais. **Ainda falta validar o Espadachim nas quatro direções e ações.** [Relatório, consumo e228 frames de camadas ainda ausentes](PAPER-DOLL-CABELO-ROUPA.md).

### Exceção autorizada — armas rígidas por encaixe

Após autorização específica do proprietário, `kind:rigid-attachment` permite que uma arma reutilize uma única imagem com sockets inteiros por animação/direção/frame. A [prévia Idle/sul](../pixellab-pip-generations/paper-doll-rigid-weapon-20261021/preview.html) mantém o modelo da espada constante sobre quatro poses reais do corpo, sem novas gerações. Este é um modo declarado de peça rígida, não uma folha de frames gerados. Corpo, cabelo e roupa continuam exigindo frames próprios; outras ações e direções só ficam válidas com fontes/encaixes correspondentes. O catálogo do jogo mantém o fallback. [Contrato, origem e testes](PAPER-DOLL-ARMA-RIGIDA.md).

Branch `feature/paper-doll-fase-1`, criada de `origin/main` em `5047eea`, incorpora o checkpoint de animações2.0 (`4ab2348`, preservado por cherry-pick). O PR de checkpoint39 permanece em rascunho; esta fase inclui esse trabalho e não depende de fazer merge nele. Não fazer merge/publicação automática de nenhum dos dois.

## Auditoria dos assets existentes

- Bases de facção: folhas de personagem completo, células56×56 com padding, quatro direções e idle/walk reais. Úteis como referência, escala e fallback; pele/cabelo/roupas já estão fundidos.
- Bento Espadachim: células84×84, pivô42/65, corpo de referência46px, escala70/46; ataque de8 frames a12FPS, impacto no frame3. Seus arquivos e metadados são preservados. O módulo de desenho não modifica o relógio nem os eventos do ataque.
- A referência de Idle é4 frames/4FPS; Walk é8/8FPS; ambos vêm da base pirata, com seu pivô56/28/52 próprio. Na bancada, esse pivô é colocado no mesmo ponto visual do pivô do rig84; não se redimensionam os PNGs nem se promete identidade de proporções entre fontes diferentes.
- Os80 frames recentes do Lutador foram conferidos como RGBA e registrados por SHA256. São personagens completos, não roupas/partes reutilizáveis como Paper Doll. Resultados reprovados continuam preservados.
- O job `5ead33c2-960b-4e42-8982-89d1a868d714`, antes sem conclusão confirmada, foi consultado por `list_jobs(include_recent=true)`: **failed — Generation stalled and was automatically failed**. Os quatro frames hurt/leste não foram entregues. Não houve retry.
- Ícones de itens32×32 não são sprites de equipamento animado. Não são sobrepostos ao personagem para simular a entrega.

Auditoria legível por ferramenta e hashes: `assets/paper-doll/source-audit.json`. Nesta fase: **zero novas gerações PixelLab**. As13 gerações informadas pelo lote anterior permanecem no recibo histórico; um job falhou e eventual ajuste de cobrança não foi exposto pelo getter consultado.

## Arquitetura e integração

`paper-doll.js` é um compositor Canvas2D independente de classe, facção, combate e save. Recebe uma aparência e uma pose `{animationId,direction,frameIndex}`; não avança relógios nem emite dano, cura, projéteis ou eventos. Todas as camadas recebem exatamente esse mesmo frame.

`paper-doll-assets.js` fornece o catálogo do protótipo, a resolução pura de equipamento para peça visual e a referência do sprite completo. Seus placeholders declaram `available:false`, sem URLs inventadas. Apenas o protótipo Pirata+Espadachim é elegível; outras classes/facções e todas as transformações Zoan seguem diretamente o caminho existente.

O mundo e o retrato passam por `drawPlayerSprite`; inventário/prévia do personagem consultam o mesmo resolvedor. A cada mudança de definição equipada, ou remoção de item, a assinatura visual é recalculada no próximo desenho. Não se grava um novo campo em `game` e não se altera a chave/formato de save. Melhorias numéricas do mesmo item não mudam sua skin.

O estado de combate fornece ação, direção travada e tempo. A amostragem só converte esse tempo para um frame visual. Somente Idle, Walk e Attack são cobertos pelo contrato inicial. Skills, hurt, death e outras poses continuam no renderizador legado quando não há sequência modular compatível. Zoan tem prioridade antes de qualquer tentativa Paper Doll; Haki/VFX e ordenação do mundo continuam fora do compositor.

### Fallback atômico

Antes de desenhar, o compositor verifica todas as camadas selecionadas. Peça obrigatória ausente, rig/ação/direção incompatível, frame inválido, PNG pendente/falho, folha com dimensões erradas, frame vazio, repetição estática da sequência ou transformação inválida causam retorno `false`, **sem desenhar camadas parciais**. O chamador mantém o sprite antigo. Ocultar uma camada na inspeção não remove sua exigência de cobertura.

Assets de produção exigem `approved:true`; os placeholders nunca recebem essa aprovação. A bancada pode inspecionar um pacote local como rascunho (`allowDraft:true`), mas isso não o ativa no jogo nem concede aprovação artística. Falta de peça é diagnosticada, não preenchida com desenho improvisado.

## Contrato técnico de sprites

| Campo | Regra do protótipo |
|---|---|
| `rigId` | `swordsman-v1`, revisão explícita |
| Resolução / célula |84×84 RGBA, incluindo padding; não é tile64 nem obrigação de desenhar um corpo de84px |
| Corpo de referência |46px; renderização de referência70px, escala uniforme70/46 |
| `pivotX`, `pivotY` |42,65 na célula comum; pés no mesmo referencial de mundo |
| Direções / linhas | `south`, `north`, `west`, `east`, nessa ordem no template; ordem declarada nos metadados, sem espelhar |
| Idle |4 frames,4FPS, loop; folha336×336 |
| Walk |8 frames,8FPS, loop; folha672×336 |
| Attack |8 frames,12FPS, one-shot; folha672×336; dano permanece no evento de impacto do controlador existente |
| Colunas |Frames em ordem original da esquerda para a direita; índices0–3 ou0–7 |
| Transparência |RGBA transparente, sem matte, fundo xadrez, suavização ou pixels cortados |
| `offsetX/Y` |Inteiros nativos, padrão0/0. Somados depois de alinhar o pivô; não usar offsets oscilantes para esconder erro de ancoragem |
| `zIndex` |Inteiro por peça/clip; pode mudar por direção e frame, sem alterar o relógio |
| Compatibilidade |Mesmo rig, célula, contagem, FPS, loop, direções e cobertura real da pose; cada frame visível precisa existir |
| Integridade |Preservar originais, proveniência e aprovação. Sem inventar quadros por duplicação, ping-pong ou inversão |

Nomenclatura: `<slot>-<animationId>.png`, por exemplo `hair-walk.png`, com manifestos e revisões por peça. O template não contém PNGs: `assets/paper-doll/swordsman/manifest.json`.

Slots suportados: `body`, `pants`, `boots`, `outfit`, `hair`, `accessory`, `weapon`. Quatro são obrigatórios no protótipo: body/hair/outfit/weapon. Camadas opcionais só são desenhadas se explicitamente selecionadas e compatíveis.

Ordem padrão: corpo, calças, botas, roupa, cabelo, acessório e arma. Uma espada norte pode usar `directionOverrides.north.zIndex:10` e ficar atrás do corpo; numa pose específica, `poseOverrides.south[3]` pode alterar z/offset. O template usa a ordem20/50/60/80 nas quatro peças obrigatórias. Valores empatados usam a ordem estável dos slots.

Exemplo de clip, somente metadados:

```json
{
  "url": "weapon-attack.png",
  "frames": 8, "fps": 12, "loop": false,
  "directions": ["south", "north", "west", "east"],
  "frameWidth": 84, "frameHeight": 84,
  "pivotX": 42, "pivotY": 65,
  "offsetX": 0, "offsetY": 0, "zIndex": 80,
  "directionOverrides": {"north": {"zIndex": 10}},
  "poseOverrides": {"south": [{}, {}, {}, {"zIndex": 85}]}
}
```

A Fase1 rejeita folhas cujas células de uma sequência multidirecional são todas vazias ou reproduzem exatamente a mesma imagem em todas as colunas de uma direção. Isso detecta simulação de animação estática; não substitui a inspeção de anatomia, armas e alinhamento. A exceção autorizada para armas exige o tipo explícito `rigid-attachment`, uma única imagem e sockets por pose; não se duplicam células para contornar a auditoria. Ver contrato acima.

### Equipamento e aparência

Bindings preparados: arma0→espada do protótipo; arma1→Sabre de Coral; torso6→roupa do protótipo; torso7→Casaco da Bruma; cabeça18→bandana. Peças alternativas também estão ausentes. Remover arma/torso retorna à peça padrão; remover cabeça retorna à ausência do acessório opcional. Definição não mapeada nesses slots usa fallback do personagem completo.

Calças, botas e outros acessórios têm slots técnicos preparados, mas não recebem skins de itens nesta fase. Seus itens, números e visuais legados continuam como antes. Esta preparação não representa cobertura modular desses equipamentos e não modifica regras de compatibilidade de classe.

### Adicionar uma peça posteriormente

1. Produzir os frames sobre o mesmo rig/poses; manter pixels originais e a proveniência. Qualquer geração nova exige aprovação própria.
2. Preencher as três folhas e o manifesto, com nomes únicos e dimensões exatas. Não distribuir imagens artificiais como camada final.
3. Na bancada, carregar o JSON com seus PNGs, conferir todas as quatro direções/quatro ou oito frames e a ordem das camadas, usando controles de frame/pivô/visibilidade.
4. Corrigir na fonte quaisquer lacunas ou ancoragens inconsistentes; registrar offsets legítimos. A presença de imagem e igualdade de contagem não provam qualidade artística.
5. Só após revisão artística, registrar a peça real em `paper-doll-assets.js`, com URLs relativos, `available:true`, `approved:true`, revisão e bindings. A resolução pura alimenta mundo/retrato/inventário sem novo save.
6. Rodar Node, navegador, build/cache e regressão Haki/Zoan antes de propor merge. Uma peça sem todas as poses não pode ser anunciada como cobertura completa do personagem.

## Bancada de inspeção

Atualização da caminhada: o pacote `?pack=walk-south` reúne Idle nas quatro vistas e oito frames reais de Walk/south. A cobertura de produção continua desativada; as outras caminhadas e todos os ataques usam fallback. Ver [contrato, máscaras, custos e validação desta etapa](PAPER-DOLL-CAMINHADA.md). O pivô é fixo; a passada preserva a variação natural dos pés, sem alinhamento artificial por frame.

### Compactação de margens para produção de camadas

A auditoria offline aceita células quadradas ou retangulares, declaradas como inteiro ou par `[largura, altura]`. Ambas as dimensões devem dividir exatamente o atlas; máscaras, contato e ordem row-major são verificados por célula. Isso não altera o contrato84 do renderizador nem aceita folhas finais com frames incompatíveis.

É permitido remover somente margens transparentes usando o mesmo retângulo fixo em toda a sequência. A transformação precisa ser reversível pixel a pixel: recolocar o recorte na posição original deve recuperar todos os pixels visíveis, incluindo alfa parcial. Se um único pixel visível ficar de fora, a preparação falha antes de uma chamada paga. RGB sob alfa0 não representa perda visual. Nenhuma imagem é redimensionada ou recentralizada por frame.

No estudo norte, células nativas64×64 são compactadas para32×52 retirando margens em16/4, depois restauradas no rig84 com padding total26/17. A referência de aparência continua ancorada no personagem; cabelo e roupa são edições independentes do mesmo corpo. `tests/paper_doll_compact_test.py` verifica reversibilidade, limites, transparência e rejeição de perda visível; a auditoria de lote verifica também células retangulares e exportação sem alteração de pixels.

Abra `tools/paper-doll-inspector/index.html` no servidor local ou pacote Pages. A ferramenta tem quatro direções, Idle/Walk/Attack, pausa/reprodução, slider de frame, zoom2×/3×/4×, pivôs/linha dos pés, visibilidade das sete camadas, associação de equipamento e comparação lado a lado. A diferença RGBA é contada antes dos auxiliares visuais e não deve ser confundida com aprovação artística: roupas diferentes podem legitimamente mudar pixels.

Sem peças, os dois lados mostram o sprite completo e a ferramenta informa fallback; não finge mostrar um corpo modular. O xadrez é auxiliar de transparência da interface. Esconder camada não afeta o fallback completo.

Para um pacote local: selecione um JSON e todas as folhas PNG na mesma seleção de arquivos, com nomes únicos. O importador exige o contrato84 e4/8/8, usa URLs locais temporárias, valida antes de aplicar e não faz upload. O catálogo original é restaurável. Bindings opcionais do pacote habilitam o ensaio de troca de itens; sem bindings esses seletores ficam desativados. Nenhum arquivo importado entra automaticamente no repositório ou no save.

## Cache e desempenho

### Encaixes editáveis e vistas de arma

Na bancada, **Encaixe da arma** permite escolher direção e frame, editar coordenadas inteiras do socket e a profundidade daquela pose, restaurar o pacote e exportar um JSON portátil. O PNG permanece intacto. A edição pausa a reprodução, invalida o cache e mantém `approved:false`; não grava no save nem registra arte no catálogo de produção. Reimporte o JSON exportado junto dos mesmos PNGs. Poses sem encaixe ficam desabilitadas.

Uma arma rígida pode declarar `clip.sources`, um objeto por direção com `url`, `width`, `height`, `anchorX` e `anchorY`. Ao usar esse formato, **todas** as direções declaradas no clip precisam ter uma fonte válida. A vista norte não herda a espada frontal. `clip.url` continua obrigatório para compatibilidade com o contrato e o importador; cada vista resolve sua própria imagem e âncora. O formato antigo `clip.source` permanece válido para armas de uma única fonte. Sockets e `directionOverrides`/`poseOverrides` continuam controlando posição e profundidade; corpo, roupa e cabelo não aceitam essa exceção de imagem rígida.

`tests/paper_doll_socket_browser.py` verifica edição por frame, rejeição de coordenadas inválidas, restauração, exportação/reimportação sem URLs temporárias, mobile e isolamento do save. Os testes Node verificam fontes e âncoras distintas por direção e fallback quando falta uma vista.

O carregador de imagens é compartilhado com `MareFactionSprites.image`: uma URL produz um objeto Image. O compositor audita as células uma vez por imagem/clip e usa cache LRU por rig/revisão, aparência, frame, direção, offsets, profundidade e visibilidade. Célula composta é nativa; escala é aplicada apenas no desenho final, com `imageSmoothingEnabled=false` e coordenadas arredondadas.

Limites padrão:4MiB e96 frames compostos. As dimensões da composição se expandem quando há offsets legítimos, evitando cortar arma/cabelo; offsets inválidos ou composição maior que2048px falham com segurança. Registrar novamente uma peça/rig invalida as composições. PNGs originais ficam no carregador; bytes do cache são apenas os canvases RGBA compostos, não toda a memória do navegador/GPU.

No estado atual de fallback nenhum canvas modular é composto no jogo. O custo medido dos testes precisa ser lido com essa limitação: não é benchmark de um elenco com arte modular real.

## Assets ausentes e estimativas de produção

| Peça mínima | Idle | Walk | Attack | Total |
|---|---:|---:|---:|---:|
| Corpo-base |16|32|32|80|
| Cabelo |16|32|32|80|
| Roupa |16|32|32|80|
| Espada |16|32|32|80|
| **Mínimo** |64|128|128|**320 frames /12 folhas**|

Variantes opcionais previstas (não exigidas para validar o conjunto mínimo): Sabre de Coral, Casaco da Bruma e bandana, cada uma com mais80 frames/3 folhas se cobrir as três ações. Não há parte pronta que permita descontar esses frames com segurança.

Estimativas de dimensionamento, **não orçamento aprovado**:

- Arte manual fornecida sobre o rig:0 gerações PixelLab, com trabalho artístico a estimar separadamente.
- Imagens individuais pequenas por Pixen: custo publicado de1 geração/imagem. O mínimo bruto320 frames daria aproximadamente320 gerações, sem retries. A rota não garante alinhamento entre imagens e **não é recomendada para disparar em massa**.
- Como referência de custo de movimento, um corpo-base e12 clipes v3 pequenos podem custar14–26 gerações; isso produz frames do corpo e **não** cria as outras três camadas compatíveis. Não usar esse número como orçamento do conjunto Paper Doll completo.
- Lote inicial proposto para futura aprovação: somente Idle/sul das quatro peças (16 frames), com envelope de até16 gerações se produzido por imagens individuais, ou arte manual. Validar encaixe antes de planejar Walk/sul (32 frames), Attack/sul (32) e as três outras direções. Rota, prompts, referências, frames e preço devem ser apresentados antes de qualquer geração; o orçamento pode mudar conforme a estratégia escolhida.

Gerar o personagem inteiro e tentar apagar suas roupas depois deixa anatomia oculta faltando. Recortes por cor e redimensionamento de ícones não atendem ao contrato. Uma arma rígida só pode reutilizar imagem pelo modo explícito autorizado, com encaixes reais; isso não permite fabricar anatomia oculta ou declarar o personagem inteiro concluído. Sprites completos continuam como referência/fallback.

## Validação e evidências

- `tests/paper-doll.test.cjs`: sincronização das80 poses com quatro camadas, z por direção/pose, pivôs/offsets, expansão de limites, LRU, ausência de desenho parcial, falhas de imagem, troca de peças, pureza do resolvedor e escopo classe/facção/Zoan. As imagens mockadas desses testes são dados de teste, não arte de personagem.
- `tests/paper_doll_browser.py`: bancada real, controles, quatro direções, frames, fallback pixel a pixel, importação inválida, responsividade, conformance de composição em canvas fora da tela, jogo/equipamentos/saves/Haki/Zoan e medições. Ensaios geométricos usam blocos de cor somente como fixtures técnicas; não aparecem como personagem nem contam como validação artística.
- `tests/class_combat_v2_browser.py`: regressão real das sete classes, com o Espadachim existente.
- Capturas/resultados ficam em `docs/evidence-paper-doll/`, fora do Git. O pacote estático contém a bancada, scripts, contrato e o manifesto vazio, sem ferramentas Python, saves ou evidências em massa.
- A execução local passou com31 suítes Node e sintaxe/build, além da regressão real das sete classes. O teste Pages de cache conferiu58 recursos versionados e save preservado. No ensaio do pacote estático,10.000 resoluções de fallback levaram7–11ms nas execuções locais; a amostra de combate de1,8s registrou109 frames, mediana de16,7ms e p95 de16,7–16,8ms e zero composições modulares. São medições desta máquina e deste cenário, sem arte modular real, não uma promessa de FPS geral.
- O workflow `Paper Doll — infraestrutura e fallback` repete a verificação em Chromium no pacote estático e entrega o artefato `paper-doll-infraestrutura-capturas` para revisão, sem incluir evidências em massa no repositório.

A fase entrega a infraestrutura e a prévia com fallback pela exceção expressa do pedido. **O aceite artístico do Espadachim modular em quatro direções continua pendente.** O mínimo atualizado de camadas e encaixes ausentes está no relatório Idle/sul; a arma rígida é a exceção autorizada à antiga estimativa de320 frames. Nada foi integrado à main automaticamente. Saves antigos, mapas, física, hitboxes e tempos/eventos do combate permanecem no caminho existente.
