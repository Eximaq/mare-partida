# Paper Doll — contato da espada, 21/10/2026

Continuação na branch `feature/paper-doll-idle-sul`, PR45. Esta etapa resolve o teste mecânico de contato arma/mão em quatro poses Idle/sul, sem reconstruir o corpo. A migração visual do personagem inteiro permanece parcial.

## Resultado e limite artístico

Quatro camadas nativas64×64 isoladas passaram na verificação de máscara e contato. Nenhum pixel do corpo é liberado nas máscaras; os resultados não contêm corpo, mão duplicada, matte ou pixels fora da região autorizada. Cada camada encosta na mão de seu frame original. Não houve recorte corretivo do resultado, pintura, recoloração, rotação, deslocamento, duplicação, espelhamento ou animação por imagem estática.

O conjunto ainda tem variação de tom, inclinação e espessura da lâmina. Os três primeiros resultados têm45 pixels visíveis cada; o quarto tem67. Os bounding boxes medem16×15,15×15,13×14 e18×16. O contato passou, mas não se declarou identidade visual perfeita ou aprovação artística final. Todos os arquivos de revisão mantêm `approved:false`. As diferenças ficam expostas no comparativo e no GIF.

Cabelo e roupa do piloto anterior continuam reprovados. Este teste não substitui essas peças, não conclui as quatro camadas do humano e não entrega Idle em outras direções, caminhada ou ataque.

## Ferramenta e aprovações

Foi consultado gratuitamente `get_pro_flash_capabilities(operation:inpaint,width:64,height:64)`, que confirmou canvas nativo64×64, saída única, máscaras binárias, método de saída com alterações isoladas e estimativa provisória5 gerações/chamada.

O proprietário aprovou quatro chamadas MCP `inpaint_image_pro_flash`, teto24, sem retries, com inspeção do primeiro resultado antes dos demais. Todas usam o corpo do frame correspondente, máscara própria que congela todo alpha corporal, `output_method:"New layer with changes"`, `crop_to_mask:true`, `no_background:true` e seed338809494 compartilhada, sem promessa de determinismo. O primeiro resultado passou na inspeção e permitiu continuar.

O quarto job original falhou por sobrecarga e não entregou imagem. Uma nova tentativa exclusiva foi aprovada, teto adicional6 e teto conservador revisado30, sem outras tentativas. Ela concluiu e forneceu o quarto PNG; nenhum cancelamento, exclusão de asset remoto ou retry automático foi feito.

| Frame / chamada | Job | Uso informado |
|---|---|---|
|1|`9dc8ced3-ff01-4f17-b397-d9bdfd5c3695`|5 gerações cobradas|
|2|`876aa4be-b039-4804-8871-5ff1f3985901`|5 gerações cobradas|
|3|`c6332221-aa95-42bd-8d01-1f442994d564`|5 gerações cobradas|
|4, falha|`63a9811b-9f89-418f-8da0-cabaa2dc3325`|Cobrança/reembolso não expostos pelo getter|
|4, retry autorizado|`f5ad63da-1328-47a3-9b5e-2fbfa46cfba7`|5 gerações cobradas|

São **20 gerações com cobrança confirmada nesta etapa**, mais a cobrança desconhecida do job falho. Não se presumiu reembolso nem um total exato incluindo essa falha. Os16 cobrados nos pilotos anteriores permanecem no histórico; não foram consumidos novamente nem usados para inferir saldo da conta.

Prompts exatos, tradução, parâmetros, recibos, source-image IDs e custos por chamada estão em `pixellab-pip-generations/paper-doll-sword-fit-20261021/manifest.json`. O blueprint representa as quatro chamadas que produziram os arquivos; a chamada duplicada falha consta somente no histórico do manifesto. Reproduzir exige nova autorização, não é uma rotina automática de gasto.

## Contrato e infraestrutura preservada

Cada corpo foi copiado byte a byte de `body-raw-01.png` a `body-raw-04.png` do lote anterior. Os pontos de contato medidos no canvas64 são20/36,18/35,20/36 e19/35. `prepare_inputs.py` gera apenas controles binários de máscara, sem pixels de personagem. Não se usam coordenadas de uma mão redesenhada pela transferência anterior.

O novo `audit_changes_layer` em `tools/paper_doll_fit_audit.py` verifica:

- Canvas idêntico, máscara binária válida e todos os pixels corporais congelados.
- Alpha somente 0/255 e zero pixels visíveis fora da máscara ou sobre a anatomia.
- Preservação exata dos pixels corporais após composição.
- Adjacência real da camada à região da mão indicada, não apenas proximidade com o bounding box do corpo.

O resultado é diagnóstico estrutural, não aprovação de estilo. A ferramenta não corta vazamentos para fazer o teste passar nem desloca a arma para corrigir o contato. O CLI recebe `--changes-layer --mask ... --contact X Y`; os modos anteriores de auditoria de composto e extração permanecem compatíveis.

`assemble_review.py` recusa qualquer frame ausente ou reprovado antes de criar uma sequência completa. Com os quatro arquivos reais, cria folhas336×84 por padding10/13, pivô42/65, e GIF transparente de quatro frames a4FPS. A decodificação do GIF é comparada em RGBA visível com cada original; loop0,250ms e disposal2 são verificados. Nenhuma imagem foi interpolada.

A página `preview.html` compara o mesmo corpo com a arma antiga e com a nova, permite frame manual, reprodução, pivô/contato e ocultação da arma. O compositor real `paper-doll.js` desenha as duas camadas sincronizadas em um rig explicitamente de inspeção, `sword-contact-review-v1`. Esse rig exige somente corpo/arma para testar o encaixe; não é `human-v1`, não está no catálogo do jogo e não reduz os quatro slots obrigatórios de produção. O jogo mantém fallback completo, Haki/Zoan, classes, combate e saves.

## Validação e distribuição

Dez testes Python de auditoria passaram, incluindo rejeição de camada com corpo duplicado, vazamento de máscara, alpha parcial, arma solta, canvas errado e máscara que deixa anatomia desprotegida. A montagem confere os quatro resultados reais e seus hashes. O teste Chromium `tests/paper_doll_sword_browser.py` compara cada frame em RGBA, alterna arma/pivô, confere loop e isolamento do save em desktop/mobile; a avaliação artística foi feita separadamente e registrou a variação da lâmina.

Também passaram as32 suítes Node, `python tools/build_pages.py`, a regressão da bancada/jogo e o teste de cache Pages/saves. A workflow Paper Doll instala Pillow13.0.0 (versão validada localmente), executa a auditoria e recompõe os artefatos a partir dos originais antes do build e dos testes no navegador.

O build inclui somente os arquivos de revisão por allowlist. Scripts Python, guias ampliados e evidências locais não entram no Pages. Capturas atuais: `docs/evidence-paper-doll/sword-contact-1366.png` e `sword-contact-393.png`, ignoradas pelo Git. Sem migração de save, ativação no gameplay ou merge automático. Rollback por revert do commit desta etapa.

## Próximo passo

Revisar a identidade da espada ao longo do ciclo antes de ampliar ações. O método de máscara congelada demonstrou preservação anatômica; ainda faltam cabelo/roupa aceitos e uma arma artisticamente consistente. Novas gerações ou correções dependem de plano e autorização próprios; não há consumo futuro agendado.
