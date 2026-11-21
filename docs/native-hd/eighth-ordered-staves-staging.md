# Oitavo lote local consolidado: 123–127 EAST/WEST

Cinco armas, dez perfis masculinos `attack-focus`, aparência original (cabelo/olhos castanhos, pele clara), sem outras peças visíveis. Catálogo canônico: 123/124 estrategista; 125/126/127 curandeiro. O seletor de arte não substitui as regras de classe do inventário.

EAST conserva a fonte aprovada; WEST usa seu espelho literal aprovado. O WEST antigo próprio do pacote123 diverge em todos os oito quadros e não foi promovido. Arquivos SOUTH124–127 fornecem somente texturas vinculadas por SHA à receita lateral aprovada, não a animação SOUTH. Equipamento permanece separado da anatomia; grip e cabeça são desenhados acima da arma.

Reutiliza o mecanismo opt-in existente do31: oito fases, 12 fps nominal, contato 4. A amostragem visual lê o impacto atual sem alterar controlador, recarga, cadência, dano ou rede. Não se promete 12 fps literal com qualquer velocidade de ataque. Nenhum JS de produção ou JSON de cabeça mudou.

## Verificado neste candidato local

- Regressão inicialmente vermelha:123 EAST sem rota ordenada; verde após acrescentar os dez perfis.
- Dez seleções, classes canônicas e guardas de aparência, corpo, ação, direção, subconjunto, arma removida e slots extras.
- 80 quadros originais no compositor real: alfa exato, RGB máximo1, sem exceção nova.
- Fonte e referências ZIP por SHA; registros anteriores preservados. Fixture antiga de 44 quadros continua limitada aos itens 14/16/31, como no sétimo lote.

## Integração verificada e limites

O teste headless preparado mantém o mesmo worldVisual durante 123→124 (estrategista) e 125→127 (curandeiro), verifica nova identidade/fonte E/W, rejeita a identidade antiga, e exercita luvas extras e remoção da arma. Executado na árvore consolidada: bundle completo, fontes EAST/WEST, quadro 4 no contato, identidades antigas inválidas e fallbacks passaram. A/B do controlador: cinco itens × seis velocidades × 400 passos, estados/impacto/recarga/desbloqueio inalterados e oito poses observadas. `npm test` passou (243 testes foundation e 250/250 arquivos legacy), build Pages passou e comando focal serial do workflow passou 77/77. Não houve navegador, mapa, upload ou publicação.

Rejeição de uma combinação significa somente que esta fonte não comprova seus slots. Não significa incompatibilidade geral da peça; rotas antigas continuam disponíveis e sua fidelidade não é reclassificada por este lote. As 40 linhas históricas com quatro trajes foram preservadas; apenas dez linhas novas de arma isolada foram acrescentadas.

## Consolidação append-only

Partir do sétimo candidato validado, nunca substituir seus índices pelo arquivo inteiro desta staging. Acrescentar os dez descritores por `id`, recusando colisão divergente; acrescentar o arquivoZIP por nome/SHA; preservar bindings existentes de `sources` e adicionar apenas hashes ausentes. Copiar a fixture/prova/testes e acrescentar somente as dez linhas da matriz. Manter os testes/gatilhos do sétimo e o filtro14/16/31. Revalidar igualdade de todos os registros anteriores e transporte materializado antes das suítes finais.

## Proveniência e reprodução portátil

Pai publicado equivalente: `19efd698263022befeb06b2a598cfe119af72253`. Consolidado sobre a árvore exata do sétimo lote `64730b62644992facab294f297a32cf544926792`, preservando suas doze rotas de adagas e todos os peitorais do sexto. Os dois ZIPs foram reproduzidos byte a byte, inclusive as80 referências aprovadas.

```sh
python tools/rework-weapon-layers-hd/replay-eighth-staves.py --source-dir INPUTS --recipe-zip RECIPE_V10.zip --approved-index tools/rework-weapon-layers-hd/index.json --output REPLAY
python tools/rework-weapon-layers-hd/package-eighth-staves.py --source-dir INPUTS --replay-dir REPLAY --output PACKAGE
```

INPUTS contém os seis ZIPs (123,31v3 e texturas124–127) indicados na prova. Receita v10 SHA256: `7b0a85d9df7dbdcab72d3621f8f479583c1c5e4ff2eeae28886ab16efdedee7c`. Ferramentas da reprodução: Pillow 13.0.0 e zlib 1.3.2. O índice materializado foi verificado sem perda; o payload UTF-8 calculado para o índice de armas tem 14.572.929 bytes, abaixo do limite observado 16MiB. Não se alterou ou dividiu arquivo para transporte.

O primeiro A/B sem apresentação/readback por quadro recebeu SIGKILL; RSS observado 4101 MB após o primeiro item, sem prova de causa OOM. Consumir cada quadro no próprio Canvas (limpeza e leitura de 1 pixel) manteve todas as asserções e 12.000 passos: passou em 3,5 s com RSS observado até 511 MB. Só o harness mudou, não o jogo nem tolerâncias.

## Correção separada de teste preexistente

O teste 109/133 abrangia indevidamente flats posteriores sem `basePack`. A falha original foi reproduzida antes da correção. Agora os quatro registros originais e hashes aprovados são explícitos; permanecem as 31 comparações raster, a tolerância anterior, a imutabilidade e o controle negativo de identidade. Um segundo teste exige rejeição dos flats posteriores EAST/WEST. O arquivo passou 2/2. Nenhum adaptador ou seletor de produção foi alterado. Após essa correção, `npm run test:rework-hd` passou 191/191, sem testes ignorados/cancelados (751.978 ms, exit 0). O comando focal do workflow passou 77/77 separadamente. Isso não é execução do job de navegador. A auditoria canônica leu 4.679 registros sem divergências; o verificador leu 288 arquivos e 18.768 PNGs de fonte, mais 179 PNGs de cabeça.
