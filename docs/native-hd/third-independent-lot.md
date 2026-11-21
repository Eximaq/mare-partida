# Terceiro lote independente: 133, 161, 21, 111 e 112

Escopo sobre `84f3ad9`: três calças femininas de caminhada EAST/WEST e duas armas masculinas de ataque EAST/WEST. Nenhuma composição completa foi promovida a equipamento. Nenhum ajuste de cabeça foi alterado. Os registros anteriores permanecem intactos.

## Calças

Fontes editáveis originais de 133 r15, 161 r27 e 21 r3 recuperadas. A receita conserva base, tecido transparente e sobreposição das mãos originais: near recortado em y=238, far nas amostras 2/3/4 e antebraço derivado da 21 nas amostras 2/3. A 21 usa WEST autoral, não espelhamento; amostras 4/7 têm regressão explícita. Os outros dois WEST seguem o espelhamento da própria fonte aprovada.

72 amostras recompostas RGBA exatas às referências aprovadas. O compositor real verifica 240 ticks (3 peças × 2 direções × 40 ticks), sem tolerância raster. Relógio original: 12 amostras em 40 ticks a 40 fps. O seletor exige aparência original (cabelo/rosto original, cabelo/olhos castanhos, pele clara) e somente a calça. Não oculta luvas, botas, arma ou peitoral: combinações seguem as rotas anteriores, sem aceitar seleção parcial como conjunto completo.

## Manoplas 111/112

Base e equipamento genuínos permanecem camadas separadas. São 8 estados a 12 fps, conforme a rota anterior; o hold de apresentação não modifica o relógio. Escopo masculino EAST/WEST com arma isolada e aparência original. Peitorais e outros slots não declarados compatíveis; linhas antigas de combinações com peitoral da matriz continuam abertas.

Prova independente de fonte: 32 referências RGBA exatas. No Canvas real, 112 mantém alfa exato e RGB máximo 1. Somente 111 admite arredondamento de premultiplicação: alfa exato, RGB opaco ≤1 e diferença premultiplicada translúcida ≤2. Exatamente 56 canais têm diferença RGB não premultiplicada acima de 1 (máximo 2): alfa 133:10, 180:10, 187:10, 195:20, 207:6. Máximo premultiplicado 414/255 = 1,623529. Teste fixa distribuição e máximo; não mascara geometria nem afrouxa os demais equipamentos.

## Verificação e limites

Referências em ZIP são exclusivamente de teste, não assets de equipamento. O workflow native-HD inclui agora testes independentes/separáveis novos e existentes, inclusive gatilhos de caminho. Verificação final: npm test passou (243 testes foundation e 239/239 arquivos legacy); 15 testes separáveis/calças passaram. Auditoria verificou 282 arquivos ZIP, 18.149 PNGs originais e 179 PNGs de cabeça; build e transporte lossless passaram. A receita portátil reproduziu os seis registros e 115 PNGs de calças byte a byte.

Evidência cobre seletor normal e compositor real fora do mapa. Não afirma teste de navegador, inventário, recarga ou deslocamento no mapa. Permanecem pendentes apenas combinações, aparências e direções ainda não comprovadas na matriz. Não reabrimos os resultados anteriores: Cajado 128 NORTH BASE127 já tem suporte exato, peitoral 130 feminino na aparência de fonte tem 160 ticks comprovados e a nuca do Diadema 157 NORTH já foi corrigida.
