# Paper Doll — movimento do Bento, sem duplicação por facção

## Entrega desta etapa

Dois estudos frontais preservados. O primeiro, `transfer_outfit`, consumiu10 gerações confirmadas e foi reprovado: na pose de índice2 a espada virou parte do braço. A composição vestida pode esconder esse erro; por isso todas as seis peças desse pacote ficam `available:false`, inclusive para inspeção com `allowDraft`. Não foi ativado no jogo.

O segundo usa `animate_with_skeleton_v3`, com18 articulações por pose medidas manualmente no Bento existente, não nas pontas da lâmina. Foram cobradas3 gerações e retornados exatamente8 frames, sem eco de referência. A preparação agora mantém a mão junto ao torso, o corpo muda de apoio e o golpe tem rotação e recuperação. É um **protótipo frontal em avaliação**, sem aprovação artística final, sem outras direções certificadas e sem ativação no jogo.

Total desta continuação: **13 gerações confirmadas**, sem solicitação de overage em dólares, sem jobs pendentes e sem geração paga de roupas. Os tetos anunciados foram25 para a transferência e4 para o teste por esqueleto; só uma chamada foi executada em cada rota. O auto global não foi alterado. Não se usa o saldo compartilhado para inferir cobrança.

## Prévia e camadas

[Comparação atual](../pixellab-pip-generations/paper-doll-bento-skeleton-20261021/preview.html) · [GIF modular](../pixellab-pip-generations/paper-doll-bento-skeleton-20261021/modular-south.gif) · [Pacote de inspeção](../pixellab-pip-generations/paper-doll-bento-skeleton-20261021/review-pack.json) · [Primeira transferência reprovada](../pixellab-pip-generations/paper-doll-bento-motion-20261021/preview.html).

A prévia compara Bento original, novo Paper Doll, transferência reprovada e novo corpo sem roupa, no mesmo frame/12FPS. As peças podem ser ocultadas individualmente. O compositor reutilizado é `paper-doll.js`, sem modificar seu código. Nenhum script da prévia grava saves ou ativa o catálogo do jogo.

O corpo é gerado pelo PixelLab. Cabelo, colete/camisa, calças, botas e espada são seleções dos **pixels visíveis originais** dos oito frames de Bento, em PNGs transparentes separados. Regiões por pose e famílias de cor selecionam pixels; o contorno usa somente pixels vizinhos já existentes na fonte. Não há pintura local, reconstrução de superfícies ocultas, interpolação, espelhamento, poses duplicadas ou cortes temporais. Fontes, máscaras de seleção em código e hashes ficam preservados em `extract_visible_pieces.py` e `visible-pieces-audit.json`.

Essas seleções não são roupas completas para qualquer corpo, pose ou ângulo. A espada inclui os efeitos de contato originais e não é um novo modelo universal intercambiável. O encaixe foi inspecionado em oito poses; um teste auxiliar em regiões manuais da mão encontrou distância de0–1px entre pele e pixels da arma. Isso não substitui aprovação artística. Todas as peças do candidato continuam `approved:false`; as demais direções provocam fallback.

## Contrato reutilizável de movimento

- Fonte: `assets/classes/pirate-sword/attack.png`, inalterada;8 frames a12FPS, impacto legado no índice3.
- Crop de trabalho: `[10,13,74,77]` em cada célula84, removendo só transparência; nenhum pixel visível do ataque original é perdido.
- Corpo neutro existente copiado sem alteração; canvas64, pivô32/52.
- `joint-controls.json` registra18 joints, coordenadas normalizadas, lados do personagem, profundidade de desenho e oito poses. São controles de geração autorais medidos na referência, não arte nova nem extração automática infalível de anatomia.
- Retorno ao rig: somente padding10/13, canvas84, pivô42/65, sem escala. Os oito frames recebidos ficam na ordem original.
- A rotação rígida de90° não participa do novo corte. A lâmina usa suas poses nativas originais em vez de girar bruscamente uma imagem estática.
- Este gesto é compartilhado por categoria de espada, independente de classe/facção; não gerar a mesma coreografia novamente para cada facção.

## Limites e próximos assets

Continuam pendentes: norte/oeste/leste do novo corpo e peças coerentes nessas vistas, integração com Idle/Walk deste visual, outras armas e aprovação do personagem completo. Não misturar automaticamente o colete vermelho deste estudo com o conjunto azul anterior e declarar continuidade validada. Ataques das outras categorias não foram refeitos nesta etapa.

Os controles por pose podem orientar novos corpos e roupas, mas cada resultado precisa de inspeção sem vestuário e verificação das mãos antes da camada de arma. O conjunto reprovado de giros rígidos continua preservado como diagnóstico. Bento e o renderizador legado seguem como fallback. Combate, física, eventos de impacto, câmera, classes, facções, Haki, Zoan e saves não foram alterados.

## Manifestos e reprodução

Cada pasta contém manifesto, receita `.blueprint.json`, fontes, PNGs brutos, GIF exato e auditoria de montagem. Seeds foram omitidos; não há promessa de reprodução estocástica idêntica. Os GIFs usam paleta exata, transparência, disposal2, loop0 e tempos80/90ms somando670ms. A prévia Canvas usa12FPS, execução única e mantém a última pose. Montagem e testes nunca chamam PixelLab.

- [Transferência e prompt exato](../pixellab-pip-generations/paper-doll-bento-motion-20261021/manifest.json).
- [Skeleton v3, descrição exata e articulações](../pixellab-pip-generations/paper-doll-bento-skeleton-20261021/manifest.json).

## Validação

Build Pages e os39 arquivos de testes Node passaram, incluindo as quatro suítes Paper Doll. Chromium conferiu os dois estudos: recorte reversível das fontes,24 comparações RGBA por estudo, GIFs exatos, reprodução única, quadro de impacto, viewport393px e isolamento de save. No novo candidato, conferiu ainda os oito quadros do compositor,32 combinações das cinco peças, fallback norte, limites de cache e GIF modular contra composição Pillow independente. Capturas desktop/celular e as folhas ampliadas foram inspecionadas. A anatomia da primeira transferência foi reprovada; testes geométricos não constituem aprovação artística final.

A regressão de combate legado das sete classes também terminou com sucesso. Uma primeira execução teve timeout na inicialização do diagnóstico sob carga; a página normal foi conferida sem erros de JavaScript e a repetição isolada passou, sem alterar o teste ou o jogo para contornar a falha. Essa regressão não certifica o protótipo novo em combate, pois ele permanece fora do catálogo.
