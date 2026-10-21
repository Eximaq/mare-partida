# Paper Doll — lote de camadas por atlas, 21/10/2026

Estado: **reprovado no primeiro gate artístico**. O lote aprovado tinha teto18 gerações, sem retries, na ordem espada → cabelo → roupa. Foi consumida uma chamada com cobrança confirmada de6 gerações. Cabelo e roupa não foram enviados; o teto restante não autoriza tentativas extras.

## Resultado real

O MCP `inpaint_image_pro_flash` entregou uma camada transparente nativa128×128, com quatro células64×64 sobre poses Idle/sul existentes. Job `c41dbbaa-b5bf-482c-bd5c-a3e6a8278763`, asset `cd0a0ad6-2c28-50a2-9966-44ade1987036`. Todos os pixels solicitados vieram do PixelLab; fontes e saídas brutas foram preservadas. Descrição exata, referência, máscara, contexto, bounding box e seed1612130099 constam no [manifesto](../pixellab-pip-generations/paper-doll-layer-batch-20261021/manifest.json); o plano registra também as duas chamadas não executadas.

A auditoria estrutural passou: zero alterações no corpo, zero pixels fora da máscara, alfa binário e contato da arma com a mão em todas as poses. Isso não aprovou a arte. A inspeção ampliada mostrou lâmina e guarda inconsistentes: as camadas têm79/51/74/53 pixels visíveis e caixas17×17/14×15/15×16/16×15. Essas medidas são evidências auxiliares; a reprovação decorre da variação visual observada entre as poses, não de um limiar automático de quantidade de pixels.

Não houve pintura, recoloração, reposicionamento ou cópia de uma espada estática entre frames para esconder a falha. A extração autorizada divide as quatro células nativas na ordem de leitura; padding transparente10/13 restaura o canvas84×84 e pivô42/65. O GIF usa quatro frames reais,4FPS, loop0 e disposal2, com RGBA visível comparado ao PNG de cada frame.

## Inspeção e compatibilidade

A [prévia interativa](../pixellab-pip-generations/paper-doll-layer-batch-20261021/preview.html) compara corpo original, ensaio anterior e novo atlas, com controle de frame, reprodução, visibilidade da arma e pivô. O rig é explicitamente de diagnóstico corpo/arma, `approved:false`; não é um conjunto humano completo. O jogo mantém o fallback. Classes, facções, equipamentos de produção, combate, eventos de impacto, saves, Haki e Zoan não foram alterados.

O pacote estático inclui somente a prévia e arquivos públicos necessários por allowlist. Scripts Python, máscaras e arquivos de trabalho não são distribuídos no Pages. O PR continua em revisão, sem merge ou publicação automática.

## Verificação reproduzível

```text
python pixellab-pip-generations/paper-doll-layer-batch-20261021/assemble_review.py
python tests/paper_doll_fit_audit_test.py
python tests/paper_doll_batch_audit_test.py
python tools/build_pages.py
python tests/paper_doll_layer_batch_browser.py
```

O último teste usa Chromium real: compara os pixels de cada canvas aos PNGs, verifica os quatro contatos, o aviso de reprovação, ausência das peças dependentes, alternância da arma, ciclo4FPS, desktop/mobile e preservação de um save sentinela isolado. O workflow Paper Doll também executa as regressões existentes. Capturas ficam em `docs/evidence-paper-doll/`, ignoradas pelo Git.

Resultado local desta continuação:11 testes de camada e5 de lote passaram; suíte Node `paper-doll.test.cjs` passou; build Pages passou; prévia Chromium em1366×900 e393×852 passou. A regressão `paper_doll_browser.py` também passou:80 poses de fallback por viewport, importação/conformidade, saves preservados e combate real pelo renderizador antigo. Na amostra local de1,8s foram109 frames, mediana/p95 de16,7ms e nenhuma composição modular ativa. São medições deste cenário, não validação artística nem promessa geral de desempenho.

## Pendências e próximo passo

Continuam ausentes camadas aceitas de espada/cabelo/roupa para Idle/sul, além das demais direções e ações. Não é possível declarar o personagem modular animado completo. Antes de nova geração paga, definir uma estratégia de produção que mantenha o modelo da arma entre poses, com novo custo apresentado ao proprietário. Alternativa sem créditos: receber do artista quatro camadas compatíveis com as poses e máscaras preservadas. Nenhuma dessas produções foi iniciada automaticamente.
