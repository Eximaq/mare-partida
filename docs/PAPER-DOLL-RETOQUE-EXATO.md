# Paper Doll — retoque exato no PixelLab (22/10/2026)

[Prévia e comparação antes/depois](../pixellab-pip-generations/paper-doll-exact-retouch-20261022/preview.html) · [GIF modular norte](../pixellab-pip-generations/paper-doll-exact-retouch-20261022/modular-north.gif) · [Receita](../pixellab-pip-generations/paper-doll-exact-retouch-20261022/retouch.blueprint.json) · [Manifesto](../pixellab-pip-generations/paper-doll-exact-retouch-20261022/manifest.json).

## Avanço válido

O ataque possui agora **frente, norte e oeste** em protótipo modular:24 poses, seis camadas por direção. O corpo leste também foi corrigido, completando32 poses de corpo em quatro direções. O conjunto leste com roupa/arma continua incompleto e usa fallback integral. Todas as peças permanecem `approved:false`; nenhuma arte foi habilitada no personagem publicado e o aceite artístico completo da Fase1 continua pendente.

Frente e oeste reutilizam as células anteriores sem mudança de RGBA; seus GIFs são copiados byte a byte. O norte usa o mesmo corpo gerado anteriormente, com acabamento localizado no PixelLab Workbench, e cinco camadas selecionadas dos pixels visíveis do Bento original. Isso não recupera superfícies encobertas nem cria roupas universais para qualquer anatomia.

## Retoque de anatomia e pés

O PixelLab Workbench executou operações exatas de cópia de pixels, sem nova animação generativa:

- Norte: nas poses2–6 (numeração humana), somente a superfície fixa do dorso `[29,20,39,30]` foi restaurada a partir do dorso limpo da primeira pose. Um segundo recorte transparente removeu fragmentos pendentes do antebraço fora da silhueta. Permanecem os oito frames reais, o movimento dos membros fora da região, a cabeça, as pernas e os pés. Não se substituiu uma pose inteira nem se simulou um ataque usando um corpo estático. Os comandos mudaram394 pixels líquidos nos cinco frames; os contadores por operação408 e20 incluem pixels sobrescritos e não devem ser somados como diferença final.
- Leste: quatro poses receberam acabamento no contorno da sola do pé próximo, copiando a faixa de pele e o contorno preto da própria pose para a linha seguinte. Foram40 pixels alterados. O corpo e sua origem não foram deslocados por frame. O limite inferior agora é56 nas oito imagens nativas.

Essas alterações foram executadas remotamente pelo `pixelart_workbench`, não pintadas localmente. Os originais, os três estágios norte e o resultado leste foram preservados. `verify_retouch.py` compara os PNGs devolvidos com os comandos registrados, verifica os16 frames, regiões protegidas, transparência, grade3×3 retornada com nona célula vazia e os GIFs brutos. A referência calculada na verificação nunca é exportada como arte.

Os frames nativos64×64 usam somente padding transparente para o canvas84×84, pivô42/65: norte10/13; leste10/9. Não há redimensionamento, estabilização variável da posição, espelhamento ou corte temporal. Os GIFs brutos do Workbench, de100ms/frame, são preservados. As prévias do jogo usam o contrato anterior de12FPS; o GIF de inspeção alterna80/90ms para representar o mesmo ritmo sem alterar pixels ou a ordem dos oito frames.

## Peças e profundidade norte

`extract_north.py` documenta as regiões e os filtros de seleção de cabelo/bandana, roupa, calças, botas e lâmina/guarda. Cada pixel opaco é verificado contra a respectiva pose original do Bento. A espada é desenhada atrás do corpo e recebe uma calibração fixa de−1px emY; a verificação auxiliar encontra contato de0px com a região da mão nos três frames visíveis. Isso é evidência geométrica, não aprovação artística final.

Nos índices1–5, a célula de arma é realmente transparente. `occludedFrames.north:[1,2,3,4,5]` permite essa oclusão explícita sem enfraquecer as validações para outras peças ou assets ausentes. As poses0/6/7 conservam os respectivos desenhos visíveis originais; não se reutiliza uma lâmina girada para fabricar movimento.

