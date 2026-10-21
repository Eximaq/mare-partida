# Paper Doll — estudo de caminhada de costas

[Prévia técnica](../pixellab-pip-generations/paper-doll-walk-north-20261021/preview.html) · [Bancada com o pacote parcial](../tools/paper-doll-inspector/index.html?pack=walk-north) · [Corpo e espada em movimento](../pixellab-pip-generations/paper-doll-walk-north-20261021/walk-north-body.png) · [Cabelo bruto reprovado](../pixellab-pip-generations/paper-doll-walk-north-20261021/walk-north-hair-draft.png).

> Histórico preservado. A [continuação norte](PAPER-DOLL-NORTE-COMPLETO.md) entrega cabelo e roupa por pose em outro pacote de revisão, sem sobrescrever este estudo ou ativar o personagem em produção.

## Resultado real

O corpo humano de costas possui oito passos reais, mantém a orientação norte e tem contato validado com a espada original em todos os frames. O corpo não foi redesenhado ou corrigido localmente. As mãos têm sockets próprios, com a lâmina atrás do corpo e cabo ocluído pela mão.

**O conjunto norte ainda não está completo.** O cabelo gerado ficou correto nos frames1–4, mas os frames5–8 mostram couro cabeludo careca. O resultado passou na auditoria geométrica de contato/transparência, mas foi reprovado visualmente. Os oito originais continuam preservados; não se encurtou o ciclo nem se copiaram os primeiros frames sobre os demais. A roupa não foi gerada após essa falha.

O pacote mantém Idle nas quatro vistas e Walk/south completos para inspeção. Body/weapon possuem a sequência norte, mas hair/outfit não a declaram: o compositor rejeita atomicamente o conjunto norte e usa o personagem existente. A prévia separa esse fallback dos estudos brutos, explicitamente identificados. Todas as peças permanecem `approved:false`; não há ativação no catálogo de produção ou alteração de combate, movimento, equipamento, câmera, Haki, Zoan ou saves.

## Produção e economia de margens

MiniMax animou a referência norte existente, em64×64, entregando a referência original mais oito frames. A referência foi comparada pixel a pixel no conteúdo visível e mantida separada. Os passos usam8FPS na ordem original.

Para gerar peças, o mesmo recorte fixo `(16,4,48,56)` reduz somente margens transparentes, de64×64 para32×52. O atlas4×2 fica128×104. Reconstruir cada corpo em64×64 recupera todos os pixels visíveis; se algum pixel for cortado, a preparação interrompe antes do gasto. No rig84, a origem das peças restauradas é26/17, equivalente ao recorte16/4 mais padding10/13. O pivô42/65 permanece fixo. Não há escala, centralização por frame ou estabilização artificial da passada.

O cabelo foi uma edição mascarada independente sobre esse corpo, com saída transparente. O contexto contém os oito corpos e uma referência náutica de costas, sem redimensionamento. A máscara preserva todo o corpo fora da cabeça. Esse método reduziu a cotação de nove para seis gerações por camada de oito frames, mas o formato compacto não garantiu o conteúdo artístico correto.

`hair-style-observation.json` registra uma observação de paleta: aproximadamente91% dos pixels da camada são escuros nos primeiros quatro frames, contra28–30% nos últimos quatro. Isso sustenta o diagnóstico visual; não é uma métrica genérica de aprovação de cabelo. A aparência precisa ser inspecionada mesmo quando geometria, contagem e transparência passam.

## Custos, procedência e pendências

Cobranças finais expostas: MiniMax1 geração e Pro Flash/cabelo6, total **7 confirmadas nesta etapa**. Acumulado conservador da execução: **94/100**, sendo91 confirmadas,2 previamente reportadas e1 estimada de job antigo sem cobrança final exposta. Não houve chamada de roupa, retry, overage em dólares ou mudança do auto global. Os seis restantes foram preservados, pois o plano de13 não cobre corrigir o cabelo e concluir a roupa pela rota validada.

Receipts, IDs, prompts, seeds, máscaras, hashes e receita estão no diretório do estudo, sem dados de conta ou credenciais. As fontes visíveis vêm do PixelLab; scripts locais apenas verificam, recortam margens, restauram padding e compõem. Guias opacos/xadrez são auxiliares separados da arte, não fundos embutidos.

Próxima produção recomendada: validar uma correção dos quatro frames de cabelo defeituosos em um atlas quadrado suportado, preservando todos os originais, antes da roupa/norte. Cotar o novo formato e seu custo antes de iniciar; isso é uma proposta, não um job pendente. Os perfis de caminhada e todos os ataques seguem ausentes. O estudo de ataque anterior ainda exige corrigir proporções antes de produzir peças.

## Verificação

O pipeline de lote aceita células retangulares sem alterar o contrato84 do jogo. Testes de geometria verificam índices e pixels de cada célula, rejeição de dimensões inválidas e reversibilidade do recorte, incluindo um pixel parcialmente transparente que ficaria de fora.

A prévia permite ver todos os oito passos do corpo/espada e do cabelo bruto reprovado, com reprodução e slider. A bancada deve manter fallback norte em todos os frames, sem desenhar apenas parte do personagem, e continuar mostrando Idle e Walk/south. Evidências locais ficam no diretório ignorado e no artefato de CI. Os resultados executados serão registrados após a conferência em navegador.

Validação local executada:38 arquivos Node e30 testes Python de auditoria/compaction/montagem passaram; o build Pages passou. Em Chromium, `paper_doll_north_study_browser.py` comparou os dois estudos com composição Pillow independente dos PNGs originais nos oito frames, verificou reprodução, fallback norte em todas as poses, preservação de Walk/south, celular393px e save intacto. O teste genérico da caminhada passou tanto com o pacote anterior quanto com este pacote parcial. O ensaio de mundo manteve Idle nas quatro vistas, oito frames de Walk/south, ataque/dano legados, Haki, bypass Zoan, cache limitado e schema do save. Capturas1366/393px e os estudos ampliados foram inspecionados; essa validação técnica não aprova o cabelo reprovado nem conclui a caminhada modular norte.
