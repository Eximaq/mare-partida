# Paper Doll — repouso em quatro direções

## Entrega desta etapa

O pacote de revisão reúne16 poses reais de Idle (4 frames ×4 direções), com corpo, cabelo e roupa em folhas separadas e uma espada rígida própria por vista. É um **protótipo em inspeção**, não uma migração completa do jogo. Todos os itens permanecem `approved:false`. Walk e Attack ainda usam o personagem original, assim como habilidades, dano e morte. Não há alteração de saves, hitboxes, relógios de combate, classes, facções, equipamentos, Haki ou Zoan.

[Abrir prévia](../pixellab-pip-generations/paper-doll-expansion-20261021/preview.html) · [Abrir conjunto direto na bancada](../tools/paper-doll-inspector/index.html?pack=expansion-idle) · [PNG animado sem perda](../pixellab-pip-generations/paper-doll-expansion-20261021/idle-four-directions.png).

## Arte e procedência

- Sul: conjunto anterior preservado em `paper-doll-hair-outfit-20261021`, sem novas gerações para esta vista.
- Outras direções: base humana64×64 criada no PixelLab a partir do mesmo corpo frontal; personagem `490799ff-e510-4685-b390-212ec6869bf1`. Foram preservadas as quatro rotações e os downloads originais. Uma falha de acesso aos URLs de rotação foi resolvida pelo ZIP oficial, sem gerar novamente.
- Repouso: três chamadas `animate_image`, quatro frames gerados por direção. A referência retornada no índice0 fica separada; os quatro frames são usados na ordem original a4FPS.
- Cabelo e roupa: seis chamadas `inpaint_image_pro_flash`, uma por peça/direção, em atlas128×128 contendo quatro células nativas64×64. Máscaras binárias protegem o corpo fora da região de cada peça. Saídas isoladas auditadas antes de dividir, sem recoloração, reparo pintado ou espelhamento.
- Espada: três chamadas mascaradas64×64, com contato no corpo original e sem modificar sua anatomia. Cada direção tem sua própria imagem. A vista oeste tem guarda menos legível e ainda pode receber polimento artístico; não é aprovação final de identidade entre vistas.

Os arquivos originais e receipts ficam em `pixellab-pip-generations/paper-doll-expansion-20261021/`. Arquivos ampliados de inspeção e ZIP bruto ficam preservados localmente, fora da distribuição estática. O manifesto e a receita registram prompts, parâmetros, IDs, custos expostos e falhas, sem dados de conta ou credenciais.

## Alinhamento e composição

Rig `human-v1`, canvas84×84, pivô42/65. Não há escala na montagem. Frente e costas recebem padding10/13; perfis10/10 porque os pés dos perfis nativos terminam três pixels abaixo. Essa translação fixa por direção registra todos os pés na linha65; não corrige ou esconde erros quadro a quadro.

Corpo/roupa/cabelo: folhas336×336, linhas sul/norte/oeste/leste e quatro colunas. Armas: fontes nativas64×64 com `clip.sources` por direção e sockets medidos por frame. Norte e oeste usam profundidade10, antes do corpo; sul e leste80. O compositor preserva o recorte natural das mãos. A auditoria rejeitou inicialmente um encaixe oeste porque a mão subia no segundo frame; os sockets foram remarcados sobre as poses reais, sem tocar nos PNGs.

`assemble_review.py` verifica as máscaras, a linha dos pés, o contato da arma em todas as poses e a recomposição PNG animada sem perda. `prepare_review.py` e `inspect_layer.py` não iniciam gerações pagas. A reconstrução da montagem é local e gratuita.

## Bancada

O link com `?pack=expansion-idle` carrega somente um pacote local previamente permitido. Funciona no celular sem seletor de arquivos. Não aceita URLs arbitrários. A prévia permite reproduzir, escolher frame, ocultar cada camada e exibir pivôs.

O editor de encaixes da bancada permite alterar posição e profundidade por frame, restaurar o pacote original e exportar JSON portátil. Todas as mudanças ficam na sessão, com aprovação artística desabilitada. O importador deduplica PNGs e preserva as fontes/âncoras de cada direção.

## Movimento: resultados que não foram promovidos

A caminhada livre frontal foi preservada (referência +8 frames), mas reprovada pelo movimento dos braços e fechamento fraco do ciclo. A caminhada guiada tem passos regulares, mas altera rosto/olhos e estreita o corpo; também foi reprovada. Não foram geradas roupas sobre esses movimentos. Os frames não foram encurtados, duplicados ou espelhados para aparentar aprovação.

O estudo frontal de ataque é um teste apenas do corpo, ainda sem peças compatíveis. A primeira chamada terminou sem imagem bruta e sem cobrança final exposta. A única tentativa sem âncora final idêntica entregou8 frames e confirmou1 geração cobrada. O gesto existe, mas os frames centrais mudam as proporções e perdem clareza dos braços/mãos. Foi reprovado; não foram geradas peças sobre esse movimento, nem habilitado Attack no pacote. Todos os nove PNGs retornados (referência +8 frames) estão preservados.

## Créditos e limite

O usuário autorizou a continuação autônoma e as decisões recomendadas de PixelLab. Adotou-se teto conservador de100 gerações adicionais nesta execução, sem overage em dólares, mantendo auto global inalterado. O teto não é uma meta de consumo.

Acumulado desta execução: **56 gerações com cobrança final explicitamente confirmada** (caminhada livre1 +repousos3 +camadas36 +espadas15 +ataque1), mais **2 reportadas nas ferramentas** para criar as rotações e a caminhada guiada. O ataque inicial tem estimativa1 sem cobrança exposta. O acumulado conservador é59. Não foi presumido reembolso de job sem imagem. O lote anterior do Idle/sul não é contado novamente. Nenhum job desta execução permanece pendente.

## Validação

Os testes verificam16 poses reais, composição RGBA independente, visibilidade de camadas, fontes de arma por direção, profundidade, importação mobile, edição/exportação de encaixes, fallback de Walk/Attack e save intacto. A conferência visual de Idle deve abranger todos os frames no navegador; igualdade de pixels não equivale a aprovação artística.

Execução local:33 arquivos de testes Node passaram; build Pages passou; testes Chromium `paper_doll_socket_browser.py`, `paper_doll_expansion_browser.py`, `paper_doll_modular_idle_browser.py`, `paper_doll_browser.py` e `pages_cache_browser.py` passaram. Foram inspecionadas as capturas de16 poses e das telas1366px/393px. A regressão de combate das sete classes também passou. No ensaio curto de combate legado,109 frames em1,8s, mediana/p95 de16,7ms; isso mede fallback, não um elenco modular completo em combate. A conferência Pages verificou60 recursos versionados e preservou o save. Capturas ficam no diretório local ignorado `docs/evidence-paper-doll/` e no artefato de CI.

O critério completo da Fase1 permanece pendente: faltam corpos e peças aprovados para caminhada e ataque nas quatro direções. O avanço desta etapa é o conjunto Idle multidirecional e o pipeline de encaixes/inspeção. Não houve merge automático.