## Edição do clarão leste: máscara válida, encaixe reprovado

Foi executada uma única chamada MCP `inpaint_image_pro_flash`, com fonte/máscara64×64, contexto192×128, `bounding_box:{x:64,y:0,width:64,height:64}`, `crop_to_mask:true`, `output_method:Modify current layer` e transparência. A fonte é a pose de índice5 encoberta pelo clarão. O contexto contém vizinhos e o corpo corrigido da mesma pose, em resolução nativa. Seed não enviada; o serviço retornou0.

Descrição exata: “Remove the impact flash inside the mask and redraw the pirate surfaces it covers: short black hair with a teal headband, crimson waistcoat over a cream shirt, blue trousers and a steel sailor sword. The top middle context cell is the target; the cells beside it show the outfit and sword style. The lower middle cell shows the same target pose without clothing and must guide the anatomy and hand placement. Keep the current attack pose and every unmasked pixel, native pixel scale and transparent background. No glow, sparks, impact effects, extra limbs or detached gear.”

Tradução: remover o clarão e redesenhar cabelo/bandana, colete/camisa, calças e espada encobertos, usando os vizinhos como referência de aparência e o corpo abaixo para anatomia/mão; preservar a pose, os pixels fora da máscara, escala e transparência, sem efeitos ou membros extras. O campo `context_image.usage_description` e os parâmetros exatos estão no pedido preservado.

O getter confirmou **5 gerações cobradas**, dentro do teto6. Houve zero alteração de RGBA fora da máscara. Porém a manga/mão e a posição da lâmina reconstruídas não encaixaram no corpo nem na sequência: as peças desse resultado foram reprovadas. O composto leste é apenas diagnóstico e nunca integra o pacote de camadas disponíveis. Não houve retry nem geração de outro personagem. Todos os jobs terminaram.

O Workbench é anunciado pelo PixelLab como gratuito para assinantes; suas respostas não expõem consumo de gerações por operação. As cinco gerações cobradas reportadas pertencem à chamada Pro Flash. Não houve outra geração de animação nesta etapa nem registro de saldo de conta nos arquivos.

## Pendências e validação

Ainda faltam peças coerentes de cabelo/bandana, roupa, calças e espada na pose leste encoberta e validação do encaixe de toda essa direção. O corpo leste pode ser reaproveitado sem gerar os oito movimentos novamente. A integração com Idle/Walk e a aprovação artística do conjunto completo continuam pendentes. As animações anteriores e os sprites originais permanecem disponíveis.

O teste Chromium confere24 quadros modulares e oito de fallback, RGBA independente, arma norte encoberta de fato,32 combinações de peças,16 comparações antes/depois dos corpos, reprodução única, celular e isolamento do save. Os testes Node verificam os metadados e bloqueios; a auditoria Python verifica os arquivos reais. Capturas ficam fora do Git em `docs/evidence-paper-doll/`.

A branch incorpora as correções de renderização/colisões/carregamento do colaborador via `origin/main` em `a6192c5`, sem sobrescrevê-las. O workflow anterior foi cancelado após preparar o ambiente por9min44s sob um limite de10min; o limite passa a20min para acomodar a preparação fria e a regressão completa. Nenhum teste foi retirado.

Validação local executada:45 suítes Node, nove testes das guias, auditoria dos16 frames retocados, build do Pages, teste Chromium do pacote e regressão das sete classes passaram. Capturas desktop/celular foram inspecionadas. A aprovação artística final das três vistas modulares continua pendente; a vista leste vestida permanece reprovada.

A regressão adicional da bancada identificou que o carregador atualizado acrescentava `?v=` também a URLs `blob:` locais, impedindo a importação. `faction-sprites.js` agora acrescenta a versão somente a URLs HTTP/HTTPS; arquivos relativos continuam versionados e URLs `blob:`/`data:` permanecem intactas. Um teste Node cobre essa regra e a bancada passou novamente com PNGs locais reais.
