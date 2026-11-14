# Sexto lote: quatro peitorais independentes com M111/M112

Base local `c19c716` equivale à árvore publicada `0f107ab`. Nova cobertura dos peitorais 151, 158, 165 e 179 nos ataques masculinos 111/112 EAST/WEST, aparência original (cabelo/olhos castanhos, pele clara). São camadas separadas de roupa sobre a anatomia original, abaixo da arma original. Não há chave de traje fechado nem alteração de motor, relógio, impacto, recarga, rede ou slots.

A fonte aprovada contém roupa e ownership. A receita preserva RGBA, zera apenas alfa onde ownership original é positivo e acima de y=205, e recompõe base → roupa → arma. WEST espelha cada camada EAST e é comparado com a referência WEST aprovada. As 128 recomposições de fonte são RGBA exatas. O arquivo de base/arma reproduz o SHA do terceiro lote; os 32 quadros sem peitoral permanecem intactos.

## Verificação raster

128 quadros no compositor real: alfa exato, M112 RGB≤1; M111 opacos RGB≤1 e translúcidos premultiplicados≤2. A exceção original de M111 repete exatamente seus 56 canais em cada peitoral: 224 canais RGB acima de1, alfas {133:40,180:40,187:40,195:80,207:24}, máximo premultiplicado 414/255. Não se ampliou tolerância nem reparou pixels para cada roupa. Provas de fonte exatas e diferenças de premultiplicação Canvas estão separadas.

O seletor aceita os quatro peitorais com ambas as armas, preserva a rota sem peitoral e rejeita luvas, botas, calças, cabeça/capa extras, subconjuntos e paletas não comprovadas. Remover a arma não mantém o rig111/112: a rota de peitoral sem arma já existente decide o desenho, não a nova fonte de ataque. Isso não comprova intercâmbio irrestrito de aparência ou outros equipamentos.

Testes: `rework-sixth-gauntlet-coats`, `rework-sixth-world-bundle`, `rework-separable-111112`; CI nativa inclui os novos testes serialmente. No mesmo worldVisual real, a sequência 111/151 → 111/158 → 112/158 comprovou troca independente de peitoral e arma, invalidação da identidade anterior, desenho EAST/WEST e quadro4; luvas152 extras e remoção da arma produziram novas identidades sem seleção111/112 indevida. O teste negativo comprova a saída da nova rota, não reclassifica a fidelidade de todos os slots nas rotas antigas. Todos os quatro peitorais são cobertos pelas 16 seleções e 128 rasters. A verificação headless de worldVisual não substitui equipar/recarregar no navegador ou observar o mapa. Essas verificações visuais continuam pendentes.

## Reprodução

`python tools/rework-weapon-layers-hd/package-sixth-coats.py --approved-dir DIR --recovery111 ZIP --rebuilt112 DIR --output-dir OUT`

Os dois ZIPs aprovados e SHA estão em `sixth-coats-source-proof.json`; entradas de anatomia/arma são as mesmas verificadas no terceiro lote. A receita requer Pillow e NumPy. Sem credenciais, rede, geração de arte ou fontes de fallback.

Diagnóstico de recursos: uma execução redundante foi interrompida manualmente (130); outra atingiu limite180s (124); uma sequência de cinco identidades terminou com falha genérica do processo, sem sinal conclusivo de OOM. A sequência mínima acima passou com todas as asserções em66s; nenhuma tolerância ou comportamento foi alterado para isso.

## Bloqueio pré-existente na suíte ampla

`npm test` passou (243 testes foundation; 245/245 arquivos legacy), assim como build e integridade286 ZIPs/18.494 PNGs/179 cabeças. A suíte adicional `npm run test:rework-hd` executou190 testes:189 passaram e1 falhou em `player-rework-outfit-overlay-hd.test.cjs`, “109/133 exact body identity, immutable inputs and native rendering all approved states” (`adapt(w,o)` devolve null, EAST). O mesmo arquivo falhou de modo idêntico na base intocada `c19c716`; não se repetiu toda a suíte190 na base. O teste antigo tenta aplicar overlay133 a todos os registros109, incluindo16 composições male/female posteriores sem `basePack`; o adaptador as rejeita corretamente. Esses registros e esse teste não foram alterados neste lote. Esse bloqueio continua visível, não foi contornado nem convertido em aprovação.

O comando focal exato de integração da CI passou70/70, incluindo o teste headless final com limite240s. Isso não torna verde o workflow inteiro: o passo anterior da suíte ampla mantém o bloqueio acima. Auditoria canônica:4.679 registros, zero divergências de slot. A receita portátil reproduziu byte a byte os ZIPs de roupa, referência e verificação de base/arma. Os quatro JSONs de ajuste de cabeça e todos os registros anteriores foram preservados; apenas os quatro mapas de peitorais (dois rigs × duas direções) foram acrescentados ao índice de armas.
