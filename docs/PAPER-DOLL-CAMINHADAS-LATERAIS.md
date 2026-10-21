# Paper Doll — caminhadas laterais

## Escopo e base

Continuação do personagem humano compartilhado pelas sete classes e quatro facções. A branch `feature/paper-doll-walk-profiles` parte de `origin/main` em543c92a, após a integração dos PRs48/49 pelo proprietário. As mudanças do colaborador nos mapas East Blue, Albatroz e spawns de Arlong foram preservadas. Nenhum arquivo de gameplay ou save foi alterado.

[Prévia por direção](../pixellab-pip-generations/paper-doll-walk-profiles-20261021/preview.html) · [Bancada](../tools/paper-doll-inspector/index.html?pack=walk-profiles).

## Resultado

Idle cobre16 poses nas quatro direções; Walk cobre32 nas quatro direções, com as quatro camadas sincronizadas. São48 poses de corpo/cabelo/roupa por camada para inspeção. As16 poses novas de caminhada lateral foram geradas independentemente. As vistas anteriores continuam preservadas. [GIF oeste](../pixellab-pip-generations/paper-doll-walk-profiles-20261021/walk-west.gif) · [GIF leste](../pixellab-pip-generations/paper-doll-walk-profiles-20261021/walk-east.gif).

## Fontes e produção

Cada lateral usa seu próprio corpo Idle64×64 anterior, copiado byte a byte e registrado em `run-plan.json`. PixMiniMax produziu oito passos mais a referência de entrada. A referência foi verificada e preservada separadamente; o ciclo usa os oito frames gerados, em ordem original,8FPS. Não houve espelhamento, duplicação temporal, estabilização artificial ou redesenho local de corpo.

A preparação mantém toda a altura64 e retira apenas16px transparentes de cada lado. Restaurar cada célula32×64 em64×64 deve recuperar todos os pixels visíveis antes de pagar pelas peças. Os oito corpos compõem uma linha256×64; máscaras binárias próprias protegem rostos, orelhas, mãos, antebraços e pernas. O contexto320×64 usa a referência nativa64 à direita, sem escala. Cabelo e roupa são edições independentes sobre o mesmo corpo original, não adições acumuladas em uma imagem composta.

Todos os PNGs brutos, referências, máscaras, jobs, parâmetros, hashes e gates visuais permanecem no diretório da geração. Os prompts foram elaborados a partir do pedido do proprietário: caminhada no lugar, perfil fixo, passos naturais, cabelo preto preso à cabeça e camisa clara/colete azul ajustados às oito poses. Os textos exatos em inglês estão no [manifesto](../pixellab-pip-generations/paper-doll-walk-profiles-20261021/manifest.json) e na [receita portátil](../pixellab-pip-generations/paper-doll-walk-profiles-20261021/profiles.blueprint.json).

Rota: MCP `animate_image_pixminimax`,8 frames, `no_background:true`, `enhance_prompt:false`, `view:high top-down`, `direction:west/east`, sem seed/end-frame. Peças: MCP `inpaint_image_pro_flash`, nova camada transparente, `crop_to_mask:true`, seed compartilhada607822274. Não foi criado personagem gerenciado nem substituído asset remoto existente.

## Correção exata no PixelLab Workbench

A primeira saída de cabelo oeste tinha um pixel solto nas poses4/7. O original foi preservado e não foi aceito silenciosamente. O Workbench editou uma NOVA cópia: atlas `(118,20)` de`#000102ff` para transparente e `(214,20)` de`#050301ff` para transparente. A primeira guarda esperava a cor errada no segundo ponto e falhou sem modificar nada; após conferir a cor observada, a operação removeu exatamente dois pixels.

A comparação RGBA confirma que nenhum outro pixel mudou. `hair-west-workbench.json` guarda IDs, hashes e decisão; a montagem repete essa auditoria antes de usar a cópia corrigida. Não se pintaram cabelo, face ou poses, não se copiou um frame sobre outro e o original da galeria permanece intacto. A ferramenta descreve a edição exata como gratuita para assinantes, mas não expõe uma unidade de consumo por chamada.

## Composição, profundidade e limites

