# Paper Doll — refinamento de movimento e emissão

Referência auditada: PR #124, `4c4923233060c82ea3004d605942b2db117272cf`.
Base: `7ca59cf` (main, incluindo a Ryu do colaborador). Branch: `fix/paper-doll-runtime-refinement`.

## Diagnóstico e classificação

| Situação | Causa e tratamento | Classificação |
| --- | --- | --- |
| Caminhada dependia do desenho | `walkPose()` acumulava apenas a distância líquida entre desenhos. Uma volta quadrada de 40 px, sem desenho intermediário, contabilizava zero. `stepWalk()` agora acumula cada passo físico; desenhar só consulta. | Confirmado e corrigido |
| Pés oscilavam na vertical | 22 das 32 poses da caminhada terminavam fora do plano: 98–103 para uma raiz em 100. Offsets comuns às camadas compensam o limite inferior real do corpo, sem editar PNG. As 32 poses agora terminam em 100. | Confirmado e corrigido |
| Disparo aparecia após a liberação | Em 30 FPS, velocidade 8 e pico de 220 ms, o primeiro desenho mostrava Idle e projétil já em 44,4% do percurso. Registro transitório do impacto preserva a pose de emissão e segura somente o avanço visual até o primeiro desenho. | Confirmado e corrigido |
| Origem não correspondia ao Canvas | A conta ignorava arredondamento do retângulo composto, centro do pixel e transformações externas. A geometria compartilhada agora considera bounds, pivôs, sockets, quartos de volta e escala externa. O emissor norte da manopla apontava para transparência; passou ao pixel metálico aferido (45,14). | Confirmado e corrigido |
| Eventos visuais velhos | Cancelamento, troca de equipamento/classe, Zoan e suspensão descartam a apresentação pendente. Catch-up oculto não cria uma fila de disparos atrasados. Pose e liberação têm validade de tick/quadro. | Risco mitigado |
| Dano duplicado, custo alterado ou ataque travado | Não reproduzidos nos cenários executados. O relógio e o callback de impacto originais continuam responsáveis pelo dano; desenho não aplica dano. | Não reproduzido |
| Naturalidade completa da anatomia e passada | Os oito frames existentes conservam diferenças nativas de postura/proporção e foram rejeitados artisticamente pelo proprietário anteriormente. Estabilizar a raiz e corrigir o relógio não redesenha anatomia. A aprovação artística continua pendente. | Confirmado e pendente |
| Calibração artística dos 80 px | Não há um ciclo de contato dos pés artisticamente aprovado que justifique outra distância. Mantidos os 80 px existentes; sem ajuste arbitrário ou promessa de eliminar todo deslizamento nativo. | Confirmado e pendente |
| Habilidades, hurt/death e itens sem camadas | Continuam pelos sprites legados quando faltam frames modulares. Nenhum conjunto incompleto foi promovido. | Fora do escopo artístico desta correção |

## Implementação

- `paper-doll-review.js`: fase por passo físico, velocidade/distância reais, registros de liberação ligados ao ataque, validade temporal, cancelamento e diagnóstico somente leitura.
- `game.js`: integra a atualização ao tick existente; apresenta a liberação antes de avançar o projétil; usa o fluxo atual de visibilidade. F9 e botão do DEV habilitam diagnóstico opcional.
- `paper-doll.js`: resolve offsets da raiz e projeta pontos pela mesma geometria usada na composição/cache Canvas 2D.
- `paper-doll-complete-20261026/review-pack.json`: offsets por frame da caminhada e metadados `emission` das quatro peças de disparo.
- `paper-doll-final-categories-20261026/emitter-points.json` e `assemble_complete.py`: fonte reprodutível dos pontos e cálculo dos offsets a partir das folhas existentes.
- `tools/paper-doll-inspector/`: checkbox opcional desenha raiz, encaixe, bounds da arma e emissão. Informa ação, direção, frame, fase de prévia e fallback. O link DEV abre a medição real de fase, velocidade, distância, progresso lógico e liberação. A prévia manual não inventa velocidade de gameplay.
- `dev-tools.js` / `paper-doll-look.css`: apenas controle e apresentação do diagnóstico DEV; sem reformular a HUD normal.