Rig84×84, pivô42/65; corpos laterais com padding10/10, camadas compactas com26/10. O registro é fixo por vista; oscilações reais da passada não são anuladas. Idle nas quatro vistas e Walk/south/north são reaproveitados.

As espadas são as fontes anteriores, sem escala ou nova geração. A mão visível foi medida nos oito frames de cada lateral. O estudo inicial oeste atrás do corpo ocultava a lâmina durante o balanço do braço; `body-west-grip.gif` foi conservado como diagnóstico e não é a arte registrada. Walk lateral usa profundidade80, à frente; os valores de Idle continuam intactos. A auditoria de contato considera a visibilidade real de acordo com essa profundidade, sem alterar anatomia.

Cada direção só entra no pacote após corpo/cabelo/roupa/arma passarem separadamente. Todos os itens continuam `approved:false`, fora do catálogo de produção. Cross-view de cabelo, proporções, roupas e manejo de arma ainda precisa de aprovação artística do personagem completo. Skills, impactos, ataques, física, câmera, equipamentos, Haki, Zoan e saves continuam no fluxo atual.

Os GIFs usam paleta exata, transparência e oito frames; sem quantização ou fundo embutido. O formato alterna120/130ms para média8FPS; o Canvas usa125ms. O conjunto das quatro direções totaliza266 cores opacas: o GIF combinado foi omitido para preservar os pixels, mantendo os dois GIFs laterais individuais com73/76 cores. A prévia Canvas mostra as quatro vistas juntas, sem esse limite de paleta.

## Orçamento

Foi anunciado teto de38 gerações para seis chamadas: dois corpos de1 e quatro camadas de9, sem retries pagos ou overage. O proprietário já havia delegado decisões recomendadas no PixelLab. O auto global permaneceu inalterado. Os seis getters confirmaram **38 gerações cobradas**:1+9+1+9+9+9. O acumulado conservador da execução é150:147 confirmadas,2 anteriormente reportadas e1 estimada de job antigo sem cobrança final exposta. Nenhuma geração paga foi repetida. O uso por chamada e os estados terminais estão no manifesto; a cobrança individual do Workbench não é exposta, e a ferramenta o declara gratuito para assinantes. Não se calcula custo pela variação do saldo compartilhado e nenhum dado de conta é versionado.

## Validação e pendências

Validação local:38 arquivos Node e33 testes Python de auditoria/montagem passaram. Em Chromium, o pacote completo passou nos32 frames Walk e16 Idle,16 combinações de camadas em cada uma das quatro vistas (64 comparações), pivôs, profundidade, edição/exportação de sockets, tela1366px, celular393px e saves intactos. Cada um dos16 frames laterais foi comparado com composição Pillow independente dos PNGs originais e com o GIF decodificado. O ensaio isolado do mundo observou todos os oito passos nas quatro direções, com dano legado, Haki e bypass Zoan preservados. Testes: comparação independente de cada pose com os PNGs originais e GIF decodificado; controles de camadas; sockets; profundidade; preservação das vistas anteriores; celular393px; movimento real no mundo, combate legado, cache, Haki, Zoan e saves. Evidências locais ficam no diretório ignorado `docs/evidence-paper-doll/`, com upload de artefato na CI.

A arquitetura e os assets ainda não concluem a Fase1: Attack/sword nas quatro direções permanece ausente:32 frames por camada anatômica/vestuário,96 no total, mais32 encaixes da arma e eventuais vistas de lâmina específicas. A aprovação da arte completa continua pendente, e não há ativação de personagem incompleto na aventura. Nenhum gasto de ataque é iniciado nesta entrega.

As capturas da prévia1366/393px, os dois atlas ampliados e os personagens no mundo foram inspecionados visualmente. O teste de combate real das sete classes passou. O novo teste de mundo exige fallback de caminhada apenas para direções realmente ausentes; com as quatro presentes, verifica todas as32 poses e mantém o fallback de Attack. O catálogo publicado continua sem flags de aprovação.

Build GitHub Pages e teste de cache passaram com68 recursos versionados, sem pedir o game antigo nem alterar saves. No ensaio de mundo, o cache usou48 entradas/1.356.432bytes (limite4MiB), e houve426 de dano real observado no contexto de teste. Esses números descrevem esse ensaio, não um benchmark universal de FPS ou balanceamento.