O evento visual não muda `hitFrameRatio`, duração lógica, dano, energia, velocidade de ataque, física, hitboxes ou câmera. Com um delta que atravessa o impacto, o dano ocorre no instante lógico original; somente a primeira apresentação visual é preservada. Se vários impactos ocorrerem antes de um único desenho, o corpo apresenta a liberação mais recente; não se criam golpes adicionais nem frames artificiais. Registros são limitados a oito e descartados após apresentação/expiração.

## Evidências e regressões

Antes e depois em `docs/evidence-paper-doll/refinement/{before,after}/`, ignorados pelo Git. Cada classe tem caminhada real por teclado em quatro direções, ataque, viewport móvel e resultados estruturados. `comparison/` reúne comparações no mesmo enquadramento; os GIFs servem à inspeção, não ao benchmark de FPS.

- `tests/paper-doll-motion.test.cjs`: caminho fechado, renderizações repetidas/ausentes, parada/retomada, direção, parede, teleporte, troca de contexto, deltas inválidos, relógios extremos e cadências 30/60/120.
- `tests/paper_doll_complete_browser.py`: 80 poses por classe; sete classes e quatro direções no Chromium; dano único, habilidades em fallback, remover/reequipar via inventário de teste, armazenamento DEV/normal e mobile. Matriz adicional dos quatro usuários de disparo: 30/60/120 FPS × velocidades 0,5/1/8, incluindo pico de 220 ms. Cancelamento e retiming nas sete classes; transições e suspensão pelo listener real.
- `tests/paper_doll_emitter_qa.py`: 192 casos independentes (quatro armas × quatro direções × quatro rotações × três escalas, incluindo 1,35×). Marcador existe somente em cópias de imagem na memória do teste; a referência é um pixel aferido na arte, não `lastRelease`. Também confere 32 planos dos pés e 12 condições de ciclo de vida.
- `tests/paper_doll_diagnostics_browser.py`: overlay reversível, diagnóstico ausente no jogo normal, F9, mobile e isolamento do save normal.
- Regressões existentes: todos os testes Node autônomos; 56 cenários de velocidade humano/Zoan; bancada de aparência e inventário; revisão de mundo/cache/Haki; quick-cast Haki; combate das sete classes; Ryu (Node, nove testes Python de arte/backend e navegador).
- `tests/zoan_transition_browser.cjs`: espera explicitamente o hook após reload, evitando consultar um global ainda não inicializado; mantém todas as asserções do produto.
- `python tools/build_pages.py`: build estático com caminhos relativos.

A suíte visual Paper Doll inclui os novos testes e publica capturas no artifact `paper-doll-infraestrutura-capturas` por 14 dias. O resultado remoto deve ser consultado no PR; um build local não comprova deploy.

## Preservação e limites

Nenhum PNG existente foi modificado, nenhuma geração PixelLab foi solicitada e nenhum crédito foi consumido. A Ryu mantém os arquivos e clipes de 128 px aprovados; o renderizador modular não assume suas formas animais. Mantidos sete classes, facções, inventário/Forja, atributos/talentos, Haki, frutas, mapas e schema de saves. Equipamentos incompatíveis causam fallback; não são removidos automaticamente para ocultar falhas. O kit DEV anterior permanece inalterado, e os testes utilizam personagens descartáveis isolados.

`approved:false`, `productionEnabled:false` e a exigência de aprovação artística permanecem. Esta atualização prepara um PR de refinamento técnico; não libera a arte globalmente, não faz merge e não publica no Pages por conta própria. A avaliação final de naturalidade depende do proprietário e, se exigir pixels novos, de uma etapa artística autorizada.
